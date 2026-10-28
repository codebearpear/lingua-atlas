/**
 * Een taalpakket zoals de app het krijgt: gecontroleerd tijdens het bouwen,
 * met de status van elk onderdeel erbij (scripts/packs.ts maakt het met
 * compile.ts). De app laadt het pas als je een taal opent.
 *
 * Nederlandse tekst, zoals uitleg en doelen, komt als InlineText: de doeltaal
 * en foute vormen staan erin gemarkeerd (zie inline.ts).
 *
 * Dit bestand bevat alleen typen, zodat de app er niets extra's door laadt.
 */
import type { InlineText } from './inline.ts'
import type { Word } from './schema.ts'
import type { EffectiveStatus } from './summary.ts'

export type { InlinePart, InlineText } from './inline.ts'

export type PartOfSpeech = Word['partOfSpeech']
export type Gender = NonNullable<Word['gender']>
export type Register = NonNullable<Word['register']>[number]

export interface CompiledWord {
  id: string
  text: string
  translations: string[]
  partOfSpeech: PartOfSpeech
  gender?: Gender
  transliteration?: string
  ipa?: string
  register?: Register[]
  regions?: string[]
  notes?: InlineText
  status: EffectiveStatus
}

export interface CompiledSentence {
  id: string
  text: string
  translation: string
  transliteration?: string
  register?: Register[]
  regions?: string[]
  notes?: InlineText
  status: EffectiveStatus
}

export type CompiledBlock =
  | {
      type: 'explanation'
      text: InlineText
      /** Voorbeeldzinnen, als kenmerken uit sentences. */
      examples: string[]
    }
  | { type: 'culture'; text: InlineText }

export interface CompiledLesson {
  id: string
  title: string
  goals: InlineText[]
  blocks: CompiledBlock[]
  /** Woorden die de les aanleert, als kenmerken uit words. */
  words: string[]
  exerciseCount: number
  /**
   * De laagste status van de les en alles wat ze toont: woorden,
   * voorbeeldzinnen en oefeningen.
   */
  status: EffectiveStatus
}

export interface CompiledUnit {
  id: string
  title: string
  level: string
  order: number
  goals: InlineText[]
  lessons: CompiledLesson[]
  /** De laagste status van de eenheid en haar lessen. */
  status: EffectiveStatus
}

export interface CompiledPack {
  id: string
  /** Op volgorde. */
  units: CompiledUnit[]
  words: Record<string, CompiledWord>
  sentences: Record<string, CompiledSentence>
}
