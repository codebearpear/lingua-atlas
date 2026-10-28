/**
 * Maakt van een gecontroleerd taalpakket het lespakket voor de app. Draait
 * tijdens het bouwen (scripts/packs.ts), na de controle.
 *
 * De status van een les is de laagste van de les zelf en alles wat ze toont.
 * Een les die een woord in concept toont, heet dus ook concept: de app belooft
 * nooit meer dan voor elk onderdeel geldt.
 */
import type { PackReport } from './check.ts'
import type {
  CompiledExercise,
  CompiledLesson,
  CompiledPack,
  CompiledSentence,
  CompiledUnit,
  CompiledWord,
} from './compiled.ts'
import { parseInline, type InlineText } from './inline.ts'
import type { Exercise, Lesson } from './schema.ts'
import { lowestOf, type EffectiveStatus } from './summary.ts'

/** Zonder bekende status rekent de app met Concept. */
function statusOf(report: PackReport, id: string): EffectiveStatus {
  return report.itemStatuses[id] ?? 'draft'
}

/** Nederlandse tekst met de doeltaal gemarkeerd. De controle keurde de markering al goed. */
function inline(text: string): InlineText {
  return parseInline(text).parts
}

function inlineOrNone(text: string | undefined): InlineText | undefined {
  return text === undefined ? undefined : inline(text)
}

/** Kenmerken van de voorbeeldzinnen in een les, in volgorde, elk één keer. */
function exampleIds(lesson: Lesson): string[] {
  return [
    ...new Set(
      lesson.blocks.flatMap((block) =>
        block.type === 'explanation' ? (block.examples ?? []) : [],
      ),
    ),
  ]
}

function compileExercise(
  report: PackReport,
  exercise: Exercise,
): CompiledExercise {
  const fields = {
    id: exercise.id,
    skill: exercise.skill,
    direction: exercise.direction,
    instruction: inline(exercise.instruction),
    prompt: exercise.prompt,
    items: exercise.items ?? [],
    status: statusOf(report, exercise.id),
  }
  return exercise.type === 'multiple-choice'
    ? {
        ...fields,
        type: 'multiple-choice',
        choices: exercise.choices.map((choice) => ({
          text: choice.text,
          correct: choice.correct,
          feedback: inlineOrNone(choice.feedback),
        })),
      }
    : {
        ...fields,
        type: 'typed-answer',
        answers: exercise.answers,
        feedback: (exercise.feedback ?? []).map((entry) => ({
          answer: entry.answer,
          errorType: entry.errorType,
          message: inline(entry.message),
        })),
      }
}

function compileLesson(report: PackReport, lesson: Lesson): CompiledLesson {
  const exercises = lesson.exercises ?? []
  const words = lesson.words ?? []
  return {
    id: lesson.id,
    title: lesson.title,
    goals: lesson.goals.map(inline),
    blocks: lesson.blocks.map((block) =>
      block.type === 'explanation'
        ? {
            type: 'explanation',
            text: inline(block.text),
            examples: block.examples ?? [],
          }
        : { type: 'culture', text: inline(block.text) },
    ),
    words,
    exercises: exercises.map((exercise) => compileExercise(report, exercise)),
    status: lowestOf([
      statusOf(report, lesson.id),
      ...words.map((id) => statusOf(report, id)),
      ...exampleIds(lesson).map((id) => statusOf(report, id)),
      ...exercises.map((exercise) => statusOf(report, exercise.id)),
    ]),
  }
}

/**
 * Het lespakket voor de app. Alleen voor een pakket zonder fouten; de
 * Vite-plug-in laat het bouwen anders eerst mislukken.
 */
export function compilePack(report: PackReport): CompiledPack {
  const { words, sentences, units } = report.content

  const compiledUnits: CompiledUnit[] = [...units]
    .sort((a, b) => a.order - b.order)
    .map((unit) => {
      const lessons = unit.lessons.map((lesson) =>
        compileLesson(report, lesson),
      )
      return {
        id: unit.id,
        title: unit.title,
        level: unit.level,
        order: unit.order,
        goals: unit.goals.map(inline),
        lessons,
        status: lowestOf([
          statusOf(report, unit.id),
          ...lessons.map((lesson) => lesson.status),
        ]),
      }
    })

  return {
    id: report.folder,
    units: compiledUnits,
    words: Object.fromEntries(
      words.map((word): [string, CompiledWord] => [
        word.id,
        {
          id: word.id,
          text: word.text,
          translations: word.translations,
          partOfSpeech: word.partOfSpeech,
          gender: word.gender,
          transliteration: word.transliteration,
          ipa: word.ipa,
          register: word.register,
          regions: word.regions,
          notes: inlineOrNone(word.notes),
          status: statusOf(report, word.id),
        },
      ]),
    ),
    sentences: Object.fromEntries(
      sentences.map((sentence): [string, CompiledSentence] => [
        sentence.id,
        {
          id: sentence.id,
          text: sentence.text,
          translation: sentence.translation,
          transliteration: sentence.transliteration,
          register: sentence.register,
          regions: sentence.regions,
          notes: inlineOrNone(sentence.notes),
          status: statusOf(report, sentence.id),
        },
      ]),
    ),
  }
}
