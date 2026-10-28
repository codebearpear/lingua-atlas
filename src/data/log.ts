/**
 * Het foutenlogboek: gaat er iets mis in de app, dan komt de melding hier.
 * Je kunt het logboek kopiëren en aan Claude geven. Het blijft op je apparaat.
 */
import type { Database, LogEntry } from './database'

/** Het logboek bewaart de laatste 200 meldingen. */
export const MAX_LOG_ENTRIES = 200

/** Dezelfde fout binnen 10 seconden telt mee bij de vorige melding. */
const REPEAT_WINDOW_MS = 10_000

export interface NewLogEntry {
  message: string
  detail: string | undefined
  page: string
  version: string
  /** Tijdstip in milliseconden sinds 1970. */
  at: number
}

/** De melding en de details van een fout, wat er ook is gegooid. */
export function describeError(error: unknown): {
  message: string
  detail: string | undefined
} {
  if (!(error instanceof Error)) {
    return { message: String(error), detail: undefined }
  }
  const message = `${error.name}: ${error.message}`
  // Chrome en Edge beginnen de stacktrace met dezelfde melding; die staat er al.
  const stack = error.stack?.startsWith(`${message}\n`)
    ? error.stack.slice(message.length + 1)
    : error.stack
  return { message, detail: stack === '' ? undefined : stack }
}

export async function addLogEntry(
  db: Database,
  entry: NewLogEntry,
): Promise<void> {
  await db.transaction('rw', db.log, async () => {
    const last = await db.log.orderBy('id').last()
    if (
      last?.message === entry.message &&
      last.detail === entry.detail &&
      entry.at - last.lastAt < REPEAT_WINDOW_MS
    ) {
      await db.log.update(last.id, {
        lastAt: entry.at,
        count: last.count + 1,
      })
      return
    }
    await db.log.add({ ...entry, lastAt: entry.at, count: 1 })
    const total = await db.log.count()
    if (total > MAX_LOG_ENTRIES) {
      const oldest = await db.log
        .orderBy('id')
        .limit(total - MAX_LOG_ENTRIES)
        .primaryKeys()
      await db.log.bulkDelete(oldest)
    }
  })
}

/** Alle meldingen, de nieuwste eerst. */
export function readLog(db: Database): Promise<LogEntry[]> {
  return db.log.orderBy('id').reverse().toArray()
}

export function clearLog(db: Database): Promise<void> {
  return db.log.clear()
}

export interface LogContext {
  version: string
  /** Beschrijving van het apparaat, zoals navigator.userAgent. */
  device: string
  /** Tijdstip van kopiëren. */
  now: number
  /** Tijdzone voor de tijden; zonder is het die van het apparaat. */
  timeZone?: string
}

/** Het logboek als tekst om te kopiëren, de nieuwste melding eerst. */
export function formatLog(
  entries: readonly LogEntry[],
  context: LogContext,
): string {
  const time = new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: context.timeZone,
  })
  const amount =
    entries.length === 1 ? '1 melding' : `${entries.length} meldingen`
  const header = [
    `Lingua Atlas, versie ${context.version}: foutenlogboek met ${amount}`,
    `Apparaat: ${context.device}`,
    `Gekopieerd: ${time.format(context.now)}`,
  ].join('\n')
  const blocks = entries.map((entry) =>
    [
      `${time.format(entry.at)} · ${entry.page} · versie ${entry.version}`,
      entry.message,
      ...(entry.count > 1
        ? [`(${entry.count} keer, het laatst om ${time.format(entry.lastAt)})`]
        : []),
      ...(entry.detail === undefined ? [] : [entry.detail]),
    ].join('\n'),
  )
  return [header, ...blocks].join('\n\n')
}
