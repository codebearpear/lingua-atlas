import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { serializeBackup } from './backup'
import { collectBackup, lastBackupAt, markBackupMade } from './backupStore'
import { createDatabase } from './database'
import { addLogEntry } from './log'
import { readBackup } from './readBackup'

function freshDatabase() {
  return createDatabase('test', { indexedDB: new IDBFactory(), IDBKeyRange })
}

const NOW = new Date(Date.UTC(2026, 9, 28, 11, 30, 0))

describe('collectBackup', () => {
  it('maakt een back-up met de instellingen en de databaseversie', async () => {
    const db = freshDatabase()
    const backup = await collectBackup(db, {
      now: NOW,
      appVersion: 'f9208d5',
      settings: { theme: 'light' },
    })
    expect(backup.database).toEqual({ version: 1 })
    expect(backup.settings).toEqual({ theme: 'light' })
    expect(
      (await readBackup(serializeBackup(backup), { databaseVersion: 1 })).ok,
    ).toBe(true)
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
    expect(backup.tables).toEqual({})
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
