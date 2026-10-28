/**
 * Typen in de doeltaal. Tekens die op een Nederlands toetsenbord lastig zijn,
 * staan als knoppen onder het invoerveld. Talen met een eigen schrift typ je
 * met hun eigen toetsenbord, dat je in de instellingen van je iPad of
 * computer toevoegt.
 */
import type { LanguageCode } from './languageCodes'

export const SPECIAL_CHARACTERS: Partial<
  Record<LanguageCode, readonly string[]>
> = {
  es: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
  // Hoofdletters ook, want in het Duits tellen ze mee (Übung, Ärger).
  de: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
}

/** Het toetsenbord voor een taal met een eigen schrift. */
export const KEYBOARDS: Partial<Record<LanguageCode, string>> = {
  ko: 'het Koreaanse toetsenbord',
  hi: 'het Hindi-toetsenbord',
  fa: 'het Perzische toetsenbord',
  my: 'het Birmaanse toetsenbord',
}
