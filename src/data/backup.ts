/**
 * Het back-upbestand: één JSON-bestand met je gegevens van dit apparaat, een
 * formaatversie en een controlegetal. Het formaat staat beschreven in
 * docs/backup-format.md; houd die twee gelijk.
 *
 * Dit bestand kent geen browser en geen database, zodat het overal te testen
 * is. Het controleren van een bestand staat apart in readBackup.ts, zodat de
 * app die code pas laadt als je een back-up terugzet.
 */
import { THEME_LABELS, type ThemePreference } from '../app/theme'

export const BACKUP_FORMAT = 'lingua-atlas-backup'

/** De versie van het bestandsformaat die deze app maakt en kan lezen. */
export const BACKUP_FORMAT_VERSION = 1

/** Instellingen die buiten de database staan, zoals het thema. */
export interface BackupSettings {
  theme?: ThemePreference
}

export interface Backup {
  format: typeof BACKUP_FORMAT
  formatVersion: number
  /** Tijdstip in UTC, ISO 8601. */
  createdAt: string
  app: { version: string }
  database: { version: number }
  settings: BackupSettings
  /** Per tabel van de database de records. */
  tables: Record<string, unknown[]>
  checksum: { algorithm: 'SHA-256'; value: string }
}

/**
 * JSON met de sleutels van elk object op volgorde, zodat dezelfde gegevens
 * altijd dezelfde tekst geven. Spaties en de volgorde in het bestand doen dan
 * niet mee voor het controlegetal.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner !== null && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(
          Object.entries(inner as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : inner,
  )
}

/** SHA-256 van een tekst (als UTF-8), in kleine hexadecimale tekens. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

/** Het controlegetal: de SHA-256 van het bestand zonder het veld checksum. */
export function checksumOf(content: Omit<Backup, 'checksum'>): Promise<string> {
  return sha256Hex(canonicalJson(content))
}

export interface BackupInput {
  now: Date
  appVersion: string
  databaseVersion: number
  settings: BackupSettings
  tables: Record<string, unknown[]>
}

export async function createBackup(input: BackupInput): Promise<Backup> {
  const content: Omit<Backup, 'checksum'> = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: input.now.toISOString(),
    app: { version: input.appVersion },
    database: { version: input.databaseVersion },
    settings: input.settings,
    tables: input.tables,
  }
  return {
    ...content,
    checksum: { algorithm: 'SHA-256', value: await checksumOf(content) },
  }
}

/** De tekst van het bestand: leesbaar, met inspringing. */
export function serializeBackup(backup: Backup): string {
  return `${JSON.stringify(backup, null, 2)}\n`
}

/** Een bestandsnaam met datum en tijd, zoals lingua-atlas-backup-2026-10-28-1230.json. */
export function backupFileName(now: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((found) => found.type === type)?.value ?? '00'
  return `lingua-atlas-backup-${part('year')}-${part('month')}-${part('day')}-${part('hour')}${part('minute')}.json`
}

export interface BackupDescription {
  /** Wanneer de back-up is gemaakt, in de tijd van het apparaat. */
  made: string
  /** De versie van de app die hem maakte. */
  version: string
  /** Wat erin staat, in gewone taal. */
  contents: string[]
  /** Of er records uit de database in staan; dan valt er te kiezen tussen samenvoegen en vervangen. */
  hasRecords: boolean
}

/** Wat er in een back-up staat, om te tonen voordat je hem terugzet. */
export function describeBackup(
  backup: Backup,
  timeZone?: string,
): BackupDescription {
  const time = new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  })
  const contents: string[] = []
  if (backup.settings.theme !== undefined) {
    contents.push(
      `instellingen (thema ${THEME_LABELS[backup.settings.theme].toLowerCase()})`,
    )
  }
  for (const [name, records] of Object.entries(backup.tables)) {
    if (records.length > 0) {
      contents.push(`${name}: ${records.length}`)
    }
  }
  return {
    made: time.format(Date.parse(backup.createdAt)),
    version: backup.app.version,
    contents,
    hasRecords: Object.values(backup.tables).some(
      (records) => records.length > 0,
    ),
  }
}
