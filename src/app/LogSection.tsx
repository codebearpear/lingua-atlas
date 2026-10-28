import { useEffect, useState } from 'react'
import { appDatabase } from '../data/appDatabase'
import type { LogEntry } from '../data/database'
import { logError } from '../data/errorLog'
import { clearLog, formatLog, MAX_LOG_ENTRIES, readLog } from '../data/log'
import { GroupedRow, GroupedSection } from './ui'
import { BUILD_ID } from './version'

type Log =
  | { state: 'loading' }
  | { state: 'ready'; entries: LogEntry[] }
  | { state: 'unavailable' }

async function loadLog(): Promise<Log> {
  try {
    return { state: 'ready', entries: await readLog(appDatabase()) }
  } catch {
    return { state: 'unavailable' }
  }
}

const TIME = new Intl.DateTimeFormat('nl-NL', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function ActionButton({
  children,
  onClick,
}: {
  children: string
  onClick: () => Promise<void>
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void onClick()
      }}
      className="min-h-11 rounded-full px-3 text-subhead font-semibold text-tint transition-colors hover:bg-muted"
    >
      {children}
    </button>
  )
}

/** Instellingen › Foutenlogboek: meldingen bekijken, kopiëren en wissen. */
export function LogSection() {
  const [log, setLog] = useState<Log>({ state: 'loading' })
  const [notice, setNotice] = useState<string>()

  useEffect(() => {
    let active = true
    void loadLog().then((next) => {
      if (active) {
        setLog(next)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const entries = log.state === 'ready' ? log.entries : []
  const latest = entries[0]

  const copy = async () => {
    const text = formatLog(entries, {
      version: BUILD_ID,
      device: navigator.userAgent,
      now: Date.now(),
    })
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Gekopieerd. Plak het in je gesprek met Claude.')
    } catch {
      setNotice('Kopiëren lukte niet in deze browser.')
    }
  }

  const clear = async () => {
    await clearLog(appDatabase())
    setLog(await loadLog())
    setNotice('Het logboek is leeg.')
  }

  const test = async () => {
    await logError(new Error('Testmelding vanuit Instellingen'))
    setLog(await loadLog())
    setNotice('Testmelding toegevoegd.')
  }

  return (
    <GroupedSection
      id="logboek"
      title="Foutenlogboek"
      footer={`Gaat er iets mis in Lingua Atlas, dan komt de melding hier. Kopieer het logboek en plak het in je gesprek met Claude. Het blijft op dit apparaat en bewaart de laatste ${MAX_LOG_ENTRIES} meldingen.`}
    >
      <GroupedRow>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span>Meldingen</span>
          <span className="text-secondary">
            {log.state === 'loading' && '…'}
            {log.state === 'unavailable' && 'Niet beschikbaar'}
            {log.state === 'ready' &&
              (entries.length === 0 ? 'Geen' : String(entries.length))}
          </span>
        </div>
        {log.state === 'unavailable' && (
          <p className="mt-1 text-footnote text-secondary">
            Deze browser laat Lingua Atlas niets bewaren, bijvoorbeeld in een
            privévenster.
          </p>
        )}
      </GroupedRow>
      {latest !== undefined && (
        <GroupedRow>
          <p className="text-footnote text-secondary">
            Laatste melding, {TIME.format(latest.lastAt)}
          </p>
          <p className="truncate">{latest.message}</p>
        </GroupedRow>
      )}
      {log.state === 'ready' && (
        <GroupedRow>
          <div className="-my-2 -ms-3 flex flex-wrap">
            {entries.length > 0 && (
              <ActionButton onClick={copy}>Kopiëren</ActionButton>
            )}
            {entries.length > 0 && (
              <ActionButton onClick={clear}>Wissen</ActionButton>
            )}
            <ActionButton onClick={test}>Testmelding maken</ActionButton>
          </div>
          {notice !== undefined && (
            <p role="status" className="mt-1 text-footnote text-secondary">
              {notice}
            </p>
          )}
        </GroupedRow>
      )}
    </GroupedSection>
  )
}
