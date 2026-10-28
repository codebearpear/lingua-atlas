/** Hulpjes om getallen en lijsten als Nederlandse tekst te schrijven. */

/** "1 les", "2 lessen". */
export function count(amount: number, one: string, many: string): string {
  return `${amount} ${amount === 1 ? one : many}`
}

const LIST = new Intl.ListFormat('nl', { type: 'conjunction' })

/** "Mexico, Colombia en Peru". */
export function joinList(items: readonly string[]): string {
  return LIST.format(items)
}

const REGIONS = new Intl.DisplayNames('nl', { type: 'region' })

/** De Nederlandse naam van een land, zoals "Mexico" voor MX. */
export function regionName(code: string): string {
  return REGIONS.of(code) ?? code
}
