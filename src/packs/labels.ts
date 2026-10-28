/**
 * Nederlandse namen voor de kenmerken van woorden en zinnen, zoals de app ze
 * toont. De pakketten gebruiken Engelse codes (zie schema.ts).
 *
 * Dit bestand heeft geen bouwstenen nodig, zodat de app het kan gebruiken.
 */
import type { Gender, PartOfSpeech, Register } from './compiled.ts'

export const PART_OF_SPEECH_LABELS: Record<PartOfSpeech, string> = {
  noun: 'zelfstandig naamwoord',
  verb: 'werkwoord',
  adjective: 'bijvoeglijk naamwoord',
  adverb: 'bijwoord',
  pronoun: 'voornaamwoord',
  preposition: 'voorzetsel',
  conjunction: 'voegwoord',
  interjection: 'tussenwerpsel',
  numeral: 'telwoord',
  determiner: 'determinator',
  particle: 'partikel',
  phrase: 'uitdrukking',
}

export const GENDER_LABELS: Record<Gender, string> = {
  masculine: 'mannelijk',
  feminine: 'vrouwelijk',
  neuter: 'onzijdig',
}

export const REGISTER_LABELS: Record<Register, string> = {
  formal: 'formeel',
  neutral: 'neutraal',
  informal: 'informeel',
  colloquial: 'spreektaal',
  literary: 'literair',
  polite: 'beleefd',
  honorific: 'eerbiedig',
  vulgar: 'vulgair',
}
