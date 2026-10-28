import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { logError } from '../data/errorLog'
import { describeError } from '../data/log'

/** Wat je ziet als de app vastloopt, in plaats van een leeg scherm. */
function CrashScreen({ message }: { message: string }) {
  const [copied, setCopied] = useState<boolean>()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-label">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-title2 font-bold">Er ging iets mis</h1>
        <p className="text-body text-secondary">
          Lingua Atlas liep vast op een fout. Wat je al had opgeslagen, blijft
          bewaard. De melding staat ook in het foutenlogboek in Instellingen.
        </p>
        <p className="rounded-card bg-surface p-4 text-start text-footnote break-words">
          {message}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              window.location.reload()
            }}
            className="min-h-11 rounded-full bg-tint-fill px-5 text-subhead font-semibold text-on-tint transition-opacity active:opacity-80"
          >
            Opnieuw laden
          </button>
          <button
            type="button"
            onClick={() => {
              void copy()
            }}
            className="min-h-11 rounded-full px-4 text-subhead font-semibold text-tint transition-colors hover:bg-muted"
          >
            Melding kopiëren
          </button>
        </div>
        {copied !== undefined && (
          <p role="status" className="text-footnote text-secondary">
            {copied
              ? 'Gekopieerd.'
              : 'Kopiëren lukte niet; selecteer de melding hierboven.'}
          </p>
        )}
      </div>
    </main>
  )
}

interface Props {
  children: ReactNode
}

interface State {
  message: string | undefined
}

/** Vangt een fout in de app op, zet hem in het logboek en toont een uitleg. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { message: undefined }

  static getDerivedStateFromError(error: unknown): State {
    return { message: describeError(error).message }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    void logError(error, info.componentStack ?? undefined)
  }

  override render() {
    if (this.state.message === undefined) {
      return this.props.children
    }
    return <CrashScreen message={this.state.message} />
  }
}
