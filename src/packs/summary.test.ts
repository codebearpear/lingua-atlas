import { describe, expect, it } from 'vitest'
import { lowestStatus, type PackSummary } from './summary'

function summary(
  statuses: Partial<PackSummary['statuses']>,
  manifest: PackSummary['manifestStatuses'] = {
    language: 'source-verified',
    names: 'source-verified',
  },
): PackSummary {
  return {
    version: '0.1.0',
    counts: {
      sources: 1,
      words: 0,
      sentences: 0,
      units: 0,
      lessons: 0,
      exercises: 0,
    },
    manifestStatuses: manifest,
    statuses: {
      draft: 0,
      'auto-checked': 0,
      'source-verified': 0,
      'expert-reviewed': 0,
      ...statuses,
    },
  }
}

describe('lowestStatus', () => {
  it('geeft de status van de taalgegevens als er nog geen lesstof is', () => {
    expect(lowestStatus(summary({}))).toBe('source-verified')
  })

  it('belooft nooit meer dan voor elk onderdeel geldt', () => {
    expect(
      lowestStatus(summary({ 'expert-reviewed': 5, 'auto-checked': 1 })),
    ).toBe('auto-checked')
    expect(lowestStatus(summary({ draft: 1, 'expert-reviewed': 20 }))).toBe(
      'draft',
    )
  })

  it('rekent ook de namen van de taal mee', () => {
    expect(
      lowestStatus(
        summary(
          { 'source-verified': 3 },
          { language: 'source-verified', names: 'auto-checked' },
        ),
      ),
    ).toBe('auto-checked')
  })
})
