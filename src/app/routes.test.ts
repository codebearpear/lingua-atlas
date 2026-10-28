import { describe, expect, it } from 'vitest'
import { hrefFor, pageFromHash, pageHref, sectionOf } from './routes'

describe('pageFromHash', () => {
  it('opent het overzicht als er geen pagina in het adres staat', () => {
    expect(pageFromHash('')).toEqual({ page: 'overview' })
    expect(pageFromHash('#')).toEqual({ page: 'overview' })
    expect(pageFromHash('#/')).toEqual({ page: 'overview' })
  })

  it('herkent de instellingen, ook met een schuine streep aan het eind', () => {
    expect(pageFromHash('#/instellingen')).toEqual({ page: 'settings' })
    expect(pageFromHash('#/instellingen/')).toEqual({ page: 'settings' })
  })

  it('herkent de schrifttest', () => {
    expect(pageFromHash('#/schrifttest')).toEqual({ page: 'scripts' })
  })

  it('herkent de cursus van een taal', () => {
    expect(pageFromHash('#/taal/es')).toEqual({
      page: 'course',
      language: 'es',
    })
  })

  it('herkent een les', () => {
    expect(pageFromHash('#/taal/es/les/a1-begroeten-hallo')).toEqual({
      page: 'lesson',
      language: 'es',
      lesson: 'a1-begroeten-hallo',
    })
  })

  it('geeft null bij een pagina die niet bestaat', () => {
    expect(pageFromHash('#/bestaat-niet')).toBeNull()
    expect(pageFromHash('#/taal/fr')).toBeNull()
    expect(pageFromHash('#/taal/es/les/Niet_Geldig')).toBeNull()
  })
})

describe('hrefFor en pageHref', () => {
  it('maakt een link met # ervoor', () => {
    expect(hrefFor('overview')).toBe('#/')
    expect(hrefFor('scripts')).toBe('#/schrifttest')
    expect(hrefFor('settings')).toBe('#/instellingen')
  })

  it('maakt links naar cursussen en lessen die pageFromHash weer herkent', () => {
    const lesson = {
      page: 'lesson',
      language: 'ko',
      lesson: 'a1-hangul',
    } as const
    expect(pageHref(lesson)).toBe('#/taal/ko/les/a1-hangul')
    expect(pageFromHash(pageHref(lesson))).toEqual(lesson)
    expect(pageHref({ page: 'course', language: 'fa' })).toBe('#/taal/fa')
    expect(pageHref({ page: 'settings' })).toBe('#/instellingen')
  })

  it('maakt de link naar het oefenen bij een les', () => {
    const practice = {
      page: 'practice',
      language: 'es',
      lesson: 'a1-begroeten-hallo',
    } as const
    expect(pageHref(practice)).toBe('#/taal/es/les/a1-begroeten-hallo/oefenen')
    expect(pageFromHash(pageHref(practice))).toEqual(practice)
    expect(sectionOf(practice)).toBe('overview')
  })
})

describe('sectionOf', () => {
  it('rekent cursussen en lessen tot het overzicht', () => {
    expect(sectionOf({ page: 'course', language: 'es' })).toBe('overview')
    expect(
      sectionOf({
        page: 'lesson',
        language: 'es',
        lesson: 'a1-begroeten-hallo',
      }),
    ).toBe('overview')
    expect(sectionOf({ page: 'settings' })).toBe('settings')
  })
})
