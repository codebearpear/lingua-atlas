import type { ReactNode } from 'react'
import { BrandMark, NavIcon } from './Icons'
import { ROUTES, hrefFor, sectionOf, type Page, type Route } from './routes'

interface AppShellProps {
  /** De pagina die open is, of null als die niet bestaat. */
  page: Page | null
  children: ReactNode
}

/**
 * Voor schermlezers: "page" als dit precies de open pagina is, "true" als de
 * open pagina eronder valt, zoals een les onder het overzicht.
 */
type Current = 'page' | 'true' | undefined

interface NavLinkProps {
  route: Route
  current: Current
}

function focusMain(): void {
  document.getElementById('inhoud')?.focus()
}

function currentFor(route: Route, page: Page | null): Current {
  if (page === null || sectionOf(page) !== route.id) {
    return undefined
  }
  return page.page === route.id ? 'page' : 'true'
}

function SidebarLink({ route, current }: NavLinkProps) {
  const active = current !== undefined
  return (
    <a
      href={hrefFor(route.id)}
      aria-current={current}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 transition-colors ${
        active
          ? 'bg-tint-fill font-semibold text-on-tint'
          : 'text-label hover:bg-muted'
      }`}
    >
      <NavIcon
        route={route.id}
        active={active}
        className={`size-[1.375rem] shrink-0 ${active ? '' : 'text-tint'}`}
      />
      {route.label}
    </a>
  )
}

function TabLink({ route, current }: NavLinkProps) {
  const active = current !== undefined
  return (
    <a
      href={hrefFor(route.id)}
      aria-current={current}
      className={`flex h-[3.25rem] min-w-[5.5rem] flex-col items-center justify-center gap-0.5 rounded-full px-4 text-caption2 font-semibold transition-colors ${
        active ? 'bg-muted text-tint' : 'text-label'
      }`}
    >
      <NavIcon route={route.id} active={active} className="size-6" />
      {route.label}
    </a>
  )
}

/**
 * De vaste schil om elke pagina. Op brede schermen (iPad liggend) zweeft links
 * een glazen zijbalk; op smallere schermen (iPad staand) zweeft onderaan een
 * glazen tabbalk, zoals in iPadOS.
 */
export function AppShell({ page, children }: AppShellProps) {
  return (
    <div className="min-h-dvh">
      <button
        type="button"
        onClick={focusMain}
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Naar de inhoud
      </button>

      <aside className="glass fixed inset-y-3 start-3 z-30 hidden w-[17.5rem] flex-col rounded-[1.75rem] lg:flex">
        <a
          href={hrefFor('overview')}
          className="flex items-center gap-3 rounded-t-[1.75rem] px-5 pt-5 pb-6"
        >
          <BrandMark className="size-9 shrink-0" />
          <span className="text-title3 font-semibold tracking-[-0.01em]">
            Lingua Atlas
          </span>
        </a>
        <nav aria-label="Hoofdmenu" className="flex-1 px-3">
          <ul className="space-y-0.5">
            {ROUTES.map((route) => (
              <li key={route.id}>
                <SidebarLink route={route} current={currentFor(route, page)} />
              </li>
            ))}
          </ul>
        </nav>
        <p className="px-5 pb-5 text-footnote text-secondary">
          In ontwikkeling. Je gegevens blijven op dit apparaat.
        </p>
      </aside>

      <main
        id="inhoud"
        tabIndex={-1}
        className="px-5 pt-10 pb-[calc(7rem+env(safe-area-inset-bottom))] outline-none sm:px-8 lg:ps-[20.5rem] lg:pe-10 lg:pt-12 lg:pb-16"
      >
        <div className="mx-auto max-w-[56rem]">{children}</div>
      </main>

      <nav
        aria-label="Hoofdmenu"
        className="glass fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto w-fit rounded-full p-1.5 lg:hidden"
      >
        <ul className="flex gap-1">
          {ROUTES.map((route) => (
            <li key={route.id}>
              <TabLink route={route} current={currentFor(route, page)} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
