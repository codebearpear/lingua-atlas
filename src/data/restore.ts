/**
 * Een back-up terugzetten in de database, op een van twee manieren:
 *
 * - vervangen: wat in de back-up staat, komt in de plaats van wat er op dit
 *   apparaat staat;
 * - samenvoegen: records uit de back-up komen erbij. Staat een record op beide
 *   plaatsen, dan wint het record met de nieuwste updatedAt; bij gelijk of
 *   onbekend blijft het record op dit apparaat staan.
 *
 * Alles gebeurt in één transactie: lukt een deel niet, dan verandert er niets.
 */
import { Dexie, type IndexableType } from 'dexie'

export type RestoreMode = 'merge' | 'replace'

export interface RestoreResult {
  /** Nieuwe records uit de back-up. */
  added: number
  /** Records die de back-up heeft bijgewerkt, omdat ze daar nieuwer waren. */
  updated: number
  /** Records die op dit apparaat bleven, omdat ze hier nieuwer of gelijk waren. */
  kept: number
  /** Records die bij vervangen zijn verdwenen. */
  removed: number
}

function updatedAt(record: object): number | undefined {
  return 'updatedAt' in record && typeof record.updatedAt === 'number'
    ? record.updatedAt
    : undefined
}

/** Of het record uit de back-up nieuwer is dan dat op dit apparaat. Bij twijfel niet. */
function isNewer(incoming: object, current: object): boolean {
  const backup = updatedAt(incoming)
  const device = updatedAt(current)
  return backup !== undefined && device !== undefined && backup > device
}

function asRecords(name: string, records: readonly unknown[]): object[] {
  return records.map((record) => {
    if (
      record === null ||
      typeof record !== 'object' ||
      Array.isArray(record)
    ) {
      throw new Error(`De back-up bevat een ongeldig record in ${name}.`)
    }
    return record
  })
}

/**
 * Zet de tabellen uit een back-up terug. Alleen de tabellen in names tellen
 * mee; andere tabellen in het bestand worden overgeslagen.
 */
export async function restoreTables(
  db: Dexie,
  tables: Record<string, readonly unknown[]>,
  mode: RestoreMode,
  names: readonly string[],
): Promise<Record<string, RestoreResult>> {
  const results: Record<string, RestoreResult> = {}
  if (names.length === 0) {
    return results
  }
  await db.transaction(
    'rw',
    names.map((name) => db.table(name)),
    async () => {
      for (const name of names) {
        const table = db.table(name)
        const incoming = asRecords(name, tables[name] ?? [])

        if (mode === 'replace') {
          const removed = await table.count()
          await table.clear()
          await table.bulkPut(incoming)
          results[name] = {
            added: incoming.length,
            updated: 0,
            kept: 0,
            removed,
          }
          continue
        }

        const keyPath = table.schema.primKey.keyPath
        if (keyPath === undefined) {
          throw new Error(
            `De tabel ${name} heeft geen sleutel in de records en kan niet in een back-up.`,
          )
        }
        const keys = incoming.map(
          (record) => Dexie.getByKeyPath(record, keyPath) as IndexableType,
        )
        const existing = (await table.bulkGet(keys)) as (object | undefined)[]
        const write: object[] = []
        const result: RestoreResult = {
          added: 0,
          updated: 0,
          kept: 0,
          removed: 0,
        }
        incoming.forEach((record, index) => {
          const current = existing[index]
          if (current === undefined) {
            result.added++
            write.push(record)
          } else if (isNewer(record, current)) {
            result.updated++
            write.push(record)
          } else {
            result.kept++
          }
        })
        await table.bulkPut(write)
        results[name] = result
      }
    },
  )
  return results
}
