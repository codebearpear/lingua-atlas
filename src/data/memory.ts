/**
 * De herhaalkaarten uit je bewaarde oefenrondes (zie src/engine/memory.ts).
 */
import { buildMemory, type MemoryCard } from '../engine/memory'
import type { Database } from './database'

/** Alle kaarten, berekend uit alle oefenrondes op dit apparaat. */
export async function loadMemory(
  db: Database,
): Promise<Map<string, MemoryCard>> {
  return buildMemory(await db.rounds.toArray())
}
