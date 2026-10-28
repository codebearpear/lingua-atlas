import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { createDatabase } from './database'

// Elke test krijgt een eigen, nagebootste IndexedDB.
function freshFactory() {
  return { indexedDB: new IDBFactory(), IDBKeyRange }
}

describe('createDatabase', () => {
  it('maakt versie 1 met het foutenlogboek en de gegevens over de database', async () => {
    const db = createDatabase('test', freshFactory())
    await db.open()
    expect(db.verno).toBe(1)
    expect(db.tables.map((table) => table.name).sort()).toEqual(['log', 'meta'])
    expect(db.log.schema.primKey.auto).toBe(true)
    expect(db.log.schema.indexes.map((index) => index.name)).toEqual(['at'])
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
})
