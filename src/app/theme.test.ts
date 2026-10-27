import { describe, expect, it } from 'vitest'
import { parseThemePreference, resolveTheme } from './theme'

describe('parseThemePreference', () => {
  it('accepteert alleen bekende keuzes', () => {
    expect(parseThemePreference('light')).toBe('light')
    expect(parseThemePreference('dark')).toBe('dark')
    expect(parseThemePreference('system')).toBe('system')
  })

  it('valt terug op het systeem bij een lege of onbekende waarde', () => {
    expect(parseThemePreference(null)).toBe('system')
    expect(parseThemePreference('paars')).toBe('system')
  })
})

describe('resolveTheme', () => {
  it('volgt het apparaat bij de keuze "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('houdt een vaste keuze aan, wat het apparaat ook doet', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
