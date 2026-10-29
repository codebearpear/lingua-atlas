/**
 * Back-ups en de database: verzamelen wat in een back-up gaat, en bijhouden
 * wanneer de laatste back-up is gemaakt.
 */
import { createBackup, type Backup, type BackupSettings } from './backup'
import type { Database } from './database'

/**
 * De tabellen die in een back-up gaan: je oefenrondes. Het foutenlogboek en de
 * gegevens over de database horen bij het apparaat en gaan niet mee. Komt er
 * een tabel met jouw gegevens bij, dan komt hij ook hier, en in readBackup.ts
 * een controle van de records. Herhaalkaarten zijn geen tabel: de app
 * berekent ze uit de oefenrondes (src/engine/memory.ts).
 */
export const BACKUP_TABLES: readonly string[] = ['rounds']

export async function collectBackup(
  db: Database,
  input: { now: Date; appVersion: string; settings: BackupSettings },
): Promise<Backup> {
  await db.open()
  const tables: Record<string, unknown[]> = {}
  for (const name of BACKUP_TABLES) {
    tables[name] = (await db.table(name).toArray()) as unknown[]
  }
  return createBackup({
    ...input,
    databaseVersion: db.verno,
    tables,
  })
}

const LAST_BACKUP = 'lastBackupAt'

export async function markBackupMade(db: Database, at: number): Promise<void> {
  await db.meta.put({ key: LAST_BACKUP, value: at })
}

/** Wanneer de laatste back-up is gemaakt, of undefined als dat nog nooit was. */
export async function lastBackupAt(db: Database): Promise<number | undefined> {
  const entry = await db.meta.get(LAST_BACKUP)
  return typeof entry?.value === 'number' ? entry.value : undefined
}
