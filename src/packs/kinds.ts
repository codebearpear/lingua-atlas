/**
 * Vaste lijsten die het pakketformaat (schema.ts) en de app allebei gebruiken.
 * Ze staan apart, zodat de app ze kan gebruiken zonder het hele schema te
 * laden; de app controleert er bijvoorbeeld een back-up mee.
 */

/** Wat een oefening toetst. */
export const SKILLS = [
  'vocabulary',
  'grammar',
  'reading',
  'listening',
  'writing',
  'speaking',
] as const

/**
 * Soorten fouten, voor gerichte uitleg bij bekende foute antwoorden. Hoe zwaar
 * elke soort weegt, staat in src/engine/answers.ts.
 */
export const ERROR_TYPES = [
  'spelling',
  'diacritics',
  'gender',
  'conjugation',
  'case',
  'particle',
  'ezafe',
  'vowel-sign',
  'word-order',
  'word-choice',
  'register',
  'script',
  'spacing',
  'punctuation',
] as const
