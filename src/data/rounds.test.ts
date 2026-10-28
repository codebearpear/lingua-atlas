import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import type { AnswerCheck } from '../engine/answers'
import {
  practiceReducer,
  startPractice,
  type PracticeState,
} from '../engine/practice'
import type { CompiledExercise } from '../packs/compiled'
import { createDatabase, type PracticeRound } from './database'
import {
  lastFinishedRound,
  roundCounts,
  roundRecord,
  saveRound,
  type RoundContext,
} from './rounds'

function freshDatabase() {
  return createDatabase('test', { indexedDB: new IDBFactory(), IDBKeyRange })
}

const choice: CompiledExercise = {
  id: 'oef-keuze',
  type: 'multiple-choice',
  skill: 'vocabulary',
  direction: 'to-dutch',
  instruction: ['Wat betekent dit?'],
  prompt: 'hola',
  items: ['hola'],
  status: 'auto-checked',
  choices: [
    { text: 'hallo', correct: true },
    { text: 'dag', correct: false },
  ],
}

const typed: CompiledExercise = {
  id: 'oef-typen',
  type: 'typed-answer',
  skill: 'vocabulary',
  direction: 'to-target',
  instruction: ['Vertaal naar het Spaans.'],
  prompt: 'tot ziens',
  items: ['adios'],
  status: 'auto-checked',
  answers: ['adios'],
  feedback: [],
}

const CONTEXT: RoundContext = {
  language: 'es',
  lesson: 'a1-begroeten-hallo',
  packVersion: '0.3.1',
  exercises: [choice, typed],
}

const correct: AnswerCheck = { verdict: 'correct', expected: 'hallo' }
const almost: AnswerCheck = {
  verdict: 'almost',
  errorType: 'diacritics',
  expected: 'adios',
}

/** Een ronde met een goed en een bijna goed antwoord, afgerond of niet. */
function playedRound(finish: boolean): PracticeState {
  let state = startPractice([choice, typed], {
    random: () => 0,
    now: 1000,
    id: 'ronde-1',
  })
  state = practiceReducer(state, {
    type: 'check',
    given: 'hallo',
    check: correct,
    at: 2000,
  })
  state = practiceReducer(state, { type: 'next', at: 2100 })
  state = practiceReducer(state, {
    type: 'check',
    given: 'adios',
    check: almost,
    at: 3000,
  })
  return finish ? practiceReducer(state, { type: 'next', at: 3100 }) : state
}

/** Een bewaarde ronde met een goed antwoord, voor de tests met de database. */
function stored(
  fields: Partial<PracticeRound> & { id: string },
): PracticeRound {
  return {
    language: 'es',
    lesson: 'a1-begroeten-hallo',
    packVersion: '0.3.1',
    startedAt: 1000,
    updatedAt: 1000,
    answers: [
      {
        exerciseId: 'oef-keuze',
        type: 'multiple-choice',
        direction: 'to-dutch',
        items: ['hola'],
        given: 'hallo',
        verdict: 'correct',
        overridden: false,
        answeredAt: 1000,
      },
    ],
    ...fields,
  }
}

describe('roundRecord', () => {
  it('bewaart nog niets zolang er niets is beantwoord', () => {
    expect(roundRecord(startPractice([choice]), CONTEXT, 5000)).toBeUndefined()
  })

  it('legt per antwoord vast wat de oefening toetste en hoe het ging', () => {
    expect(roundRecord(playedRound(true), CONTEXT, 5000)).toEqual({
      id: 'ronde-1',
      language: 'es',
      lesson: 'a1-begroeten-hallo',
      packVersion: '0.3.1',
      startedAt: 1000,
      finishedAt: 3100,
      updatedAt: 5000,
      answers: [
        {
          exerciseId: 'oef-keuze',
          type: 'multiple-choice',
          direction: 'to-dutch',
          items: ['hola'],
          given: 'hallo',
          verdict: 'correct',
          overridden: false,
          answeredAt: 2000,
        },
        {
          exerciseId: 'oef-typen',
          type: 'typed-answer',
          direction: 'to-target',
          items: ['adios'],
          given: 'adios',
          verdict: 'almost',
          errorType: 'diacritics',
          overridden: false,
          answeredAt: 3000,
        },
      ],
    })
  })

  it('laat finishedAt weg bij een ronde die nog loopt', () => {
    const round = roundRecord(playedRound(false), CONTEXT, 5000)
    expect(round?.answers).toHaveLength(2)
    expect(round !== undefined && 'finishedAt' in round).toBe(false)
  })
})

describe('roundCounts', () => {
  it('telt een zelf goedgekeurd antwoord als goed', () => {
    const state = practiceReducer(playedRound(false), { type: 'override' })
    const round = roundRecord(state, CONTEXT, 5000)
    expect(round === undefined ? undefined : roundCounts(round)).toEqual({
      correct: 2,
      almost: 0,
      wrong: 0,
    })
  })
})

describe('saveRound en lastFinishedRound', () => {
  it('vindt de laatst afgeronde ronde van de les', async () => {
    const db = freshDatabase()
    await saveRound(db, stored({ id: 'a', finishedAt: 100 }))
    await saveRound(db, stored({ id: 'b', finishedAt: 300 }))
    await saveRound(db, stored({ id: 'c', finishedAt: 200 }))
    // Later begonnen, maar niet afgemaakt.
    await saveRound(db, stored({ id: 'd', startedAt: 400 }))
    // Een andere les en een andere taal.
    await saveRound(db, stored({ id: 'e', lesson: 'ander', finishedAt: 500 }))
    await saveRound(db, stored({ id: 'f', language: 'de', finishedAt: 600 }))
    expect((await lastFinishedRound(db, 'es', 'a1-begroeten-hallo'))?.id).toBe(
      'b',
    )
  })

  it('vindt niets als er bij de les nog geen afgeronde ronde is', async () => {
    const db = freshDatabase()
    await saveRound(db, stored({ id: 'a' }))
    expect(
      await lastFinishedRound(db, 'es', 'a1-begroeten-hallo'),
    ).toBeUndefined()
  })

  it('werkt dezelfde ronde bij na elk antwoord', async () => {
    const db = freshDatabase()
    const running = roundRecord(playedRound(false), CONTEXT, 4000)
    const finished = roundRecord(playedRound(true), CONTEXT, 5000)
    if (running === undefined || finished === undefined) {
      throw new Error('De ronde ontbreekt.')
    }
    await saveRound(db, running)
    await saveRound(db, finished)
    expect(await db.rounds.count()).toBe(1)
    expect(await lastFinishedRound(db, 'es', 'a1-begroeten-hallo')).toEqual(
      finished,
    )
  })
})
