import { describe, expect, it } from 'vitest'
import { canonicalHash, readNavigationState } from './navigation'

describe('readNavigationState', () => {
  it('leest de toestand die de app zelf bewaarde', () => {
    expect(
      readNavigationState({
        app: 'lingua-atlas',
        from: '#/taal/es',
        scrollY: 420,
      }),
    ).toEqual({ from: '#/taal/es', scrollY: 420 })
    expect(readNavigationState({ app: 'lingua-atlas' })).toEqual({
      from: undefined,
      scrollY: undefined,
    })
  })

  it('negeert een toestand van een ander of zonder geldige waarden', () => {
    expect(readNavigationState(null)).toBeNull()
    expect(readNavigationState('tekst')).toBeNull()
    expect(readNavigationState({ from: '#/', scrollY: 10 })).toBeNull()
    expect(
      readNavigationState({
        app: 'lingua-atlas',
        from: 3,
        scrollY: Number.NaN,
      }),
    ).toEqual({ from: undefined, scrollY: undefined })
  })
})

describe('canonicalHash', () => {
  it('geeft elke pagina een vorm', () => {
    expect(canonicalHash('')).toBe('#/')
    expect(canonicalHash('#')).toBe('#/')
    expect(canonicalHash('#/instellingen/')).toBe('#/instellingen')
    expect(canonicalHash('#/taal/es/')).toBe('#/taal/es')
  })

  it('laat een onbekende pagina zoals ze is', () => {
    expect(canonicalHash('#/bestaat-niet')).toBe('#/bestaat-niet')
  })
})
