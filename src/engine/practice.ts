/**
 * Een oefenronde: de oefeningen van een les na elkaar, met per oefening je
 * antwoord en het oordeel van de antwoordcontrole (answers.ts).
 *
 * Dit is alleen de toestand en hoe die verandert; het scherm staat in
 * src/pages/PracticePage.tsx. Zo is de ronde te testen zonder browser.
 */
import type { CompiledExercise } from '../packs/compiled.ts'
import type { AnswerCheck, Verdict } from './answers.ts'

export interface Attempt {
  exerciseId: string
  /** Wat je typte, of de tekst van je keuze. */
  given: string
  check: AnswerCheck
  /** Zelf goedgekeurd: je antwoord klopte toch, maar stond niet in de sleutel. */
  overridden: boolean
}

export interface PracticeState {
  /** Kenmerken van de oefeningen, in de volgorde van deze ronde. */
  order: readonly string[]
  /** Per meerkeuzevraag de volgorde waarin de keuzes staan (indexen). */
  choiceOrder: Readonly<Record<string, readonly number[]>>
  /** Welke oefening aan de beurt is. */
  index: number
  /** Antwoorden op de oefeningen tot nu toe, in volgorde. */
  attempts: readonly Attempt[]
  /** Antwoorden, het oordeel bekijken, of de samenvatting aan het eind. */
  phase: 'answer' | 'feedback' | 'summary'
}

export type PracticeAction =
  | { type: 'check'; given: string; check: AnswerCheck }
  | { type: 'override' }
  | { type: 'next' }
  | { type: 'restart'; state: PracticeState }

/** Een nieuwe volgorde, eerlijk geschud (Fisher-Yates). */
export function shuffled<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    const here = result[index]
    const there = result[other]
    if (here !== undefined && there !== undefined) {
      result[index] = there
      result[other] = here
    }
  }
  return result
}

/**
 * Een nieuwe ronde. De oefeningen blijven in de volgorde van de les, want die
 * is zo opgebouwd: eerst herkennen, dan zelf maken. De keuzes bij meerkeuze
 * staan elke ronde anders, zodat je niet op de plek leert.
 */
export function startPractice(
  exercises: readonly CompiledExercise[],
  random: () => number = Math.random,
): PracticeState {
  const choiceOrder: Record<string, readonly number[]> = {}
  for (const exercise of exercises) {
    if (exercise.type === 'multiple-choice') {
      choiceOrder[exercise.id] = shuffled(
        exercise.choices.map((_, index) => index),
        random,
      )
    }
  }
  return {
    order: exercises.map((exercise) => exercise.id),
    choiceOrder,
    index: 0,
    attempts: [],
    phase: exercises.length === 0 ? 'summary' : 'answer',
  }
}

export function practiceReducer(
  state: PracticeState,
  action: PracticeAction,
): PracticeState {
  switch (action.type) {
    case 'check': {
      const exerciseId = state.order[state.index]
      if (state.phase !== 'answer' || exerciseId === undefined) {
        return state
      }
      return {
        ...state,
        attempts: [
          ...state.attempts,
          {
            exerciseId,
            given: action.given,
            check: action.check,
            overridden: false,
          },
        ],
        phase: 'feedback',
      }
    }
    case 'override': {
      const last = state.attempts.at(-1)
      if (
        state.phase !== 'feedback' ||
        last === undefined ||
        last.check.verdict === 'correct'
      ) {
        return state
      }
      return {
        ...state,
        attempts: [
          ...state.attempts.slice(0, -1),
          { ...last, overridden: true },
        ],
      }
    }
    case 'next': {
      if (state.phase !== 'feedback') {
        return state
      }
      const index = state.index + 1
      return index < state.order.length
        ? { ...state, index, phase: 'answer' }
        : { ...state, phase: 'summary' }
    }
    case 'restart':
      return action.state
  }
}

/** Het oordeel dat telt: een zelf goedgekeurd antwoord telt als goed. */
export function finalVerdict(attempt: Attempt): Verdict {
  return attempt.overridden ? 'correct' : attempt.check.verdict
}

/** Hoeveel antwoorden goed, bijna goed en fout waren. */
export function tally(attempts: readonly Attempt[]): Record<Verdict, number> {
  const counts: Record<Verdict, number> = { correct: 0, almost: 0, wrong: 0 }
  for (const attempt of attempts) {
    counts[finalVerdict(attempt)] += 1
  }
  return counts
}
