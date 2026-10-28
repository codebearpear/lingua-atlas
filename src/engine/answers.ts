/**
 * Antwoordcontrole: vergelijkt een antwoord met de antwoordsleutel van een
 * oefening.
 *
 * Het oordeel is goed, bijna goed of fout:
 * - Goed: het antwoord klopt. Hoofdletters, leestekens en de soort
 *   aanhalingsteken tellen niet mee. Bij een verschil dat opvalt, zoals een
 *   ontbrekend omgekeerd vraagteken in het Spaans of een spatie in het
 *   Koreaans, volgt een opmerking.
 * - Bijna goed: je kende het antwoord, maar de vorm wijkt af: een accent dat
 *   ontbreekt, een letter van een ander toetsenbord of een kleine tikfout.
 * - Fout: iets anders dan gevraagd. Staan de goede woorden in de verkeerde
 *   volgorde, dan zegt de uitleg dat.
 *
 * Bekende foute antwoorden uit het taalpakket krijgen hun eigen uitleg.
 * Antwoorden in het Nederlands, bij herkennen, beoordelen we milder: daar
 * toets je of je de doeltaal begrijpt, niet je Nederlandse spelling.
 *
 * Herhalen (fase 7) telt goed, bijna goed en fout elk anders mee.
 */
import type { ErrorType } from '../packs/compiled.ts'
import { parseInline, type InlineText } from '../packs/inline.ts'
import { normalizeAnswer } from './normalize.ts'

export type Verdict = 'correct' | 'almost' | 'wrong'

export interface AnswerCheck {
  verdict: Verdict
  /** Wat er anders was; bij een goed antwoord een opmerking, zoals spaties. */
  errorType?: ErrorType
  /** Uitleg bij het oordeel: uit het taalpakket of van de app. */
  feedback?: InlineText
  /** Het goede antwoord dat het dichtst bij het gegeven antwoord ligt. */
  expected: string
}

/** Een bekend fout antwoord uit het taalpakket, met gerichte uitleg. */
export interface KnownWrongAnswer {
  answer: string
  errorType: ErrorType
  message: InlineText
}

/** Een keuze bij een meerkeuzevraag. */
export interface Choice {
  text: string
  correct: boolean
  feedback?: InlineText
}

/** Hoe zwaar een fout van een bepaald type weegt, bij bekende foute antwoorden. */
export const ERROR_VERDICTS: Record<ErrorType, Verdict> = {
  spelling: 'almost',
  diacritics: 'almost',
  script: 'almost',
  spacing: 'almost',
  'vowel-sign': 'almost',
  punctuation: 'correct',
  gender: 'wrong',
  conjugation: 'wrong',
  case: 'wrong',
  particle: 'wrong',
  ezafe: 'wrong',
  'word-order': 'wrong',
  'word-choice': 'wrong',
  register: 'wrong',
}

// ---------------------------------------------------------------------------
// Vaste vormen

/** Rechte en krullende apostrofs, en accenten die als apostrof gebruikt worden. */
const APOSTROPHES = /[\u2018\u2019\u201B\u0060\u00B4\u02BC]/gu
const QUOTES = /[\u201C\u201D\u201E\u00AB\u00BB]/gu
const DASHES = /[\u2010-\u2014\u2212]/gu
/** Onzichtbare tekens zonder betekenis voor het antwoord. De halve spatie (ZWNJ) blijft. */
const INVISIBLE = /[\u00AD\u200B\u2060\uFEFF]|\u200D/gu

/**
 * Het antwoord zoals het er staat, in een vaste vorm: Unicode NFC, enkele
 * spaties, en eenduidige apostrofs, aanhalingstekens en streepjes.
 */
export function canonical(text: string): string {
  return normalizeAnswer(
    text
      .replace(INVISIBLE, '')
      .replace(APOSTROPHES, "'")
      .replace(QUOTES, '"')
      .replace(DASHES, '-'),
  )
}

/** Cijfers uit andere schriften, zoals Perzische, als gewone cijfers. */
const DIGIT_STARTS = [0x0660, 0x06f0, 0x0966, 0x1040] as const

function asciiDigits(text: string): string {
  return text.replace(
    /[\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u1040-\u1049]/gu,
    (digit) => {
      const code = digit.codePointAt(0) ?? 0
      const start = DIGIT_STARTS.find(
        (first) => code >= first && code <= first + 9,
      )
      return start === undefined ? digit : String(code - start)
    },
  )
}

/** Accenten weg: á wordt a, ñ wordt n. */
function withoutMarks(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')
}

// ---------------------------------------------------------------------------
// Regels per taal

interface Fold {
  errorType: 'diacritics' | 'script'
  /** Maakt twee vormen gelijk die alleen hierin verschillen. */
  fold: (text: string) => string
  /** Uitleg, met een kleine letter; het oordeel zelf staat er al boven. */
  message: string
}

interface AnswerRules {
  locale: string
  /** Hoofdletters binnen het antwoord tellen mee, zoals bij Duitse zelfstandige naamwoorden. */
  caseMatters: boolean
  /** Een spatiefout: bijna goed, of goed met een opmerking. */
  spacing: 'almost' | 'note'
  /** Tekens die zonder opmerking wegvallen, zoals Perzische klinkertekens. */
  silent: (text: string) => string
  folds: readonly Fold[]
  /** Tikfouten per jamo tellen, zoals in het Koreaans. */
  jamo: boolean
  /** Leestekens die we noemen als ze ontbreken, zoals het Spaanse omgekeerde vraagteken. */
  notedPunctuation?: RegExp
  /** Lidwoorden die voor een antwoord mogen ontbreken of erbij mogen. */
  articles?: readonly string[]
  /** Bijna goed telt als goed, met een opmerking. */
  lenient: boolean
}

const ACCENTS: Fold = {
  errorType: 'diacritics',
  fold: withoutMarks,
  message: 'let op de accenten',
}

const BASE: AnswerRules = {
  locale: 'und',
  caseMatters: false,
  spacing: 'almost',
  silent: (text) => text,
  folds: [ACCENTS],
  jamo: false,
  lenient: false,
}

const RULES: Partial<Record<string, AnswerRules>> = {
  nl: {
    ...BASE,
    locale: 'nl',
    articles: ['de', 'het', 'een', 't'],
    lenient: true,
  },
  en: { ...BASE, locale: 'en' },
  de: {
    ...BASE,
    locale: 'de',
    caseMatters: true,
    folds: [
      {
        errorType: 'diacritics',
        fold: (text) =>
          text
            .replace(/\u00e4/gu, 'ae')
            .replace(/\u00f6/gu, 'oe')
            .replace(/\u00fc/gu, 'ue')
            .replace(/\u00df/gu, 'ss'),
        message: 'let op \u00e4, \u00f6, \u00fc en \u00df',
      },
      { ...ACCENTS, message: 'let op \u00e4, \u00f6, \u00fc en \u00df' },
    ],
  },
  es: {
    ...BASE,
    locale: 'es',
    notedPunctuation: /[\u00bf\u00a1]/u,
  },
  ko: { ...BASE, locale: 'ko', spacing: 'note', folds: [], jamo: true },
  hi: {
    ...BASE,
    locale: 'hi',
    folds: [
      {
        errorType: 'diacritics',
        // Nukta weg, chandrabindu als anusvara
        fold: (text) =>
          text.replace(/\u093c/gu, '').replace(/\u0901/gu, '\u0902'),
        message: 'let op de nukta en de chandrabindu',
      },
    ],
  },
  fa: {
    ...BASE,
    locale: 'fa',
    spacing: 'note',
    // Klinkertekens (harakat) en het rekstreepje schrijf je in het Perzisch meestal niet.
    silent: (text) => text.replace(/[\u064b-\u065f\u0670\u0640]/gu, ''),
    folds: [
      {
        errorType: 'script',
        fold: (text) =>
          text
            .replace(/[\u064a\u0649]/gu, '\u06cc')
            .replace(/\u0643/gu, '\u06a9'),
        message:
          'gebruik de Perzische letters *\u06cc* en *\u06a9*, niet de Arabische ~\u064a~ en ~\u0643~ (het Perzische toetsenbord geeft de goede)',
      },
    ],
  },
  my: { ...BASE, locale: 'my', spacing: 'note', folds: [] },
}

function answerRules(language: string): AnswerRules {
  return RULES[language] ?? BASE
}

/**
 * Vorm om te vergelijken: als canonical, zonder hoofdletters en leestekens.
 * Met keepCase blijven de hoofdletters staan; met ignoreFirst telt de eerste
 * letter daarbij niet, zoals aan het begin van een zin.
 */
function comparable(
  text: string,
  rules: AnswerRules,
  keepCase = false,
  ignoreFirst = false,
): string {
  let value = asciiDigits(rules.silent(canonical(text)))
  if (!keepCase) {
    value = value.toLocaleLowerCase(rules.locale)
  } else if (ignoreFirst) {
    value = value.charAt(0).toLocaleLowerCase(rules.locale) + value.slice(1)
  }
  value = value
    .replace(/'/gu, '')
    .replace(/\p{P}/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
  const words = value.split(' ')
  const [first] = words
  if (
    rules.articles !== undefined &&
    words.length > 1 &&
    first !== undefined &&
    rules.articles.includes(first)
  ) {
    return words.slice(1).join(' ')
  }
  return value
}

/**
 * De vorm waarin de antwoordsleutel twee antwoorden als hetzelfde ziet: zonder
 * verschil in hoofdletters, leestekens en de soort aanhalingsteken. Voor het
 * controlescript, dat er dubbele antwoorden mee vindt.
 */
export function answerKey(text: string, language: string): string {
  return comparable(text, answerRules(language))
}

function withoutSpaces(text: string, rules: AnswerRules): string {
  return comparable(text, rules).replace(/[\s\u200c]/gu, '')
}

function foldAll(text: string, rules: AnswerRules): string {
  return rules.folds.reduce((value, fold) => fold.fold(value), text)
}

function units(text: string, rules: AnswerRules): string[] {
  return Array.from(rules.jamo ? text.normalize('NFD') : text)
}

/**
 * Aantal bewerkingen om van a naar b te komen: een teken erbij, eraf, anders,
 * of twee buren omgewisseld (Damerau-Levenshtein, beperkte vorm).
 */
export function editDistance(
  a: readonly string[],
  b: readonly string[],
): number {
  const width = b.length + 1
  const table = new Array<number>((a.length + 1) * width).fill(0)
  const at = (i: number, j: number): number => table[i * width + j] ?? 0
  for (let i = 0; i <= a.length; i += 1) {
    table[i * width] = i
  }
  for (let j = 0; j <= b.length; j += 1) {
    table[j] = j
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(
        at(i - 1, j) + 1,
        at(i, j - 1) + 1,
        at(i - 1, j - 1) + cost,
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, at(i - 2, j - 2) + 1)
      }
      table[i * width + j] = best
    }
  }
  return at(a.length, b.length)
}

/** Hoeveel tikfouten nog bijna goed zijn: geen bij korte woorden, die worden anders snel een ander woord. */
function typoLimit(expected: string, rules: AnswerRules): number {
  const chars = Array.from(expected)
  if (rules.jamo) {
    const syllables = chars.filter((char) =>
      /\p{Script=Hangul}/u.test(char),
    ).length
    return syllables >= 5 ? 2 : syllables >= 2 ? 1 : 0
  }
  const letters = chars.filter((char) => /\p{L}/u.test(char)).length
  return letters >= 12 ? 2 : letters >= 5 ? 1 : 0
}

function nearest(
  given: string,
  answers: readonly string[],
  rules: AnswerRules,
): { answer: string; distance: number } {
  const mine = units(foldAll(comparable(given, rules), rules), rules)
  let best = { answer: answers[0] ?? '', distance: Number.POSITIVE_INFINITY }
  for (const answer of answers) {
    const distance = editDistance(
      mine,
      units(foldAll(comparable(answer, rules), rules), rules),
    )
    if (distance < best.distance) {
      best = { answer, distance }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Uitleg

function escapeMarkup(text: string): string {
  return text.replace(/[*~]/gu, (marker) => `\\${marker}`)
}

/** Een zin met het goede antwoord erin, dat als doeltaal gemarkeerd is. */
function explain(lead: string, expected: string, target: boolean): InlineText {
  const shown = target ? `*${escapeMarkup(expected)}*` : escapeMarkup(expected)
  const end = /\p{P}$/u.test(expected) ? '' : '.'
  return parseInline(`${lead} ${shown}${end}`).parts
}

// ---------------------------------------------------------------------------
// Het oordeel

/**
 * Beoordeelt een getypt antwoord.
 *
 * @param language De taal van het antwoord: "nl" bij herkennen, anders de
 *   taalcode van het pakket.
 */
export function checkTypedAnswer(
  input: string,
  answers: readonly string[],
  known: readonly KnownWrongAnswer[],
  language: string,
): AnswerCheck {
  const rules = answerRules(language)
  const target = language !== 'nl'
  const given = canonical(input)
  const fallback = answers[0] ?? ''
  if (given === '') {
    return { verdict: 'wrong', expected: fallback }
  }

  const almost = (
    errorType: ErrorType,
    message: string,
    expected: string,
  ): AnswerCheck =>
    rules.lenient
      ? {
          verdict: 'correct',
          errorType,
          feedback: explain('Precies geschreven:', expected, target),
          expected,
        }
      : {
          verdict: 'almost',
          errorType,
          feedback: explain(
            `${message.charAt(0).toUpperCase()}${message.slice(1)}. Goed is`,
            expected,
            target,
          ),
          expected,
        }

  // 1. Precies goed
  const exact = answers.find((answer) => canonical(answer) === given)
  if (exact !== undefined) {
    return { verdict: 'correct', expected: exact }
  }

  // 2. Goed, op hoofdletters en leestekens na
  const key = comparable(given, rules)
  const loose = answers.find((answer) => comparable(answer, rules) === key)
  if (loose !== undefined) {
    // Een zin mag met een kleine letter beginnen; een woord als Haus niet.
    const sentence = /[.!?]$/u.test(canonical(loose))
    if (
      rules.caseMatters &&
      comparable(loose, rules, true, sentence) !==
        comparable(given, rules, true, sentence)
    ) {
      return almost('spelling', 'let op de hoofdletters', loose)
    }
    const noted = rules.notedPunctuation
    if (
      noted !== undefined &&
      noted.test(loose) &&
      Array.from(loose)
        .filter((char) => noted.test(char))
        .join('') !==
        Array.from(given)
          .filter((char) => noted.test(char))
          .join('')
    ) {
      return {
        verdict: 'correct',
        errorType: 'punctuation',
        feedback: explain('Let op de leestekens:', loose, target),
        expected: loose,
      }
    }
    return { verdict: 'correct', expected: loose }
  }

  // 3. Bekende foute antwoorden uit het pakket
  const knownWrong = known.find(
    (entry) => comparable(entry.answer, rules) === key,
  )
  if (knownWrong !== undefined) {
    return {
      verdict: ERROR_VERDICTS[knownWrong.errorType],
      errorType: knownWrong.errorType,
      feedback: knownWrong.message,
      expected: nearest(given, answers, rules).answer,
    }
  }

  // 4. Alleen de spaties anders
  const bare = withoutSpaces(given, rules)
  const spaced = answers.find((answer) => withoutSpaces(answer, rules) === bare)
  if (spaced !== undefined) {
    const lead = spaced.includes('\u200c')
      ? 'Let op de halve spatie:'
      : 'Let op de spaties:'
    return rules.spacing === 'note'
      ? {
          verdict: 'correct',
          errorType: 'spacing',
          feedback: explain(lead, spaced, target),
          expected: spaced,
        }
      : almost('spacing', 'let op de spaties', spaced)
  }

  // 5. Accenten, of letters van een ander toetsenbord
  for (const fold of rules.folds) {
    const folded = fold.fold(key)
    const match = answers.find(
      (answer) => fold.fold(comparable(answer, rules)) === folded,
    )
    if (match !== undefined) {
      return almost(fold.errorType, fold.message, match)
    }
  }

  // 6. Een kleine tikfout
  const near = nearest(given, answers, rules)
  if (near.distance > 0 && near.distance <= typoLimit(near.answer, rules)) {
    return almost('spelling', 'let op de spelling', near.answer)
  }

  // 7. De goede woorden in een andere volgorde
  const words = key.split(' ')
  const sorted = [...words].sort().join(' ')
  const reordered = answers.find((answer) => {
    const theirs = comparable(answer, rules).split(' ')
    return theirs.length > 1 && [...theirs].sort().join(' ') === sorted
  })
  if (reordered !== undefined) {
    return {
      verdict: 'wrong',
      errorType: 'word-order',
      feedback: explain(
        'De woorden kloppen, maar de volgorde niet. Goed is',
        reordered,
        target,
      ),
      expected: reordered,
    }
  }

  return { verdict: 'wrong', expected: near.answer }
}

/** Beoordeelt een keuze bij een meerkeuzevraag. */
export function checkChoice(
  choices: readonly Choice[],
  index: number,
): AnswerCheck {
  const chosen = choices[index]
  const expected = choices.find((choice) => choice.correct)?.text ?? ''
  if (chosen === undefined) {
    return { verdict: 'wrong', expected }
  }
  return {
    verdict: chosen.correct ? 'correct' : 'wrong',
    feedback: chosen.feedback,
    expected: chosen.correct ? chosen.text : expected,
  }
}
