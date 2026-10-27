import { describe, expect, it } from 'vitest'
import { checkPack, checkText, type PackReport } from './check.ts'

// Tekens buiten ASCII staan als code, zodat ook onzichtbare verschillen
// opvallen: \u00f1 is ñ als één teken, n\u0303 is n plus een losse tilde.

const TODAY = '2026-10-28'

function baseManifest() {
  return {
    schemaVersion: 1,
    id: 'es',
    version: '0.1.0',
    license: 'CC-BY-NC-SA-4.0',
    language: {
      code: 'es',
      locale: 'es-ES',
      script: 'Latn',
      direction: 'ltr',
    },
    names: { dutch: 'Spaans', native: 'Espa\u00f1ol' },
    display: { scriptName: 'Latijns', glyph: '\u00d1\u00f1' },
    variant: 'Standaardspaans (castellano)',
    levels: { framework: 'cefr', description: 'ERK, A1 tot C2' },
  }
}

function fullPack() {
  return {
    'pack.json': baseManifest(),
    'sources.json': {
      sources: [
        {
          id: 'rae',
          title: 'Diccionario de la lengua espa\u00f1ola',
          publisher: 'Real Academia Espa\u00f1ola',
          url: 'https://dle.rae.es/',
          kind: 'dictionary',
          authoritative: true,
        },
        {
          id: 'blog',
          title: 'Een blog',
          kind: 'website',
          authoritative: false,
        },
      ],
    },
    'vocabulary.json': {
      words: [
        {
          id: 'hola',
          text: 'hola',
          translations: ['hallo'],
          partOfSpeech: 'interjection',
          level: 'A1',
          examples: ['hola-que-tal'],
        },
        {
          id: 'adios',
          text: 'adi\u00f3s',
          translations: ['dag', 'tot ziens'],
          partOfSpeech: 'interjection',
          level: 'A1',
        },
      ] as Record<string, unknown>[],
    },
    'sentences.json': {
      sentences: [
        {
          id: 'hola-que-tal',
          text: '\u00a1Hola! \u00bfQu\u00e9 tal?',
          translation: 'Hallo! Hoe gaat het?',
          words: ['hola'],
          level: 'A1',
        },
      ] as Record<string, unknown>[],
    },
    'units/a1-begroeten.json': {
      id: 'a1-begroeten',
      title: 'Begroeten',
      level: 'A1',
      order: 1,
      goals: ['Je kunt iemand begroeten en gedag zeggen.'],
      lessons: [
        {
          id: 'a1-begroeten-1',
          title: 'Hallo en dag',
          goals: ['Je kunt hallo en dag zeggen.'],
          blocks: [
            {
              type: 'explanation',
              text: 'Hola betekent hallo.',
              examples: ['hola-que-tal'],
            },
          ] as Record<string, unknown>[],
          words: ['hola', 'adios'],
          exercises: [
            {
              id: 'oef-hola-keuze',
              type: 'multiple-choice',
              skill: 'vocabulary',
              direction: 'to-dutch',
              instruction: 'Kies de vertaling.',
              prompt: 'hola',
              items: ['hola'],
              choices: [
                { text: 'hallo', correct: true },
                { text: 'dag', correct: false },
              ],
            },
            {
              id: 'oef-adios-typen',
              type: 'typed-answer',
              skill: 'vocabulary',
              direction: 'to-target',
              instruction: 'Vertaal naar het Spaans.',
              prompt: 'dag',
              items: ['adios'],
              answers: ['adi\u00f3s'],
              feedback: [
                {
                  answer: 'adios',
                  errorType: 'diacritics',
                  message: 'Let op het accent: adi\u00f3s.',
                },
              ],
            },
          ] as Record<string, unknown>[],
        },
      ],
    },
  }
}

type Fixture = ReturnType<typeof fullPack>

function check(entries: Record<string, unknown>, folder = 'es'): PackReport {
  const files = new Map(
    Object.entries(entries).map(([name, data]) => [
      name,
      typeof data === 'string' ? data : JSON.stringify(data),
    ]),
  )
  return checkPack({ folder, files }, { today: TODAY })
}

function messages(
  report: PackReport,
  severity?: 'error' | 'warning',
): string[] {
  return report.issues
    .filter((issue) => severity === undefined || issue.severity === severity)
    .map(
      (issue) =>
        `${[issue.file, issue.path].filter(Boolean).join(' › ')}: ${issue.message}`,
    )
}

function firstLesson(pack: Fixture) {
  const lesson = pack['units/a1-begroeten.json'].lessons[0]
  if (lesson === undefined) {
    throw new Error('De testgegevens missen een les.')
  }
  return lesson
}

describe('checkPack', () => {
  it('keurt een volledig en correct pakket goed', () => {
    const report = check(fullPack())
    expect(messages(report)).toEqual([])
    expect(report.counts).toEqual({
      sources: 2,
      words: 2,
      sentences: 1,
      units: 1,
      lessons: 1,
      exercises: 2,
    })
    expect(report.statuses).toEqual({
      draft: 0,
      'auto-checked': 7,
      'source-verified': 0,
      'expert-reviewed': 0,
    })
    expect(report.manifestStatuses).toEqual({
      language: 'auto-checked',
      names: 'auto-checked',
    })
  })

  it('meldt een ontbrekend manifest', () => {
    expect(messages(check({}))).toEqual([
      'pack.json: Het manifest pack.json ontbreekt.',
    ])
  })

  it('meldt ongeldige JSON met het bestand erbij', () => {
    const [message] = messages(check({ 'pack.json': '{ "id": ' }))
    expect(message).toMatch(/^pack\.json: Geen geldige JSON: /)
  })

  it('meldt onbekende velden, zodat tikfouten opvallen', () => {
    const report = check({
      'pack.json': { ...baseManifest(), varaint: 'Standaardspaans' },
    })
    expect(messages(report)).toEqual([
      'pack.json: Onbekend veld: "varaint". Klopt de spelling?',
    ])
  })

  it('geeft Nederlandse meldingen voor ontbrekende velden', () => {
    const pack = fullPack()
    delete pack['vocabulary.json'].words[0]?.partOfSpeech
    expect(messages(check(pack))).toEqual([
      'vocabulary.json › words[0].partOfSpeech: Ontbreekt.',
    ])
  })

  it('controleert de taalcode', () => {
    const manifest = baseManifest()
    const withLocale = (locale: string, code = 'es') =>
      messages(
        check({
          'pack.json': {
            ...manifest,
            language: { ...manifest.language, locale, code },
          },
        }),
      )
    expect(withLocale('es-es')).toEqual([
      'pack.json › language.locale: Schrijf de taalcode als "es-ES".',
    ])
    expect(withLocale('es_ES')).toEqual([
      'pack.json › language.locale: "es_ES" is geen geldige BCP 47-taalcode.',
    ])
    expect(withLocale('es-ES', 'fr')).toEqual([
      'pack.json › language.code: Hoort gelijk te zijn aan de taal in "es-ES": "es".',
    ])
  })

  it('eist dat het kenmerk gelijk is aan de mapnaam', () => {
    expect(messages(check({ 'pack.json': baseManifest() }, 'spaans'))).toEqual([
      'pack.json › id: Het kenmerk "es" moet gelijk zijn aan de mapnaam "spaans".',
    ])
  })

  it('meldt dubbele kenmerken, ook over bestanden heen', () => {
    const pack = fullPack()
    pack['sentences.json'].sentences.push({
      id: 'hola',
      text: 'Hola.',
      translation: 'Hallo.',
    })
    expect(messages(check(pack))).toEqual([
      'sentences.json › sentences[1].id: Het kenmerk "hola" is al in gebruik in vocabulary.json (words[0]).',
    ])
  })

  it('meldt verwijzingen die niet bestaan of naar de verkeerde soort wijzen', () => {
    const pack = fullPack()
    const [hola] = pack['vocabulary.json'].words
    if (hola !== undefined) {
      hola.examples = ['bestaat-niet']
    }
    firstLesson(pack).words = ['hola', 'hola-que-tal']
    expect(messages(check(pack))).toEqual([
      'vocabulary.json › words[0].examples[0]: Verwijst naar "bestaat-niet", maar dat kenmerk bestaat niet in dit pakket.',
      'units/a1-begroeten.json › lessons[0].words[1]: Verwijst naar "hola-que-tal", maar dat is een zin; verwacht een woord.',
    ])
  })

  it('eist Unicode-normaalvorm NFC en houdt het onderdeel dan op Concept', () => {
    const pack = fullPack()
    const [, adios] = pack['vocabulary.json'].words
    if (adios !== undefined) {
      adios.text = 'adio\u0301s'
    }
    const report = check(pack)
    expect(messages(report)).toEqual([
      'vocabulary.json › words[1].text: Niet in Unicode-normaalvorm NFC. Sla de tekst op als NFC, zodat elk teken één vaste code heeft.',
    ])
    expect(report.statuses.draft).toBe(1)
    expect(report.statuses['auto-checked']).toBe(6)
  })

  it('waarschuwt bij dubbele spaties, zonder publicatie tegen te houden', () => {
    const pack = fullPack()
    const [sentence] = pack['sentences.json'].sentences
    if (sentence !== undefined) {
      sentence.translation = 'Hallo!  Hoe gaat het?'
    }
    const report = check(pack)
    expect(messages(report, 'error')).toEqual([])
    expect(messages(report, 'warning')).toEqual([
      'sentences.json › sentences[0].translation: Twee spaties achter elkaar.',
    ])
    expect(report.statuses.draft).toBe(1)
  })

  it('controleert de antwoordsleutel van meerkeuzevragen', () => {
    const withChoices = (choices: { text: string; correct: boolean }[]) => {
      const pack = fullPack()
      const [exercise] = firstLesson(pack).exercises
      if (exercise !== undefined) {
        exercise.choices = choices
      }
      return messages(check(pack))
    }
    const where = 'units/a1-begroeten.json › lessons[0].exercises[0]'
    expect(
      withChoices([
        { text: 'hallo', correct: false },
        { text: 'dag', correct: false },
      ]),
    ).toEqual([`${where}.choices: Geen enkele keuze is als goed gemarkeerd.`])
    expect(
      withChoices([
        { text: 'hallo', correct: true },
        { text: 'hoi', correct: true },
      ]),
    ).toEqual([
      `${where}.choices: 2 keuzes zijn als goed gemarkeerd. Bij meerkeuze verwacht de app er één; klopt dit?`,
    ])
    expect(
      withChoices([
        { text: 'hallo', correct: true },
        { text: 'hallo', correct: false },
      ]),
    ).toEqual([`${where}.choices[1]: De keuze "hallo" staat er twee keer in.`])
  })

  it('controleert de antwoordsleutel van open vragen', () => {
    const pack = fullPack()
    const [, exercise] = firstLesson(pack).exercises
    if (exercise !== undefined) {
      exercise.answers = ['adi\u00f3s', 'adi\u00f3s']
      exercise.feedback = [
        {
          answer: 'adi\u00f3s',
          errorType: 'diacritics',
          message: 'Let op het accent.',
        },
      ]
    }
    const where = 'units/a1-begroeten.json › lessons[0].exercises[1]'
    expect(messages(check(pack))).toEqual([
      `${where}.answers[1]: Het antwoord "adi\u00f3s" staat er twee keer in.`,
      `${where}.feedback[0].answer: "adi\u00f3s" staat ook bij de goede antwoorden.`,
    ])
  })

  it('stelt eisen aan Bron-geverifieerd', () => {
    const withVerification = (verification: Record<string, unknown>) => {
      const pack = fullPack()
      const [hola] = pack['vocabulary.json'].words
      if (hola !== undefined) {
        hola.verification = verification
      }
      return check(pack)
    }
    const verified = (source: string, date = '2026-10-20') => ({
      status: 'source-verified',
      sources: [{ source, locator: 'hola' }],
      checkedBy: 'Claude',
      date,
    })

    const good = withVerification(verified('rae'))
    expect(messages(good)).toEqual([])
    expect(good.statuses['source-verified']).toBe(1)

    expect(messages(withVerification(verified('blog')))).toEqual([
      'vocabulary.json › words[0].verification.sources: Bron-geverifieerd vraagt minstens één gezaghebbende bron (authoritative: true).',
    ])
    expect(messages(withVerification(verified('onbekend')))).toEqual([
      'vocabulary.json › words[0].verification.sources[0].source: Bron "onbekend" staat niet in sources.json.',
      'vocabulary.json › words[0].verification.sources: Bron-geverifieerd vraagt minstens één gezaghebbende bron (authoritative: true).',
    ])
    expect(messages(withVerification(verified('rae', '2026-11-30')))).toEqual([
      'vocabulary.json › words[0].verification.date: De datum 2026-11-30 ligt in de toekomst.',
    ])
    // Een dag speling, voor het tijdsverschil tussen jouw pc en GitHub
    expect(messages(withVerification(verified('rae', '2026-10-29')))).toEqual(
      [],
    )
  })

  it('controleert niveaus binnen het kader van het pakket', () => {
    const pack = fullPack()
    const [hola] = pack['vocabulary.json'].words
    if (hola !== undefined) {
      hola.level = 'B3'
    }
    expect(messages(check(pack))).toEqual([
      'vocabulary.json › words[0].level: Niveau "B3" past niet bij dit pakket. Kies uit: A1, A2, B1, B2, C1, C2.',
    ])

    const milestones = fullPack()
    milestones['pack.json'].levels = {
      framework: 'milestones',
      description: 'Eigen mijlpalen',
    }
    expect(messages(check(milestones))).toContain(
      'units/a1-begroeten.json › level: Dit pakket heeft nog geen niveaus; zet de mijlpalen eerst in pack.json.',
    )
  })

  it('eist dat een eenheid in een bestand met haar eigen kenmerk staat', () => {
    const pack: Record<string, unknown> = fullPack()
    pack['units/begroeten.json'] = pack['units/a1-begroeten.json']
    delete pack['units/a1-begroeten.json']
    expect(messages(check(pack))).toEqual([
      'units/begroeten.json › id: Een eenheid met kenmerk "a1-begroeten" hoort in units/a1-begroeten.json te staan.',
    ])
  })

  it('waarschuwt bij uitleg zonder voorbeeldzin', () => {
    const pack = fullPack()
    firstLesson(pack).blocks = [
      { type: 'explanation', text: 'Hola betekent hallo.' },
    ]
    expect(messages(check(pack), 'warning')).toEqual([
      'units/a1-begroeten.json › lessons[0].blocks[0]: Uitleg zonder voorbeeldzin. Voeg een voorbeeld uit sentences.json toe.',
    ])
  })

  it('slaat onbekende bestanden over met een waarschuwing', () => {
    const report = check({ ...fullPack(), 'notities.txt': 'Niet vergeten' })
    expect(messages(report)).toEqual([
      'notities.txt: Onbekend bestand; de controle slaat het over.',
    ])
  })
})

describe('checkText', () => {
  it('staat gewone tekst in elk schrift toe, ook met een halve spatie', () => {
    // Perzisch mi-khaham met ZWNJ (U+200C), Koreaans hangugeo, Hindi namaste
    for (const text of [
      '\u0645\u06cc\u200c\u062e\u0648\u0627\u0647\u0645',
      '\ud55c\uad6d\uc5b4',
      '\u0928\u092e\u0938\u094d\u0924\u0947',
    ]) {
      expect(checkText(text)).toEqual([])
    }
  })

  it('weigert stuurtekens en spaties aan het begin of eind', () => {
    expect(checkText(' hola')).toEqual([
      {
        severity: 'error',
        message: 'Spatie of regeleinde aan het begin of eind.',
      },
    ])
    expect(checkText('a\u0009b')).toEqual([
      {
        severity: 'error',
        message:
          "Bevat een stuurteken (U+0009), zoals een tab of regeleinde. Zet losse alinea's in aparte velden.",
      },
    ])
  })

  it('waarschuwt bij onzichtbare richtingstekens', () => {
    expect(checkText('\u202bhola')).toEqual([
      {
        severity: 'warning',
        message:
          'Bevat een onzichtbaar richtingsteken (U+202B). De app regelt de richting zelf met lang en dir.',
      },
    ])
  })
})
