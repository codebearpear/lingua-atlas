import { hrefFor } from '../app/routes'
import { ContentUnavailable } from '../app/ui'
import { usePageTitle } from '../app/usePageTitle'

export function NotFoundPage() {
  usePageTitle('Pagina niet gevonden')

  return (
    <div className="mt-12 rounded-card bg-surface">
      <ContentUnavailable
        icon="question-circle"
        title="Deze pagina bestaat niet"
      >
        <p>Misschien is de link verouderd of zit er een tikfout in.</p>
        <p className="mt-4">
          <a
            href={hrefFor('overview')}
            className="font-semibold text-tint hover:underline"
          >
            Naar het overzicht
          </a>
        </p>
      </ContentUnavailable>
    </div>
  )
}
