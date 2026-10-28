// Controleert alle taalpakketten in content/packs.
//
//   npm run pakketten
//
// Bij een fout stopt het met foutcode 1, zodat npm run check en GitHub dan
// niets publiceren. Een waarschuwing houdt publicatie niet tegen, maar het
// onderdeel blijft dan op Concept staan. De regels zelf staan in
// src/packs/check.ts en het formaat in src/packs/schema.ts.

import { join } from 'node:path'
import {
  STATUS_LABELS,
  STATUS_ORDER,
  checkPack,
  type PackReport,
} from '../src/packs/check.ts'
import { SCHEMA_VERSION } from '../src/packs/schema.ts'
import { listPacks, readPack, today } from './packs.ts'

const ROOT = join(import.meta.dirname, '..')

function count(amount: number, one: string, many: string): string {
  return `${amount} ${amount === 1 ? one : many}`
}

const CONTENT_FILE = /^(vocabulary\.json|sentences\.json|units\/.+\.json)$/

function contentSummary(
  report: PackReport,
  files: ReadonlyMap<string, string>,
): string {
  const { words, sentences, units, lessons, exercises } = report.counts
  if (words + sentences + units === 0) {
    const hasContent = [...files.keys()].some((name) => CONTENT_FILE.test(name))
    return hasContent
      ? 'Lesinhoud niet geteld: los eerst de fouten op.'
      : 'Nog geen lesinhoud.'
  }
  return [
    count(words, 'woord', 'woorden'),
    count(sentences, 'zin', 'zinnen'),
    count(units, 'eenheid', 'eenheden'),
    count(lessons, 'les', 'lessen'),
    count(exercises, 'oefening', 'oefeningen'),
  ].join(', ')
}

function statusSummary(report: PackReport): string | undefined {
  const parts = STATUS_ORDER.filter(
    (status) => report.statuses[status] > 0,
  ).map((status) => `${report.statuses[status]} ${STATUS_LABELS[status]}`)
  return parts.length === 0 ? undefined : parts.join(', ')
}

const folders = await listPacks(ROOT)

console.log(`Taalpakketten controleren (schemaversie ${SCHEMA_VERSION})`)
console.log('')

let errors = 0
let warnings = 0
for (const folder of folders) {
  const files = await readPack(ROOT, folder)
  const report = checkPack({ folder, files }, { today: today() })
  const packErrors = report.issues.filter(
    (issue) => issue.severity === 'error',
  ).length
  const packWarnings = report.issues.length - packErrors
  errors += packErrors
  warnings += packWarnings

  const name = report.manifest?.names.dutch ?? '(manifest ongeldig)'
  const version = report.manifest?.version ?? '-'
  const verdict =
    packErrors === 0
      ? 'in orde'
      : `${count(packErrors, 'fout', 'fouten')}, ${count(packWarnings, 'waarschuwing', 'waarschuwingen')}`
  console.log(
    `${packErrors === 0 ? '✓' : '✗'} ${folder.padEnd(3)} ${name.padEnd(10)} versie ${version}  ${verdict}`,
  )

  for (const issue of report.issues) {
    const where =
      issue.path === '' ? issue.file : `${issue.file} › ${issue.path}`
    const label = issue.severity === 'error' ? '✗ fout' : '! waarschuwing'
    console.log(`    ${label}  ${where}: ${issue.message}`)
  }
  if (report.manifestStatuses !== undefined) {
    console.log(
      `    Taalgegevens: ${STATUS_LABELS[report.manifestStatuses.language]} · Namen: ${STATUS_LABELS[report.manifestStatuses.names]}`,
    )
  }
  console.log(`    ${contentSummary(report, files)}`)
  const statuses = statusSummary(report)
  if (statuses !== undefined) {
    console.log(`    Status: ${statuses}`)
  }
}

console.log('')
console.log(
  `Samenvatting: ${count(folders.length, 'pakket', 'pakketten')}, ${count(errors, 'fout', 'fouten')}, ${count(warnings, 'waarschuwing', 'waarschuwingen')}.`,
)

if (folders.length === 0) {
  console.log('Er staan geen pakketten in content/packs.')
  process.exitCode = 1
} else if (errors > 0) {
  process.exitCode = 1
}
