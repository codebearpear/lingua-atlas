import type { ReactNode } from 'react'
import type { RouteId } from './routes'

interface IconProps {
  className?: string
}

/** Het beeldmerk: een wereldbol met een gouden evenaar. */
export function BrandMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      <rect width="512" height="512" rx="112" fill="#13233a" />
      <g fill="none" stroke="#f3ead7" strokeWidth="14" strokeLinecap="round">
        <circle cx="256" cy="256" r="150" />
        <ellipse cx="256" cy="256" rx="72" ry="150" />
        <line x1="256" y1="106" x2="256" y2="406" />
        <line x1="126" y1="181" x2="386" y2="181" />
        <line x1="126" y1="331" x2="386" y2="331" />
      </g>
      <line
        x1="106"
        y1="256"
        x2="406"
        y2="256"
        stroke="#d4a72c"
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  )
}

const NAV_ICON_PATHS: Record<RouteId, ReactNode> = {
  // Kompas
  overview: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  // Schuifregelaars
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
}

export function NavIcon({ route, className }: IconProps & { route: RouteId }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {NAV_ICON_PATHS[route]}
    </svg>
  )
}
