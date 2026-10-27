import { useEffect } from 'react'

/** Zet de titel van het venster of tabblad, bijvoorbeeld "Instellingen · Lingua Atlas". */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · Lingua Atlas`
  }, [title])
}
