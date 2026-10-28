import { useEffect, useState, type ReactNode } from 'react'
import {
  formatBytes,
  readStorageInfo,
  requestPersistence,
  type StorageInfo,
} from './storage'
import { GroupedRow, GroupedSection } from './ui'

type Request = 'idle' | 'busy' | 'denied'

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <GroupedRow>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span>{label}</span>
        {children}
      </div>
    </GroupedRow>
  )
}

/** Een getal uit de browser, of "Onbekend" als de browser het niet geeft. */
function bytesOrUnknown(bytes: number | undefined, prefix = ''): string {
  return bytes === undefined ? 'Onbekend' : `${prefix}${formatBytes(bytes)}`
}

function persistedLabel(persisted: boolean | undefined): string {
  if (persisted === undefined) {
    return 'Onbekend'
  }
  return persisted ? 'Aan' : 'Uit'
}

/** Instellingen › Opslag: gebruik, bovengrens en blijvend bewaren. */
export function StorageSection() {
  const [info, setInfo] = useState<StorageInfo>()
  const [request, setRequest] = useState<Request>('idle')

  useEffect(() => {
    let active = true
    void readStorageInfo().then((next) => {
      if (active) {
        setInfo(next)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const ask = async () => {
    setRequest('busy')
    const granted = await requestPersistence()
    setInfo(await readStorageInfo())
    setRequest(granted === true ? 'idle' : 'denied')
  }

  const loading = info === undefined
  const value = (text: string) => (
    <span className="text-secondary">{loading ? '…' : text}</span>
  )

  return (
    <GroupedSection
      id="opslag"
      title="Opslag"
      footer="Met blijvend bewaren wist de browser je gegevens niet vanzelf, ook niet bij plaatsgebrek of als je de app een tijd niet gebruikt. De browser beslist of Lingua Atlas dat krijgt; als geïnstalleerde app lukt het meestal. De bovengrens is een schatting van de browser, geen garantie."
    >
      <InfoRow label="In gebruik">{value(bytesOrUnknown(info?.usage))}</InfoRow>
      <InfoRow label="Bovengrens">
        {value(bytesOrUnknown(info?.quota, 'ongeveer '))}
      </InfoRow>
      <GroupedRow>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span>Blijvend bewaren</span>
          <div className="flex items-center gap-2">
            {value(persistedLabel(info?.persisted))}
            {info?.persisted === false && (
              <button
                type="button"
                disabled={request === 'busy'}
                onClick={() => {
                  void ask()
                }}
                className="-my-2 -me-3 min-h-11 rounded-full px-3 text-subhead font-semibold text-tint transition-colors hover:bg-muted disabled:opacity-50"
              >
                Aanvragen
              </button>
            )}
          </div>
        </div>
        {request === 'denied' && (
          <p role="status" className="mt-1 text-footnote text-secondary">
            De browser heeft het nu niet toegestaan.
          </p>
        )}
      </GroupedRow>
    </GroupedSection>
  )
}
