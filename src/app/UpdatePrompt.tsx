import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdatePrompt.css'

/**
 * Meldt wanneer de app klaar is voor offline gebruik
 * en wanneer er een nieuwe versie klaarstaat.
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
    <div className="update-prompt-region" role="status">
      {(offlineReady || needRefresh) && (
        <div className="update-prompt">
          <p className="update-prompt__text">
            {needRefresh
              ? 'Er staat een nieuwe versie van Lingua Atlas klaar.'
              : 'Lingua Atlas werkt nu ook zonder internet.'}
          </p>
          <div className="update-prompt__actions">
            {needRefresh && (
              <button
                type="button"
                className="update-prompt__button update-prompt__button--primary"
                onClick={() => {
                  void updateServiceWorker(true)
                }}
              >
                Vernieuwen
              </button>
            )}
            <button
              type="button"
              className="update-prompt__button"
              onClick={close}
            >
              {needRefresh ? 'Later' : 'Sluiten'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
