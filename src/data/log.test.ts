import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { createDatabase, type LogEntry } from './database'
import {
  addLogEntry,
  clearLog,
  describeError,
  formatLog,
  MAX_LOG_ENTRIES,
  readLog,
  type NewLogEntry,
} from './log'

function freshDatabase() {
  return createDatabase('test', { indexedDB: new IDBFactory(), IDBKeyRange })
}

// 28 oktober 2026, 12:00:00 in Nederland
const NOON = Date.UTC(2026, 9, 28, 11, 0, 0)

function entry(overrides: Partial<NewLogEntry> = {}): NewLogEntry {
  return {
    message: 'TypeError: x is undefined',
    detail: 'at render (App.tsx:10:5)',
    page: '#/instellingen',
    version: 'abc1234',
    at: NOON,
    ...overrides,
  }
}

describe('describeError', () => {
  it('geeft de soort fout, de melding en de stacktrace', () => {
    const error = new TypeError('x is undefined')
    error.stack = 'stap 1\nstap 2'
    expect(describeError(error)).toEqual({
      message: 'TypeError: x is undefined',
      detail: 'stap 1\nstap 2',
    })
  })

  it('laat de melding niet twee keer staan als de stacktrace ermee begint', () => {
    const error = new TypeError('x is undefined')
    error.stack = 'TypeError: x is undefined\n    at render (App.tsx:10:5)'
    expect(describeError(error).detail).toBe('    at render (App.tsx:10:5)')
  })

  it('kan ook iets anders dan een fout beschrijven', () => {
    expect(describeError('mislukt')).toEqual({
      message: 'mislukt',
      detail: undefined,
    })
  })
})

describe('addLogEntry en readLog', () => {
  it('bewaart een melding', async () => {
    const db = freshDatabase()
    await addLogEntry(db, entry())
    const [saved] = await readLog(db)
    expect(saved).toEqual({
      id: 1,
      ...entry(),
      lastAt: NOON,
      count: 1,
    })
  })

  it('telt dezelfde fout binnen 10 seconden bij de vorige op', async () => {
    const db = freshDatabase()
    await addLogEntry(db, entry())
    await addLogEntry(db, entry({ at: NOON + 4_000 }))
    await addLogEntry(db, entry({ at: NOON + 9_000 }))
    const log = await readLog(db)
    expect(log).toHaveLength(1)
    expect(log[0]?.count).toBe(3)
    expect(log[0]?.lastAt).toBe(NOON + 9_000)
  })

  it('maakt een nieuwe melding voor een andere fout of na 10 seconden', async () => {
    const db = freshDatabase()
    await addLogEntry(db, entry())
    await addLogEntry(
      db,
      entry({ message: 'Error: iets anders', at: NOON + 1 }),
    )
    await addLogEntry(
      db,
      entry({ message: 'Error: iets anders', at: NOON + 20_000 }),
    )
    const log = await readLog(db)
    expect(log.map((saved) => saved.count)).toEqual([1, 1, 1])
    // De nieuwste staat voorop.
    expect(log.map((saved) => saved.at)).toEqual([
      NOON + 20_000,
      NOON + 1,
      NOON,
    ])
  })

  it(`bewaart alleen de laatste ${MAX_LOG_ENTRIES} meldingen`, async () => {
    const db = freshDatabase()
    for (let index = 0; index < MAX_LOG_ENTRIES + 5; index++) {
      await addLogEntry(db, entry({ message: `Fout ${index}` }))
    }
    const log = await readLog(db)
    expect(log).toHaveLength(MAX_LOG_ENTRIES)
    expect(log[0]?.message).toBe(`Fout ${MAX_LOG_ENTRIES + 4}`)
    expect(log.at(-1)?.message).toBe('Fout 5')
  })

  it('wist alles met clearLog', async () => {
    const db = freshDatabase()
    await addLogEntry(db, entry())
    await clearLog(db)
    expect(await readLog(db)).toEqual([])
  })
})

describe('formatLog', () => {
  it('maakt tekst om aan Claude te geven, de nieuwste melding eerst', () => {
    const entries: LogEntry[] = [
      {
        id: 2,
        message: 'Error: opslaan mislukt',
        detail: undefined,
        page: '#/',
        version: 'abc1234',
        at: NOON + 60_000,
        lastAt: NOON + 65_000,
        count: 2,
      },
      { id: 1, ...entry(), lastAt: NOON, count: 1 },
    ]
    expect(
      formatLog(entries, {
        version: 'abc1234',
        device: 'Proefapparaat',
        now: NOON + 120_000,
        timeZone: 'Europe/Amsterdam',
      }),
    ).toBe(
      [
        'Lingua Atlas, versie abc1234: foutenlogboek met 2 meldingen',
        'Apparaat: Proefapparaat',
        'Gekopieerd: 28-10-2026, 12:02:00',
        '',
        '28-10-2026, 12:01:00 · #/ · versie abc1234',
        'Error: opslaan mislukt',
        '(2 keer, het laatst om 28-10-2026, 12:01:05)',
        '',
        '28-10-2026, 12:00:00 · #/instellingen · versie abc1234',
        'TypeError: x is undefined',
        'at render (App.tsx:10:5)',
      ].join('\n'),
    )
  })
})
