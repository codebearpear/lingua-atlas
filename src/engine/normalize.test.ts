import { describe, expect, it } from 'vitest'
import { normalizeAnswer } from './normalize'

describe('normalizeAnswer', () => {
  it('haalt witruimte aan begin en eind weg', () => {
    expect(normalizeAnswer('  Haus  ')).toBe('Haus')
  })

  it('maakt van meerdere spaties één spatie', () => {
    expect(normalizeAnswer('el   perro')).toBe('el perro')
  })

  it('voegt een los accentteken samen met de letter (NFC)', () => {
    // 'e' + los accent (U+0301) wordt 'é' (U+00E9)
    expect(normalizeAnswer('cafe\u0301')).toBe('caf\u00e9')
  })

  it('stelt een Koreaanse lettergreep samen uit losse jamo', () => {
    // ᄒ + ᅡ + ᆫ (U+1112 U+1161 U+11AB) wordt 한 (U+D55C)
    expect(normalizeAnswer('\u1112\u1161\u11ab')).toBe('\ud55c')
  })

  it('laat de Perzische halve spatie (ZWNJ) staan', () => {
    // می‌خواهم ("ik wil"), met halve spatie U+200C tussen می en خواهم
    const woord = '\u0645\u06cc\u200c\u062e\u0648\u0627\u0647\u0645'
    expect(normalizeAnswer(woord)).toBe(woord)
  })
})
