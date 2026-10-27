import type { ReactNode } from 'react'
import { SymbolIcon, type SymbolName } from './Icons'

/** De grote titel bovenaan een pagina, zoals in de apps van Apple. */
export function PageHeader({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <header className="mb-8 space-y-2">
      <h1 className="text-large-title font-bold tracking-[-0.015em]">
        {title}
      </h1>
      {children !== undefined && (
        <div className="max-w-2xl space-y-2 text-body text-secondary">
          {children}
        </div>
      )}
    </header>
  )
}

/** Een kop boven een blok inhoud, zoals "Vandaag". */
export function SectionHeading({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  return (
    <h2 id={id} className="mb-3 px-1 text-title2 font-bold">
      {children}
    </h2>
  )
}

/**
 * Een gegroepeerde lijst: een kleine grijze kop, een afgeronde kaart met rijen
 * en eventueel een toelichting eronder.
 */
export function GroupedSection({
  id,
  title,
  footer,
  children,
}: {
  id: string
  title: string
  footer?: ReactNode
  children: ReactNode
}) {
  const headingId = `${id}-titel`
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h2
        id={headingId}
        className="px-5 text-footnote tracking-[0.02em] text-secondary uppercase"
      >
        {title}
      </h2>
      <div className="overflow-hidden rounded-card bg-surface">{children}</div>
      {footer !== undefined && (
        <div className="px-5 text-footnote text-secondary">{footer}</div>
      )}
    </section>
  )
}

/**
 * Een rij in een kaart, met een scheidingslijn die links inspringt. De lijn is
 * een halve pixel dik: op een Retina-scherm precies één beeldpunt, zoals bij Apple.
 */
export function GroupedRow({ children }: { children: ReactNode }) {
  return (
    <div className="group/row ps-5">
      <div className="border-b-[0.5px] border-separator py-3 pe-5 group-last/row:border-b-0">
        {children}
      </div>
    </div>
  )
}

/** Een lege toestand: een pictogram, een titel en een korte uitleg. */
export function ContentUnavailable({
  icon,
  title,
  children,
}: {
  icon: SymbolName
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <SymbolIcon name={icon} className="size-12 text-secondary" />
      <p className="mt-3 text-title3 font-semibold">{title}</p>
      <div className="mt-1 max-w-sm text-subhead text-secondary">
        {children}
      </div>
    </div>
  )
}
