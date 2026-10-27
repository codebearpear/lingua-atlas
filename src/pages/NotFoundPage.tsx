import { hrefFor } from '../app/routes'
import { usePageTitle } from '../app/usePageTitle'

export function NotFoundPage() {
  usePageTitle('Pagina niet gevonden')

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">
        Deze pagina bestaat niet
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted">
        Misschien is de link verouderd of zit er een tikfout in.
      </p>
      <p>
        <a
          href={hrefFor('overview')}
          className="font-medium text-accent underline underline-offset-4"
        >
          Naar het overzicht
        </a>
      </p>
    </div>
  )
}
