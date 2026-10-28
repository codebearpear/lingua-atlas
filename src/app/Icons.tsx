import type { ReactNode } from 'react'
import type { RouteId } from './routes'

interface IconProps {
  className?: string
}

/** Het app-pictogram: een witte wereldbol op een blauw verloop. */
export function BrandMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="lingua-atlas-verloop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4aa3ff" />
          <stop offset="1" stopColor="#1763e4" />
        </linearGradient>
      </defs>
      <rect
        width="512"
        height="512"
        rx="115"
        fill="url(#lingua-atlas-verloop)"
      />
      <g fill="none" stroke="#ffffff" strokeWidth="18" strokeLinecap="round">
        <circle cx="256" cy="256" r="150" />
        <ellipse cx="256" cy="256" rx="70" ry="150" />
        <path d="M106 256h300M256 106v300" />
        <path d="M124 186h264M124 326h264" strokeOpacity="0.75" />
      </g>
    </svg>
  )
}

const NAV_ICONS: Record<RouteId, (active: boolean) => ReactNode> = {
  // Vier vlakken, gevuld als de pagina open is
  overview: (active) => (
    <g fill={active ? 'currentColor' : 'none'}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </g>
  ),
  // Letter A met een streep eronder
  scripts: () => (
    <>
      <path d="m6 16 4.5-11h1L16 16M7.6 12h6.8" />
      <path d="M4 20h16" />
    </>
  ),
  // Schuifregelaars
  settings: () => (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
}

export function NavIcon({
  route,
  active,
  className,
}: IconProps & { route: RouteId; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {NAV_ICONS[route](active)}
    </svg>
  )
}

export type SymbolName =
  | 'book'
  | 'calendar-check'
  | 'checkmark-circle'
  | 'chevron-left'
  | 'chevron-right'
  | 'exclamation-circle'
  | 'globe'
  | 'question-circle'

const SYMBOLS: Record<SymbolName, ReactNode> = {
  // Een open boek
  book: (
    <>
      <path d="M12 6.8C10.2 5.5 7.6 4.8 4 4.8v13.4c3.6 0 6.2.7 8 2 1.8-1.3 4.4-2 8-2V4.8c-3.6 0-6.2.7-8 2Z" />
      <path d="M12 6.8v13.4" />
    </>
  ),
  'calendar-check': (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
  'checkmark-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.7L16 9.8" />
    </>
  ),
  // Pijlpunten, zoals de terugknop en de pijl achter een rij die je opent
  'chevron-left': <path d="m14.5 5-7 7 7 7" />,
  'chevron-right': <path d="m9.5 5 7 7-7 7" />,
  'exclamation-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.6h.01" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="3.8" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
  'question-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" />
      <path d="M12 16.8h.01" />
    </>
  ),
}

/** Eenvoudige lijnpictogrammen in de stijl van de systeemsymbolen. */
export function SymbolIcon({
  name,
  className,
}: IconProps & { name: SymbolName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SYMBOLS[name]}
    </svg>
  )
}
