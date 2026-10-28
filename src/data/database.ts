/**
 * De database van Lingua Atlas: IndexedDB op je eigen apparaat, via Dexie.
 *
 * Versies komen er alleen bij; een bestaande versie verandert nooit. Op je
 * apparaat kan nog een database van een oudere versie staan, en Dexie zet die
 * bij het openen stap voor stap om naar de nieuwste.
 */
import { Dexie, type DexieOptions, type EntityTable } from 'dexie'
import type { LanguageCode } from '../content/languageCodes'
import type { Verdict } from '../engine/answers'
import type { CompiledExercise, ErrorType } from '../packs/compiled'

export const DATABASE_NAME = 'lingua-atlas'

/** Een melding in het foutenlogboek. */
export interface LogEntry {
  /** Volgnummer, door de database gegeven. */
  id: number
  /** Eerste keer, in milliseconden sinds 1970. */
  at: number
  /** Laatste keer, als dezelfde fout kort na elkaar terugkwam. */
  lastAt: number
  /** Hoe vaak de fout kort na elkaar kwam. */
  count: number
  message: string
  /** Waar het misging, zoals de stacktrace. */
  detail: string | undefined
  /** De pagina, zoals #/instellingen. */
  page: string
  /** De versie van de app. */
  version: string
}

/** Gegevens over de database zelf, zoals wanneer hij is gemaakt. */
export interface MetaEntry {
  key: string
  value: unknown
}

/**
 * Eén antwoord in een oefenronde. Wat de oefening toetste, staat erbij, zodat
 * het antwoord ook te begrijpen blijft als het taalpakket later verandert.
 */
export interface RoundAnswer {
  exerciseId: string
  type: CompiledExercise['type']
  /** to-dutch is herkennen, to-target produceren. */
  direction: CompiledExercise['direction']
  /** De woorden of zinnen die de oefening toetst, als kenmerken. */
  items: string[]
  /** Wat je typte, of de tekst van je keuze. */
  given: string
  /** Het oordeel van de antwoordcontrole. */
  verdict: Verdict
  /** Wat er anders was, als de antwoordcontrole dat herkende. */
  errorType?: ErrorType
  /** Zelf goedgekeurd: het antwoord telt als goed. */
  overridden: boolean
  /** Wanneer je het antwoord controleerde, in milliseconden sinds 1970. */
  answeredAt: number
}

/** Een oefenronde bij een les, met je antwoorden op volgorde. */
export interface PracticeRound {
  /** Een willekeurig kenmerk, zodat rondes van verschillende apparaten niet botsen. */
  id: string
  language: LanguageCode
  /** Het kenmerk van de les. */
  lesson: string
  /** De versie van het taalpakket tijdens de ronde. */
  packVersion: string
  startedAt: number
  /** Wanneer je de laatste oefening afrondde. Ontbreekt als je stopte. */
  finishedAt?: number
  /** De laatste wijziging; bij samenvoegen met een back-up wint de nieuwste. */
  updatedAt: number
  answers: RoundAnswer[]
}

export type Database = Dexie & {
  log: EntityTable<LogEntry, 'id'>
  meta: EntityTable<MetaEntry, 'key'>
  rounds: EntityTable<PracticeRound, 'id'>
}

/**
 * Maakt de database aan, of opent hem als hij al bestaat. Tests geven een eigen
 * naam en een nagebootste IndexedDB mee.
 */
export function createDatabase(
  name: string = DATABASE_NAME,
  options?: DexieOptions,
): Database {
  const db = new Dexie(name, options) as Database

  // Versie 1 (stap 4.2): het foutenlogboek en gegevens over de database.
  db.version(1).stores({
    log: '++id, at',
    meta: 'key',
  })

  // Versie 2 (stap 6.3): je oefenrondes. Een ronde zonder finishedAt staat
  // niet in de index, dus die vindt alleen afgeronde rondes.
  db.version(2).stores({
    rounds: 'id, [language+lesson+finishedAt]',
  })

  // Alleen bij de allereerste keer, als de database nog niet bestond.
  db.on('populate', (transaction) => {
    void transaction.table('meta').add({ key: 'createdAt', value: Date.now() })
  })

  return db
}
