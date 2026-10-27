/**
 * Voorbeeldteksten voor de schrifttest.
 *
 * Ze testen alleen of elk schrift goed op het scherm komt; het is geen
 * lesstof. Validatiestatus: Concept.
 */

export interface ScriptSample {
  /** Korte naam waar de controlepunten naar verwijzen. */
  label: string
  /** BCP 47-taalcode, voor het lang-attribuut. */
  locale: string
  text: string
  /** De betekenis in het Nederlands. */
  meaning: string
}

export interface MixedExample {
  before: string
  word: string
  wordLocale: string
  after: string
}

export interface ScriptTest {
  id: 'latin' | 'hangul' | 'devanagari' | 'persian' | 'myanmar'
  title: string
  direction: 'ltr' | 'rtl'
  /** Welk lettertype de app voor dit schrift gebruikt. */
  fontNote: string
  /** Toon de voorbeelden in de leesletter (New York of Literata). */
  serif: boolean
  samples: readonly ScriptSample[]
  /** Een Nederlandse zin met een woord in dit schrift erin. */
  mixedExample?: MixedExample
  /** Waar je op let om te zien of de weergave klopt. */
  checks: readonly string[]
}

export const SCRIPT_TESTS: readonly ScriptTest[] = [
  {
    id: 'latin',
    title: 'Latijns schrift: Engels, Duits en Spaans',
    direction: 'ltr',
    fontNote: 'Leesletter: New York op Apple-apparaten, Literata op Windows',
    serif: true,
    samples: [
      {
        label: 'Engels',
        locale: 'en-US',
        text: 'Typography matters: “curly quotes,” an em dash — and the apostrophe in don’t.',
        meaning:
          'Typografie doet ertoe: gekrulde aanhalingstekens, een gedachtestreepje en de apostrof in don’t.',
      },
      {
        label: 'Duits',
        locale: 'de-DE',
        text: '„Die Größe der Straße überrascht das Mädchen.“',
        meaning: 'De grootte van de straat verrast het meisje.',
      },
      {
        label: 'Spaans',
        locale: 'es-ES',
        text: '¿Dónde está la estación? El año que viene aprenderé español.',
        meaning: 'Waar is het station? Volgend jaar leer ik Spaans.',
      },
    ],
    checks: [
      'Aanhalingstekens en de apostrof zijn gekruld, niet recht.',
      'De ß in het Duitse voorbeeld is één letter, geen B.',
      'Duitse aanhalingstekens openen onderaan en sluiten bovenaan.',
      'De Spaanse vraag begint met een omgekeerd vraagteken.',
      'Accenten en tildes staan netjes boven de letter.',
    ],
  },
  {
    id: 'hangul',
    title: 'Hangul: Koreaans',
    direction: 'ltr',
    fontNote:
      'Systeemlettertype: Apple SD Gothic Neo op Apple-apparaten, Malgun Gothic op Windows',
    serif: false,
    samples: [
      {
        label: 'Begroeting',
        locale: 'ko-KR',
        text: '안녕하세요',
        meaning: 'Hallo (beleefd)',
      },
      {
        label: 'Dubbele slotmedeklinkers',
        locale: 'ko-KR',
        text: '닭 · 값 · 읽다',
        meaning: 'kip · prijs · lezen',
      },
      {
        label: 'Zin',
        locale: 'ko-KR',
        text: '한국어를 공부해요.',
        meaning: 'Ik studeer Koreaans.',
      },
    ],
    checks: [
      'Elke lettergreep is één compact blok; nergens staan losse letters naast elkaar.',
      'Bij de dubbele slotmedeklinkers staan onderin elk blok twee medeklinkers naast elkaar.',
      'De zin heeft gewone spaties tussen de woorden.',
    ],
  },
  {
    id: 'devanagari',
    title: 'Devanagari: Hindi',
    direction: 'ltr',
    fontNote: 'Op Windows: Noto Sans Devanagari, meegeleverd',
    serif: false,
    samples: [
      {
        label: 'Begroeting',
        locale: 'hi-IN',
        text: 'नमस्ते',
        meaning: 'Gegroet, hallo',
      },
      {
        label: 'Samengestelde medeklinkers',
        locale: 'hi-IN',
        text: 'क्षमा · विद्या · धर्म · प्रेम',
        meaning: 'vergeving · kennis · religie, plicht · liefde',
      },
      {
        label: 'Nukta',
        locale: 'hi-IN',
        text: 'ज़रूर',
        meaning: 'zeker, beslist',
      },
      {
        label: 'Zin',
        locale: 'hi-IN',
        text: 'हिंदी सीखना मज़ेदार है।',
        meaning: 'Hindi leren is leuk.',
      },
    ],
    checks: [
      'De kopstreep loopt over aaneengeschreven letters heen door.',
      'Het teken voor de korte i staat links van de medeklinker waar het bij hoort, ook al spreek je het erna uit.',
      'Samengestelde medeklinkers vormen één geheel, zonder los schuin streepje (halant) eronder.',
      'Bij het nukta-voorbeeld staat een puntje onder de eerste letter.',
      'Nergens staan stippelcirkels: die wijzen op een lettertype dat het schrift niet goed ondersteunt.',
    ],
  },
  {
    id: 'persian',
    title: 'Perzisch schrift: Perzisch (Farsi)',
    direction: 'rtl',
    fontNote: 'Op Windows: Vazirmatn, meegeleverd',
    serif: false,
    samples: [
      {
        label: 'Begroeting',
        locale: 'fa-IR',
        text: 'سلام',
        meaning: 'Hallo',
      },
      {
        label: 'Halve spatie',
        locale: 'fa-IR',
        text: 'می‌خواهم',
        meaning: 'Ik wil',
      },
      {
        label: 'Eigen Perzische letters',
        locale: 'fa-IR',
        text: 'پدر، چای، ژاپن، گل',
        meaning: 'vader, thee, Japan, bloem',
      },
      {
        label: 'Ezafe',
        locale: 'fa-IR',
        text: 'کتابِ من',
        meaning: 'mijn boek',
      },
      {
        label: 'Cijfers',
        locale: 'fa-IR',
        text: '۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹',
        meaning: 'nul tot en met negen',
      },
    ],
    mixedExample: {
      before: 'Het Perzische woord ',
      word: 'کتاب',
      wordLocale: 'fa-IR',
      after: ' betekent ‘boek’.',
    },
    checks: [
      'De tekst begint rechts en loopt naar links.',
      'De letters binnen een woord zijn met elkaar verbonden.',
      'Bij de halve spatie staan de twee delen los van elkaar, maar dichter bij elkaar dan bij een gewone spatie.',
      'Bij de ezafe staat een klein schuin streepje onder de laatste letter van het eerste woord.',
      'De cijfers 4, 5 en 6 hebben de Perzische vorm, niet de Arabische.',
      'In de Nederlandse zin staat het Perzische woord op zijn plaats en de punt aan het eind.',
    ],
  },
  {
    id: 'myanmar',
    title: 'Birmaans schrift: Birmaans',
    direction: 'ltr',
    fontNote: 'Op Windows: Noto Sans Myanmar, meegeleverd',
    serif: false,
    samples: [
      {
        label: 'Begroeting',
        locale: 'my-MM',
        text: 'မင်္ဂလာပါ',
        meaning: 'Gegroet (mingalaba)',
      },
      {
        label: 'Dank je',
        locale: 'my-MM',
        text: 'ကျေးဇူးတင်ပါတယ်',
        meaning: 'Dank je wel',
      },
      {
        label: 'Gestapelde medeklinkers',
        locale: 'my-MM',
        text: 'သတ္တဝါ',
        meaning: 'dier, levend wezen',
      },
      {
        label: 'Medial ra',
        locale: 'my-MM',
        text: 'မြန်မာစာ',
        meaning: 'Birmaans (de geschreven taal)',
      },
    ],
    checks: [
      'Bij de begroeting staat een kleine krul (kinzi) boven het midden van het woord.',
      'Bij “Dank je” staat het klinkerteken voor e links van de eerste medeklinker, ook al spreek je het erna uit.',
      'Bij de gestapelde medeklinkers staat een kleine medeklinker onder een grote.',
      'Bij de medial ra omsluit een boog de eerste letter.',
      'Nergens staan stippelcirkels: die wijzen op een kapot lettertype of op de verouderde Zawgyi-codering.',
    ],
  },
]
