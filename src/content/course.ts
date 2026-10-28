/**
 * Opzoeken in een lespakket: een les met haar plaats in de cursus, en de
 * woorden en voorbeeldzinnen die ze toont.
 */
import type {
  CompiledLesson,
  CompiledPack,
  CompiledSentence,
  CompiledUnit,
  CompiledWord,
} from '../packs/compiled'

export interface LessonPlace {
  unit: CompiledUnit
  lesson: CompiledLesson
  /** Plaats van de les in haar eenheid, vanaf 1. */
  number: number
  /** De les ervoor en erna in de hele cursus, ook over eenheden heen. */
  previous?: CompiledLesson
  next?: CompiledLesson
}

/** Alle lessen van de cursus, op volgorde. */
function allLessons(
  pack: CompiledPack,
): { unit: CompiledUnit; lesson: CompiledLesson; number: number }[] {
  return pack.units.flatMap((unit) =>
    unit.lessons.map((lesson, index) => ({ unit, lesson, number: index + 1 })),
  )
}

/** Een les met haar plaats in de cursus, of undefined als ze niet bestaat. */
export function findLesson(
  pack: CompiledPack,
  id: string,
): LessonPlace | undefined {
  const lessons = allLessons(pack)
  const index = lessons.findIndex((entry) => entry.lesson.id === id)
  const entry = lessons[index]
  if (entry === undefined) {
    return undefined
  }
  return {
    ...entry,
    previous: lessons[index - 1]?.lesson,
    next: lessons[index + 1]?.lesson,
  }
}

/**
 * Onderdelen bij hun kenmerken, in dezelfde volgorde. Het bouwen controleert
 * de verwijzingen al; een onbekend kenmerk valt hier gewoon weg.
 */
function pick<T>(items: Record<string, T>, ids: readonly string[]): T[] {
  return ids.flatMap((id) => {
    const item = items[id]
    return item === undefined ? [] : [item]
  })
}

export function wordsOf(
  pack: CompiledPack,
  ids: readonly string[],
): CompiledWord[] {
  return pick(pack.words, ids)
}

export function sentencesOf(
  pack: CompiledPack,
  ids: readonly string[],
): CompiledSentence[] {
  return pick(pack.sentences, ids)
}
