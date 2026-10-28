import { describe, expect, it } from 'vitest'
import { rulesFor } from './scripts.ts'
import { checkText, type TextProblem } from './text.ts'

// Tekens buiten ASCII staan als code, zodat ook onzichtbare verschillen
// opvallen. In de commentaren staat de uitspraak, zodat je weet wat er staat.

const persian = rulesFor({ code: 'fa', script: 'Arab' })
const hindi = rulesFor({ code: 'hi', script: 'Deva' })
const korean = rulesFor({ code: 'ko', script: 'Kore' })
const spanish = rulesFor({ code: 'es', script: 'Latn' })
const burmese = rulesFor({ code: 'my', script: 'Mymr' })

function messages(problems: readonly TextProblem[]): string[] {
  return problems.map((found) => `${found.severity}: ${found.message}`)
}

describe('letters in de doeltaal', () => {
  it('accepteert tekst in het eigen schrift', () => {
    expect(spanish.target('adi\u00f3s')).toEqual([])
    // ketab
    expect(persian.target('\u06a9\u062a\u0627\u0628')).toEqual([])
    // hangugeo
    expect(korean.target('\ud55c\uad6d\uc5b4')).toEqual([])
    // namaste
    expect(hindi.target('\u0928\u092e\u0938\u094d\u0924\u0947')).toEqual([])
    // myanma
    expect(burmese.target('\u1019\u103c\u1014\u103a\u1019\u102c')).toEqual([])
  })

  it('weigert een letter uit een ander schrift, zoals een Cyrillische o', () => {
    expect(messages(spanish.target('h\u043ela'))).toEqual([
      'error: Letter uit een ander schrift: "\u043e" (U+043E) is Cyrillisch.',
    ])
  })

  it('weigert doeltaaltekst zonder letters in het eigen schrift', () => {
    expect(messages(hindi.target('namaste'))).toEqual([
      'error: Bevat geen letters in Devanagari.',
      'warning: Bevat Latijnse letters (namste). Is dat bedoeld?',
    ])
  })

  it('waarschuwt bij Latijnse letters in een ander schrift', () => {
    // tivi TV
    expect(messages(hindi.target('\u091f\u0940\u0935\u0940 TV'))).toEqual([
      'warning: Bevat Latijnse letters (TV). Is dat bedoeld?',
    ])
  })

  it('controleert dat een transliteratie in Latijnse letters staat', () => {
    expect(persian.romanization('ket\u00e2b')).toEqual([])
    expect(messages(persian.romanization('ket\u0627b'))).toEqual([
      'error: Een transliteratie staat in Latijnse letters, maar dit bevat "\u0627" (U+0627, Arabisch).',
    ])
  })
})

describe('Perzisch', () => {
  it('weigert de Arabische ye en kaf', () => {
    // ketabi, geschreven met de Arabische kaf (U+0643) en ye (U+064A)
    expect(
      messages(persian.characters('\u0643\u062a\u0627\u0628\u064a')),
    ).toEqual([
      'error: Arabische ye \u064A (U+064A). Gebruik de Perzische ye \u06CC (U+06CC).',
      'error: Arabische kaf \u0643 (U+0643). Gebruik de Perzische kaf \u06A9 (U+06A9).',
    ])
  })

  it('weigert Arabische cijfers en vaste lettervormen', () => {
    expect(messages(persian.characters('\u0664'))).toEqual([
      'error: Arabisch cijfer \u0664 (U+0664). Gebruik Perzische cijfers, \u06F0 tot \u06F9 (U+06F0 tot U+06F9).',
    ])
    expect(messages(persian.characters('\ufe8f'))).toEqual([
      'error: Vaste lettervorm (U+FE8F), vaak door kopi\u00ebren uit een pdf. Gebruik de gewone letter.',
    ])
  })

  it('waarschuwt bij een gewone spatie waar een halve spatie hoort', () => {
    // mi khaham, met een gewone spatie
    expect(
      messages(
        persian.characters('\u0645\u06cc \u062e\u0648\u0627\u0647\u0645'),
      ),
    ).toEqual([
      'warning: Gewone spatie na \u0645\u06CC. In het Perzisch hoort daar een halve spatie (ZWNJ), zoals in \u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u0645.',
    ])
    // ketab ha, met een gewone spatie
    expect(
      messages(persian.characters('\u06a9\u062a\u0627\u0628 \u0647\u0627')),
    ).toEqual([
      'warning: Gewone spatie voor \u0647\u0627. In het Perzisch hoort daar een halve spatie (ZWNJ), zoals in \u06A9\u062A\u0627\u0628\u200C\u0647\u0627.',
    ])
  })

  it('accepteert de halve spatie op de goede plek', () => {
    // mi-khaham, met een halve spatie
    const text = '\u0645\u06cc\u200c\u062e\u0648\u0627\u0647\u0645'
    expect(persian.characters(text)).toEqual([])
    expect(checkText(text)).toEqual([])
  })

  it('weigert een halve spatie die niet tussen twee letters staat', () => {
    expect(
      messages(checkText('\u0645\u06cc\u200c \u062e\u0648\u0627\u0647\u0645')),
    ).toEqual([
      'error: Halve spatie (ZWNJ, U+200C) die niet tussen twee letters staat.',
    ])
  })
})

describe('Hindi', () => {
  // hindi sikhna mazedar hai, met de nukta (U+093C) als los teken, zoals NFC dat vraagt
  const sentence =
    '\u0939\u093f\u0902\u0926\u0940 \u0938\u0940\u0916\u0928\u093e \u092e\u091c\u093c\u0947\u0926\u093e\u0930 \u0939\u0948'

  it('vraagt om een danda aan het eind van een zin', () => {
    expect(hindi.sentence(`${sentence}\u0964`)).toEqual([])
    expect(messages(hindi.sentence(`${sentence}.`))).toEqual([
      'warning: Een Hindi-zin eindigt met een danda (\u0964), niet met een punt.',
    ])
  })

  it('weigert een verticale streep in plaats van de danda', () => {
    expect(messages(hindi.characters(`${sentence} |`))).toEqual([
      'error: Verticale streep (|) in Hindi-tekst. Gebruik de danda \u0964 (U+0964).',
    ])
  })
})

describe('Koreaans', () => {
  it('waarschuwt bij losse letters in woorden en zinnen', () => {
    // giyeok, de letter g als losse letter
    expect(messages(korean.target('\u3131'))).toEqual([
      'warning: Losse Hangul-letter \u3131 (U+3131). In woorden en zinnen horen hele lettergrepen.',
    ])
  })

  it('weigert Hangul in halve breedte', () => {
    expect(messages(korean.characters('\uffa1'))).toEqual([
      'error: Hangul in halve breedte (U+FFA1). Gebruik gewone Hangul.',
    ])
  })
})

describe('Spaans', () => {
  it('vraagt om \u00bf en \u00a1 aan het begin van een vraag of uitroep', () => {
    expect(spanish.sentence('\u00bfQu\u00e9 tal?')).toEqual([])
    expect(messages(spanish.sentence('Qu\u00e9 tal?'))).toEqual([
      'warning: Een Spaanse vraag begint met \u00BF.',
    ])
    expect(messages(spanish.sentence('Hola!'))).toEqual([
      'warning: Een Spaanse uitroep begint met \u00A1.',
    ])
  })
})

describe('Birmaans', () => {
  it('weigert het klinkerteken e aan het begin van een woord, een teken van Zawgyi', () => {
    // ne in Zawgyi-volgorde: eerst het klinkerteken, dan de medeklinker
    expect(messages(checkText('\u1031\u1014'))).toEqual([
      'error: Klinkerteken \u1031 (U+1031) aan het begin van een woord. In Unicode staat het n\u00e1 de medeklinker; dit wijst op Zawgyi-codering.',
    ])
    // ne in Unicode-volgorde
    expect(checkText('\u1014\u1031')).toEqual([])
  })

  it('waarschuwt bij tekens buiten het Birmaanse alfabet', () => {
    expect(messages(burmese.characters('\u1060'))).toEqual([
      'warning: Teken buiten het Birmaanse alfabet (U+1060), zoals uit het Mon of Shan. Klopt het schrift, en is de tekst geen Zawgyi?',
    ])
  })
})

describe('algemene tekstregels', () => {
  it('weigert een accent zonder letter ervoor', () => {
    expect(messages(checkText('caf \u0301'))).toEqual([
      'error: Teken zonder letter ervoor (U+0301), zoals een klinkerteken aan het begin van een woord.',
    ])
  })

  it('waarschuwt bij rechte aanhalingstekens en apostrofs', () => {
    expect(messages(checkText("auto's"))).toEqual([
      "warning: Rechte apostrof ('). Gebruik \u2019.",
    ])
    expect(messages(checkText('"hola"'))).toEqual([
      'warning: Recht aanhalingsteken ("). Gebruik \u201c \u201d (in het Duits \u201e \u201c).',
    ])
  })

  it('slaat typografie over bij bekende foute antwoorden', () => {
    expect(checkText("don't", { typography: false })).toEqual([])
  })
})
