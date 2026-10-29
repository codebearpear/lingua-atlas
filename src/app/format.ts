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

/** Een kalenderdag (JJJJ-MM-DD) als dagnummer, om dagen te kunnen tellen. */
function dayNumber(day: string): number {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  return Date.UTC(year, month - 1, date) / 86_400_000
}

/**
 * Hoeveel kalenderdagen het ene tijdstip na het andere ligt, ook over een
 * maand- of jaargrens en de overgang naar zomer- of wintertijd.
 */
function daysAfter(
  time: number,
  reference: number,
  timeZone: string | undefined,
): number {
  return (
    dayNumber(calendarDay(time, timeZone)) -
    dayNumber(calendarDay(reference, timeZone))
  )
}

function clockTime(time: number, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(time)
}

/** "26 oktober", met het jaar erbij als dat een ander is dan dat van reference. */
function dateLabel(
  time: number,
  reference: number,
  timeZone: string | undefined,
): string {
  const sameYear =
    calendarDay(time, timeZone).slice(0, 4) ===
    calendarDay(reference, timeZone).slice(0, 4)
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: sameYear ? undefined : 'numeric',
    timeZone,
  }).format(time)
}

/**
 * Wanneer een herhaalkaart terugkomt: "nu", "vandaag om 14:20", "morgen",
 * "over 3 dagen" of "op 12 november". Met byDay telt alleen de dag, zoals bij
 * een gewone kaart, die je de hele dag kunt herhalen; anders ook de tijd,
 * zoals bij een kaart in de leerfase.
 */
export function dueLabel(
  due: number,
  now: number,
  byDay: boolean,
  timeZone?: string,
): string {
  const days = daysAfter(due, now, timeZone)
  if (byDay) {
    if (days <= 0) {
      return 'nu'
    }
    if (days === 1) {
      return 'morgen'
    }
    return days < 14
      ? `over ${days} dagen`
      : `op ${dateLabel(due, now, timeZone)}`
  }
  if (due <= now) {
    return 'nu'
  }
  const clock = clockTime(due, timeZone)
  if (days === 0) {
    return `vandaag om ${clock}`
  }
  if (days === 1) {
    return `morgen om ${clock}`
  }
  return `op ${dateLabel(due, now, timeZone)} om ${clock}`
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
  const clock = clockTime(time, timeZone)
  const days = daysAfter(time, now, timeZone)
  if (days === 0) {
    return `vandaag om ${clock}`
  }
  if (days === -1) {
    return `gisteren om ${clock}`
  }
  return `op ${dateLabel(time, now, timeZone)} om ${clock}`
}
