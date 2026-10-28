import { describe, expect, it } from 'vitest'
import {
  answerKey,
  checkChoice,
  checkTypedAnswer,
  editDistance,
  type AnswerCheck,
  type KnownWrongAnswer,
} from './answers'

// Tekens buiten ASCII staan als code, zodat ook onzichtbare verschillen
// opvallen. In de commentaren staat wat er staat.

function typed(
  input: string,
  answers: string[],
  language: string,
  known: KnownWrongAnswer[] = [],
): AnswerCheck {
  return checkTypedAnswer(input, answers, known, language)
}

/** Oordeel en fouttype in een woord, zoals "almost diacritics". */
function verdict(result: AnswerCheck): string {
  return [result.verdict, result.errorType].filter(Boolean).join(' ')
}

describe('editDistance', () => {
  const chars = (text: string) => Array.from(text)

  it('telt toevoegen, weglaten, vervangen en omwisselen als een stap', () => {
    expect(editDistance(chars('adios'), chars('adios'))).toBe(0)
    expect(editDistance(chars('adios'), chars('adois'))).toBe(1)
    expect(editDistance(chars('hola'), chars('bola'))).toBe(1)
    expect(editDistance([], chars('abc'))).toBe(3)
  })
})

describe('Spaans', () => {
  // adios, hasta luego
  const goodbye = ['adi\u00f3s', 'hasta luego']

  it('rekent hoofdletters, leestekens en spaties aan de rand niet mee', () => {
    expect(verdict(typed('adi\u00f3s', goodbye, 'es'))).toBe('correct')
    expect(verdict(typed('  Adi\u00f3s! ', goodbye, 'es'))).toBe('correct')
    expect(typed('Hasta luego.', goodbye, 'es').expected).toBe('hasta luego')
  })

  it('noemt een ontbrekend accent bijna goed, met het goede antwoord erbij', () => {
    const result = typed('adios', goodbye, 'es')
    expect(verdict(result)).toBe('almost diacritics')
    expect(result.feedback).toEqual([
      'Bijna: let op de accenten. Goed is ',
      { kind: 'target', text: 'adi\u00f3s' },
      '.',
    ])
  })

  it('noemt een kleine tikfout bijna goed, maar niet bij korte woorden', () => {
    expect(verdict(typed('hasta lugo', goodbye, 'es'))).toBe('almost spelling')
    // adios met omgewisselde letters en zonder accent
    expect(verdict(typed('adois', goodbye, 'es'))).toBe('almost spelling')
    expect(verdict(typed('bola', ['hola'], 'es'))).toBe('wrong')
  })

  it('ziet een ontbrekende spatie als een fout in de vorm', () => {
    expect(verdict(typed('hastaluego', goodbye, 'es'))).toBe('almost spacing')
  })

  it('noemt het omgekeerde vraagteken, maar rekent het antwoord goed', () => {
    // Como te llamas?
    const question = ['\u00bfC\u00f3mo te llamas?']
    expect(verdict(typed('\u00bfC\u00f3mo te llamas?', question, 'es'))).toBe(
      'correct',
    )
    const result = typed('C\u00f3mo te llamas?', question, 'es')
    expect(verdict(result)).toBe('correct punctuation')
    expect(result.feedback).toEqual([
      'Let op de leestekens: ',
      { kind: 'target', text: '\u00bfC\u00f3mo te llamas?' },
    ])
    expect(verdict(typed('como te llamas', question, 'es'))).toBe(
      'almost diacritics',
    )
  })

  it('zegt het als de goede woorden in een andere volgorde staan', () => {
    const result = typed('Llamo me Ana', ['Me llamo Ana.'], 'es')
    expect(verdict(result)).toBe('wrong word-order')
    expect(result.expected).toBe('Me llamo Ana.')
  })

  it('geeft bij een bekend fout antwoord de uitleg uit het pakket', () => {
    const known: KnownWrongAnswer[] = [
      {
        answer: 'adios',
        errorType: 'diacritics',
        message: ['Het accent hoort op de o.'],
      },
    ]
    const result = typed('Adios', ['adi\u00f3s'], 'es', known)
    expect(verdict(result)).toBe('almost diacritics')
    expect(result.feedback).toEqual(['Het accent hoort op de o.'])
    expect(result.expected).toBe('adi\u00f3s')
  })

  it('rekent een leeg of ander antwoord fout', () => {
    expect(verdict(typed('', goodbye, 'es'))).toBe('wrong')
    expect(verdict(typed('hola', goodbye, 'es'))).toBe('wrong')
  })
})

describe('Nederlands, bij herkennen', () => {
  const pleased = ['aangenaam', 'aangenaam kennis te maken']

  it('rekent een tikfout goed, met de precieze schrijfwijze erbij', () => {
    expect(verdict(typed('Aangenaam!', pleased, 'nl'))).toBe('correct')
    const result = typed('aangenam', pleased, 'nl')
    expect(verdict(result)).toBe('correct spelling')
    expect(result.feedback).toEqual([
      'Goed gerekend. Precies is het: aangenaam.',
    ])
  })

  it('laat een lidwoord voor het antwoord toe', () => {
    expect(verdict(typed('hond', ['de hond'], 'nl'))).toBe('correct')
    expect(verdict(typed('een hond', ['de hond'], 'nl'))).toBe('correct')
  })
})

describe('Duits', () => {
  it('telt hoofdletters, behalve de eerste letter van een zin', () => {
    expect(verdict(typed('das haus', ['das Haus'], 'de'))).toBe(
      'almost spelling',
    )
    expect(verdict(typed('haus', ['Haus'], 'de'))).toBe('almost spelling')
    expect(verdict(typed('das ist gut', ['Das ist gut.'], 'de'))).toBe(
      'correct',
    )
  })

  it('noemt ss voor \u00df en een ontbrekende umlaut bijna goed', () => {
    // die Strasse
    expect(verdict(typed('die Strasse', ['die Stra\u00dfe'], 'de'))).toBe(
      'almost diacritics',
    )
    // schoen en schon voor schon met umlaut
    expect(verdict(typed('schoen', ['sch\u00f6n'], 'de'))).toBe(
      'almost diacritics',
    )
    expect(verdict(typed('schon', ['sch\u00f6n'], 'de'))).toBe(
      'almost diacritics',
    )
  })
})

describe('Perzisch', () => {
  // ketab, met de Perzische kaf
  const book = ['\u06a9\u062a\u0627\u0628']
  // mi-khaham, met halve spatie
  const want = ['\u0645\u06cc\u200c\u062e\u0648\u0627\u0647\u0645']

  it('noemt Arabische letters van een ander toetsenbord bijna goed', () => {
    expect(verdict(typed('\u0643\u062a\u0627\u0628', book, 'fa'))).toBe(
      'almost script',
    )
    // mi-khaham met de Arabische ye
    expect(
      verdict(
        typed('\u0645\u064a\u200c\u062e\u0648\u0627\u0647\u0645', want, 'fa'),
      ),
    ).toBe('almost script')
  })

  it('negeert klinkertekens en de soort cijfers', () => {
    // ketab met een kasra
    expect(verdict(typed('\u06a9\u0650\u062a\u0627\u0628', book, 'fa'))).toBe(
      'correct',
    )
    expect(verdict(typed('12', ['\u06f1\u06f2'], 'fa'))).toBe('correct')
  })

  it('rekent een gewone spatie voor de halve spatie goed, met een opmerking', () => {
    const result = typed(
      '\u0645\u06cc \u062e\u0648\u0627\u0647\u0645',
      want,
      'fa',
    )
    expect(verdict(result)).toBe('correct spacing')
    expect(result.feedback?.[0]).toBe('Let op de halve spatie: ')
  })
})

describe('Koreaans', () => {
  // annyeonghaseyo
  const hello = ['\uc548\ub155\ud558\uc138\uc694']

  it('rekent een spatie goed, met een opmerking', () => {
    expect(verdict(typed('\uc548\ub155 \ud558\uc138\uc694', hello, 'ko'))).toBe(
      'correct spacing',
    )
  })

  it('vergelijkt per lettergreep, ook als het antwoord uit losse jamo bestaat', () => {
    const jamo = '\uc548\ub155\ud558\uc138\uc694'.normalize('NFD')
    expect(verdict(typed(jamo, hello, 'ko'))).toBe('correct')
  })

  it('telt tikfouten per jamo', () => {
    // gamsahamnida met m in plaats van b
    expect(
      verdict(
        typed(
          '\uac10\uc0ac\ud568\ub2c8\ub2e4',
          ['\uac10\uc0ac\ud569\ub2c8\ub2e4'],
          'ko',
        ),
      ),
    ).toBe('almost spelling')
    // Een enkele lettergreep: geen ruimte voor tikfouten
    expect(verdict(typed('\ud574', ['\ud55c'], 'ko'))).toBe('wrong')
  })
})

describe('Hindi en Birmaans', () => {
  it('noemt een ontbrekende nukta bijna goed', () => {
    // zarur, met en zonder nukta
    expect(
      verdict(
        typed(
          '\u091c\u0930\u0942\u0930',
          ['\u091c\u093c\u0930\u0942\u0930'],
          'hi',
        ),
      ),
    ).toBe('almost diacritics')
  })

  it('rekent de danda als leesteken', () => {
    // namaste, met en zonder danda
    expect(
      verdict(
        typed(
          '\u0928\u092e\u0938\u094d\u0924\u0947',
          ['\u0928\u092e\u0938\u094d\u0924\u0947\u0964'],
          'hi',
        ),
      ),
    ).toBe('correct')
  })

  it('rekent een spatie in het Birmaans goed, met een opmerking', () => {
    // mingalaba
    const greeting = ['\u1019\u1004\u103a\u1039\u1002\u101c\u102c\u1015\u102b']
    expect(
      verdict(
        typed(
          '\u1019\u1004\u103a\u1039\u1002\u101c\u102c \u1015\u102b',
          greeting,
          'my',
        ),
      ),
    ).toBe('correct spacing')
  })
})

describe('answerKey', () => {
  it('ziet antwoorden die alleen in hoofdletters of leestekens verschillen als hetzelfde', () => {
    expect(answerKey('\u00bfC\u00f3mo te llamas?', 'es')).toBe(
      answerKey('c\u00f3mo te llamas', 'es'),
    )
    expect(answerKey('como te llamas', 'es')).not.toBe(
      answerKey('c\u00f3mo te llamas', 'es'),
    )
  })
})

describe('checkChoice', () => {
  const choices = [
    { text: 'hallo', correct: true },
    {
      text: 'tot ziens',
      correct: false,
      feedback: [
        'Tot ziens is ',
        { kind: 'target' as const, text: 'adi\u00f3s' },
        '.',
      ],
    },
  ]

  it('rekent de goede keuze goed', () => {
    expect(checkChoice(choices, 0)).toEqual({
      verdict: 'correct',
      feedback: undefined,
      expected: 'hallo',
    })
  })

  it('geeft bij een foute keuze de uitleg en de goede keuze', () => {
    expect(checkChoice(choices, 1)).toEqual({
      verdict: 'wrong',
      feedback: ['Tot ziens is ', { kind: 'target', text: 'adi\u00f3s' }, '.'],
      expected: 'hallo',
    })
  })
})
