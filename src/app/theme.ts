/** De keuze van de gebruiker; 'system' volgt de instelling van het apparaat. */
export type ThemePreference = 'system' | 'light' | 'dark'

/** Het thema dat echt op het scherm staat. */
export type Theme = 'light' | 'dark'

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  'system',
  'light',
  'dark',
]

/** Maakt van een opgeslagen waarde een geldige keuze; onbekend wordt 'system'. */
export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): Theme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }
  return preference
}
