import { describe, expect, it } from 'vitest'
import { parseInline } from './inline.ts'

// Tekens buiten ASCII staan als code, zoals \u00f3 voor een o met accent.

describe('parseInline', () => {
  it('laat tekst zonder markering heel', () => {
    expect(parseInline('Zeg hallo.')).toEqual({ parts: ['Zeg hallo.'] })
  })

  it('markeert doeltaal tussen sterretjes', () => {
    expect(parseInline('*Hola* betekent hallo.')).toEqual({
      parts: [{ kind: 'target', text: 'Hola' }, ' betekent hallo.'],
    })
    expect(parseInline('Zeg *buenos d\u00edas* of *hola*.')).toEqual({
      parts: [
        'Zeg ',
        { kind: 'target', text: 'buenos d\u00edas' },
        ' of ',
        { kind: 'target', text: 'hola' },
        '.',
      ],
    })
  })

  it('markeert een foute vorm tussen tildes', () => {
    expect(parseInline('Schrijf niet ~adios~, maar *adi\u00f3s*.')).toEqual({
      parts: [
        'Schrijf niet ',
        { kind: 'wrong', text: 'adios' },
        ', maar ',
        { kind: 'target', text: 'adi\u00f3s' },
        '.',
      ],
    })
  })

  it('leest \\* en \\~ als gewone tekens', () => {
    expect(parseInline('5 \\* 3 en \\~5')).toEqual({ parts: ['5 * 3 en ~5'] })
    expect(parseInline('*a\\*b*')).toEqual({
      parts: [{ kind: 'target', text: 'a*b' }],
    })
  })

  it('meldt een sterretje of tilde zonder partner, zonder tekst te verliezen', () => {
    const star = parseInline('Zeg *hola.')
    expect(star.problem).toMatch(/^Sterretje zonder partner/)
    expect(star.parts).toEqual(['Zeg *hola.'])
    expect(parseInline('~adios').problem).toMatch(/^Tilde zonder partner/)
  })

  it('meldt lege markeringen, spaties binnen de markering en markeringen in elkaar', () => {
    expect(parseInline('Zeg ** hier.').problem).toBe('Lege markering (**).')
    expect(parseInline('Zeg * hola* hier.').problem).toMatch(
      /^Spatie direct binnen de markering/,
    )
    expect(parseInline('*a ~b~ c*').problem).toMatch(
      /^Een markering binnen een andere/,
    )
  })
})
