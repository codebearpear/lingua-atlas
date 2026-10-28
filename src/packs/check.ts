/**
 * Controleert één taalpakket.
 *
 * Dit is puur rekenwerk zonder bestandstoegang: de tests en het
 * controlescript (scripts/pakketten.ts) gebruiken dezelfde regels.
 *
 * - Een fout houdt publicatie tegen.
 * - Een waarschuwing niet, maar een onderdeel met een waarschuwing blijft op
 *   Concept staan.
 * - Een onderdeel in concept zonder fouten of waarschuwingen krijgt de status
 *   Automatisch gecontroleerd. Dat zegt iets over de vorm (tekens, verwijzingen,
 *   antwoordsleutels), niet over de taal zelf.
 */
import { z } from 'zod'
import { normalizeAnswer } from '../engine/normalize.ts'
import {
  manifestSchema,
  sentencesFileSchema,
  sourcesFileSchema,
  unitSchema,
  vocabularyFileSchema,
  type Exercise,
  type PackManifest,
  type Source,
  type Unit,
  type Verification,
} from './schema.ts'
import { rulesFor } from './scripts.ts'
import { checkText, type Severity, type TextProblem } from './text.ts'

export { checkText } from './text.ts'
export type { Severity } from './text.ts'

export interface Issue {
  severity: Severity
  /** Bestand binnen de pakketmap, zoals "units/a1-begroeten.json". */
  file: string
  /** Plaats in het bestand, zoals "words[3].translations[0]"; leeg is het hele bestand. */
  path: string
  message: string
  /** Kenmerk van het onderdeel waar het om gaat, als dat bekend is. */
  itemId?: string
}

export type EffectiveStatus =
  'draft' | 'auto-checked' | 'source-verified' | 'expert-reviewed'

/** De statussen van laag naar hoog. */
export const STATUS_ORDER = [
  'draft',
  'auto-checked',
  'source-verified',
  'expert-reviewed',
] as const satisfies readonly EffectiveStatus[]

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  draft: 'Concept',
  'auto-checked': 'Automatisch gecontroleerd',
  'source-verified': 'Bron-geverifieerd',
  'expert-reviewed': 'Expert-beoordeeld',
}

export interface PackInput {
  /** Naam van de pakketmap. */
  folder: string
  /** De bestanden in de map: pad met / als scheidingsteken, en de inhoud. */
  files: ReadonlyMap<string, string>
}

export interface PackCounts {
  sources: number
  words: number
  sentences: number
  units: number
  lessons: number
  exercises: number
}

export interface PackReport {
  folder: string
  manifest: PackManifest | undefined
  issues: Issue[]
  counts: PackCounts
  /** Status van de taalgegevens en de namen in pack.json. */
  manifestStatuses:
    { language: EffectiveStatus; names: EffectiveStatus } | undefined
  /** Aantal lesonderdelen per status: woorden, zinnen, eenheden, lessen en oefeningen. */
  statuses: Record<EffectiveStatus, number>
}

export interface CheckOptions {
  /** De datum van vandaag als JJJJ-MM-DD. */
  today: string
}

/** Kenmerken voor de twee onderdelen van het manifest die een status hebben. */
const MANIFEST_LANGUAGE = 'manifest:language'
const MANIFEST_NAMES = 'manifest:names'

const KNOWN_FILES = new Set([
  'pack.json',
  'sources.json',
  'vocabulary.json',
  'sentences.json',
])
const UNIT_FILE = /^units\/[^/]+\.json$/

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
const TOPIK_LEVELS = [
  'TOPIK-1',
  'TOPIK-2',
  'TOPIK-3',
  'TOPIK-4',
  'TOPIK-5',
  'TOPIK-6',
] as const

// ---------------------------------------------------------------------------
// Foutmeldingen in het Nederlands

const dutchLocale = z.locales.nl().localeError

const TYPE_NAMES: Partial<Record<string, string>> = {
  string: 'tekst',
  number: 'een getal',
  int: 'een geheel getal',
  boolean: 'true of false',
  array: 'een lijst',
  object: 'een object',
}

/** Duidelijke Nederlandse meldingen voor de schema's, met de vertaling van Zod als terugval. */
export const dutchErrors: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.input === undefined) {
        return 'Ontbreekt.'
      }
      return `Verwacht ${TYPE_NAMES[issue.expected] ?? issue.expected}.`
    case 'unrecognized_keys':
      return `Onbekend veld: ${issue.keys.map((key) => `"${key}"`).join(', ')}. Klopt de spelling?`
    case 'invalid_value':
      if (issue.input === undefined) {
        return 'Ontbreekt.'
      }
      return `Kies uit: ${issue.values.map((value) => JSON.stringify(value)).join(', ')}.`
    case 'invalid_union':
      if (issue.discriminator !== undefined) {
        return property(issue.input, issue.discriminator) === undefined
          ? 'Ontbreekt.'
          : `Onbekende waarde voor "${issue.discriminator}".`
      }
      return 'Past bij geen van de toegestane vormen.'
    case 'too_small':
      if (issue.origin === 'array') {
        return `Moet minstens ${String(issue.minimum)} onderdeel bevatten.`
      }
      return dutchLocale(issue)
    default:
      return dutchLocale(issue)
  }
}

// ---------------------------------------------------------------------------
// Hulpfuncties

function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((key, index) => {
      if (typeof key === 'number') {
        return `[${key}]`
      }
      return index === 0 ? String(key) : `.${String(key)}`
    })
    .join('')
}

function property(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }
  return (value as Record<string, unknown>)[key]
}

function idAt(
  list: unknown,
  index: PropertyKey | undefined,
): string | undefined {
  if (!Array.isArray(list) || typeof index !== 'number') {
    return undefined
  }
  const id = property(list[index], 'id')
  return typeof id === 'string' ? id : undefined
}

/** Zoekt bij een plaats in een bestand het kenmerk van het onderdeel. */
function itemIdAt(
  file: string,
  data: unknown,
  path: readonly PropertyKey[],
): string | undefined {
  const [first, second, third, fourth] = path
  if (file === 'pack.json') {
    if (first === 'language') {
      return MANIFEST_LANGUAGE
    }
    return first === 'names' ? MANIFEST_NAMES : undefined
  }
  if (file === 'vocabulary.json' && first === 'words') {
    return idAt(property(data, 'words'), second)
  }
  if (file === 'sentences.json' && first === 'sentences') {
    return idAt(property(data, 'sentences'), second)
  }
  if (UNIT_FILE.test(file)) {
    const lessons = property(data, 'lessons')
    if (first === 'lessons') {
      if (third === 'exercises' && Array.isArray(lessons)) {
        const lesson: unknown =
          typeof second === 'number' ? lessons[second] : undefined
        const exerciseId = idAt(property(lesson, 'exercises'), fourth)
        if (exerciseId !== undefined) {
          return exerciseId
        }
      }
      const lessonId = idAt(lessons, second)
      if (lessonId !== undefined) {
        return lessonId
      }
    }
    const unitId = property(data, 'id')
    return typeof unitId === 'string' ? unitId : undefined
  }
  return undefined
}

/** Een bekend fout antwoord in een oefening, met opzet fout. */
function isFeedbackAnswer(path: readonly PropertyKey[]): boolean {
  return path.at(-1) === 'answer' && path.at(-3) === 'feedback'
}

function walkStrings(
  value: unknown,
  path: PropertyKey[],
  visit: (text: string, path: PropertyKey[]) => void,
): void {
  if (typeof value === 'string') {
    visit(value, path)
  } else if (Array.isArray(value)) {
    value.forEach((item: unknown, index) => {
      walkStrings(item, [...path, index], visit)
    })
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      walkStrings(item, [...path, key], visit)
    }
  }
}

function allowedLevels(levels: PackManifest['levels']): readonly string[] {
  switch (levels.framework) {
    case 'cefr':
    case 'cefr-informed':
      return CEFR_LEVELS
    case 'topik':
      return TOPIK_LEVELS
    case 'milestones':
      return levels.milestones?.map((milestone) => milestone.id) ?? []
  }
}

function nextDay(date: string): string {
  const time = Date.parse(`${date}T00:00:00Z`) + 24 * 60 * 60 * 1000
  return new Date(time).toISOString().slice(0, 10)
}

function effectiveStatus(
  verification: Verification | undefined,
  id: string,
  flagged: ReadonlySet<string>,
): EffectiveStatus {
  const stored = verification?.status ?? 'draft'
  if (stored === 'draft') {
    return flagged.has(id) ? 'draft' : 'auto-checked'
  }
  return stored
}

type ItemKind = 'word' | 'sentence' | 'unit' | 'lesson' | 'exercise'

const KIND_NAMES: Record<ItemKind, string> = {
  word: 'een woord',
  sentence: 'een zin',
  unit: 'een eenheid',
  lesson: 'een les',
  exercise: 'een oefening',
}

interface ItemRecord {
  kind: ItemKind
  file: string
  path: string
  verification: Verification | undefined
}

// ---------------------------------------------------------------------------
// De controle

export function checkPack(input: PackInput, options: CheckOptions): PackReport {
  const issues: Issue[] = []
  const add = (
    severity: Severity,
    file: string,
    path: string,
    message: string,
    itemId?: string,
  ): void => {
    issues.push(
      itemId === undefined
        ? { severity, file, path, message }
        : { severity, file, path, message, itemId },
    )
  }

  // 1. Bestanden inlezen
  const parsed = new Map<string, unknown>()
  for (const [file, text] of input.files) {
    if (!KNOWN_FILES.has(file) && !UNIT_FILE.test(file)) {
      add('warning', file, '', 'Onbekend bestand; de controle slaat het over.')
      continue
    }
    try {
      parsed.set(file, JSON.parse(text) as unknown)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      add('error', file, '', `Geen geldige JSON: ${detail}`)
    }
  }
  if (!input.files.has('pack.json')) {
    add('error', 'pack.json', '', 'Het manifest pack.json ontbreekt.')
  }

  // 2. Regels voor alle tekst
  for (const [file, data] of parsed) {
    walkStrings(data, [], (text, path) => {
      const typography = !isFeedbackAnswer(path)
      for (const problem of checkText(text, { typography })) {
        add(
          problem.severity,
          file,
          formatPath(path),
          problem.message,
          itemIdAt(file, data, path),
        )
      }
    })
  }

  // 3. Schema's
  const invalidFiles = new Set<string>()
  function validate<T extends z.ZodType>(
    schema: T,
    file: string,
  ): z.output<T> | undefined {
    if (!parsed.has(file)) {
      return undefined
    }
    const data = parsed.get(file)
    const result = schema.safeParse(data, { error: dutchErrors })
    if (result.success) {
      return result.data
    }
    for (const issue of result.error.issues) {
      add(
        'error',
        file,
        formatPath(issue.path),
        issue.message,
        itemIdAt(file, data, issue.path),
      )
    }
    invalidFiles.add(file)
    return undefined
  }

  const manifest = validate(manifestSchema, 'pack.json')
  const sources = validate(sourcesFileSchema, 'sources.json')?.sources ?? []
  const words = validate(vocabularyFileSchema, 'vocabulary.json')?.words ?? []
  const sentences =
    validate(sentencesFileSchema, 'sentences.json')?.sentences ?? []
  const units: { file: string; unit: Unit }[] = []
  for (const file of [...parsed.keys()]
    .filter((name) => UNIT_FILE.test(name))
    .sort()) {
    const unit = validate(unitSchema, file)
    if (unit !== undefined) {
      units.push({ file, unit })
    }
  }

  // 4. Het manifest
  if (manifest !== undefined) {
    if (manifest.id !== input.folder) {
      add(
        'error',
        'pack.json',
        'id',
        `Het kenmerk "${manifest.id}" moet gelijk zijn aan de mapnaam "${input.folder}".`,
      )
    }
    const { locale, code, script } = manifest.language
    let canonical: string | undefined
    try {
      canonical = Intl.getCanonicalLocales(locale)[0]
    } catch {
      add(
        'error',
        'pack.json',
        'language.locale',
        `"${locale}" is geen geldige BCP 47-taalcode.`,
        MANIFEST_LANGUAGE,
      )
    }
    if (canonical !== undefined) {
      if (canonical !== locale) {
        add(
          'error',
          'pack.json',
          'language.locale',
          `Schrijf de taalcode als "${canonical}".`,
          MANIFEST_LANGUAGE,
        )
      }
      const parts = new Intl.Locale(canonical)
      if (parts.language !== code) {
        add(
          'error',
          'pack.json',
          'language.code',
          `Hoort gelijk te zijn aan de taal in "${locale}": "${parts.language}".`,
          MANIFEST_LANGUAGE,
        )
      }
      if (parts.script !== undefined && parts.script !== script) {
        add(
          'error',
          'pack.json',
          'language.script',
          `Hoort gelijk te zijn aan het schrift in "${locale}": "${parts.script}".`,
          MANIFEST_LANGUAGE,
        )
      }
    }
  }

  // 5. Bronnen
  const sourceIds = new Map<string, Source>()
  sources.forEach((source, index) => {
    if (sourceIds.has(source.id)) {
      add(
        'error',
        'sources.json',
        `sources[${index}].id`,
        `Het kenmerk "${source.id}" komt vaker voor.`,
      )
    } else {
      sourceIds.set(source.id, source)
    }
  })

  // 6. Alle lesonderdelen met een uniek kenmerk
  const items = new Map<string, ItemRecord>()
  const register = (id: string, record: ItemRecord): void => {
    const existing = items.get(id)
    if (existing !== undefined) {
      add(
        'error',
        record.file,
        `${record.path}.id`,
        `Het kenmerk "${id}" is al in gebruik in ${existing.file} (${existing.path}).`,
        id,
      )
      return
    }
    items.set(id, record)
  }
  words.forEach((word, index) => {
    register(word.id, {
      kind: 'word',
      file: 'vocabulary.json',
      path: `words[${index}]`,
      verification: word.verification,
    })
  })
  sentences.forEach((sentence, index) => {
    register(sentence.id, {
      kind: 'sentence',
      file: 'sentences.json',
      path: `sentences[${index}]`,
      verification: sentence.verification,
    })
  })
  for (const { file, unit } of units) {
    if (file !== `units/${unit.id}.json`) {
      add(
        'error',
        file,
        'id',
        `Een eenheid met kenmerk "${unit.id}" hoort in units/${unit.id}.json te staan.`,
        unit.id,
      )
    }
    register(unit.id, {
      kind: 'unit',
      file,
      path: '',
      verification: unit.verification,
    })
    unit.lessons.forEach((lesson, lessonIndex) => {
      register(lesson.id, {
        kind: 'lesson',
        file,
        path: `lessons[${lessonIndex}]`,
        verification: lesson.verification,
      })
      lesson.exercises?.forEach((exercise, exerciseIndex) => {
        register(exercise.id, {
          kind: 'exercise',
          file,
          path: `lessons[${lessonIndex}].exercises[${exerciseIndex}]`,
          verification: exercise.verification,
        })
      })
    })
  }

  // 7. Verwijzingen naar andere onderdelen
  //
  // Kenmerken uit bestanden die niet door het schema kwamen, tellen ook mee.
  // Zo geeft één fout in vocabulary.json geen reeks valse meldingen over
  // verwijzingen elders.
  const unvalidated = new Map<string, ItemKind>()
  const collectIds = (list: unknown, kind: ItemKind): void => {
    if (!Array.isArray(list)) {
      return
    }
    for (const entry of list) {
      const id = property(entry, 'id')
      if (typeof id === 'string') {
        unvalidated.set(id, kind)
      }
    }
  }
  for (const file of invalidFiles) {
    const data = parsed.get(file)
    if (file === 'vocabulary.json') {
      collectIds(property(data, 'words'), 'word')
    } else if (file === 'sentences.json') {
      collectIds(property(data, 'sentences'), 'sentence')
    } else if (UNIT_FILE.test(file)) {
      collectIds([data], 'unit')
      const lessons = property(data, 'lessons')
      collectIds(lessons, 'lesson')
      if (Array.isArray(lessons)) {
        for (const lesson of lessons) {
          collectIds(property(lesson, 'exercises'), 'exercise')
        }
      }
    }
  }

  const expectItems = (
    ids: readonly string[] | undefined,
    kinds: readonly ItemKind[],
    file: string,
    path: string,
    ownerId: string,
  ): void => {
    ids?.forEach((id, index) => {
      const target = items.get(id)?.kind ?? unvalidated.get(id)
      if (target === undefined) {
        add(
          'error',
          file,
          `${path}[${index}]`,
          `Verwijst naar "${id}", maar dat kenmerk bestaat niet in dit pakket.`,
          ownerId,
        )
      } else if (!kinds.includes(target)) {
        add(
          'error',
          file,
          `${path}[${index}]`,
          `Verwijst naar "${id}", maar dat is ${KIND_NAMES[target]}; verwacht ${kinds.map((kind) => KIND_NAMES[kind]).join(' of ')}.`,
          ownerId,
        )
      }
    })
  }

  // 8. Validatiestatus en herkomst
  const checkVerification = (
    verification: Verification | undefined,
    file: string,
    path: string,
    itemId: string,
  ): void => {
    if (verification === undefined || verification.status === 'draft') {
      return
    }
    const refs = verification.sources ?? []
    refs.forEach((ref, index) => {
      if (!sourceIds.has(ref.source)) {
        add(
          'error',
          file,
          `${path}.verification.sources[${index}].source`,
          `Bron "${ref.source}" staat niet in sources.json.`,
          itemId,
        )
      }
    })
    if (
      verification.status === 'source-verified' &&
      !refs.some((ref) => sourceIds.get(ref.source)?.authoritative === true)
    ) {
      add(
        'error',
        file,
        `${path}.verification.sources`,
        'Bron-geverifieerd vraagt minstens één gezaghebbende bron (authoritative: true).',
        itemId,
      )
    }
    if (verification.date > nextDay(options.today)) {
      add(
        'error',
        file,
        `${path}.verification.date`,
        `De datum ${verification.date} ligt in de toekomst.`,
        itemId,
      )
    }
  }

  const checkOrigin = (
    origin: { source: string } | undefined,
    file: string,
    path: string,
    itemId: string,
  ): void => {
    if (origin !== undefined && !sourceIds.has(origin.source)) {
      add(
        'error',
        file,
        `${path}.origin.source`,
        `Bron "${origin.source}" staat niet in sources.json.`,
        itemId,
      )
    }
  }

  // 9. Niveaus binnen het kader van het pakket
  const levels =
    manifest === undefined ? undefined : allowedLevels(manifest.levels)
  const checkLevel = (
    level: string | undefined,
    file: string,
    path: string,
    itemId: string,
  ): void => {
    if (level === undefined || levels === undefined || levels.includes(level)) {
      return
    }
    add(
      'error',
      file,
      path,
      levels.length === 0
        ? 'Dit pakket heeft nog geen niveaus; zet de mijlpalen eerst in pack.json.'
        : `Niveau "${level}" past niet bij dit pakket. Kies uit: ${levels.join(', ')}.`,
      itemId,
    )
  }

  if (manifest !== undefined) {
    checkVerification(
      manifest.language.verification,
      'pack.json',
      'language',
      MANIFEST_LANGUAGE,
    )
    checkVerification(
      manifest.names.verification,
      'pack.json',
      'names',
      MANIFEST_NAMES,
    )
  }

  words.forEach((word, index) => {
    const path = `words[${index}]`
    expectItems(
      word.examples,
      ['sentence'],
      'vocabulary.json',
      `${path}.examples`,
      word.id,
    )
    checkVerification(word.verification, 'vocabulary.json', path, word.id)
    checkOrigin(word.origin, 'vocabulary.json', path, word.id)
    checkLevel(word.level, 'vocabulary.json', `${path}.level`, word.id)
  })

  sentences.forEach((sentence, index) => {
    const path = `sentences[${index}]`
    expectItems(
      sentence.words,
      ['word'],
      'sentences.json',
      `${path}.words`,
      sentence.id,
    )
    checkVerification(
      sentence.verification,
      'sentences.json',
      path,
      sentence.id,
    )
    checkOrigin(sentence.origin, 'sentences.json', path, sentence.id)
    checkLevel(sentence.level, 'sentences.json', `${path}.level`, sentence.id)
  })

  const orders = new Map<number, string>()
  for (const { file, unit } of units) {
    checkVerification(unit.verification, file, '', unit.id)
    checkLevel(unit.level, file, 'level', unit.id)
    const sameOrder = orders.get(unit.order)
    if (sameOrder !== undefined) {
      add(
        'warning',
        file,
        'order',
        `Volgnummer ${unit.order} is ook in gebruik bij eenheid "${sameOrder}".`,
        unit.id,
      )
    } else {
      orders.set(unit.order, unit.id)
    }

    unit.lessons.forEach((lesson, lessonIndex) => {
      const lessonPath = `lessons[${lessonIndex}]`
      checkVerification(lesson.verification, file, lessonPath, lesson.id)
      expectItems(
        lesson.words,
        ['word'],
        file,
        `${lessonPath}.words`,
        lesson.id,
      )
      lesson.blocks.forEach((block, blockIndex) => {
        if (block.type !== 'explanation') {
          return
        }
        const blockPath = `${lessonPath}.blocks[${blockIndex}]`
        if (block.examples === undefined) {
          add(
            'warning',
            file,
            blockPath,
            'Uitleg zonder voorbeeldzin. Voeg een voorbeeld uit sentences.json toe.',
            lesson.id,
          )
        }
        expectItems(
          block.examples,
          ['sentence'],
          file,
          `${blockPath}.examples`,
          lesson.id,
        )
      })
      lesson.exercises?.forEach((exercise, exerciseIndex) => {
        const exercisePath = `${lessonPath}.exercises[${exerciseIndex}]`
        checkVerification(
          exercise.verification,
          file,
          exercisePath,
          exercise.id,
        )
        expectItems(
          exercise.items,
          ['word', 'sentence'],
          file,
          `${exercisePath}.items`,
          exercise.id,
        )
        checkAnswerKey(exercise, file, exercisePath, add)
      })
    })
  }

  // 10. Taal en schrift
  if (manifest !== undefined) {
    const rules = rulesFor(manifest.language)
    const report = (
      problems: readonly TextProblem[],
      file: string,
      path: string,
      itemId: string | undefined,
    ): void => {
      for (const found of problems) {
        add(found.severity, file, path, found.message, itemId)
      }
    }

    // Tekst in de doeltaal. Nederlandse tekst valt hier buiten: uitleg mag
    // bijvoorbeeld de Arabische kaf noemen om het verschil te laten zien.
    const target = (
      text: string,
      file: string,
      path: string,
      itemId: string,
      sentence = false,
    ): void => {
      report(rules.target(text), file, path, itemId)
      report(rules.characters(text), file, path, itemId)
      if (sentence) {
        report(rules.sentence(text), file, path, itemId)
      }
    }
    const romanized = (
      text: string | undefined,
      file: string,
      path: string,
      itemId: string,
    ): void => {
      if (text !== undefined) {
        report(rules.romanization(text), file, path, itemId)
      }
    }

    target(manifest.names.native, 'pack.json', 'names.native', MANIFEST_NAMES)
    words.forEach((word, index) => {
      target(word.text, 'vocabulary.json', `words[${index}].text`, word.id)
      romanized(
        word.transliteration,
        'vocabulary.json',
        `words[${index}].transliteration`,
        word.id,
      )
    })
    sentences.forEach((sentence, index) => {
      const path = `sentences[${index}]`
      target(sentence.text, 'sentences.json', `${path}.text`, sentence.id, true)
      romanized(
        sentence.transliteration,
        'sentences.json',
        `${path}.transliteration`,
        sentence.id,
      )
    })
    for (const { file, unit } of units) {
      unit.lessons.forEach((lesson, lessonIndex) => {
        lesson.exercises?.forEach((exercise, exerciseIndex) => {
          const path = `lessons[${lessonIndex}].exercises[${exerciseIndex}]`
          // Herkennen: de opgave staat in de doeltaal. Produceren: de antwoorden.
          if (exercise.direction === 'to-dutch') {
            target(exercise.prompt, file, `${path}.prompt`, exercise.id)
            return
          }
          if (exercise.type === 'multiple-choice') {
            exercise.choices.forEach((choice, choiceIndex) => {
              target(
                choice.text,
                file,
                `${path}.choices[${choiceIndex}].text`,
                exercise.id,
              )
            })
          } else {
            exercise.answers.forEach((answer, answerIndex) => {
              target(
                answer,
                file,
                `${path}.answers[${answerIndex}]`,
                exercise.id,
              )
            })
          }
        })
      })
    }
  }

  // 11. Statussen
  const flagged = new Set(
    issues.flatMap((issue) =>
      issue.itemId === undefined ? [] : [issue.itemId],
    ),
  )
  const statuses: Record<EffectiveStatus, number> = {
    draft: 0,
    'auto-checked': 0,
    'source-verified': 0,
    'expert-reviewed': 0,
  }
  for (const [id, record] of items) {
    statuses[effectiveStatus(record.verification, id, flagged)] += 1
  }

  return {
    folder: input.folder,
    manifest,
    issues,
    counts: {
      sources: sources.length,
      words: words.length,
      sentences: sentences.length,
      units: units.length,
      lessons: units.reduce(
        (total, { unit }) => total + unit.lessons.length,
        0,
      ),
      exercises: units.reduce(
        (total, { unit }) =>
          total +
          unit.lessons.reduce(
            (sum, lesson) => sum + (lesson.exercises?.length ?? 0),
            0,
          ),
        0,
      ),
    },
    manifestStatuses:
      manifest === undefined
        ? undefined
        : {
            language: effectiveStatus(
              manifest.language.verification,
              MANIFEST_LANGUAGE,
              flagged,
            ),
            names: effectiveStatus(
              manifest.names.verification,
              MANIFEST_NAMES,
              flagged,
            ),
          },
    statuses,
  }
}

/** Elke oefening heeft een volledige en eenduidige antwoordsleutel. */
function checkAnswerKey(
  exercise: Exercise,
  file: string,
  path: string,
  add: (
    severity: Severity,
    file: string,
    path: string,
    message: string,
    itemId?: string,
  ) => void,
): void {
  if (exercise.type === 'multiple-choice') {
    const correct = exercise.choices.filter((choice) => choice.correct).length
    if (correct === 0) {
      add(
        'error',
        file,
        `${path}.choices`,
        'Geen enkele keuze is als goed gemarkeerd.',
        exercise.id,
      )
    } else if (correct > 1) {
      add(
        'warning',
        file,
        `${path}.choices`,
        `${correct} keuzes zijn als goed gemarkeerd. Bij meerkeuze verwacht de app er één; klopt dit?`,
        exercise.id,
      )
    }
    const seen = new Set<string>()
    exercise.choices.forEach((choice, index) => {
      const key = normalizeAnswer(choice.text)
      if (seen.has(key)) {
        add(
          'error',
          file,
          `${path}.choices[${index}]`,
          `De keuze "${choice.text}" staat er twee keer in.`,
          exercise.id,
        )
      }
      seen.add(key)
    })
    return
  }

  const accepted = new Set<string>()
  exercise.answers.forEach((answer, index) => {
    const key = normalizeAnswer(answer)
    if (accepted.has(key)) {
      add(
        'warning',
        file,
        `${path}.answers[${index}]`,
        `Het antwoord "${answer}" staat er twee keer in.`,
        exercise.id,
      )
    }
    accepted.add(key)
  })
  exercise.feedback?.forEach((entry, index) => {
    if (accepted.has(normalizeAnswer(entry.answer))) {
      add(
        'error',
        file,
        `${path}.feedback[${index}].answer`,
        `"${entry.answer}" staat ook bij de goede antwoorden.`,
        exercise.id,
      )
    }
  })
}
