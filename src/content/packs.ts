/**
 * Per taal wat er in het taalpakket staat en hoe ver het is nagekeken. De
 * samenvatting komt uit de controle tijdens het bouwen (scripts/packs.ts).
 */
import rawSummaries from 'virtual:lingua-atlas/packs'
import type { PackSummary } from '../packs/summary'
import type { LanguageCode } from './languages'

const summaries = rawSummaries as Readonly<Partial<Record<string, PackSummary>>>

export function packSummary(code: LanguageCode): PackSummary {
  const summary = summaries[code]
  if (summary === undefined) {
    throw new Error(
      `De samenvatting van het taalpakket content/packs/${code} ontbreekt.`,
    )
  }
  return summary
}
