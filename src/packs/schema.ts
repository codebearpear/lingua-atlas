/**
 * Het formaat van een taalpakket, schemaversie 1.
 *
 * Een pakket staat in content/packs/<kenmerk>/ en bestaat uit:
 * - pack.json: het manifest (taal, schrift, richting, niveaukader, licentie)
 * - sources.json: de bronnen waar onderdelen naar verwijzen
 * - vocabulary.json: woorden (mag ontbreken)
 * - sentences.json: zinnen (mag ontbreken)
 * - units/<kenmerk>.json: eenheden met lessen en oefeningen (mag ontbreken)
 *
 * Veldnamen zijn Engels, zoals in de rest van de code; uitleg en vertalingen
 * zijn Nederlands. De regels die over meer dan één veld gaan, zoals
 * verwijzingen en unieke kenmerken, staan in check.ts.
 *
 * In Nederlandse tekst (uitleg, doelen, notities en de teksten van
 * oefeningen) staat de doeltaal tussen sterretjes en een foute vorm tussen
 * tildes: "*Hola* betekent hallo." Zie inline.ts.
 *
 * Nieuwe soorten inhoud (lees- en luisterteksten, handschriftgegevens) komen
 * in de fasen die ze nodig hebben, met een hogere schemaversie.
 */
import { z } from 'zod'
import { ERROR_TYPES, SKILLS } from './kinds.ts'

export const SCHEMA_VERSION = 1

// ---------------------------------------------------------------------------
// Bouwstenen

/** Kenmerk van een onderdeel, zoals "a1-begroeten". */
export const idSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Gebruik kleine letters, cijfers en losse streepjes, zoals "a1-begroeten".',
  )

const textSchema = z.string().min(1, 'Mag niet leeg zijn.')

const dateSchema = z.iso.date('Gebruik een datum als JJJJ-MM-DD.')

/** Licenties die de app kent. Er komt er een bij zodra een bron dat vraagt. */
export const LICENSES = [
  'CC-BY-NC-SA-4.0',
  'CC-BY-SA-4.0',
  'CC-BY-4.0',
  'CC0-1.0',
] as const

export const licenseSchema = z.enum(LICENSES)

/** Een verwijzing naar een bron uit sources.json. */
export const sourceRefSchema = z.strictObject({
  source: idSchema,
  /** Waar in de bron: een pagina, trefwoord of onderdeel. */
  locator: textSchema.optional(),
})

/**
 * De validatiestatus zoals die in het pakket staat.
 *
 * "Automatisch gecontroleerd" staat hier bewust niet bij: die status geeft
 * het controlescript zelf, aan onderdelen in concept die alle controles
 * zonder waarschuwing doorstaan.
 */
export const verificationSchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('draft'),
    notes: textSchema.optional(),
  }),
  z.strictObject({
    status: z.literal('source-verified'),
    sources: z.array(sourceRefSchema).min(1, 'Noem minstens één bron.'),
    /** Wie de bronnen naliep: jij of Claude. */
    checkedBy: textSchema,
    date: dateSchema,
    notes: textSchema.optional(),
  }),
  z.strictObject({
    status: z.literal('expert-reviewed'),
    reviewer: z.strictObject({
      name: textSchema,
      qualification: textSchema,
    }),
    date: dateSchema,
    sources: z.array(sourceRefSchema).min(1).optional(),
    notes: textSchema.optional(),
  }),
])

/**
 * Herkomst van een onderdeel dat van iemand anders komt. Onderdelen zonder
 * herkomst zijn eigen werk en vallen onder de licentie van het pakket.
 */
export const originSchema = z.strictObject({
  source: idSchema,
  locator: textSchema.optional(),
  license: licenseSchema,
  /** De naamsvermelding zoals de licentie die vraagt. */
  attribution: textSchema,
})

// ---------------------------------------------------------------------------
// Manifest (pack.json)

export const LEVEL_FRAMEWORKS = [
  'cefr',
  'cefr-informed',
  'topik',
  'milestones',
] as const

const levelsSchema = z.discriminatedUnion('framework', [
  z.strictObject({ framework: z.literal('cefr'), description: textSchema }),
  z.strictObject({
    framework: z.literal('cefr-informed'),
    description: textSchema,
  }),
  z.strictObject({ framework: z.literal('topik'), description: textSchema }),
  z.strictObject({
    framework: z.literal('milestones'),
    description: textSchema,
    /** De eigen mijlpalen, elk met een can-do-doel in het Nederlands. */
    milestones: z
      .array(z.strictObject({ id: idSchema, goal: textSchema }))
      .min(1)
      .optional(),
  }),
])

export const manifestSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  /** Gelijk aan de naam van de map. */
  id: idSchema,
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Gebruik een versienummer als 1.0.0.'),
  /** De licentie van de eigen inhoud van het pakket. */
  license: licenseSchema,
  /** Feiten over de taal, met een eigen validatiestatus. */
  language: z.strictObject({
    code: z
      .string()
      .regex(
        /^[a-z]{2,3}$/,
        'Gebruik de taalcode in kleine letters, zoals "fa".',
      ),
    /** BCP 47, zoals "fa-IR", voor het lang-attribuut en voor spraak. */
    locale: textSchema,
    /** Schriftcode volgens ISO 15924, zoals "Arab". */
    script: z
      .string()
      .regex(
        /^[A-Z][a-z]{3}$/,
        'Gebruik een schriftcode volgens ISO 15924, zoals "Arab".',
      ),
    direction: z.enum(['ltr', 'rtl']),
    verification: verificationSchema.optional(),
  }),
  /** De naam van de taal in het Nederlands en in de taal zelf. */
  names: z.strictObject({
    dutch: textSchema,
    native: textSchema,
    verification: verificationSchema.optional(),
  }),
  /** Keuzes van de app voor de weergave. */
  display: z.strictObject({
    /** De naam van het schrift zoals de app die toont. */
    scriptName: textSchema,
    /** Een of twee tekens voor het taalpictogram. */
    glyph: textSchema,
  }),
  /** De standaardvariant die de app aanhoudt. */
  variant: textSchema,
  levels: levelsSchema,
})

// ---------------------------------------------------------------------------
// Bronnen (sources.json)

export const SOURCE_KINDS = [
  'standard',
  'dictionary',
  'grammar',
  'textbook',
  'corpus',
  'website',
  'other',
] as const

export const sourceSchema = z.strictObject({
  id: idSchema,
  title: textSchema,
  publisher: textSchema.optional(),
  authors: z.array(textSchema).min(1).optional(),
  year: z.int().min(1450).max(2100).optional(),
  url: z
    .httpUrl('Gebruik een webadres dat met https:// of http:// begint.')
    .optional(),
  isbn: textSchema.optional(),
  kind: z.enum(SOURCE_KINDS),
  /** Gezaghebbend genoeg om onderdelen mee te verifiëren. */
  authoritative: z.boolean(),
  notes: textSchema.optional(),
})

export const sourcesFileSchema = z.strictObject({
  sources: z.array(sourceSchema),
})

// ---------------------------------------------------------------------------
// Woorden en zinnen (vocabulary.json, sentences.json)

export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
  'numeral',
  'determiner',
  'particle',
  'phrase',
] as const

export const REGISTERS = [
  'formal',
  'neutral',
  'informal',
  'colloquial',
  'literary',
  'polite',
  'honorific',
  'vulgar',
] as const

const itemFields = {
  id: idSchema,
  /** Niveau binnen het kader van het pakket, zoals "A1". */
  level: textSchema.optional(),
  register: z.array(z.enum(REGISTERS)).min(1).optional(),
  /** Landen waar dit gebruikelijk is, als ISO 3166-code, zoals "MX". */
  regions: z
    .array(
      z
        .string()
        .regex(
          /^[A-Z]{2}$/,
          'Gebruik een landcode volgens ISO 3166, zoals "MX".',
        ),
    )
    .min(1)
    .optional(),
  notes: textSchema.optional(),
  origin: originSchema.optional(),
  verification: verificationSchema.optional(),
}

export const wordSchema = z.strictObject({
  ...itemFields,
  text: textSchema,
  translations: z
    .array(textSchema)
    .min(1, 'Geef minstens één Nederlandse vertaling.'),
  partOfSpeech: z.enum(PARTS_OF_SPEECH),
  gender: z.enum(['masculine', 'feminine', 'neuter']).optional(),
  /** Romanisering voor schriften die niet Latijns zijn. */
  transliteration: textSchema.optional(),
  ipa: textSchema.optional(),
  /** Voorbeeldzinnen uit sentences.json. */
  examples: z.array(idSchema).min(1).optional(),
})

export const vocabularyFileSchema = z.strictObject({
  words: z.array(wordSchema),
})

export const sentenceSchema = z.strictObject({
  ...itemFields,
  text: textSchema,
  translation: textSchema,
  transliteration: textSchema.optional(),
  /** Woorden uit vocabulary.json die in de zin staan. */
  words: z.array(idSchema).min(1).optional(),
})

export const sentencesFileSchema = z.strictObject({
  sentences: z.array(sentenceSchema),
})

// ---------------------------------------------------------------------------
// Eenheden, lessen en oefeningen (units/<kenmerk>.json)
//
// De vaardigheden (SKILLS) en soorten fouten (ERROR_TYPES) staan in kinds.ts.

const exerciseFields = {
  id: idSchema,
  skill: z.enum(SKILLS),
  /**
   * to-dutch is herkennen: de opgave staat in de doeltaal en het antwoord is
   * Nederlands. to-target is produceren: andersom.
   */
  direction: z.enum(['to-dutch', 'to-target']),
  /** De opdracht in het Nederlands. */
  instruction: textSchema,
  prompt: textSchema,
  /** Woorden of zinnen die de oefening toetst. */
  items: z.array(idSchema).min(1).optional(),
  verification: verificationSchema.optional(),
}

export const exerciseSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...exerciseFields,
    type: z.literal('multiple-choice'),
    choices: z
      .array(
        z.strictObject({
          text: textSchema,
          correct: z.boolean(),
          feedback: textSchema.optional(),
        }),
      )
      .min(2, 'Geef minstens twee keuzes.'),
  }),
  z.strictObject({
    ...exerciseFields,
    type: z.literal('typed-answer'),
    /** Alle goede antwoorden. */
    answers: z.array(textSchema).min(1, 'Geef minstens één goed antwoord.'),
    /** Bekende foute antwoorden met gerichte uitleg. */
    feedback: z
      .array(
        z.strictObject({
          answer: textSchema,
          errorType: z.enum(ERROR_TYPES),
          message: textSchema,
        }),
      )
      .min(1)
      .optional(),
  }),
])

const lessonBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('explanation'),
    text: textSchema,
    /** Voorbeeldzinnen uit sentences.json. */
    examples: z.array(idSchema).min(1).optional(),
  }),
  z.strictObject({
    type: z.literal('culture'),
    text: textSchema,
  }),
])

export const lessonSchema = z.strictObject({
  id: idSchema,
  title: textSchema,
  /** Can-do-doelen in het Nederlands. */
  goals: z.array(textSchema).min(1, 'Geef minstens één leerdoel.'),
  blocks: z.array(lessonBlockSchema).min(1),
  /** Woorden die deze les aanleert. */
  words: z.array(idSchema).min(1).optional(),
  exercises: z.array(exerciseSchema).min(1).optional(),
  verification: verificationSchema.optional(),
})

export const unitSchema = z.strictObject({
  id: idSchema,
  title: textSchema,
  level: textSchema,
  /** Volgorde binnen het pakket, vanaf 1. */
  order: z.int().min(1),
  goals: z.array(textSchema).min(1, 'Geef minstens één leerdoel.'),
  lessons: z.array(lessonSchema).min(1),
  verification: verificationSchema.optional(),
})

// ---------------------------------------------------------------------------
// Typen voor de rest van de code

export type License = z.infer<typeof licenseSchema>
export type Verification = z.infer<typeof verificationSchema>
export type PackManifest = z.infer<typeof manifestSchema>
export type Source = z.infer<typeof sourceSchema>
export type Word = z.infer<typeof wordSchema>
export type Sentence = z.infer<typeof sentenceSchema>
export type Exercise = z.infer<typeof exerciseSchema>
export type Lesson = z.infer<typeof lessonSchema>
export type Unit = z.infer<typeof unitSchema>
