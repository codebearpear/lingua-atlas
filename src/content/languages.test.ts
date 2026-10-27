import { describe, expect, it } from 'vitest'
import { LANGUAGE_CODES, LANGUAGES, type LanguageCode } from './languages'

describe('LANGUAGES', () => {
  it('bevat de zeven talen van Lingua Atlas, elk één keer en in vaste volgorde', () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual([
      'en',
      'de',
      'es',
      'ko',
      'hi',
      'fa',
      'my',
    ])
  })

  it('heeft voor elke taal precies één taalpakket, en geen pakket zonder taal', () => {
    const packs = Object.keys(import.meta.glob('/content/packs/*/pack.json'))
      .map((path) => path.split('/')[3])
      .sort()
    expect(packs).toEqual([...LANGUAGE_CODES].sort())
  })

  it('schrijft alleen Perzisch van rechts naar links', () => {
    const rightToLeft = LANGUAGES.filter(
      (language) => language.direction === 'rtl',
    ).map((language) => language.code)
    expect(rightToLeft).toEqual(['fa'])
  })

  it('slaat alle eigen namen op in Unicode-normaalvorm NFC', () => {
    for (const language of LANGUAGES) {
      expect(language.nativeName).toBe(language.nativeName.normalize('NFC'))
    }
  })

  it('heeft voor elke taal een teken voor het pictogram, ook in NFC', () => {
    for (const language of LANGUAGES) {
      expect(language.glyph.length).toBeGreaterThan(0)
      expect(language.glyph).toBe(language.glyph.normalize('NFC'))
    }
  })

  it('heeft de eigen namen tot op het teken goed', () => {
    // Per teken uitgeschreven als code, zodat ook onzichtbare verschillen opvallen.
    const expected: Record<LanguageCode, string> = {
      en: 'English',
      de: 'Deutsch',
      es: 'Espa\u00f1ol',
      // Koreaans: han-guk-eo
      ko: '\ud55c\uad6d\uc5b4',
      // Hindi: met anusvara (U+0902), zoals in de standaardspelling
      hi: '\u0939\u093f\u0902\u0926\u0940',
      // Perzisch: met de Perzische ye (U+06CC), niet de Arabische (U+064A)
      fa: '\u0641\u0627\u0631\u0633\u06cc',
      // Birmaans: medial ra (U+103C) direct na de medeklinker
      my: '\u1019\u103c\u1014\u103a\u1019\u102c\u1018\u102c\u101e\u102c',
    }
    for (const language of LANGUAGES) {
      expect(language.nativeName).toBe(expected[language.code])
    }
  })
})
