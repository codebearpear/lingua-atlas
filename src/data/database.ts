/**
 * De database van Lingua Atlas: IndexedDB op je eigen apparaat, via Dexie.
 *
 * Versies komen er alleen bij; een bestaande versie verandert nooit. Op je
 * apparaat kan nog een database van een oudere versie staan, en Dexie zet die
 * bij het openen stap voor stap om naar de nieuwste.
 */
import { Dexie, type DexieOptions, type EntityTable } from 'dexie'

export const DATABASE_NAME = 'lingua-atlas'

/** Een melding in het foutenlogboek. */
export interface LogEntry {
  /** Volgnummer, door de database gegeven. */
  id: number
  /** Eerste keer, in milliseconden sinds 1970. */
  at: number
  /** Laatste keer, als dezelfde fout kort na elkaar terugkwam. */
  lastAt: number
  /** Hoe vaak de fout kort na elkaar kwam. */
  count: number
  message: string
  /** Waar het misging, zoals de stacktrace. */
  detail: string | undefined
  /** De pagina, zoals #/instellingen. */
  page: string
  /** De versie van de app. */
  version: string
}

/** Gegevens over de database zelf, zoals wanneer hij is gemaakt. */
export interface MetaEntry {
  key: string
  value: unknown
}

export type Database = Dexie & {
  log: EntityTable<LogEntry, 'id'>
  meta: EntityTable<MetaEntry, 'key'>
}

/**
 * Maakt de database aan, of opent hem als hij al bestaat. Tests geven een eigen
 * naam en een nagebootste IndexedDB mee.
 */
export function createDatabase(
  name: string = DATABASE_NAME,
  options?: DexieOptions,
): Database {
  const db = new Dexie(name, options) as Database

  // Versie 1 (stap 4.2): het foutenlogboek en gegevens over de database.
  db.version(1).stores({
    log: '++id, at',
    meta: 'key',
  })

  // Alleen bij de allereerste keer, als de database nog niet bestond.
  db.on('populate', (transaction) => {
    void transaction.table('meta').add({ key: 'createdAt', value: Date.now() })
  })

  return db
}
