/**
 * De lespakketten per taal. De app laadt een pakket pas als je de taal opent;
 * daarna blijft het bewaard, ook zonder internet (de service worker heeft het).
 */
import { useEffect, useState } from 'react'
import loaders from 'virtual:lingua-atlas/pack-loaders'
import { logError } from '../data/errorLog'
import type { CompiledPack } from '../packs/compiled'
import type { LanguageCode } from './languages'

const loading = new Map<LanguageCode, Promise<CompiledPack>>()
/** Pakketten die al binnen zijn, zodat een pagina ze meteen kan tonen. */
const ready = new Map<LanguageCode, CompiledPack>()

export function loadCoursePack(code: LanguageCode): Promise<CompiledPack> {
  let pack = loading.get(code)
  if (pack === undefined) {
    const loader = loaders[code]
    const request: Promise<{ default: unknown }> =
      loader === undefined
        ? Promise.reject(
            new Error(`Het lespakket content/packs/${code} ontbreekt.`),
          )
        : loader()
    pack = request.then((module) => {
      const loaded = module.default as CompiledPack
      ready.set(code, loaded)
      return loaded
    })
    pack.catch((error: unknown) => {
      // Een mislukte poging niet bewaren, zodat opnieuw proberen kan.
      loading.delete(code)
      void logError(error, `Lespakket ${code} laden`)
    })
    loading.set(code, pack)
  }
  return pack
}

export type CoursePackState =
  | { state: 'loading' }
  | { state: 'ready'; pack: CompiledPack }
  | { state: 'error'; error: unknown }

/** Het lespakket van een taal, met de toestand van het laden. */
export function useCoursePack(code: LanguageCode): CoursePackState {
  const [failure, setFailure] = useState<{
    code: LanguageCode
    error: unknown
  }>()
  // Alleen om opnieuw te tekenen zodra een pakket binnen is.
  const [, setLoaded] = useState<LanguageCode>()

  useEffect(() => {
    if (ready.has(code)) {
      return
    }
    let active = true
    loadCoursePack(code).then(
      () => {
        if (active) {
          setLoaded(code)
        }
      },
      (error: unknown) => {
        if (active) {
          setFailure({ code, error })
        }
      },
    )
    return () => {
      active = false
    }
  }, [code])

  // Een pakket dat al binnen is, staat er meteen; zo komt terug naar een
  // pagina uit op de plek waar je was.
  const pack = ready.get(code)
  if (pack !== undefined) {
    return { state: 'ready', pack }
  }
  if (failure?.code === code) {
    return { state: 'error', error: failure.error }
  }
  return { state: 'loading' }
}
