/**
 * Regels voor tekst in een taalpakket, in welke taal ook.
 *
 * De regels per taal en schrift staan in scripts.ts. Een fout houdt
 * publicatie tegen; een waarschuwing houdt het onderdeel op Concept.
 */

export type Severity = 'error' | 'warning'

export interface TextProblem {
  severity: Severity
  message: string
}

export function codePoint(char: string): string {
  const code = char.codePointAt(0) ?? 0
  return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`
}

/** Het eerste stuurteken in de tekst, zoals een tab of regeleinde. */
function findControlChar(text: string): string | undefined {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      return char
    }
  }
  return undefined
}

/** Richtingstekens; de richting hoort bij lang en dir in de app. */
const BIDI_CHAR = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/u
/**
 * Een combinatieteken zonder letter ervoor, zoals een klinkerteken aan het
 * begin van een woord.
 */
const MARK_WITHOUT_BASE = /(?:^|[\s\p{P}\p{S}])(\p{M})/u
/** Het Birmaanse klinkerteken e; in Zawgyi staat het vóór de medeklinker. */
const MYANMAR_VOWEL_E = '\u1031'

/** De halve spatie (ZWNJ) uit het Perzisch, ook gebruikt in Devanagari. */
const ZWNJ = '\u200C'
const LETTER_OR_MARK = /[\p{L}\p{M}]/u

/** Een halve spatie die niet tussen twee letters staat. */
function hasLooseZwnj(text: string): boolean {
  const chars = Array.from(text)
  return chars.some((char, index) => {
    if (char !== ZWNJ) {
      return false
    }
    const before = chars[index - 1]
    const after = chars[index + 1]
    return (
      before === undefined ||
      after === undefined ||
      !LETTER_OR_MARK.test(before) ||
      !LETTER_OR_MARK.test(after)
    )
  })
}

/** Onzichtbare tekens die zelden bedoeld zijn: zacht afbreekstreepje, spatie zonder breedte, woordbinder, BOM. */
const INVISIBLE_CHAR = /[\u00AD\u200B\u2060\uFEFF]/u

export interface TextOptions {
  /**
   * Ook letten op typografie, zoals rechte aanhalingstekens. Niet bij bekende
   * foute antwoorden: die zijn met opzet fout.
   */
  typography?: boolean
}

/** Regels voor elke tekst in een pakket, in welke taal ook. */
export function checkText(
  text: string,
  { typography = true }: TextOptions = {},
): TextProblem[] {
  const problems: TextProblem[] = []
  if (text !== text.normalize('NFC')) {
    problems.push({
      severity: 'error',
      message:
        'Niet in Unicode-normaalvorm NFC. Sla de tekst op als NFC, zodat elk teken één vaste code heeft.',
    })
  }
  if (text !== text.trim()) {
    problems.push({
      severity: 'error',
      message: 'Spatie of regeleinde aan het begin of eind.',
    })
  }
  const control = findControlChar(text)
  if (control !== undefined) {
    problems.push({
      severity: 'error',
      message: `Bevat een stuurteken (${codePoint(control)}), zoals een tab of regeleinde. Zet losse alinea's in aparte velden.`,
    })
  }
  if (text.includes('  ')) {
    problems.push({
      severity: 'warning',
      message: 'Twee spaties achter elkaar.',
    })
  }
  const bidi = BIDI_CHAR.exec(text)
  if (bidi !== null) {
    problems.push({
      severity: 'warning',
      message: `Bevat een onzichtbaar richtingsteken (${codePoint(bidi[0])}). De app regelt de richting zelf met lang en dir.`,
    })
  }
  const invisible = INVISIBLE_CHAR.exec(text)
  if (invisible !== null) {
    problems.push({
      severity: 'warning',
      message: `Bevat een onzichtbaar teken (${codePoint(invisible[0])}). Is dat bedoeld?`,
    })
  }
  const loose = MARK_WITHOUT_BASE.exec(text)?.[1]
  if (loose !== undefined) {
    problems.push({
      severity: 'error',
      message:
        loose === MYANMAR_VOWEL_E
          ? 'Klinkerteken \u1031 (U+1031) aan het begin van een woord. In Unicode staat het n\u00e1 de medeklinker; dit wijst op Zawgyi-codering.'
          : `Teken zonder letter ervoor (${codePoint(loose)}), zoals een klinkerteken aan het begin van een woord.`,
    })
  }
  if (hasLooseZwnj(text)) {
    problems.push({
      severity: 'error',
      message:
        'Halve spatie (ZWNJ, U+200C) die niet tussen twee letters staat.',
    })
  }
  if (typography && text.includes('"')) {
    problems.push({
      severity: 'warning',
      message:
        'Recht aanhalingsteken ("). Gebruik \u201c \u201d (in het Duits \u201e \u201c).',
    })
  }
  if (typography && text.includes("'")) {
    problems.push({
      severity: 'warning',
      message: "Rechte apostrof ('). Gebruik \u2019.",
    })
  }
  return problems
}
