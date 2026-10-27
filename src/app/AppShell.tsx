import type { ReactNode } from 'react'
import { BrandMark, NavIcon } from './Icons'
import { ROUTES, hrefFor, type Route, type RouteId } from './routes'

interface AppShellProps {
  current: RouteId | null
  children: ReactNode
}

interface NavLinkProps {
  route: Route
  active: boolean
}

const SIDEBAR_LINK =
  'flex min-h-11 items-center gap-3 rounded-xl px-3 transition-colors'
const SIDEBAR_LINK_ACTIVE = 'bg-surface-muted font-semibold text-ink'
const SIDEBAR_LINK_IDLE =
  'text-ink-muted hover:bg-surface-muted/60 hover:text-ink'

function focusMain(): void {
  document.getElementById('inhoud')?.focus()
}

function Brand({ className }: { className?: string }) {
  return (
    <a
      href={hrefFor('overview')}
      className={`flex items-center gap-3 ${className ?? ''}`}
    >
      <BrandMark className="size-9 shrink-0" />
      <span className="font-serif text-lg font-semibold tracking-tight">
        Lingua Atlas
      </span>
    </a>
  )
}

function SidebarLink({ route, active }: NavLinkProps) {
  return (
    <a
      href={hrefFor(route.id)}
      aria-current={active ? 'page' : undefined}
      className={`${SIDEBAR_LINK} ${active ? SIDEBAR_LINK_ACTIVE : SIDEBAR_LINK_IDLE}`}
    >
      <NavIcon
        route={route.id}
        className={`size-5 shrink-0 ${active ? 'text-accent' : ''}`}
      />
      {route.label}
    </a>
  )
}

function TabLink({ route, active }: NavLinkProps) {
  return (
    <a
      href={hrefFor(route.id)}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${active ? 'text-ink' : 'text-ink-muted'}`}
    >
      <NavIcon
        route={route.id}
        className={`size-6 ${active ? 'text-accent' : ''}`}
      />
      {route.label}
    </a>
  )
}

/**
 * De vaste schil om elke pagina: een zijbalk op brede schermen (iPad liggend)
 * en een balk onderaan op smallere schermen (iPad staand).
 */
export function AppShell({ current, children }: AppShellProps) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <button
        type="button"
        onClick={focusMain}
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Naar de inhoud
      </button>

      <aside className="hidden border-e border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <Brand className="px-6 pt-7 pb-8" />
        <nav aria-label="Hoofdmenu" className="flex-1 px-3">
          <ul className="space-y-1">
            {ROUTES.map((route) => (
              <li key={route.id}>
                <SidebarLink route={route} active={route.id === current} />
              </li>
            ))}
          </ul>
        </nav>
        <p className="px-6 pb-6 text-xs leading-relaxed text-ink-muted">
          In ontwikkeling. Je gegevens blijven op dit apparaat.
        </p>
      </aside>

      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur lg:hidden">
        <Brand className="px-5 py-3" />
      </header>

      <main
        id="inhoud"
        tabIndex={-1}
        className="px-5 pt-8 pb-32 outline-none sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      <nav
        aria-label="Hoofdmenu"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul
          className="mx-auto grid max-w-md"
          style={{
            gridTemplateColumns: `repeat(${ROUTES.length}, minmax(0, 1fr))`,
          }}
        >
          {ROUTES.map((route) => (
            <li key={route.id}>
              <TabLink route={route} active={route.id === current} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
