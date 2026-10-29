import { describe, expect, it } from 'vitest'
import { count, dueLabel, momentLabel } from './format'

const ZONE = 'Europe/Amsterdam'

/** Een tijdstip in UTC: jaar, maand (1-12), dag, uur en minuut. */
function utc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number {
  return Date.UTC(year, month - 1, day, hour, minute)
}

describe('count', () => {
  it('kiest enkelvoud of meervoud', () => {
    expect(count(1, 'les', 'lessen')).toBe('1 les')
    expect(count(0, 'les', 'lessen')).toBe('0 lessen')
    expect(count(3, 'les', 'lessen')).toBe('3 lessen')
  })
})

describe('momentLabel', () => {
  // Woensdag 28 oktober 2026, 22:31 in Nederland (wintertijd, UTC+1).
  const NOW = utc(2026, 10, 28, 21, 31)

  it('noemt vandaag en gisteren bij naam', () => {
    expect(momentLabel(utc(2026, 10, 28, 8, 5), NOW, ZONE)).toBe(
      'vandaag om 09:05',
    )
    expect(momentLabel(utc(2026, 10, 27, 22, 59), NOW, ZONE)).toBe(
      'gisteren om 23:59',
    )
  })

  it('kijkt naar de dag in Nederland, niet in UTC', () => {
    // 23:30 UTC op 27 oktober is 0:30 op 28 oktober in Nederland.
    expect(momentLabel(utc(2026, 10, 27, 23, 30), NOW, ZONE)).toBe(
      'vandaag om 00:30',
    )
  })

  it('geeft de datum bij eerdere dagen, met het jaar als dat anders is', () => {
    expect(momentLabel(utc(2026, 10, 26, 13, 5), NOW, ZONE)).toBe(
      'op 26 oktober om 14:05',
    )
    expect(momentLabel(utc(2025, 12, 31, 22, 0), NOW, ZONE)).toBe(
      'op 31 december 2025 om 23:00',
    )
  })

  it('vindt gisteren ook over de overgang naar wintertijd heen', () => {
    // Zondag 25 oktober 2026 duurde 25 uur. Om 23:30 die avond was 23:30 de
    // dag ervoor precies 25 uur eerder.
    const lateSunday = utc(2026, 10, 25, 22, 30)
    expect(momentLabel(utc(2026, 10, 24, 21, 30), lateSunday, ZONE)).toBe(
      'gisteren om 23:30',
    )
  })

  it('vindt gisteren ook over een maand- en jaargrens heen', () => {
    expect(
      momentLabel(utc(2026, 10, 31, 19, 0), utc(2026, 11, 1, 7, 0), ZONE),
    ).toBe('gisteren om 20:00')
    expect(
      momentLabel(utc(2026, 12, 31, 21, 0), utc(2027, 1, 1, 9, 0), ZONE),
    ).toBe('gisteren om 22:00')
  })
})

describe('dueLabel', () => {
  // Donderdag 29 oktober 2026, 10:00 in Nederland.
  const NOW = utc(2026, 10, 29, 9, 0)

  it('telt bij een gewone kaart alleen de dag', () => {
    expect(dueLabel(utc(2026, 10, 28, 9, 0), NOW, true, ZONE)).toBe('nu')
    expect(dueLabel(utc(2026, 10, 29, 20, 0), NOW, true, ZONE)).toBe('nu')
    expect(dueLabel(utc(2026, 10, 30, 7, 0), NOW, true, ZONE)).toBe('morgen')
    expect(dueLabel(utc(2026, 11, 1, 9, 0), NOW, true, ZONE)).toBe(
      'over 3 dagen',
    )
    expect(dueLabel(utc(2026, 11, 11, 9, 0), NOW, true, ZONE)).toBe(
      'over 13 dagen',
    )
    expect(dueLabel(utc(2026, 11, 12, 9, 0), NOW, true, ZONE)).toBe(
      'op 12 november',
    )
    expect(dueLabel(utc(2027, 2, 3, 9, 0), NOW, true, ZONE)).toBe(
      'op 3 februari 2027',
    )
  })

  it('geeft bij een kaart in de leerfase ook de tijd', () => {
    expect(dueLabel(utc(2026, 10, 29, 8, 59), NOW, false, ZONE)).toBe('nu')
    expect(dueLabel(utc(2026, 10, 29, 9, 10), NOW, false, ZONE)).toBe(
      'vandaag om 10:10',
    )
    // 23:05 UTC is 0:05 op 30 oktober in Nederland.
    expect(dueLabel(utc(2026, 10, 29, 23, 5), NOW, false, ZONE)).toBe(
      'morgen om 00:05',
    )
    expect(dueLabel(utc(2026, 11, 5, 13, 0), NOW, false, ZONE)).toBe(
      'op 5 november om 14:00',
    )
  })

  it('telt kalenderdagen, niet etmalen', () => {
    // Om 23:30 is een kaart om 0:30 al morgen.
    const late = utc(2026, 10, 29, 22, 30)
    expect(dueLabel(utc(2026, 10, 29, 23, 30), late, true, ZONE)).toBe('morgen')
  })
})
