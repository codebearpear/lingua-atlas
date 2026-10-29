import { useEffect, useState } from 'react'
import { appDatabase } from '../data/appDatabase'
import { logError } from '../data/errorLog'
import { loadMemory } from '../data/memory'
import type { MemoryCard } from '../engine/memory'

export interface MemorySnapshot {
  cards: ReadonlyMap<string, MemoryCard>
  /** Het moment waar "nu" en "vandaag" van uitgaan. */
  now: number
}

/**
 * Je herhaalkaarten: undefined zolang ze laden, null als dat mislukte. Komt
 * de app weer in beeld, dan rekent hij opnieuw; en elke minuut schuift "nu"
 * mee, zodat een kaart in de leerfase op tijd aan de beurt is.
 */
export function useMemory(): MemorySnapshot | null | undefined {
  const [snapshot, setSnapshot] = useState<MemorySnapshot | null>()

  useEffect(() => {
    let active = true
    const load = () => {
      loadMemory(appDatabase()).then(
        (cards) => {
          if (active) {
            setSnapshot({ cards, now: Date.now() })
          }
        },
        (error: unknown) => {
          void logError(error, 'Herhaalkaarten berekenen')
          if (active) {
            setSnapshot(null)
          }
        },
      )
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        load()
      }
    }
    load()
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(() => {
      setSnapshot((current) =>
        current === null || current === undefined
          ? current
          : { ...current, now: Date.now() },
      )
    }, 60_000)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }, [])

  return snapshot
}
