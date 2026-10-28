// Inlezen, samenvatten en omzetten van de taalpakketten in content/packs.
//
// - Het controlescript (pakketten.ts) leest de pakketten hiermee in.
// - Bij het bouwen levert de Vite-plug-in hieronder per pakket een
//   samenvatting en een lespakket. Zo krijgt de app gecontroleerde inhoud met
//   de status van elk onderdeel, zonder de controle zelf te draaien. Een
//   pakket met fouten laat het bouwen mislukken.

import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { Plugin } from 'vite'
import { checkPack, type PackReport } from '../src/packs/check.ts'
import { compilePack } from '../src/packs/compile.ts'
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

// Modules die niet als bestand bestaan. Het nulteken vooraan is de afspraak
// daarvoor in Vite.
const NUL = String.fromCharCode(0)
/** De samenvattingen van alle pakketten. */
const SUMMARIES_ID = 'virtual:lingua-atlas/packs'
/** Per pakket een functie die het lespakket laadt, pas als de app het nodig heeft. */
const LOADERS_ID = 'virtual:lingua-atlas/pack-loaders'
/** Het lespakket van één taal, zoals virtual:lingua-atlas/pack/es. */
const PACK_PREFIX = 'virtual:lingua-atlas/pack/'

/** Of een module van deze plug-in is. */
function isPackModule(id: string): boolean {
  return id === SUMMARIES_ID || id === LOADERS_ID || id.startsWith(PACK_PREFIX)
}

interface BuildContext {
  addWatchFile(id: string): void
  error(message: string): never
}

/** Leest en controleert een pakket. Bij fouten stopt het bouwen. */
async function checkedPack(
  context: BuildContext,
  root: string,
  folder: string,
): Promise<PackReport> {
  const files = await readPack(root, folder)
  for (const name of files.keys()) {
    context.addWatchFile(join(packsDir(root), folder, name))
  }
  const report = checkPack({ folder, files }, { today: today() })
  if (report.issues.some((issue) => issue.severity === 'error')) {
    context.error(
      `Het taalpakket ${folder} heeft fouten. Draai npm run pakketten voor de details.`,
    )
  }
  return report
}

/** Vite-plug-in voor de samenvattingen en de lespakketten. */
export function languagePacks(): Plugin {
  let root = process.cwd()
  return {
    name: 'lingua-atlas-packs',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return isPackModule(id) ? NUL + id : null
    },
    async load(id) {
      const name = id.slice(1)
      if (!id.startsWith(NUL) || !isPackModule(name)) {
        return null
      }
      const folders = await listPacks(root)

      if (name === SUMMARIES_ID) {
        const summaries: Record<string, PackSummary> = {}
        for (const folder of folders) {
          const summary = summarize(await checkedPack(this, root, folder))
          if (summary === undefined) {
            this.error(`Het taalpakket ${folder} heeft geen geldig pack.json.`)
          }
          summaries[folder] = summary
        }
        return `export default ${JSON.stringify(summaries)}`
      }

      if (name === LOADERS_ID) {
        const lines = folders.map(
          (folder) =>
            `  ${JSON.stringify(folder)}: () => import(${JSON.stringify(PACK_PREFIX + folder)}),`,
        )
        return `export default {\n${lines.join('\n')}\n}`
      }

      if (name.startsWith(PACK_PREFIX)) {
        const folder = name.slice(PACK_PREFIX.length)
        if (!folders.includes(folder)) {
          this.error(`Er is geen taalpakket ${folder}.`)
        }
        const report = await checkedPack(this, root, folder)
        return `export default ${JSON.stringify(compilePack(report))}`
      }

      return null
    },
  }
}
