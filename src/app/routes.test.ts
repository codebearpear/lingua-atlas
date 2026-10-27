import { describe, expect, it } from 'vitest'
import { hrefFor, routeFromHash } from './routes'

describe('routeFromHash', () => {
  it('opent het overzicht als er geen pagina in het adres staat', () => {
    expect(routeFromHash('')).toBe('overview')
    expect(routeFromHash('#')).toBe('overview')
    expect(routeFromHash('#/')).toBe('overview')
  })

  it('herkent de instellingen, ook met een schuine streep aan het eind', () => {
    expect(routeFromHash('#/instellingen')).toBe('settings')
    expect(routeFromHash('#/instellingen/')).toBe('settings')
  })

  it('geeft null bij een pagina die niet bestaat', () => {
    expect(routeFromHash('#/bestaat-niet')).toBeNull()
  })
})

describe('hrefFor', () => {
  it('maakt een link met # ervoor', () => {
    expect(hrefFor('overview')).toBe('#/')
    expect(hrefFor('settings')).toBe('#/instellingen')
  })
})
