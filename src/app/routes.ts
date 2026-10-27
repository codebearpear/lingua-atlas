/**
 * De pagina's van de app.
 *
 * Navigatie gebruikt het deel na # in het adres (bijvoorbeeld #/instellingen).
 * Zo werkt elke pagina ook op GitHub Pages en zonder internet, zonder extra
 * instellingen op de server.
 */
export type RouteId = 'overview' | 'scripts' | 'settings'

export interface Route {
  id: RouteId
  path: string
  label: string
}

export const ROUTES: readonly Route[] = [
  { id: 'overview', path: '/', label: 'Overzicht' },
  { id: 'scripts', path: '/schrifttest', label: 'Schrifttest' },
  { id: 'settings', path: '/instellingen', label: 'Instellingen' },
]

/** Zet de hash uit de adresbalk om naar een pagina, of `null` als die niet bestaat. */
export function routeFromHash(hash: string): RouteId | null {
  const path = hash.replace(/^#/u, '') || '/'
  const normalized = path.length > 1 ? path.replace(/\/+$/u, '') : path
  return ROUTES.find((route) => route.path === normalized)?.id ?? null
}

/** De link naar een pagina, voor het href-attribuut. */
export function hrefFor(id: RouteId): string {
  const route = ROUTES.find((candidate) => candidate.id === id)
  return `#${route?.path ?? '/'}`
}
