import { Dexie } from 'dexie'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { createDatabase } from './database'

// Elke test krijgt een eigen, nagebootste IndexedDB.
function freshFactory() {
  return { indexedDB: new IDBFactory(), IDBKeyRange }
}

describe('createDatabase', () => {
  it('maakt versie 2 met het foutenlogboek, de gegevens over de database en de oefenrondes', async () => {
    const db = createDatabase('test', freshFactory())
    await db.open()
    expect(db.verno).toBe(2)
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      'log',
      'meta',
      'rounds',
    ])
    expect(db.log.schema.primKey.auto).toBe(true)
    expect(db.log.schema.indexes.map((index) => index.name)).toEqual(['at'])
    expect(db.rounds.schema.primKey.keyPath).toBe('id')
    expect(db.rounds.schema.indexes.map((index) => index.name)).toEqual([
      '[language+lesson+finishedAt]',
    ])
  })

  it('legt bij het aanmaken vast wanneer dat was', async () => {
    const before = Date.now()
    const db = createDatabase('test', freshFactory())
    const created = await db.meta.get('createdAt')
    expect(typeof created?.value).toBe('number')
    expect(Number(created?.value) >= before).toBe(true)
  })

  it('houdt de gegevens bij opnieuw openen', async () => {
    const factory = freshFactory()
    const first = createDatabase('test', factory)
    await first.meta.put({ key: 'proef', value: 42 })
    const created = await first.meta.get('createdAt')
    first.close()

    const second = createDatabase('test', factory)
    expect(await second.meta.get('proef')).toEqual({ key: 'proef', value: 42 })
    // Bij opnieuw openen wordt de database niet opnieuw aangemaakt.
    expect(await second.meta.get('createdAt')).toEqual(created)
  })

  it('zet een database van versie 1 om zonder iets te verliezen', async () => {
    const factory = freshFactory()
    // Zoals de app hem tot stap 6.3 maakte.
    const old = new Dexie('test', factory)
    old.version(1).stores({ log: '++id, at', meta: 'key' })
    await old.table('meta').put({ key: 'createdAt', value: 1000 })
    await old.table('log').add({ at: 2000, message: 'Error: proef' })
    old.close()

    const db = createDatabase('test', factory)
    await db.open()
    expect(db.verno).toBe(2)
    expect(await db.meta.get('createdAt')).toEqual({
      key: 'createdAt',
      value: 1000,
    })
    expect(await db.log.count()).toBe(1)
    expect(await db.rounds.count()).toBe(0)
  })
})
