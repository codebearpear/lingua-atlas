/**
 * De pagina's van de app.
 *
 * Navigatie gebruikt het deel na # in het adres (bijvoorbeeld #/instellingen).
 * Zo werkt elke pagina ook op GitHub Pages en zonder internet, zonder extra
 * instellingen op de server.
 */
import { isLanguageCode, type LanguageCode } from '../content/languageCodes'

/** De onderdelen in het hoofdmenu. */
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

/** Een pagina, met wat erbij hoort, zoals de taal van een cursus. */
export type Page =
  | { page: RouteId }
  | { page: 'course'; language: LanguageCode }
  | { page: 'lesson'; language: LanguageCode; lesson: string }
  | { page: 'practice'; language: LanguageCode; lesson: string }

const ID = '[a-z0-9]+(?:-[a-z0-9]+)*'
const COURSE = /^\/taal\/([a-z]+)$/u
const LESSON = new RegExp(`^/taal/([a-z]+)/les/(${ID})(/oefenen)?$`, 'u')

/** Zet de hash uit de adresbalk om naar een pagina, of `null` als die niet bestaat. */
export function pageFromHash(hash: string): Page | null {
  const path = hash.replace(/^#/u, '') || '/'
  const normalized = path.length > 1 ? path.replace(/\/+$/u, '') : path

  const route = ROUTES.find((candidate) => candidate.path === normalized)
  if (route !== undefined) {
    return { page: route.id }
  }

  const course = COURSE.exec(normalized)
  if (course?.[1] !== undefined && isLanguageCode(course[1])) {
    return { page: 'course', language: course[1] }
  }

  const lesson = LESSON.exec(normalized)
  if (
    lesson?.[1] !== undefined &&
    lesson[2] !== undefined &&
    isLanguageCode(lesson[1])
  ) {
    return {
      page: lesson[3] === undefined ? 'lesson' : 'practice',
      language: lesson[1],
      lesson: lesson[2],
    }
  }

  return null
}

/** De link naar een onderdeel van het hoofdmenu, voor het href-attribuut. */
export function hrefFor(id: RouteId): string {
  const route = ROUTES.find((candidate) => candidate.id === id)
  return `#${route?.path ?? '/'}`
}

/** De link naar een pagina, voor het href-attribuut. */
export function pageHref(page: Page): string {
  switch (page.page) {
    case 'course':
      return `#/taal/${page.language}`
    case 'lesson':
      return `#/taal/${page.language}/les/${page.lesson}`
    case 'practice':
      return `#/taal/${page.language}/les/${page.lesson}/oefenen`
    default:
      return hrefFor(page.page)
  }
}

/** Bij welk onderdeel van het hoofdmenu een pagina hoort. Cursussen horen bij het overzicht. */
export function sectionOf(page: Page): RouteId {
  switch (page.page) {
    case 'course':
    case 'lesson':
    case 'practice':
      return 'overview'
    default:
      return page.page
  }
}
