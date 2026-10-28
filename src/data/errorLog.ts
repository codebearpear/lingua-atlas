import { BUILD_ID } from '../app/version'
import { appDatabase } from './appDatabase'
import { addLogEntry, describeError } from './log'

/**
 * Zet een fout in het foutenlogboek. Lukt dat niet, bijvoorbeeld omdat de
 * browser niets mag bewaren, dan gaat de app gewoon door.
 */
export async function logError(error: unknown, extra?: string): Promise<void> {
  const { message, detail } = describeError(error)
  const details = [detail, extra]
    .filter((part) => part !== undefined && part !== '')
    .join('\n')
  try {
    await addLogEntry(appDatabase(), {
      message,
      detail: details === '' ? undefined : details,
      page: window.location.hash || '#/',
      version: BUILD_ID,
      at: Date.now(),
    })
  } catch {
    // Het logboek zelf werkt niet. Geen nieuwe melding maken, anders blijft
    // het rondgaan.
  }
}

/** Vangt fouten op die nergens anders worden afgehandeld. */
export function captureErrors(): void {
  window.addEventListener('error', (event) => {
    const error: unknown = event.error
    const place =
      event.filename === ''
        ? undefined
        : `${event.filename}:${event.lineno}:${event.colno}`
    void logError(error ?? event.message, place)
  })
  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason
    void logError(reason)
  })
}
