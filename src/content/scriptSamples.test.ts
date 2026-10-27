import { describe, expect, it } from 'vitest'
import { SCRIPT_TESTS } from './scriptSamples'

// De verwachte teksten staan hier als codes, zodat elk teken zichtbaar is,
// ook onzichtbare tekens zoals de halve spatie.

const allTexts = SCRIPT_TESTS.flatMap((test) =>
  test.samples.map((sample) => sample.text),
)

function textsOf(id: string): string {
  return (
    SCRIPT_TESTS.find((test) => test.id === id)
      ?.samples.map((sample) => sample.text)
      .join(' ') ?? ''
  )
}

describe('SCRIPT_TESTS', () => {
  it('heeft voor elk schrift voorbeelden en controlepunten', () => {
    expect(SCRIPT_TESTS.map((test) => test.id)).toEqual([
      'latin',
      'hangul',
      'devanagari',
      'persian',
      'myanmar',
    ])
    for (const test of SCRIPT_TESTS) {
      expect(test.samples.length).toBeGreaterThan(0)
      expect(test.checks.length).toBeGreaterThan(0)
    }
  })

  it('slaat alle voorbeelden op in Unicode-normaalvorm NFC', () => {
    for (const text of allTexts) {
      expect(text).toBe(text.normalize('NFC'))
    }
  })

  it('gebruikt in het Perzisch de Perzische ye en kaf, niet de Arabische', () => {
    const persian = textsOf('persian')
    // Arabische ye (U+064A) en kaf (U+0643) mogen niet voorkomen
    expect(persian).not.toMatch(/[\u064a\u0643]/u)
    // Perzische ye (U+06CC) en kaf (U+06A9) wel
    expect(persian).toMatch(/\u06cc/u)
    expect(persian).toMatch(/\u06a9/u)
  })

  it('schrijft "ik wil" met een halve spatie (ZWNJ, U+200C)', () => {
    expect(allTexts).toContain(
      '\u0645\u06cc\u200c\u062e\u0648\u0627\u0647\u0645',
    )
  })

  it('gebruikt de Perzische cijfers (U+06F0 tot U+06F9)', () => {
    const digits = Array.from({ length: 10 }, (_, index) =>
      String.fromCodePoint(0x06f0 + index),
    ).join(' ')
    expect(allTexts).toContain(digits)
  })

  it('zet bij Hindi de nukta direct na de medeklinker', () => {
    // ja (U+091C) + nukta (U+093C), niet het losse teken U+095B
    expect(allTexts).toContain('\u091c\u093c\u0930\u0942\u0930')
  })

  it('schrijft Birmaans in de Unicode-volgorde, niet in Zawgyi', () => {
    // Begroeting met kinzi: nga + asat + virama (U+1004 U+103A U+1039)
    expect(allTexts).toContain(
      '\u1019\u1004\u103a\u1039\u1002\u101c\u102c\u1015\u102b',
    )
    // "Dank je": medial ya (U+103B) vóór het klinkerteken e (U+1031)
    expect(textsOf('myanmar')).toMatch(/\u1000\u103b\u1031/u)
    // Gestapelde medeklinker met virama (U+1039)
    expect(allTexts).toContain('\u101e\u1010\u1039\u1010\u101d\u102b')
  })
})
