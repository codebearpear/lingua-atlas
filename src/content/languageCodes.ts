/** De taalcodes van Lingua Atlas, los van de rest, zodat ook de routes ze kennen. */
export type LanguageCode = 'en' | 'de' | 'es' | 'ko' | 'hi' | 'fa' | 'my'

/** De volgorde waarin de app de talen toont. */
export const LANGUAGE_CODES: readonly LanguageCode[] = [
  'en',
  'de',
  'es',
  'ko',
  'hi',
  'fa',
  'my',
]

export function isLanguageCode(value: string): value is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(value)
}
