/**
 * Een back-upbestand lezen en controleren. Staat apart van backup.ts, zodat de
 * app deze code (en Zod) pas laadt als je een back-up terugzet.
 */
import { z } from 'zod'
import { THEME_PREFERENCES } from '../app/theme'
import { LANGUAGE_CODES } from '../content/languageCodes'
import { ERROR_TYPES } from '../packs/kinds'
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  checksumOf,
  type Backup,
} from './backup'
import type { PracticeRound } from './database'

const backupSchema = z.strictObject({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.int().positive(),
  createdAt: z.iso.datetime(),
  app: z.strictObject({ version: z.string() }),
  database: z.strictObject({ version: z.int().positive() }),
  settings: z.strictObject({ theme: z.enum(THEME_PREFERENCES).optional() }),
  tables: z.record(z.string(), z.array(z.unknown())),
  checksum: z.strictObject({
    algorithm: z.literal('SHA-256'),
    value: z.string().regex(/^[0-9a-f]{64}$/),
  }),
}) satisfies z.ZodType<Backup>

/** Alleen de versies; een nieuwer formaat kan velden hebben die wij niet kennen. */
const versionsSchema = z.looseObject({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.int().positive(),
  database: z.looseObject({ version: z.int().positive() }),
})

/**
 * Records van de tabellen in BACKUP_TABLES (backupStore.ts). Een record mag
 * velden hebben die deze versie niet kent; die blijven bewaard.
 */
const roundSchema = z.looseObject({
  id: z.string().min(1),
  language: z.enum(LANGUAGE_CODES),
  lesson: z.string(),
  packVersion: z.string(),
  startedAt: z.number(),
  finishedAt: z.number().optional(),
  updatedAt: z.number(),
  answers: z.array(
    z.looseObject({
      exerciseId: z.string(),
      type: z.enum(['multiple-choice', 'typed-answer']),
      direction: z.enum(['to-dutch', 'to-target']),
      items: z.array(z.string()),
      given: z.string(),
      verdict: z.enum(['correct', 'almost', 'wrong']),
      errorType: z.enum(ERROR_TYPES).optional(),
      overridden: z.boolean(),
      answeredAt: z.number(),
    }),
  ),
}) satisfies z.ZodType<PracticeRound>

const RECORD_SCHEMAS: ReadonlyMap<string, z.ZodType> = new Map<
  string,
  z.ZodType
>([['rounds', roundSchema]])

export type BackupProblem =
  'json' | 'format' | 'version' | 'checksum' | 'records'

export type BackupReading =
  | { ok: true; backup: Backup }
  | { ok: false; problem: BackupProblem; message: string }

const MESSAGES: Record<BackupProblem, string> = {
  json: 'Dit bestand is geen back-up van Lingua Atlas: het is geen geldige JSON. Misschien is het niet helemaal opgeslagen.',
  format:
    'Dit bestand is geen back-up van Lingua Atlas, of er ontbreken onderdelen.',
  version:
    'Deze back-up komt uit een nieuwere versie van Lingua Atlas. Werk de app eerst bij en probeer het dan opnieuw.',
  checksum:
    'Het controlegetal klopt niet: het bestand is beschadigd of aangepast. Gebruik een andere back-up.',
  records:
    'In deze back-up staan gegevens die niet kloppen, dus de app zet hem niet terug. Gebruik een andere back-up.',
}

function problem(kind: BackupProblem): BackupReading {
  return { ok: false, problem: kind, message: MESSAGES[kind] }
}

/**
 * Leest en controleert een back-upbestand: geldige JSON, het juiste formaat,
 * versies die deze app kent, een kloppend controlegetal en records die de app
 * kan gebruiken.
 */
export async function readBackup(
  text: string,
  options: { databaseVersion: number },
): Promise<BackupReading> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return problem('json')
  }
  const versions = versionsSchema.safeParse(data)
  if (!versions.success) {
    return problem('format')
  }
  if (
    versions.data.formatVersion > BACKUP_FORMAT_VERSION ||
    versions.data.database.version > options.databaseVersion
  ) {
    return problem('version')
  }
  const parsed = backupSchema.safeParse(data)
  if (!parsed.success) {
    return problem('format')
  }
  const { checksum, ...content } = parsed.data
  if ((await checksumOf(content)) !== checksum.value) {
    return problem('checksum')
  }
  for (const [name, records] of Object.entries(parsed.data.tables)) {
    const schema = RECORD_SCHEMAS.get(name)
    if (
      schema !== undefined &&
      !records.every((record) => schema.safeParse(record).success)
    ) {
      return problem('records')
    }
  }
  return { ok: true, backup: parsed.data }
}
