import { describe, expect, it } from 'vitest'
import { checkPack } from '../packs/check'

// Het Spaanse voorbeeldpakket laat zien hoe een pakket eruitziet. Het hoort
// daarom zonder fouten en zonder waarschuwingen door de controle te komen.
const FILES = import.meta.glob<string>('/content/packs/es/**/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})

describe('het Spaanse voorbeeldpakket', () => {
  it('doorstaat alle controles zonder fouten of waarschuwingen', () => {
    const files = new Map(
      Object.entries(FILES).map(([path, text]) => [
        path.replace('/content/packs/es/', ''),
        text,
      ]),
    )
    const report = checkPack({ folder: 'es', files }, { today: '2026-10-28' })
    expect(report.issues).toEqual([])
    expect(report.counts.lessons).toBeGreaterThan(0)
    expect(report.statuses.draft).toBe(0)
  })
})
