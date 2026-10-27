import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
  }
}

function getHash(): string {
  return window.location.hash
}

/** De huidige hash uit de adresbalk. De component tekent opnieuw bij elke wijziging. */
export function useHashLocation(): string {
  return useSyncExternalStore(subscribe, getHash)
}
