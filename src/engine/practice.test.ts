import { describe, expect, it } from 'vitest'
import type { CompiledExercise } from '../packs/compiled'
import type { AnswerCheck } from './answers'
import {
  finalVerdict,
  practiceReducer,
  shuffled,
  startPractice,
  tally,
  type PracticeState,
} from './practice'

/** Een vaste reeks "toevallige" getallen, zodat de test elke keer hetzelfde doet. */
function sequence(...values: number[]): () => number {
  let index = 0
  return () => values[index++ % values.length] ?? 0
}

const choice: CompiledExercise = {
  id: 'oef-keuze',
  type: 'multiple-choice',
  skill: 'vocabulary',
  direction: 'to-dutch',
  instruction: ['Wat betekent dit?'],
  prompt: 'hola',
  items: [],
  status: 'auto-checked',
  choices: [
    { text: 'hallo', correct: true },
    { text: 'dag', correct: false },
    { text: 'goedemorgen', correct: false },
  ],
}

const typed: CompiledExercise = {
  id: 'oef-typen',
  type: 'typed-answer',
  skill: 'vocabulary',
  direction: 'to-target',
  instruction: ['Vertaal naar het Spaans.'],
  prompt: 'tot ziens',
  items: [],
  status: 'auto-checked',
  answers: ['adios'],
  feedback: [],
}

const correct: AnswerCheck = { verdict: 'correct', expected: 'hallo' }
const almost: AnswerCheck = {
  verdict: 'almost',
  errorType: 'diacritics',
  expected: 'adios',
}

describe('shuffled', () => {
  it('geeft dezelfde onderdelen in een andere volgorde, zonder het origineel te wijzigen', () => {
    const items = [1, 2, 3, 4]
    const result = shuffled(items, sequence(0, 0, 0))
    expect(result).toEqual([2, 3, 4, 1])
    expect(items).toEqual([1, 2, 3, 4])
    expect([...result].sort()).toEqual([1, 2, 3, 4])
  })
})

describe('startPractice', () => {
  it('houdt de oefeningen in de volgorde van de les en schudt de keuzes', () => {
    const state = startPractice([choice, typed], sequence(0, 0))
    expect(state.order).toEqual(['oef-keuze', 'oef-typen'])
    expect(state.choiceOrder['oef-keuze']).toEqual([1, 2, 0])
    expect(state.choiceOrder['oef-typen']).toBeUndefined()
    expect(state.phase).toBe('answer')
  })

  it('gaat zonder oefeningen meteen naar de samenvatting', () => {
    expect(startPractice([]).phase).toBe('summary')
  })
})

describe('practiceReducer', () => {
  const start = (): PracticeState => startPractice([choice, typed], sequence(0))

  it('loopt van antwoorden via het oordeel naar de volgende oefening en de samenvatting', () => {
    let state = start()
    state = practiceReducer(state, {
      type: 'check',
      given: 'hallo',
      check: correct,
    })
    expect(state.phase).toBe('feedback')
    expect(state.attempts).toEqual([
      {
        exerciseId: 'oef-keuze',
        given: 'hallo',
        check: correct,
        overridden: false,
      },
    ])
    state = practiceReducer(state, { type: 'next' })
    expect(state.phase).toBe('answer')
    expect(state.index).toBe(1)
    state = practiceReducer(state, {
      type: 'check',
      given: 'adios',
      check: almost,
    })
    state = practiceReducer(state, { type: 'next' })
    expect(state.phase).toBe('summary')
    expect(tally(state.attempts)).toEqual({ correct: 1, almost: 1, wrong: 0 })
  })

  it('laat een antwoord zelf goedkeuren, maar alleen als het niet al goed was', () => {
    let state = start()
    state = practiceReducer(state, {
      type: 'check',
      given: 'hallo',
      check: correct,
    })
    expect(practiceReducer(state, { type: 'override' })).toBe(state)
    state = practiceReducer(state, { type: 'next' })
    state = practiceReducer(state, {
      type: 'check',
      given: 'adios',
      check: almost,
    })
    state = practiceReducer(state, { type: 'override' })
    const last = state.attempts.at(-1)
    expect(last?.overridden).toBe(true)
    expect(last === undefined ? undefined : finalVerdict(last)).toBe('correct')
  })

  it('negeert acties die niet bij de fase passen', () => {
    const state = start()
    expect(practiceReducer(state, { type: 'next' })).toBe(state)
    const checked = practiceReducer(state, {
      type: 'check',
      given: 'hallo',
      check: correct,
    })
    expect(
      practiceReducer(checked, { type: 'check', given: 'dag', check: correct }),
    ).toBe(checked)
  })
})
