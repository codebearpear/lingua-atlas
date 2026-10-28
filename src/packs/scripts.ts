/**
 * Regels per schrift en per taal, voor tekst in een taalpakket.
 *
 * - target: tekst in de doeltaal, zoals een woord, een zin, een antwoord of de
 *   eigen naam van de taal. De letters horen bij het schrift van het pakket.
 * - characters: tekens die in de taal niet horen, zoals de Arabische kaf in
 *   Perzische tekst.
 * - sentence: leestekens van een hele zin in de doeltaal.
 * - romanization: een transliteratie staat in Latijnse letters.
 * - fragment: doeltaal tussen sterretjes in Nederlandse tekst (zie inline.ts).
 *   Een woord, een deel van een zin of een losse letter: het schrift en de
 *   tekens tellen, de regels voor hele woorden en zinnen niet.
 * - unmarked: het Nederlandse deel van zo'n tekst. Bij een eigen schrift hoort
 *   tekst in dat schrift gemarkeerd te zijn.
 *
 * Foute vormen tussen tildes in Nederlandse tekst vallen buiten de regels:
 * die laten met opzet het verschil zien. Net als bekende foute antwoorden in
 * oefeningen (feedback).
 */
import {
  ZawgyiConverter,
  ZawgyiDetector,
} from '../../vendor/myanmar-tools/index.js'
import { codePoint, type Severity, type TextProblem } from './text.ts'

export interface LanguageRules {
  target: (text: string) => TextProblem[]
  characters: (text: string) => TextProblem[]
  sentence: (text: string) => TextProblem[]
  romanization: (text: string) => TextProblem[]
  fragment: (text: string) => TextProblem[]
  unmarked: (text: string) => TextProblem[]
}

const LETTER_OR_MARK = /[\p{L}\p{M}]/u
/** Tekens die bij elk schrift kunnen horen, zoals losse accenten. */
const ANY_SCRIPT = /[\p{Script=Inherited}\p{Script=Common}]/u
const LATIN = /\p{Script=Latin}/u

/** Namen van schriften voor de meldingen. */
const SCRIPT_NAMES: readonly (readonly [RegExp, string])[] = [
  [/\p{Script=Latin}/u, 'Latijns'],
  [/\p{Script=Greek}/u, 'Grieks'],
  [/\p{Script=Cyrillic}/u, 'Cyrillisch'],
  [/\p{Script=Armenian}/u, 'Armeens'],
  [/\p{Script=Hebrew}/u, 'Hebreeuws'],
  [/\p{Script=Arabic}/u, 'Arabisch'],
  [/\p{Script=Devanagari}/u, 'Devanagari'],
  [/\p{Script=Bengali}/u, 'Bengaals'],
  [/\p{Script=Gurmukhi}/u, 'Gurmukhi'],
  [/\p{Script=Gujarati}/u, 'Gujarati'],
  [/\p{Script=Thai}/u, 'Thai'],
  [/\p{Script=Myanmar}/u, 'Birmaans'],
  [/\p{Script=Hangul}/u, 'Hangul'],
  [/\p{Script=Han}/u, 'Chinees'],
  [/\p{Script=Hiragana}/u, 'Hiragana'],
  [/\p{Script=Katakana}/u, 'Katakana'],
]

function scriptName(char: string): string {
  return (
    SCRIPT_NAMES.find(([pattern]) => pattern.test(char))?.[1] ??
    'uit een ander schrift'
  )
}

interface ScriptSpec {
  /** Letters die bij het schrift horen. */
  letters: RegExp
  /** Naam voor de meldingen. */
  name: string
}

/** Per schriftcode (ISO 15924): welke letters erbij horen. */
const SCRIPTS: Partial<Record<string, ScriptSpec>> = {
  Latn: { letters: /\p{Script=Latin}/u, name: 'het Latijnse schrift' },
  // Kore is Hangul, aangevuld met Hanja
  Kore: {
    letters: /[\p{Script=Hangul}\p{Script=Han}]/u,
    name: 'het Koreaanse schrift',
  },
  Hang: { letters: /\p{Script=Hangul}/u, name: 'Hangul' },
  Deva: { letters: /\p{Script=Devanagari}/u, name: 'Devanagari' },
  Arab: {
    letters: /\p{Script=Arabic}/u,
    name: 'het Perzisch-Arabische schrift',
  },
  Mymr: { letters: /\p{Script=Myanmar}/u, name: 'het Birmaanse schrift' },
}

function problem(severity: Severity, message: string): TextProblem {
  return { severity, message }
}

/** Letters in doeltaaltekst horen bij het schrift van het pakket. */
function checkLetters(
  text: string,
  script: string,
  spec: ScriptSpec,
): TextProblem[] {
  let own = false
  const foreign = new Map<string, string>()
  const latin = new Set<string>()
  for (const char of text) {
    if (!LETTER_OR_MARK.test(char) || ANY_SCRIPT.test(char)) {
      continue
    }
    if (spec.letters.test(char)) {
      own = true
    } else if (script !== 'Latn' && LATIN.test(char)) {
      latin.add(char)
    } else {
      foreign.set(char, scriptName(char))
    }
  }
  const problems: TextProblem[] = []
  if (!own) {
    problems.push(problem('error', `Bevat geen letters in ${spec.name}.`))
  }
  for (const [char, name] of foreign) {
    problems.push(
      problem(
        'error',
        `Letter uit een ander schrift: "${char}" (${codePoint(char)}) is ${name}.`,
      ),
    )
  }
  if (latin.size > 0) {
    problems.push(
      problem(
        'warning',
        `Bevat Latijnse letters (${[...latin].join('')}). Is dat bedoeld?`,
      ),
    )
  }
  return problems
}

/** Een transliteratie staat in Latijnse letters. */
function checkRomanization(text: string): TextProblem[] {
  const other = Array.from(text).find(
    (char) =>
      LETTER_OR_MARK.test(char) && !ANY_SCRIPT.test(char) && !LATIN.test(char),
  )
  if (other === undefined) {
    return []
  }
  return [
    problem(
      'error',
      `Een transliteratie staat in Latijnse letters, maar dit bevat "${other}" (${codePoint(other)}, ${scriptName(other)}).`,
    ),
  ]
}

/**
 * Tekst in het schrift van het pakket buiten de markering, in Nederlandse
 * tekst. Bij het Latijnse schrift is dat niet te zien: dat deelt het
 * Nederlands.
 */
function checkUnmarked(
  text: string,
  script: string,
  spec: ScriptSpec,
): TextProblem[] {
  if (script === 'Latn') {
    return []
  }
  const letter = spec.letters.source
  const run = new RegExp(`(?:${letter})(?:${letter}|\\p{M})*`, 'u').exec(text)
  if (run === null) {
    return []
  }
  return [
    problem(
      'warning',
      `Tekst in ${spec.name} zonder markering: "${run[0]}". Zet doeltaal tussen sterretjes (*\u2026*) en een foute vorm tussen tildes (~\u2026~).`,
    ),
  ]
}

/** Zoekt met een patroon en geeft bij een treffer de melding, met de gevonden tekens erbij. */
function whenFound(
  text: string,
  pattern: RegExp,
  severity: Severity,
  message: (found: string) => string,
): TextProblem[] {
  const match = pattern.exec(text)
  return match === null ? [] : [problem(severity, message(match[0]))]
}

// ---------------------------------------------------------------------------
// Regels per taal

type ExtraRules = Partial<
  Pick<LanguageRules, 'target' | 'characters' | 'sentence'>
>

const PERSIAN: ExtraRules = {
  characters: (text) => [
    ...whenFound(
      text,
      /\u064A/u,
      'error',
      () =>
        'Arabische ye \u064A (U+064A). Gebruik de Perzische ye \u06CC (U+06CC).',
    ),
    ...whenFound(
      text,
      /\u0649/u,
      'error',
      () =>
        'Arabische alef maqsura \u0649 (U+0649). Gebruik de Perzische ye \u06CC (U+06CC).',
    ),
    ...whenFound(
      text,
      /\u0643/u,
      'error',
      () =>
        'Arabische kaf \u0643 (U+0643). Gebruik de Perzische kaf \u06A9 (U+06A9).',
    ),
    ...whenFound(
      text,
      /[\u0660-\u0669]/u,
      'error',
      (found) =>
        `Arabisch cijfer ${found} (${codePoint(found)}). Gebruik Perzische cijfers, \u06F0 tot \u06F9 (U+06F0 tot U+06F9).`,
    ),
    ...whenFound(
      text,
      /[\uFB50-\uFDFF\uFE70-\uFEFE]/u,
      'error',
      (found) =>
        `Vaste lettervorm (${codePoint(found)}), vaak door kopiëren uit een pdf. Gebruik de gewone letter.`,
    ),
    ...whenFound(
      text,
      /\u0640/u,
      'warning',
      () => 'Rekstreepje (kashida, U+0640); dat hoort niet in lestekst.',
    ),
    ...whenFound(
      text,
      /(?<![\p{L}\p{M}])(?:\u0646)?\u0645\u06CC (?=\p{Script=Arabic})/u,
      'warning',
      () =>
        'Gewone spatie na \u0645\u06CC. In het Perzisch hoort daar een halve spatie (ZWNJ), zoals in \u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u0645.',
    ),
    ...whenFound(
      text,
      /(?<=\p{Script=Arabic}) \u0647\u0627(?:\u06CC){0,2}(?![\p{L}\p{M}])/u,
      'warning',
      () =>
        'Gewone spatie voor \u0647\u0627. In het Perzisch hoort daar een halve spatie (ZWNJ), zoals in \u06A9\u062A\u0627\u0628\u200C\u0647\u0627.',
    ),
  ],
}

const HINDI: ExtraRules = {
  characters: (text) =>
    /\p{Script=Devanagari}/u.test(text)
      ? whenFound(
          text,
          /\|/u,
          'error',
          () =>
            'Verticale streep (|) in Hindi-tekst. Gebruik de danda \u0964 (U+0964).',
        )
      : [],
  sentence: (text) =>
    whenFound(
      text,
      /\.$/u,
      'warning',
      () => 'Een Hindi-zin eindigt met een danda (\u0964), niet met een punt.',
    ),
}

const KOREAN: ExtraRules = {
  characters: (text) => [
    ...whenFound(
      text,
      /[\uFFA0-\uFFDC]/u,
      'error',
      (found) =>
        `Hangul in halve breedte (${codePoint(found)}). Gebruik gewone Hangul.`,
    ),
    ...whenFound(
      text,
      /[\u1100-\u11FF\uA960-\uA97F\uD7B0-\uD7FF]/u,
      'warning',
      (found) =>
        `Losse jamo (${codePoint(found)}). Moderne lettergrepen horen samengesteld te zijn.`,
    ),
  ],
  target: (text) =>
    whenFound(
      text,
      /[\u3131-\u318E]/u,
      'warning',
      (found) =>
        `Losse Hangul-letter ${found} (${codePoint(found)}). In woorden en zinnen horen hele lettergrepen.`,
    ),
}

const SPANISH: ExtraRules = {
  sentence: (text) => [
    ...(text.includes('?') && !text.includes('\u00BF')
      ? [problem('warning', 'Een Spaanse vraag begint met \u00BF.')]
      : []),
    ...(text.includes('!') && !text.includes('\u00A1')
      ? [problem('warning', 'Een Spaanse uitroep begint met \u00A1.')]
      : []),
  ],
}

/*
 * Zawgyi-herkenning met myanmar-tools van Google, waarvan een kopie in
 * vendor/myanmar-tools staat (zie de README daar). Het model geeft de kans dat
 * een tekst Zawgyi is in plaats van Unicode. De drempel 0,95 komt uit de
 * README van myanmar-tools: daarboven wordt minder dan 1 procent van de
 * Unicode-teksten ten onrechte als Zawgyi aangewezen. Op de voorbeeldteksten
 * van myanmar-tools was dat ongeveer 1 op de 1400 woordgroepen: metta hta ywe,
 * met de gestapelde medeklinkers van het Pali-leenwoord metta.
 *
 * Omdat het model zich dus kan vergissen, geeft het een waarschuwing en geen
 * fout. Het bouwen gaat door, maar een concept met een waarschuwing blijft
 * Concept tot iemand het nakijkt.
 */
const ZAWGYI_THRESHOLD = 0.95
const zawgyiDetector = new ZawgyiDetector()
const zawgyiConverter = new ZawgyiConverter()

function checkZawgyi(text: string): TextProblem[] {
  if (!/\p{Script=Myanmar}/u.test(text)) {
    return []
  }
  // Tekst die bij het omzetten gelijk blijft, ziet er in beide coderingen
  // hetzelfde uit. Dan is er niets mis, wat het model ook zegt.
  const unicode = zawgyiConverter.zawgyiToUnicode(text)
  if (unicode === text) {
    return []
  }
  if (zawgyiDetector.getZawgyiProbability(text) <= ZAWGYI_THRESHOLD) {
    return []
  }
  return [
    problem(
      'warning',
      `Waarschijnlijk Zawgyi in plaats van Unicode (volgens myanmar-tools). In Unicode wordt dit "${unicode}". Controleer dat en vervang de tekst als het klopt.`,
    ),
  ]
}

const BURMESE: ExtraRules = {
  characters: (text) => [
    ...checkZawgyi(text),
    ...whenFound(
      text,
      /[\u1050-\u109F\uA9E0-\uA9FF\uAA60-\uAA7F]/u,
      'warning',
      (found) =>
        `Teken buiten het Birmaanse alfabet (${codePoint(found)}), zoals uit het Mon of Shan. Klopt het schrift, en is de tekst geen Zawgyi?`,
    ),
  ],
}

const LANGUAGE_RULES: Partial<Record<string, ExtraRules>> = {
  fa: PERSIAN,
  hi: HINDI,
  ko: KOREAN,
  es: SPANISH,
  my: BURMESE,
}

/** De regels voor de taal van een pakket. */
export function rulesFor(language: {
  code: string
  script: string
}): LanguageRules {
  const spec = SCRIPTS[language.script]
  const extra = LANGUAGE_RULES[language.code] ?? {}
  return {
    target: (text) => [
      ...(spec === undefined
        ? [
            problem(
              'warning',
              `De controle kent het schrift ${language.script} nog niet.`,
            ),
          ]
        : checkLetters(text, language.script, spec)),
      ...(extra.target?.(text) ?? []),
    ],
    characters: (text) => extra.characters?.(text) ?? [],
    sentence: (text) => extra.sentence?.(text) ?? [],
    romanization: checkRomanization,
    fragment: (text) => [
      // Zonder letters, zoals bij een los omgekeerd vraagteken, valt er geen
      // schrift te controleren.
      ...(spec === undefined || !LETTER_OR_MARK.test(text)
        ? []
        : checkLetters(text, language.script, spec)),
      ...(extra.characters?.(text) ?? []),
    ],
    unmarked: (text) =>
      spec === undefined ? [] : checkUnmarked(text, language.script, spec),
  }
}
