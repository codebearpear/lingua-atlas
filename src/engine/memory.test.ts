import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import {
  buildMemory,
  cardKey,
  endOfDay,
  gradeFor,
  isDue,
  memorySkill,
  summarize,
  type MemoryAnswer,
  type MemoryCard,
  type MemoryRound,
} from './memory'

const MINUTE = 60_000
const DAY = 86_400_000
// Donderdag 29 oktober 2026, 10:00 in Nederland.
const T0 = Date.UTC(2026, 9, 29, 9, 0)

function answer(fields: Partial<MemoryAnswer> = {}): MemoryAnswer {
  return {
    type: 'typed-answer',
    direction: 'to-target',
    items: ['adios'],
    verdict: 'correct',
    overridden: false,
    answeredAt: T0,
    ...fields,
  }
}

function round(
  answers: MemoryAnswer[],
  id = 'ronde',
  language: MemoryRound['language'] = 'es',
): MemoryRound {
  return { id, language, answers }
}

/** De kaart voor adios (zelf maken) na deze antwoorden. */
function adios(...answers: MemoryAnswer[]): MemoryCard {
  const card = buildMemory([round(answers)]).get('es:adios:production')
  if (card === undefined) {
    throw new Error('De kaart ontbreekt.')
  }
  return card
}

/** Over hoeveel minuten de kaart terugkomt, gerekend vanaf een tijdstip. */
function minutesUntilDue(card: MemoryCard, from: number): number {
  return (card.fsrs.due.getTime() - from) / MINUTE
}

describe('memorySkill', () => {
  it('telt alleen een getypt antwoord in de doeltaal als zelf maken', () => {
    expect(memorySkill({ type: 'typed-answer', direction: 'to-target' })).toBe(
      'production',
    )
    expect(memorySkill({ type: 'typed-answer', direction: 'to-dutch' })).toBe(
      'recognition',
    )
    expect(
      memorySkill({ type: 'multiple-choice', direction: 'to-target' }),
    ).toBe('recognition')
    expect(
      memorySkill({ type: 'multiple-choice', direction: 'to-dutch' }),
    ).toBe('recognition')
  })
})

describe('gradeFor', () => {
  it('geeft goed, bijna goed en fout het cijfer Good, Hard en Again', () => {
    expect(gradeFor({ verdict: 'correct', overridden: false })).toBe(3)
    expect(gradeFor({ verdict: 'almost', overridden: false })).toBe(2)
    expect(gradeFor({ verdict: 'wrong', overridden: false })).toBe(1)
  })

  it('telt een zelf goedgekeurd antwoord als goed', () => {
    expect(gradeFor({ verdict: 'wrong', overridden: true })).toBe(3)
  })
})

describe('buildMemory', () => {
  it('maakt per woord en vaardigheid één kaart, per taal', () => {
    const cards = buildMemory([
      round([
        answer({
          type: 'multiple-choice',
          direction: 'to-dutch',
          items: ['hola'],
        }),
        answer({ items: ['adios'] }),
        answer({
          type: 'typed-answer',
          direction: 'to-dutch',
          items: ['adios'],
        }),
        answer({ items: ['adios'], answeredAt: T0 + MINUTE }),
      ]),
      round([answer({ items: ['adios'] })], 'ronde-de', 'de'),
    ])
    expect([...cards.keys()].sort()).toEqual([
      'de:adios:production',
      'es:adios:production',
      'es:adios:recognition',
      'es:hola:recognition',
    ])
    expect(cards.get(cardKey('es', 'adios', 'production'))?.fsrs.reps).toBe(2)
    expect(cards.get('es:adios:production')?.firstReview).toBe(T0)
  })

  it('laat een nieuwe kaart na 10, 6 of 1 minuut terugkomen bij goed, bijna goed of fout', () => {
    for (const [verdict, minutes] of [
      ['correct', 10],
      ['almost', 6],
      ['wrong', 1],
    ] as const) {
      const card = adios(answer({ verdict }))
      expect(card.fsrs.state).toBe(State.Learning)
      expect(minutesUntilDue(card, T0)).toBe(minutes)
    }
  })

  it('laat een kaart na twee keer goed pas na dagen terugkomen, en steeds later', () => {
    const learned = adios(answer(), answer({ answeredAt: T0 + 10 * MINUTE }))
    expect(learned.fsrs.state).toBe(State.Review)
    expect(minutesUntilDue(learned, T0 + 10 * MINUTE)).toBe(2 * 24 * 60)

    const again = adios(
      answer(),
      answer({ answeredAt: T0 + 10 * MINUTE }),
      answer({ answeredAt: T0 + 3 * DAY }),
    )
    expect(minutesUntilDue(again, T0 + 3 * DAY)).toBe(14 * 24 * 60)
  })

  it('laat een vergeten kaart na 10 minuten opnieuw terugkomen', () => {
    const card = adios(
      answer(),
      answer({ answeredAt: T0 + 10 * MINUTE }),
      answer({ answeredAt: T0 + 3 * DAY, verdict: 'wrong' }),
    )
    expect(card.fsrs.state).toBe(State.Relearning)
    expect(card.fsrs.lapses).toBe(1)
    expect(minutesUntilDue(card, T0 + 3 * DAY)).toBe(10)
  })

  it('doorloopt de antwoorden in volgorde van tijd, ook over rondes heen', () => {
    const first = round([answer()], 'a')
    const later = round([answer({ answeredAt: T0 + 10 * MINUTE })], 'b')
    const inOrder = buildMemory([first, later])
    expect(buildMemory([later, first])).toEqual(inOrder)
    expect(inOrder.get('es:adios:production')?.fsrs.state).toBe(State.Review)
  })

  it('telt een zelf goedgekeurd antwoord als goed', () => {
    expect(adios(answer({ verdict: 'wrong', overridden: true }))).toEqual(
      adios(answer()),
    )
  })

  it('slaat een oefening zonder woorden of zinnen over', () => {
    expect(buildMemory([round([answer({ items: [] })])]).size).toBe(0)
  })
})

describe('isDue en summarize', () => {
  // Om 10:00 een nieuw woord goed, om 10:10 nog eens goed: terug over 2 dagen.
  const learned = adios(answer(), answer({ answeredAt: T0 + 10 * MINUTE }))
  // Om 10:00 een nieuw woord fout: terug om 10:01.
  const failed = buildMemory([
    round([answer({ items: ['hola'], verdict: 'wrong' })]),
  ]).get('es:hola:production')
  if (failed === undefined) {
    throw new Error('De kaart ontbreekt.')
  }
  const midnight = Date.UTC(2026, 9, 29, 23, 0) // 30 oktober 0:00 in Nederland

  it('laat een kaart in de leerfase pas terugkomen als zijn tijd om is', () => {
    expect(isDue(failed, T0, midnight)).toBe(false)
    expect(isDue(failed, T0 + MINUTE, midnight)).toBe(true)
  })

  it('laat een gewone kaart de hele dag terugkomen waarop hij aan de beurt is', () => {
    const dueDay = T0 + 10 * MINUTE + 2 * DAY
    // Om 8:00 op de dag zelf, twee uur voor het tijdstip van FSRS.
    expect(isDue(learned, dueDay - 2 * 60 * MINUTE, midnight + 2 * DAY)).toBe(
      true,
    )
    // De dag ervoor nog niet.
    expect(isDue(learned, dueDay - DAY, midnight + DAY)).toBe(false)
  })

  it('telt de kaarten, wat nu aan de beurt is en wat later vandaag komt', () => {
    expect(summarize([learned, failed], T0 + 30 * 1000, midnight)).toEqual({
      cards: 2,
      recognition: 0,
      production: 2,
      due: 0,
      laterToday: 1,
      next: failed,
    })
    expect(summarize([learned, failed], T0 + 2 * MINUTE, midnight)).toEqual({
      cards: 2,
      recognition: 0,
      production: 2,
      due: 1,
      laterToday: 0,
      next: learned,
    })
  })
})

describe('endOfDay', () => {
  it('geeft middernacht na het tijdstip, in de tijd van het apparaat', () => {
    const end = endOfDay(T0)
    expect(end > T0).toBe(true)
    expect(end - T0 <= DAY).toBe(true)
    expect(new Date(end).getHours()).toBe(0)
    expect(new Date(end).getMinutes()).toBe(0)
  })
})
