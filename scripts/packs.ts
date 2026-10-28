// Inlezen en samenvatten van de taalpakketten in content/packs.
//
// - Het controlescript (pakketten.ts) leest de pakketten hiermee in.
// - Bij het bouwen maakt de Vite-plug-in hieronder een samenvatting per
//   pakket. Zo kan de app de inhoud en de status tonen zonder de controle zelf
//   te draaien. Een pakket met fouten laat het bouwen mislukken.

import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { Plugin } from 'vite'
import { checkPack, type PackReport } from '../src/packs/check.ts'
import type { PackSummary } from '../src/packs/summary.ts'

/** De map met pakketten, vanaf de hoofdmap van het project. */
export function packsDir(root: string): string {
  return join(root, 'content', 'packs')
}

/** De namen van de pakketmappen, op volgorde. */
export async function listPacks(root: string): Promise<string[]> {
  const entries = await readdir(packsDir(root), { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

/** Alle bestanden van één pakket: het pad met / als scheidingsteken, en de inhoud. */
export async function readPack(
  root: string,
  folder: string,
): Promise<Map<string, string>> {
  const dir = join(packsDir(root), folder)
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  const names: string[] = []
  for (const entry of entries) {
    if (entry.isFile()) {
      names.push(
        relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'),
      )
    }
  }
  const files = new Map<string, string>()
  for (const name of names.sort()) {
    files.set(name, await readFile(join(dir, name), 'utf8'))
  }
  return files
}

/** De datum van vandaag als JJJJ-MM-DD. */
export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Wat de app van een gecontroleerd pakket nodig heeft. */
export function summarize(report: PackReport): PackSummary | undefined {
  if (report.manifest === undefined || report.manifestStatuses === undefined) {
    return undefined
  }
  return {
    version: report.manifest.version,
    counts: report.counts,
    manifestStatuses: report.manifestStatuses,
    statuses: report.statuses,
  }
}

const VIRTUAL_ID = 'virtual:lingua-atlas/packs'
// Het nulteken vooraan is de afspraak voor modules die niet als bestand bestaan.
const RESOLVED_ID = String.fromCharCode(0) + VIRTUAL_ID

/** Vite-plug-in voor de module virtual:lingua-atlas/packs. */
export function packSummaries(): Plugin {
  let root = process.cwd()
  return {
    name: 'lingua-atlas-packs',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null
    },
    async load(id) {
      if (id !== RESOLVED_ID) {
        return null
      }
      const summaries: Record<string, PackSummary> = {}
      for (const folder of await listPacks(root)) {
        const files = await readPack(root, folder)
        for (const name of files.keys()) {
          this.addWatchFile(join(packsDir(root), folder, name))
        }
        const report = checkPack({ folder, files }, { today: today() })
        const summary = summarize(report)
        if (
          summary === undefined ||
          report.issues.some((issue) => issue.severity === 'error')
        ) {
          this.error(
            `Het taalpakket ${folder} heeft fouten. Draai npm run pakketten voor de details.`,
          )
        }
        summaries[folder] = summary
      }
      return `export default ${JSON.stringify(summaries)}`
    },
  }
}
