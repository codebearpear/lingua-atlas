/**
 * Doeltaal in Nederlandse tekst.
 *
 * In uitleg, doelen, notities en de teksten van oefeningen staat de doeltaal
 * tussen sterretjes: "*Hola* betekent hallo." Een foute vorm die de uitleg
 * wil laten zien, staat tussen tildes: "Schrijf niet ~adios~, maar *adiós*."
 * Een sterretje of tilde zelf schrijf je als \* of \~.
 *
 * De controle past op doeltaal de regels van het schrift toe, en laat foute
 * vormen met rust. De app toont beide in de taal en richting van het pakket,
 * zodat lettertype, schrijfrichting en voorlezen kloppen.
 *
 * Dit bestand heeft geen bouwstenen nodig, zodat de app het kan gebruiken.
 */

export type InlineKind = 'target' | 'wrong'

/** Een stuk tekst: Nederlands als gewone tekst, doeltaal en foute vormen gemarkeerd. */
export type InlinePart = string | { kind: InlineKind; text: string }

export type InlineText = InlinePart[]

const MARKERS = new Map<string, InlineKind>([
  ['*', 'target'],
  ['~', 'wrong'],
])

const MARKER_NAMES: Record<InlineKind, { one: string; example: string }> = {
  target: {
    one: 'Sterretje',
    example: 'zet doeltaal tussen twee sterretjes, zoals *hola*',
  },
  wrong: {
    one: 'Tilde',
    example: 'zet een foute vorm tussen twee tildes, zoals ~adios~',
  },
}

export interface InlineResult {
  parts: InlineText
  /** De eerste fout in de markering, als die er is. */
  problem?: string
}

/** Splitst tekst in Nederlandse stukken, doeltaal en foute vormen. */
export function parseInline(text: string): InlineResult {
  const parts: InlineText = []
  let plain = ''
  let open: { kind: InlineKind; marker: string; text: string } | undefined
  let problem: string | undefined

  const flush = (): void => {
    if (plain !== '') {
      parts.push(plain)
      plain = ''
    }
  }
  const fail = (message: string): void => {
    problem ??= message
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index)
    const next = text.charAt(index + 1)
    if (char === '\\' && MARKERS.has(next)) {
      // Een sterretje of tilde als gewoon teken
      if (open === undefined) {
        plain += next
      } else {
        open.text += next
      }
      index += 1
      continue
    }

    const kind = MARKERS.get(char)
    if (kind === undefined) {
      if (open === undefined) {
        plain += char
      } else {
        open.text += char
      }
      continue
    }

    if (open === undefined) {
      flush()
      open = { kind, marker: char, text: '' }
    } else if (open.kind === kind) {
      if (open.text === '') {
        fail(`Lege markering (${char}${char}).`)
      } else if (open.text !== open.text.trim()) {
        fail(
          `Spatie direct binnen de markering: schrijf ${char}hola${char}, niet ${char} hola ${char}.`,
        )
      }
      parts.push({ kind: open.kind, text: open.text })
      open = undefined
    } else {
      fail(
        'Een markering binnen een andere: sluit de ene af voordat je de andere opent.',
      )
      open.text += char
    }
  }

  if (open !== undefined) {
    const name = MARKER_NAMES[open.kind]
    fail(
      `${name.one} zonder partner: ${name.example}. Als teken schrijf je \\${open.marker}.`,
    )
    // De rest als gewone tekst, zodat er niets verdwijnt.
    const last = parts.at(-1)
    if (plain === '' && typeof last === 'string') {
      parts.pop()
      plain = last
    }
    plain += open.marker + open.text
  }
  flush()
  return problem === undefined ? { parts } : { parts, problem }
}
