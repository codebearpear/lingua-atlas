import { ContentUnavailable } from './ui'

/** Zolang een lespakket laadt. Verschijnt pas na een korte pauze, zodat het niet flitst. */
export function CourseLoading() {
  return (
    <p
      role="status"
      className="animate-appear px-1 py-6 text-subhead text-secondary"
    >
      Lessen laden…
    </p>
  )
}

/** Als een lespakket niet laadt. De fout staat dan al in het foutenlogboek. */
export function CourseLoadError() {
  return (
    <div className="rounded-card bg-surface">
      <ContentUnavailable
        icon="exclamation-circle"
        title="De lessen konden niet laden"
      >
        <p>
          Laad de app opnieuw. Lukt het dan nog niet, dan staat de melding in
          Instellingen, bij Foutenlogboek.
        </p>
        <p className="mt-4">
          <button
            type="button"
            onClick={() => {
              window.location.reload()
            }}
            className="min-h-11 rounded-full bg-tint-fill px-5 text-subhead font-semibold text-on-tint transition-opacity active:opacity-80"
          >
            Opnieuw laden
          </button>
        </p>
      </ContentUnavailable>
    </div>
  )
}
