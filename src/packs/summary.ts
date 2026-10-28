/**
 * Wat de app over een taalpakket weet: de uitkomst van de controle, zonder de
 * inhoud zelf. Het bouwen maakt deze samenvatting (scripts/packs.ts), zodat de
 * app de controle niet zelf hoeft te draaien.
 *
 * Dit bestand heeft geen bouwstenen nodig, zodat de app het kan gebruiken.
 */

export type EffectiveStatus =
  'draft' | 'auto-checked' | 'source-verified' | 'expert-reviewed'

/** De statussen van laag naar hoog. */
export const STATUS_ORDER = [
  'draft',
  'auto-checked',
  'source-verified',
  'expert-reviewed',
] as const satisfies readonly EffectiveStatus[]

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  draft: 'Concept',
  'auto-checked': 'Automatisch gecontroleerd',
  'source-verified': 'Bron-geverifieerd',
  'expert-reviewed': 'Expert-beoordeeld',
}

/** Wat een status betekent, als vervolg op de naam: "Concept: nog niet gecontroleerd." */
export const STATUS_DESCRIPTIONS: Record<EffectiveStatus, string> = {
  draft: 'nog niet gecontroleerd.',
  'auto-checked':
    'de vorm klopt, zoals de tekens en de antwoorden; de taal zelf heeft nog geen mens nagekeken.',
  'source-verified': 'nagelopen tegen een gezaghebbende bron.',
  'expert-reviewed': 'beoordeeld door een deskundige.',
}

export interface PackCounts {
  sources: number
  words: number
  sentences: number
  units: number
  lessons: number
  exercises: number
}

export interface PackSummary {
  version: string
  counts: PackCounts
  /** Status van de taalgegevens en de namen in pack.json. */
  manifestStatuses: { language: EffectiveStatus; names: EffectiveStatus }
  /** Aantal lesonderdelen per status. */
  statuses: Record<EffectiveStatus, number>
}

/** De laagste van een reeks statussen; zonder statussen is dat Concept. */
export function lowestOf(statuses: Iterable<EffectiveStatus>): EffectiveStatus {
  const present = new Set(statuses)
  return STATUS_ORDER.find((status) => present.has(status)) ?? 'draft'
}

/**
 * De laagste status van alles in het pakket, de taalgegevens meegerekend.
 * Zo belooft de app nooit meer dan voor elk onderdeel geldt.
 */
export function lowestStatus(summary: PackSummary): EffectiveStatus {
  return lowestOf([
    summary.manifestStatuses.language,
    summary.manifestStatuses.names,
    ...STATUS_ORDER.filter((status) => summary.statuses[status] > 0),
  ])
}
