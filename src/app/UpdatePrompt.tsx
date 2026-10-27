import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Meldt wanneer de app klaar is voor offline gebruik en wanneer er een nieuwe
 * versie klaarstaat. De melding zweeft boven de tabbalk (smal scherm) of
 * onderaan naast de zijbalk (breed scherm).
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:bottom-[max(1rem,env(safe-area-inset-bottom))] lg:ps-[20.5rem]"
    >
      {(offlineReady || needRefresh) && (
        <div className="glass pointer-events-auto flex max-w-xl flex-wrap items-center gap-x-4 gap-y-2 rounded-[1.375rem] py-2.5 ps-5 pe-2.5">
          <p className="flex-1 basis-56 text-subhead">
            {needRefresh
              ? 'Er staat een nieuwe versie van Lingua Atlas klaar.'
              : 'Lingua Atlas werkt nu ook zonder internet.'}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={close}
              className="min-h-11 rounded-full px-4 text-subhead font-semibold text-tint transition-colors hover:bg-muted"
            >
              {needRefresh ? 'Later' : 'Sluiten'}
            </button>
            {needRefresh && (
              <button
                type="button"
                onClick={() => {
                  void updateServiceWorker(true)
                }}
                className="min-h-11 rounded-full bg-tint-fill px-5 text-subhead font-semibold text-on-tint transition-opacity active:opacity-80"
              >
                Vernieuwen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
