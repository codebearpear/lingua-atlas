/**
 * Basisgegevens van de zeven talen.
 *
 * Validatiestatus: Concept. Deze gegevens verhuizen in fase 3 naar de
 * taalpakketten, met bronvermelding per onderdeel.
 */
export type LanguageCode = 'en' | 'de' | 'es' | 'ko' | 'hi' | 'fa' | 'my'

/** ISO 15924-code van het schrift. */
export type ScriptCode = 'Latn' | 'Hang' | 'Deva' | 'Arab' | 'Mymr'

export interface Language {
  code: LanguageCode
  /** BCP 47-taalcode met regio, voor het lang-attribuut en voor spraak. */
  locale: string
  dutchName: string
  /** De naam van de taal in de taal zelf. */
  nativeName: string
  /** Een of twee tekens die het schrift laten zien, voor het taalpictogram. */
  glyph: string
  scriptName: string
  scriptCode: ScriptCode
  direction: 'ltr' | 'rtl'
  /** De standaardvariant die de app aanhoudt. */
  variant: string
  /** Het niveau waarop je begint. */
  startLevel: string
  /** Het niveaukader, zonder te beweren dat kaders precies gelijk zijn. */
  framework: string
}

export const LANGUAGES: readonly Language[] = [
  {
    code: 'en',
    locale: 'en-US',
    dutchName: 'Engels',
    nativeName: 'English',
    glyph: 'Aa',
    scriptName: 'Latijns',
    scriptCode: 'Latn',
    direction: 'ltr',
    variant: 'Amerikaans Engels',
    startLevel: 'C1, gecertificeerd (Cambridge)',
    framework: 'ERK, gericht op C2',
  },
  {
    code: 'de',
    locale: 'de-DE',
    dutchName: 'Duits',
    nativeName: 'Deutsch',
    glyph: 'Ää',
    scriptName: 'Latijns',
    scriptCode: 'Latn',
    direction: 'ltr',
    variant: 'Standaardduits (Hochdeutsch)',
    startLevel: 'C1, gecertificeerd (Goethe-Institut)',
    framework: 'ERK, gericht op C2',
  },
  {
    code: 'es',
    locale: 'es-ES',
    dutchName: 'Spaans',
    nativeName: 'Español',
    glyph: 'Ññ',
    scriptName: 'Latijns',
    scriptCode: 'Latn',
    direction: 'ltr',
    variant: 'Standaardspaans (castellano)',
    startLevel: 'Nog niet bepaald',
    framework: 'ERK, A1 tot C2',
  },
  {
    code: 'ko',
    locale: 'ko-KR',
    dutchName: 'Koreaans',
    nativeName: '한국어',
    glyph: '한',
    scriptName: 'Hangul',
    scriptCode: 'Hang',
    direction: 'ltr',
    variant: 'Standaardkoreaans (Seoul)',
    startLevel: 'Nog niet bepaald',
    framework: 'TOPIK 1 tot 6, met ERK-doelen',
  },
  {
    code: 'hi',
    locale: 'hi-IN',
    dutchName: 'Hindi',
    nativeName: 'हिंदी',
    glyph: 'अ',
    scriptName: 'Devanagari',
    scriptCode: 'Deva',
    direction: 'ltr',
    variant: 'Standaardhindi',
    startLevel: 'Nog niet bepaald',
    framework: 'Doelen naar het ERK',
  },
  {
    code: 'fa',
    locale: 'fa-IR',
    dutchName: 'Perzisch',
    nativeName: 'فارسی',
    glyph: 'ف',
    scriptName: 'Perzisch schrift',
    scriptCode: 'Arab',
    direction: 'rtl',
    variant: 'Iraans standaardperzisch',
    startLevel: 'Nog niet bepaald',
    framework: 'Doelen naar het ERK',
  },
  {
    code: 'my',
    locale: 'my-MM',
    dutchName: 'Birmaans',
    nativeName: 'မြန်မာဘာသာ',
    glyph: 'က',
    scriptName: 'Birmaans schrift',
    scriptCode: 'Mymr',
    direction: 'ltr',
    variant: 'Standaardbirmaans',
    startLevel: 'Nog niet bepaald',
    framework: 'Eigen mijlpalen',
  },
]
