/**
 * Modules en waarden die niet als bestand bestaan, maar die Vite tijdens het
 * bouwen maakt.
 */

/** Samenvatting van de taalpakketten, gemaakt door scripts/packs.ts. */
declare module 'virtual:lingua-atlas/packs' {
  const summaries: unknown
  export default summaries
}

/** De versie van de app, ingevuld door vite.config.ts. */
declare const __BUILD_ID__: string
