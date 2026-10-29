/**
 * Het geheugenmodel: per woord of zin een herhaalkaart voor herkennen en een
 * voor zelf maken. Wanneer een kaart terugkomt, berekent FSRS-6 (ts-fsrs, met
 * de standaardinstellingen van de makers).
 *
 * De kaarten worden niet apart bewaard. Ze volgen uit je antwoorden in de
 * oefenrondes, in volgorde van tijd: elk antwoord herhaalt de kaarten van de
 * woorden of zinnen die de oefening toetst. Zo kloppen de kaarten ook na het
 * samenvoegen van back-ups van twee apparaten, en kan een beter model later
 * dezelfde geschiedenis opnieuw doorrekenen.
 */
import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs'
import type { LanguageCode } from '../content/languageCodes.ts'
import type { Verdict } from './answers.ts'

/** Herkennen: begrijpen of kiezen. Zelf maken: het zelf opschrijven. */
export type MemorySkill = 'recognition' | 'production'

/** Een antwoord zoals het geheugenmodel het nodig heeft (zie RoundAnswer). */
export interface MemoryAnswer {
  type: 'multiple-choice' | 'typed-answer'
  direction: 'to-dutch' | 'to-target'
  /** De woorden of zinnen die de oefening toetst. */
  items: readonly string[]
  verdict: Verdict
  overridden: boolean
  answeredAt: number
}

/** Een oefenronde zoals het geheugenmodel hem nodig heeft (zie PracticeRound). */
export interface MemoryRound {
  id: string
  language: LanguageCode
  answers: readonly MemoryAnswer[]
}

export interface MemoryCard {
  key: string
  language: LanguageCode
  /** Het woord of de zin, als kenmerk uit het taalpakket. */
  item: string
  skill: MemorySkill
  /** De toestand volgens FSRS: stabiliteit, moeilijkheid en wanneer de kaart terugkomt. */
  fsrs: Card
  /** Wanneer je de kaart voor het eerst oefende, in milliseconden sinds 1970. */
  firstReview: number
}

/**
 * De planning: FSRS-6 met de standaardinstellingen van ts-fsrs. Een kaart
 * komt terug als de kans dat je hem nog weet, gedaald is tot 90%. Een nieuwe
 * of vergeten kaart komt eerst na 1 en 10 minuten nog eens terug.
 */
export const SCHEDULER = fsrs()

/**
 * Welke kaart een antwoord herhaalt. Alleen een getypt antwoord in de
 * doeltaal is zelf maken; bij meerkeuze kies je de doeltaal, maar maak je hem
 * niet zelf, dus dat is herkennen.
 */
export function memorySkill(
  answer: Pick<MemoryAnswer, 'type' | 'direction'>,
): MemorySkill {
  return answer.type === 'typed-answer' && answer.direction === 'to-target'
    ? 'production'
    : 'recognition'
}

/**
 * Het cijfer voor FSRS: goed is Good, bijna goed is Hard en fout is Again.
 * Een zelf goedgekeurd antwoord telt als goed.
 */
export function gradeFor(
  answer: Pick<MemoryAnswer, 'verdict' | 'overridden'>,
): Grade {
  if (answer.overridden) {
    return Rating.Good
  }
  switch (answer.verdict) {
    case 'correct':
      return Rating.Good
    case 'almost':
      return Rating.Hard
    case 'wrong':
      return Rating.Again
  }
}

export function cardKey(
  language: LanguageCode,
  item: string,
  skill: MemorySkill,
): string {
  return `${language}:${item}:${skill}`
}

/**
 * Alle kaarten, door je antwoorden in volgorde van tijd opnieuw te doorlopen.
 * Antwoorden op hetzelfde moment komen op een vaste volgorde, zodat dezelfde
 * rondes altijd dezelfde kaarten geven.
 */
export function buildMemory(
  rounds: readonly MemoryRound[],
  scheduler = SCHEDULER,
): Map<string, MemoryCard> {
  const answers = rounds.flatMap((round) =>
    round.answers.map((answer, index) => ({ round, answer, index })),
  )
  answers.sort(
    (a, b) =>
      a.answer.answeredAt - b.answer.answeredAt ||
      (a.round.id < b.round.id ? -1 : a.round.id > b.round.id ? 1 : 0) ||
      a.index - b.index,
  )

  const cards = new Map<string, MemoryCard>()
  for (const { round, answer } of answers) {
    const skill = memorySkill(answer)
    const grade = gradeFor(answer)
    const at = new Date(answer.answeredAt)
    for (const item of new Set(answer.items)) {
      const key = cardKey(round.language, item, skill)
      const card = cards.get(key) ?? {
        key,
        language: round.language,
        item,
        skill,
        fsrs: createEmptyCard(at),
        firstReview: answer.answeredAt,
      }
      cards.set(key, {
        ...card,
        fsrs: scheduler.next(card.fsrs, at, grade).card,
      })
    }
  }
  return cards
}

/** Of een kaart in de leerfase is: dan komt hij binnen minuten terug. */
export function isLearning(card: MemoryCard): boolean {
  return card.fsrs.state !== State.Review
}

/**
 * Of je een kaart nu kunt herhalen. Een kaart in de leerfase zodra zijn tijd
 * om is; een gewone kaart de hele dag waarop hij terugkomt.
 */
export function isDue(
  card: MemoryCard,
  now: number,
  endOfToday: number,
): boolean {
  const due = card.fsrs.due.getTime()
  return isLearning(card) ? due <= now : due < endOfToday
}

/** Het einde van de dag van een tijdstip, in de tijd van het apparaat. */
export function endOfDay(time: number): number {
  const date = new Date(time)
  date.setHours(24, 0, 0, 0)
  return date.getTime()
}

export interface MemorySummary {
  /** Alle kaarten, en hoeveel daarvan voor herkennen en voor zelf maken. */
  cards: number
  recognition: number
  production: number
  /** Kaarten die je nu kunt herhalen. */
  due: number
  /** Kaarten in de leerfase die later vandaag terugkomen. */
  laterToday: number
  /** De eerstvolgende kaart die nu nog niet aan de beurt is. */
  next: MemoryCard | undefined
}

/** Hoeveel kaarten er zijn, en wanneer ze terugkomen. */
export function summarize(
  cards: Iterable<MemoryCard>,
  now: number,
  endOfToday: number,
): MemorySummary {
  const summary: MemorySummary = {
    cards: 0,
    recognition: 0,
    production: 0,
    due: 0,
    laterToday: 0,
    next: undefined,
  }
  for (const card of cards) {
    summary.cards += 1
    summary[card.skill] += 1
    if (isDue(card, now, endOfToday)) {
      summary.due += 1
      continue
    }
    if (isLearning(card) && card.fsrs.due.getTime() < endOfToday) {
      summary.laterToday += 1
    }
    if (
      summary.next === undefined ||
      card.fsrs.due.getTime() < summary.next.fsrs.due.getTime()
    ) {
      summary.next = card
    }
  }
  return summary
}
