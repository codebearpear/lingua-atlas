import { describe, expect, it } from 'vitest'
import { checkPack } from './check.ts'
import { compilePack } from './compile.ts'

// Tekens buiten ASCII staan als code, zoals \u00f3 voor een o met accent.

const TODAY = '2026-10-28'

const VERIFIED = {
  status: 'source-verified',
  sources: [{ source: 'rae' }],
  checkedBy: 'Claude',
  date: TODAY,
}

/** Een klein pakket met twee eenheden, in bestanden die niet op volgorde staan. */
function packFiles(): Record<string, unknown> {
  return {
    'pack.json': {
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
    },
    'sources.json': {
      sources: [
        {
          id: 'rae',
          title: 'Diccionario de la lengua espa\u00f1ola',
          kind: 'dictionary',
          authoritative: true,
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
          verification: VERIFIED,
        },
        {
          id: 'adios',
          text: 'adi\u00f3s',
          translations: ['dag', 'tot ziens'],
          partOfSpeech: 'interjection',
          notes: 'Zeg je bij het weggaan.',
        },
      ],
    },
    'sentences.json': {
      sentences: [
        {
          id: 's-hola',
          text: '\u00a1Hola!',
          translation: 'Hallo!',
          register: ['informal'],
          verification: VERIFIED,
        },
      ],
    },
    // Op bestandsnaam komt deze eenheid eerst, maar ze heeft volgorde 2.
    'units/a1-afscheid.json': {
      id: 'a1-afscheid',
      title: 'Afscheid nemen',
      level: 'A1',
      order: 2,
      goals: ['Je kunt gedag zeggen.'],
      lessons: [
        {
          id: 'a1-afscheid-dag',
          title: 'Dag zeggen',
          goals: ['Je kunt dag zeggen.'],
          // Uitleg zonder voorbeeldzin geeft een waarschuwing; een les in
          // concept blijft dan Concept.
          blocks: [{ type: 'explanation', text: '*Adi\u00f3s* betekent dag.' }],
          words: ['adios'],
        },
      ],
      verification: VERIFIED,
    },
    'units/a1-begroeten.json': {
      id: 'a1-begroeten',
      title: 'Begroeten',
      level: 'A1',
      order: 1,
      goals: ['Je kunt iemand begroeten.'],
      lessons: [
        {
          id: 'a1-begroeten-hallo',
          title: 'Hallo',
          goals: ['Je kunt hallo zeggen.'],
          blocks: [
            {
              type: 'explanation',
              text: '*Hola* betekent hallo.',
              examples: ['s-hola'],
            },
            { type: 'culture', text: 'In Spanje geef je vaak twee zoenen.' },
          ],
          words: ['hola'],
          exercises: [
            {
              id: 'oef-hola',
              type: 'multiple-choice',
              skill: 'vocabulary',
              direction: 'to-dutch',
              instruction: 'Wat betekent dit?',
              prompt: 'hola',
              items: ['hola'],
              choices: [
                { text: 'hallo', correct: true },
                { text: 'dag', correct: false },
              ],
              verification: VERIFIED,
            },
          ],
          verification: VERIFIED,
        },
      ],
      verification: VERIFIED,
    },
  }
}

function compile(entries: Record<string, unknown>) {
  const files = new Map(
    Object.entries(entries).map(([name, data]) => [name, JSON.stringify(data)]),
  )
  const report = checkPack({ folder: 'es', files }, { today: TODAY })
  expect(report.issues.filter((issue) => issue.severity === 'error')).toEqual(
    [],
  )
  return compilePack(report)
}

describe('compilePack', () => {
  it('zet de eenheden op volgorde, niet op bestandsnaam', () => {
    const pack = compile(packFiles())
    expect(pack.id).toBe('es')
    expect(pack.units.map((unit) => unit.id)).toEqual([
      'a1-begroeten',
      'a1-afscheid',
    ])
  })

  it('neemt de lesinhoud over, met lege voorbeelden waar die ontbreken', () => {
    const [first, second] = compile(packFiles()).units
    expect(first?.lessons[0]).toMatchObject({
      id: 'a1-begroeten-hallo',
      title: 'Hallo',
      words: ['hola'],
      exerciseCount: 1,
    })
    expect(first?.lessons[0]?.blocks[1]).toEqual({
      type: 'culture',
      text: ['In Spanje geef je vaak twee zoenen.'],
    })
    expect(second?.lessons[0]?.blocks).toEqual([
      {
        type: 'explanation',
        text: [{ kind: 'target', text: 'Adi\u00f3s' }, ' betekent dag.'],
        examples: [],
      },
    ])
  })

  it('zet Nederlandse tekst om in stukken, met de doeltaal gemarkeerd', () => {
    const pack = compile(packFiles())
    const [first] = pack.units
    expect(first?.goals).toEqual([['Je kunt iemand begroeten.']])
    expect(first?.lessons[0]?.goals).toEqual([['Je kunt hallo zeggen.']])
    expect(first?.lessons[0]?.blocks[0]).toEqual({
      type: 'explanation',
      text: [{ kind: 'target', text: 'Hola' }, ' betekent hallo.'],
      examples: ['s-hola'],
    })
    expect(pack.words.adios?.notes).toEqual(['Zeg je bij het weggaan.'])
    expect(pack.words.hola?.notes).toBeUndefined()
  })

  it('geeft een les de laagste status van alles wat ze toont', () => {
    const [first, second] = compile(packFiles()).units
    // Alles in de eerste les is nagelopen tegen een bron.
    expect(first?.lessons[0]?.status).toBe('source-verified')
    // Deze les heeft een waarschuwing en blijft Concept, ook al is haar
    // eenheid nagelopen.
    expect(second?.lessons[0]?.status).toBe('draft')
  })

  it('rekent een woord in de les mee, ook als de les zelf is nagelopen', () => {
    const files = packFiles()
    const unit = files['units/a1-begroeten.json'] as {
      lessons: { words: string[] }[]
    }
    const lesson = unit.lessons[0]
    if (lesson === undefined) {
      throw new Error('De testgegevens missen een les.')
    }
    lesson.words = ['hola', 'adios']
    const [first] = compile(files).units
    expect(first?.lessons[0]?.status).toBe('auto-checked')
    expect(first?.status).toBe('auto-checked')
  })

  it('geeft een eenheid de laagste status van haar lessen', () => {
    const [first, second] = compile(packFiles()).units
    expect(first?.status).toBe('source-verified')
    expect(second?.status).toBe('draft')
  })

  it('levert woorden en zinnen met hun eigen status', () => {
    const pack = compile(packFiles())
    expect(pack.words.hola).toMatchObject({
      text: 'hola',
      translations: ['hallo'],
      partOfSpeech: 'interjection',
      status: 'source-verified',
    })
    expect(pack.words.adios).toMatchObject({
      text: 'adi\u00f3s',
      status: 'auto-checked',
    })
    expect(pack.sentences['s-hola']).toMatchObject({
      text: '\u00a1Hola!',
      translation: 'Hallo!',
      register: ['informal'],
      status: 'source-verified',
    })
  })
})
