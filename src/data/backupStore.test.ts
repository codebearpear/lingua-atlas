import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { serializeBackup } from './backup'
import { collectBackup, lastBackupAt, markBackupMade } from './backupStore'
import { createDatabase, type PracticeRound } from './database'
import { addLogEntry } from './log'
import { readBackup } from './readBackup'
import { saveRound } from './rounds'

function freshDatabase() {
  return createDatabase('test', { indexedDB: new IDBFactory(), IDBKeyRange })
}

const NOW = new Date(Date.UTC(2026, 9, 28, 11, 30, 0))

const ROUND: PracticeRound = {
  id: '6f1c2a0e-3b5d-4e8f-9a7b-1c2d3e4f5a6b',
  language: 'es',
  lesson: 'a1-begroeten-hallo',
  packVersion: '0.3.1',
  startedAt: 1000,
  finishedAt: 3100,
  updatedAt: 3100,
  answers: [
    {
      exerciseId: 'oef-typen',
      type: 'typed-answer',
      direction: 'to-target',
      items: ['adios'],
      given: 'adios',
      verdict: 'almost',
      errorType: 'diacritics',
      overridden: false,
      answeredAt: 3000,
    },
  ],
}

describe('collectBackup', () => {
  it('maakt een back-up met de instellingen en de databaseversie', async () => {
    const db = freshDatabase()
    const backup = await collectBackup(db, {
      now: NOW,
      appVersion: 'f9208d5',
      settings: { theme: 'light' },
    })
    expect(backup.database).toEqual({ version: 2 })
    expect(backup.settings).toEqual({ theme: 'light' })
    expect(backup.tables).toEqual({ rounds: [] })
    expect(
      (await readBackup(serializeBackup(backup), { databaseVersion: 2 })).ok,
    ).toBe(true)
  })

  it('neemt je oefenrondes mee, zoals ze in de database staan', async () => {
    const db = freshDatabase()
    await saveRound(db, ROUND)
    const backup = await collectBackup(db, {
      now: NOW,
      appVersion: 'f9208d5',
      settings: {},
    })
    expect(backup.tables).toEqual({ rounds: [ROUND] })
    expect(
      await readBackup(serializeBackup(backup), { databaseVersion: 2 }),
    ).toEqual({ ok: true, backup })
  })

  it('laat het foutenlogboek en de gegevens over de database thuis', async () => {
    const db = freshDatabase()
    await addLogEntry(db, {
      message: 'Error: proef',
      detail: undefined,
      page: '#/',
      version: 'f9208d5',
      at: NOW.getTime(),
    })
    const backup = await collectBackup(db, {
      now: NOW,
      appVersion: 'f9208d5',
      settings: {},
    })
    expect(backup.tables).toEqual({ rounds: [] })
  })
})

describe('markBackupMade en lastBackupAt', () => {
  it('onthoudt wanneer de laatste back-up is gemaakt', async () => {
    const db = freshDatabase()
    expect(await lastBackupAt(db)).toBeUndefined()
    await markBackupMade(db, NOW.getTime())
    expect(await lastBackupAt(db)).toBe(NOW.getTime())
  })
})
