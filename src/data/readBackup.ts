/**
 * Een back-upbestand lezen en controleren. Staat apart van backup.ts, zodat de
 * app deze code (en Zod) pas laadt als je een back-up terugzet.
 */
import { z } from 'zod'
import { THEME_PREFERENCES } from '../app/theme'
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  checksumOf,
  type Backup,
} from './backup'

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

export type BackupProblem = 'json' | 'format' | 'version' | 'checksum'

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
}

function problem(kind: BackupProblem): BackupReading {
  return { ok: false, problem: kind, message: MESSAGES[kind] }
}

/**
 * Leest en controleert een back-upbestand: geldige JSON, het juiste formaat,
 * versies die deze app kent en een kloppend controlegetal.
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
  return { ok: true, backup: parsed.data }
}
