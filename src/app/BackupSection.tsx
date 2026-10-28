import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { appDatabase } from '../data/appDatabase'
import {
  backupFileName,
  describeBackup,
  serializeBackup,
  type Backup,
} from '../data/backup'
import {
  BACKUP_TABLES,
  collectBackup,
  lastBackupAt,
  markBackupMade,
} from '../data/backupStore'
import { logError } from '../data/errorLog'
import { restoreTables, type RestoreMode } from '../data/restore'
import { getThemePreference, setThemePreference } from './themeStore'
import { GroupedRow, GroupedSection } from './ui'
import { BUILD_ID } from './version'

type How = 'download' | 'share'

const TIME = new Intl.DateTimeFormat('nl-NL', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const BUTTON_SHAPE =
  'min-h-11 rounded-full px-3 text-subhead font-semibold transition-colors hover:bg-muted disabled:opacity-50'

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

function Button({
  children,
  onClick,
  disabled,
  destructive = false,
}: {
  children: ReactNode
  onClick: () => Promise<void> | void
  disabled?: boolean
  /** Voor een actie die iets weghaalt, in rood. */
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        void onClick()
      }}
      className={`${BUTTON_SHAPE} ${destructive ? 'text-destructive' : 'text-tint'}`}
    >
      {children}
    </button>
  )
}

/** Instellingen › Back-up: een back-upbestand maken, bewaren en terugzetten. */
export function BackupSection() {
  // undefined: nog aan het laden; null: nog nooit een back-up gemaakt
  const [last, setLast] = useState<number | null>()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string>()
  const [pending, setPending] = useState<Backup>()
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

  const fail = (error: unknown, what: string) => {
    void logError(error)
    setNotice(`${what} is niet gelukt. De melding staat in het foutenlogboek.`)
  }

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
        fail(error, 'De back-up')
      }
    } finally {
      setBusy(false)
    }
  }

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Leegmaken, zodat je hetzelfde bestand nog eens kunt kiezen.
    event.target.value = ''
    if (file === undefined) {
      return
    }
    setBusy(true)
    setNotice(undefined)
    setPending(undefined)
    try {
      // De controle laadt pas nu, zodat de app daar niet zwaarder van wordt.
      const { readBackup } = await import('../data/readBackup')
      const db = appDatabase()
      await db.open()
      const reading = await readBackup(await file.text(), {
        databaseVersion: db.verno,
      })
      if (reading.ok) {
        setPending(reading.backup)
      } else {
        setNotice(reading.message)
      }
    } catch (error) {
      fail(error, 'Het lezen van de back-up')
    } finally {
      setBusy(false)
    }
  }

  const restore = async (backup: Backup, mode: RestoreMode) => {
    setBusy(true)
    try {
      // Zonder records zet de app alleen de instellingen terug; je gegevens op
      // dit apparaat blijven dan staan.
      if (describeBackup(backup).hasRecords) {
        await restoreTables(appDatabase(), backup.tables, mode, BACKUP_TABLES)
      }
      // Bij samenvoegen blijven de instellingen van dit apparaat.
      if (mode === 'replace') {
        setThemePreference(backup.settings.theme ?? 'system')
      }
      setPending(undefined)
      setNotice(`Teruggezet uit de back-up van ${describeBackup(backup).made}.`)
    } catch (error) {
      fail(error, 'Het terugzetten')
    } finally {
      setBusy(false)
    }
  }

  const description =
    pending === undefined ? undefined : describeBackup(pending)

  return (
    <GroupedSection
      id="back-up"
      title="Back-up"
      footer="Een back-up is één bestand met je instellingen en je oefenrondes van dit apparaat. Bewaar het buiten de app, bijvoorbeeld in iCloud Drive of OneDrive; op de iPad kun je Delen kiezen en dan Bewaar in Bestanden. Bij terugzetten controleert de app het bestand en laat zien wat erin staat, voordat er iets verandert."
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
          <Button disabled={busy} onClick={() => make('download')}>
            Downloaden
          </Button>
          {shareable && (
            <Button disabled={busy} onClick={() => make('share')}>
              Delen…
            </Button>
          )}
          {/* Een label opent de bestandskiezer ook op de iPad betrouwbaar. */}
          <label
            className={`${BUTTON_SHAPE} inline-flex text-tint cursor-pointer items-center has-[:disabled]:opacity-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-tint`}
          >
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(event) => {
                void choose(event)
              }}
              className="sr-only"
            />
            Terugzetten…
          </label>
        </div>
        {notice !== undefined && (
          <p role="status" className="mt-1 text-footnote text-secondary">
            {notice}
          </p>
        )}
      </GroupedRow>
      {pending !== undefined && description !== undefined && (
        <GroupedRow>
          <div
            role="group"
            aria-label="Back-up terugzetten"
            className="space-y-2"
          >
            <p className="font-semibold">
              Back-up van {description.made} terugzetten?
            </p>
            <p className="text-footnote text-secondary">
              Gemaakt met versie {description.version}. Erin staat:{' '}
              {description.contents.length === 0
                ? 'niets'
                : description.contents.join(', ')}
              .
            </p>
            {description.hasRecords ? (
              <ul className="space-y-1 text-footnote text-secondary">
                <li>
                  Samenvoegen: wat in de back-up staat, komt erbij. Staat iets
                  op beide plaatsen, dan wint het nieuwste. Je instellingen op
                  dit apparaat blijven.
                </li>
                <li>
                  Vervangen: alles op dit apparaat wordt wat in de back-up
                  staat, ook je instellingen. Maak eerst een back-up als je wat
                  er nu staat wilt bewaren.
                </li>
              </ul>
            ) : (
              <p className="text-footnote text-secondary">
                Je instellingen worden die uit de back-up. Je oefenrondes op dit
                apparaat blijven staan.
              </p>
            )}
            <div className="-mb-2 -ms-3 flex flex-wrap">
              {description.hasRecords ? (
                <>
                  <Button
                    disabled={busy}
                    onClick={() => restore(pending, 'merge')}
                  >
                    Samenvoegen
                  </Button>
                  <Button
                    disabled={busy}
                    destructive
                    onClick={() => restore(pending, 'replace')}
                  >
                    Vervangen
                  </Button>
                </>
              ) : (
                <Button
                  disabled={busy}
                  onClick={() => restore(pending, 'replace')}
                >
                  Terugzetten
                </Button>
              )}
              <Button
                disabled={busy}
                onClick={() => {
                  setPending(undefined)
                }}
              >
                Annuleren
              </Button>
            </div>
          </div>
        </GroupedRow>
      )}
    </GroupedSection>
  )
}
