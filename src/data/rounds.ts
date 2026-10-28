/**
 * Oefenrondes bewaren en terugvinden. De oefenpagina bewaart de ronde na elk
 * antwoord, zodat er niets verloren gaat als je halverwege stopt of de app
 * sluit. De lespagina toont de laatste afgeronde ronde.
 */
import { Dexie } from 'dexie'
import type { LanguageCode } from '../content/languageCodes'
import type { Verdict } from '../engine/answers'
import { countVerdicts, type PracticeState } from '../engine/practice'
import type { CompiledExercise } from '../packs/compiled'
import type { Database, PracticeRound, RoundAnswer } from './database'

/** Waar een ronde bij hoort. */
export interface RoundContext {
  language: LanguageCode
  lesson: string
  packVersion: string
  exercises: readonly CompiledExercise[]
}

/**
 * De ronde zoals hij bewaard wordt, of undefined zolang er nog niets is
 * beantwoord. Velden zonder waarde blijven weg, zodat het record er in de
 * database en in een back-up hetzelfde uitziet.
 */
export function roundRecord(
  state: Pick<PracticeState, 'id' | 'startedAt' | 'attempts' | 'finishedAt'>,
  context: RoundContext,
  now: number,
): PracticeRound | undefined {
  if (state.attempts.length === 0) {
    return undefined
  }
  const answers = state.attempts.flatMap((attempt): RoundAnswer[] => {
    const exercise = context.exercises.find(
      (item) => item.id === attempt.exerciseId,
    )
    if (exercise === undefined) {
      return []
    }
    const answer: RoundAnswer = {
      exerciseId: exercise.id,
      type: exercise.type,
      direction: exercise.direction,
      items: [...exercise.items],
      given: attempt.given,
      verdict: attempt.check.verdict,
      overridden: attempt.overridden,
      answeredAt: attempt.answeredAt,
    }
    if (attempt.check.errorType !== undefined) {
      answer.errorType = attempt.check.errorType
    }
    return [answer]
  })
  const round: PracticeRound = {
    id: state.id,
    language: context.language,
    lesson: context.lesson,
    packVersion: context.packVersion,
    startedAt: state.startedAt,
    updatedAt: now,
    answers,
  }
  if (state.finishedAt !== undefined) {
    round.finishedAt = state.finishedAt
  }
  return round
}

export async function saveRound(
  db: Database,
  round: PracticeRound,
): Promise<void> {
  await db.rounds.put(round)
}

/** De laatste afgeronde ronde bij een les, of undefined als die er niet is. */
export function lastFinishedRound(
  db: Database,
  language: LanguageCode,
  lesson: string,
): Promise<PracticeRound | undefined> {
  return db.rounds
    .where('[language+lesson+finishedAt]')
    .between([language, lesson, Dexie.minKey], [language, lesson, Dexie.maxKey])
    .last()
}

/**
 * Het oordeel dat telt: een zelf goedgekeurd antwoord telt als goed, net als
 * finalVerdict in de ronde zelf.
 */
export function answerVerdict(answer: RoundAnswer): Verdict {
  return answer.overridden ? 'correct' : answer.verdict
}

/** Hoeveel antwoorden in een ronde goed, bijna goed en fout waren. */
export function roundCounts(round: PracticeRound): Record<Verdict, number> {
  return countVerdicts(round.answers.map(answerVerdict))
}
