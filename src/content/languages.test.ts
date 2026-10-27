import { describe, expect, it } from 'vitest'
import { LANGUAGES, type LanguageCode } from './languages'

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

  it('heeft de eigen namen tot op het teken goed', () => {
    // Per teken uitgeschreven, zodat ook onzichtbare verschillen opvallen.
    const expected: Record<LanguageCode, string> = {
      en: 'English',
      de: 'Deutsch',
      es: 'Español',
      // 한국어
      ko: '한국어',
      // हिंदी: met anusvara (U+0902), zoals in de standaardspelling
      hi: 'हिंदी',
      // فارسی: met de Perzische ye (U+06CC), niet de Arabische (U+064A)
      fa: 'فارسی',
      // မြန်မာဘာသာ: medial ra (U+103C) direct na de medeklinker
      my: 'မြန်မာဘာသာ',
    }
    for (const language of LANGUAGES) {
      expect(language.nativeName).toBe(expected[language.code])
    }
  })
})
