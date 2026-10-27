import { useSyncExternalStore } from 'react'
import {
  parseThemePreference,
  resolveTheme,
  type Theme,
  type ThemePreference,
} from './theme'

/** Moet gelijk blijven aan de sleutel in het opstartscript in index.html. */
const STORAGE_KEY = 'lingua-atlas:theme'

const listeners = new Set<() => void>()
let preference: ThemePreference = 'system'
let darkQuery: MediaQueryList | undefined

function readStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return 'system'
  }
}

/** Kleur van de titelbalk van de geïnstalleerde app, gelijk aan de achtergrond. */
const THEME_COLORS: Record<Theme, string> = {
  light: '#f2f2f7',
  dark: '#000000',
}

function applyTheme(): void {
  const theme = resolveTheme(preference, darkQuery?.matches ?? false)
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme])
}

function notify(): void {
  applyTheme()
  for (const listener of listeners) {
    listener()
  }
}

/** Leest de bewaarde keuze en volgt daarna wijzigingen van het apparaat. */
export function initTheme(): void {
  preference = readStoredPreference()
  darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  darkQuery.addEventListener('change', notify)
  applyTheme()
}

export function getThemePreference(): ThemePreference {
  return preference
}

export function setThemePreference(next: ThemePreference): void {
  preference = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Opslag niet beschikbaar, bijvoorbeeld in een privévenster:
    // de keuze geldt dan alleen tot de app sluit.
  }
  notify()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference)
}
