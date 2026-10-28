import { useEffect, useState } from 'react'
import { appDatabase } from '../data/appDatabase'
import { backupFileName, serializeBackup } from '../data/backup'
import {
  collectBackup,
  lastBackupAt,
  markBackupMade,
} from '../data/backupStore'
import { logError } from '../data/errorLog'
import { getThemePreference } from './themeStore'
import { GroupedRow, GroupedSection } from './ui'
import { BUILD_ID } from './version'

type How = 'download' | 'share'

const TIME = new Intl.DateTimeFormat('nl-NL', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function backupFile(text: string, name: string): File {
  return new File([text], name, { type: 'application/json' })
}

/** Of de browser een JSON-bestand kan delen, zoals Safari op de iPad. */
function canShareFiles(): boolean {
  try {
    return (
      'canShare' in navigator &&
      navigator.canShare({ files: [backupFile('{}', 'proef.json')] })
    )
  } catch {
    return false
  }
}

function download(text: string, name: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  // Even wachten, zodat de browser het bestand zeker heeft opgehaald.
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 60_000)
}

/** Instellingen › Back-up: een back-upbestand maken en bewaren. */
export function BackupSection() {
  // undefined: nog aan het laden; null: nog nooit een back-up gemaakt
  const [last, setLast] = useState<number | null>()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string>()
  const [shareable] = useState(canShareFiles)

  useEffect(() => {
    let active = true
    lastBackupAt(appDatabase()).then(
      (at) => {
        if (active) {
          setLast(at ?? null)
        }
      },
      () => {
        if (active) {
          setLast(null)
        }
      },
    )
    return () => {
      active = false
    }
  }, [])

  const make = async (how: How) => {
    setBusy(true)
    setNotice(undefined)
    try {
      const db = appDatabase()
      const now = new Date()
      const backup = await collectBackup(db, {
        now,
        appVersion: BUILD_ID,
        settings: { theme: getThemePreference() },
      })
      const name = backupFileName(now)
      const text = serializeBackup(backup)
      if (how === 'share') {
        await navigator.share({
          files: [backupFile(text, name)],
          title: 'Back-up van Lingua Atlas',
        })
      } else {
        download(text, name)
      }
      await markBackupMade(db, now.getTime())
      setLast(now.getTime())
      setNotice(
        how === 'share'
          ? `Gedeeld: ${name}`
          : `Gedownload: ${name}. Je vindt het bij je downloads.`,
      )
    } catch (error) {
      // Annuleren in het deelmenu is geen fout.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        void logError(error)
        setNotice(
          'De back-up is niet gelukt. De melding staat in het foutenlogboek.',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  const button = (how: How, label: string) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        void make(how)
      }}
      className="min-h-11 rounded-full px-3 text-subhead font-semibold text-tint transition-colors hover:bg-muted disabled:opacity-50"
    >
      {label}
    </button>
  )

  return (
    <GroupedSection
      id="back-up"
      title="Back-up"
      footer="Een back-up is één bestand met je gegevens van dit apparaat. Bewaar het buiten de app, bijvoorbeeld in iCloud Drive of OneDrive. Op de iPad kun je Delen kiezen en dan Bewaar in Bestanden. Nu staan je instellingen erin; je leervoortgang komt erbij zodra er lessen zijn."
    >
      <GroupedRow>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span>Laatste back-up</span>
          <span className="text-secondary">
            {last === undefined && '…'}
            {last === null && 'Nog niet gemaakt'}
            {typeof last === 'number' && TIME.format(last)}
          </span>
        </div>
      </GroupedRow>
      <GroupedRow>
        <div className="-my-2 -ms-3 flex flex-wrap">
          {button('download', 'Downloaden')}
          {shareable && button('share', 'Delen…')}
        </div>
        {notice !== undefined && (
          <p role="status" className="mt-1 text-footnote text-secondary">
            {notice}
          </p>
        )}
      </GroupedRow>
    </GroupedSection>
  )
}
