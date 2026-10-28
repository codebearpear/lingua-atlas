/**
 * Terug en de scrollpositie, zoals in een app op de iPad: een nieuwe pagina
 * begint bovenaan, en terug brengt je waar je was.
 *
 * De browser bewaart bij elke stap in de geschiedenis een eigen toestand
 * (history.state). Daarin houdt de app bij waar je vandaan kwam en hoe ver je
 * gescrold was. Ga je terug of vooruit, dan staat die toestand er al; open je
 * een nieuwe pagina, dan nog niet.
 */
import { useEffect, useLayoutEffect, type MouseEvent } from 'react'
import { pageFromHash, pageHref } from './routes'

/** Wat de app per stap in de geschiedenis bewaart. */
export interface NavigationState {
  /** De pagina waar je vandaan kwam, als link (zoals #/taal/es). */
  from?: string
  /** Hoe ver je gescrold was, in pixels. */
  scrollY?: number
}

const MARK = 'lingua-atlas'

/** Leest de toestand van de app uit history.state; van anderen negeren we alles. */
export function readNavigationState(state: unknown): NavigationState | null {
  if (typeof state !== 'object' || state === null) {
    return null
  }
  const record = state as Record<string, unknown>
  if (record.app !== MARK) {
    return null
  }
  return {
    from: typeof record.from === 'string' ? record.from : undefined,
    scrollY:
      typeof record.scrollY === 'number' && Number.isFinite(record.scrollY)
        ? record.scrollY
        : undefined,
  }
}

function writeNavigationState(state: NavigationState): void {
  try {
    history.replaceState({ app: MARK, ...state }, '')
  } catch {
    // Safari staat dit maar een beperkt aantal keer per tien seconden toe.
    // Lukt het niet, dan vergeet de app alleen deze plek.
  }
}

/** Eén vorm per pagina: '', '#' en '#/' zijn allemaal het overzicht. */
export function canonicalHash(hash: string): string {
  const page = pageFromHash(hash)
  return page === null ? hash : pageHref(page)
}

function hashOf(url: string): string {
  try {
    return new URL(url).hash
  } catch {
    return ''
  }
}

/** Gebeurtenissen waarmee je zelf scrolt. */
const USER_SCROLL = ['wheel', 'touchstart', 'keydown'] as const

/**
 * Houdt de geschiedenis en de scrollpositie bij. Eén keer gebruiken, in de
 * component die de pagina's toont, met de huidige hash.
 */
export function useNavigationMemory(hash: string): void {
  useEffect(() => {
    // De app herstelt de scrollpositie zelf.
    history.scrollRestoration = 'manual'
    if (readNavigationState(history.state) === null) {
      // De eerste pagina: waar je vandaan kwam, weten we niet.
      writeNavigationState({})
    }

    const onHashChange = (event: HashChangeEvent) => {
      if (readNavigationState(history.state) === null) {
        // Een nieuwe stap, via een link of een ander adres.
        writeNavigationState({ from: canonicalHash(hashOf(event.oldURL)) })
      }
    }

    const saveScroll = () => {
      const current = readNavigationState(history.state)
      if (current !== null) {
        writeNavigationState({ ...current, scrollY: window.scrollY })
      }
    }

    // Bewaren als het scrollen even stilstaat, en meteen bij een tik op een
    // link: die kan naar een andere pagina leiden.
    const onClick = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('a[href]') !== null
      ) {
        saveScroll()
      }
    }
    let timer: number | undefined
    const onScroll = () => {
      window.clearTimeout(timer)
      const href = location.href
      timer = window.setTimeout(() => {
        if (location.href === href) {
          saveScroll()
        }
      }, 200)
    }

    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('click', onClick, { capture: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onClick, { capture: true })
    }
  }, [])

  // Voor het tekenen: terug naar de bewaarde plek, of bovenaan beginnen.
  useLayoutEffect(() => {
    const target = readNavigationState(history.state)?.scrollY ?? 0
    window.scrollTo(0, target)
    if (window.scrollY >= target - 1) {
      return
    }
    // De pagina is nog te kort, bijvoorbeeld omdat een lespakket nog laadt.
    // Zodra ze groeit, opnieuw proberen; niet meer als je zelf gaat scrollen.
    const observer = new ResizeObserver(() => {
      window.scrollTo(0, target)
      if (window.scrollY >= target - 1) {
        stop()
      }
    })
    const timer = window.setTimeout(stop, 3000)
    function stop() {
      observer.disconnect()
      window.clearTimeout(timer)
      for (const type of USER_SCROLL) {
        window.removeEventListener(type, stop)
      }
    }
    observer.observe(document.body)
    for (const type of USER_SCROLL) {
      window.addEventListener(type, stop, { passive: true })
    }
    return stop
  }, [hash])
}

/**
 * Voor een terugknop: kwam je van die pagina, dan gaat de app echt terug in
 * de geschiedenis, zodat je terugkomt waar je was. Anders volgt de link
 * gewoon, bijvoorbeeld als je de les via een bladwijzer opende.
 */
export function followBackLink(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
): void {
  const plainClick =
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  const state = readNavigationState(history.state)
  if (plainClick && state?.from === canonicalHash(href)) {
    event.preventDefault()
    history.back()
  }
}
