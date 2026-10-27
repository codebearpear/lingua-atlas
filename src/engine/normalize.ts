/**
 * Maakt een antwoord vergelijkbaar met de antwoordsleutel.
 *
 * - Unicode-normalisatie (NFC): hetzelfde teken krijgt altijd dezelfde code,
 *   ook als het op twee manieren getypt kan worden (zoals é of 한).
 * - Witruimte aan begin en eind verdwijnt; meerdere spaties worden één spatie.
 *
 * Hoofdletters en leestekens blijven bewust staan: die regels verschillen per
 * taal en komen later in de taalpakketten.
 */
export function normalizeAnswer(input: string): string {
  return input.normalize('NFC').trim().replace(/\s+/gu, ' ')
}
