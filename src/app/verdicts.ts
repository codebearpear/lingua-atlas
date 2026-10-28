/** Hoe de app een oordeel van de antwoordcontrole toont. */
import type { Verdict } from '../engine/answers'
import type { SymbolName } from './Icons'

/** Per oordeel het woord, het pictogram en de kleuren. */
export const VERDICTS: Record<
  Verdict,
  {
    label: string
    icon: SymbolName
    tone: string
    panel: string
    border: string
  }
> = {
  correct: {
    label: 'Goed',
    icon: 'checkmark-circle',
    tone: 'text-positive',
    panel: 'bg-positive/10',
    border: 'border-positive',
  },
  almost: {
    label: 'Bijna goed',
    icon: 'exclamation-circle',
    tone: 'text-caution',
    panel: 'bg-caution/10',
    border: 'border-caution',
  },
  wrong: {
    label: 'Fout',
    icon: 'xmark-circle',
    tone: 'text-destructive',
    panel: 'bg-destructive/10',
    border: 'border-destructive',
  },
}

/** De oordelen van goed naar fout. */
export const VERDICT_ORDER: readonly Verdict[] = ['correct', 'almost', 'wrong']

/** "2 goed · 1 bijna goed · 0 fout" */
export function countsText(counts: Record<Verdict, number>): string {
  return `${counts.correct} goed · ${counts.almost} bijna goed · ${counts.wrong} fout`
}
