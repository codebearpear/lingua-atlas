/**
 * De zeven talen van Lingua Atlas.
 *
 * De gegevens over elke taal komen uit het manifest van het taalpakket
 * (content/packs/<taal>/pack.json), met bronnen en validatiestatus per
 * onderdeel; npm run pakketten controleert ze vóór elke publicatie. Hier staat
 * alleen wat bij jou hoort: je beginniveau per taal.
 */
import type { PackManifest } from '../packs/schema'
import { LANGUAGE_CODES, type LanguageCode } from './languageCodes'

export { isLanguageCode, LANGUAGE_CODES } from './languageCodes'
export type { LanguageCode } from './languageCodes'

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
  /** Schriftcode volgens ISO 15924. */
  scriptCode: string
  direction: 'ltr' | 'rtl'
  /** De standaardvariant die de app aanhoudt. */
  variant: string
  /** Het niveau waarop je begint. */
  startLevel: string
  /** Het niveaukader, zonder te beweren dat kaders precies gelijk zijn. */
  framework: string
}

/**
 * Jouw beginniveau per taal. Dit verhuist naar je eigen gegevens op het
 * apparaat zodra je het zelf kunt bepalen, met de diagnosetoets uit fase 8.
 */
const START_LEVELS: Record<LanguageCode, string> = {
  en: 'C1, gecertificeerd (Cambridge)',
  de: 'C1, gecertificeerd (Goethe-Institut)',
  es: 'Nog niet bepaald',
  ko: 'Nog niet bepaald',
  hi: 'Nog niet bepaald',
  fa: 'Nog niet bepaald',
  my: 'Nog niet bepaald',
}

/** De manifesten, ingelezen tijdens het bouwen. */
const manifests = import.meta.glob<PackManifest>('/content/packs/*/pack.json', {
  eager: true,
  import: 'default',
})

function manifestFor(code: LanguageCode): PackManifest {
  const manifest = manifests[`/content/packs/${code}/pack.json`]
  if (manifest === undefined) {
    throw new Error(`Het taalpakket content/packs/${code} ontbreekt.`)
  }
  return manifest
}

export const LANGUAGES: readonly Language[] = LANGUAGE_CODES.map((code) => {
  const { language, names, display, variant, levels } = manifestFor(code)
  return {
    code,
    locale: language.locale,
    dutchName: names.dutch,
    nativeName: names.native,
    glyph: display.glyph,
    scriptName: display.scriptName,
    scriptCode: language.script,
    direction: language.direction,
    variant,
    startLevel: START_LEVELS[code],
    framework: levels.description,
  }
})

export function languageInfo(code: LanguageCode): Language {
  const language = LANGUAGES.find((candidate) => candidate.code === code)
  if (language === undefined) {
    throw new Error(`De taal ${code} ontbreekt.`)
  }
  return language
}
