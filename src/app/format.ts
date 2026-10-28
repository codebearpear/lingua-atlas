/** Hulpjes om getallen, lijsten en tijden als Nederlandse tekst te schrijven. */

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

/** De kalenderdag van een tijdstip als JJJJ-MM-DD, in de tijdzone van het apparaat. */
function calendarDay(time: number, timeZone: string | undefined): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(time)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((found) => found.type === type)?.value ?? '00'
  return `${part('year')}-${part('month')}-${part('day')}`
}

/** De dag voor een kalenderdag, ook over een maand- of jaargrens. */
function dayBefore(day: string): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, date - 1))
    .toISOString()
    .slice(0, 10)
}

/**
 * Wanneer iets gebeurde, zoals op een iPad: "vandaag om 14:05", "gisteren om
 * 09:30" of "op 26 oktober om 14:05", met het jaar erbij als het niet dit
 * jaar was.
 */
export function momentLabel(
  time: number,
  now: number = Date.now(),
  timeZone?: string,
): string {
  const clock = new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(time)
  const day = calendarDay(time, timeZone)
  const today = calendarDay(now, timeZone)
  if (day === today) {
    return `vandaag om ${clock}`
  }
  if (day === dayBefore(today)) {
    return `gisteren om ${clock}`
  }
  const date = new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: day.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
    timeZone,
  }).format(time)
  return `op ${date} om ${clock}`
}
