import { Dexie, type EntityTable } from 'dexie'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { restoreTables } from './restore'

// Een proefdatabase met een tabel zoals die later komen: elk record heeft een
// sleutel en een tijdstip van de laatste wijziging.
interface Card {
  id: string
  step: number
  updatedAt: number
}

type TestDatabase = Dexie & { cards: EntityTable<Card, 'id'> }

async function databaseWith(cards: Card[]): Promise<TestDatabase> {
  const db = new Dexie('proef', {
    indexedDB: new IDBFactory(),
    IDBKeyRange,
  }) as TestDatabase
  db.version(1).stores({ cards: 'id' })
  await db.cards.bulkAdd(cards)
  return db
}

const ON_DEVICE: Card[] = [
  { id: 'a', step: 1, updatedAt: 100 },
  { id: 'b', step: 5, updatedAt: 500 },
  { id: 'c', step: 3, updatedAt: 300 },
]

const IN_BACKUP: Card[] = [
  { id: 'a', step: 2, updatedAt: 200 }, // nieuwer dan op het apparaat
  { id: 'b', step: 4, updatedAt: 400 }, // ouder dan op het apparaat
  { id: 'c', step: 9, updatedAt: 300 }, // even oud
  { id: 'd', step: 1, updatedAt: 100 }, // alleen in de back-up
]

describe('restoreTables', () => {
  it('voegt samen: nieuwere records winnen, bij gelijk blijft het apparaat', async () => {
    const db = await databaseWith(ON_DEVICE)
    const results = await restoreTables(db, { cards: IN_BACKUP }, 'merge', [
      'cards',
    ])
    expect(results).toEqual({
      cards: { added: 1, updated: 1, kept: 2, removed: 0 },
    })
    expect(await db.cards.orderBy('id').toArray()).toEqual([
      { id: 'a', step: 2, updatedAt: 200 },
      { id: 'b', step: 5, updatedAt: 500 },
      { id: 'c', step: 3, updatedAt: 300 },
      { id: 'd', step: 1, updatedAt: 100 },
    ])
  })

  it('vervangt: daarna staat alleen wat in de back-up staat', async () => {
    const db = await databaseWith(ON_DEVICE)
    const results = await restoreTables(db, { cards: IN_BACKUP }, 'replace', [
      'cards',
    ])
    expect(results).toEqual({
      cards: { added: 4, updated: 0, kept: 0, removed: 3 },
    })
    expect(await db.cards.orderBy('id').toArray()).toEqual(IN_BACKUP)
  })

  it('leegt bij vervangen ook een tabel die in de back-up ontbreekt', async () => {
    const db = await databaseWith(ON_DEVICE)
    await restoreTables(db, {}, 'replace', ['cards'])
    expect(await db.cards.count()).toBe(0)
  })

  it('slaat tabellen over die de app niet kent', async () => {
    const db = await databaseWith([])
    const results = await restoreTables(
      db,
      { cards: [], onbekend: [{ id: 'x' }] },
      'merge',
      ['cards'],
    )
    expect(Object.keys(results)).toEqual(['cards'])
  })

  it('verandert niets als een record ongeldig is', async () => {
    const db = await databaseWith(ON_DEVICE)
    let message = ''
    try {
      await restoreTables(
        db,
        { cards: [...IN_BACKUP, 'geen record'] },
        'replace',
        ['cards'],
      )
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toBe('De back-up bevat een ongeldig record in cards.')
    expect(await db.cards.orderBy('id').toArray()).toEqual(ON_DEVICE)
  })

  it('doet niets zonder tabellen', async () => {
    const db = await databaseWith(ON_DEVICE)
    expect(
      await restoreTables(db, { cards: IN_BACKUP }, 'replace', []),
    ).toEqual({})
    expect(await db.cards.count()).toBe(3)
  })
})
