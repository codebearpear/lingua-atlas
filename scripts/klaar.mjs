// Lingua Atlas: één opdracht voor een complete stap.
//
//   npm run klaar
//
// 1. Verwijdert bestanden die Claude in .claude-stap.json noemt. Dat kan
//    alleen bij bestanden die al in een bewaarpunt staan, zodat ze altijd
//    terug te halen zijn.
// 2. Installeert de bouwstenen, plus nieuwe als Claude die noemt.
// 3. Maakt alle bestanden netjes op (Prettier).
// 4. Draait alle controles (npm run check).
// 5. Alleen als alles slaagt: legt de wijzigingen vast (commit) en stuurt ze
//    naar GitHub (push). GitHub publiceert daarna zelf de nieuwe versie.
//
// Het volledige verslag komt in .claude-verslag/laatste.txt, zodat Claude het
// zelf kan lezen. Als de bouwstenen veranderen, komt er ook een kopie in
// .claude-verslag/bouwstenen.tgz, zodat Claude zijn code vooraf kan
// controleren. Die map en .claude-stap.json gaan niet mee naar GitHub.

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const STAP_BESTAND = '.claude-stap.json'
const VERSLAG_MAP = '.claude-verslag'
const VERSLAG_BESTAND = join(VERSLAG_MAP, 'laatste.txt')
const BERICHT_BESTAND = join(VERSLAG_MAP, 'commitbericht.txt')
const KOPIE_BESTAND = join(VERSLAG_MAP, 'bouwstenen.tgz')
const KOPIE_KENMERK = join(VERSLAG_MAP, 'bouwstenen.sha256')
const STANDAARD_BERICHT = 'Wijzigingen bijgewerkt'

// Alleen gewone pakketnamen, eventueel met versie, zoals "naam@^1.2.3".
const PAKKETNAAM = /^[@a-z0-9][a-z0-9@/._~^+-]*$/i
// Alleen gewone paden binnen het project, met / als scheidingsteken.
const PADTEKENS = /^[A-Za-z0-9._@/-]+$/
// Kleurcodes uit de terminal, die horen niet in het verslag.
const KLEURCODES = /\u001b\[[0-9;?]*[A-Za-z]/g

const verslag = []

function noteer(regel = '') {
  console.log(regel)
  verslag.push(regel)
}

/** Voert een opdracht uit, toont de uitvoer live en bewaart die voor het verslag. */
function voerUit(opdracht, { stil = false } = {}) {
  return new Promise((resolve) => {
    const kind = spawn(opdracht, {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    })
    let uitvoer = ''
    for (const stroom of [kind.stdout, kind.stderr]) {
      stroom.setEncoding('utf8')
      stroom.on('data', (stuk) => {
        if (!stil) {
          process.stdout.write(stuk)
        }
        uitvoer += stuk
      })
    }
    kind.on('error', (fout) => {
      uitvoer += `\n${fout.message}`
    })
    kind.on('close', (code) => {
      resolve({ code: code ?? 1, uitvoer: uitvoer.replace(KLEURCODES, '') })
    })
  })
}

async function stap(titel, opdracht) {
  noteer()
  noteer(`▶ ${titel}`)
  noteer(`  > ${opdracht}`)
  const { code, uitvoer } = await voerUit(opdracht)
  verslag.push(uitvoer.trimEnd())
  if (code === 0) {
    noteer(`✓ Gelukt: ${titel}`)
  } else {
    noteer(`✗ Mislukt: ${titel} (foutcode ${code})`)
  }
  return { gelukt: code === 0, uitvoer }
}

function lijstVanPakketten(waarde, veld) {
  if (waarde === undefined) {
    return []
  }
  if (
    !Array.isArray(waarde) ||
    !waarde.every((naam) => typeof naam === 'string' && PAKKETNAAM.test(naam))
  ) {
    throw new Error(
      `"${veld}" in ${STAP_BESTAND} moet een lijst met gewone pakketnamen zijn.`,
    )
  }
  return waarde
}

function geldigPad(pad) {
  return (
    typeof pad === 'string' &&
    PADTEKENS.test(pad) &&
    !pad.startsWith('/') &&
    !pad.split('/').includes('..') &&
    !pad.startsWith('.git/') &&
    !pad.startsWith('node_modules/')
  )
}

function lijstVanPaden(waarde) {
  if (waarde === undefined) {
    return []
  }
  if (!Array.isArray(waarde) || !waarde.every(geldigPad)) {
    throw new Error(
      `"verwijderen" in ${STAP_BESTAND} moet een lijst met gewone paden binnen het project zijn.`,
    )
  }
  return waarde
}

async function leesStap() {
  if (!existsSync(STAP_BESTAND)) {
    return {
      bericht: STANDAARD_BERICHT,
      installeren: [],
      installerenDev: [],
      verwijderen: [],
      vanClaude: false,
    }
  }
  const inhoud = JSON.parse(await readFile(STAP_BESTAND, 'utf8'))
  if (typeof inhoud.bericht !== 'string' || inhoud.bericht.trim() === '') {
    throw new Error(`"bericht" ontbreekt in ${STAP_BESTAND}.`)
  }
  return {
    bericht: inhoud.bericht,
    installeren: lijstVanPakketten(inhoud.installeren, 'installeren'),
    installerenDev: lijstVanPakketten(inhoud.installerenDev, 'installerenDev'),
    verwijderen: lijstVanPaden(inhoud.verwijderen),
    vanClaude: true,
  }
}

const tussenAanhalingstekens = (tekst) => `"${tekst}"`

async function kenmerkVanBouwstenen() {
  const inhoud = await readFile('package-lock.json')
  return createHash('sha256').update(inhoud).digest('hex')
}

/** Maakt een kopie van node_modules voor Claude, alleen als de bouwstenen veranderd zijn. */
async function maakKopieVoorClaude() {
  const kenmerk = await kenmerkVanBouwstenen()
  const vorigKenmerk = existsSync(KOPIE_KENMERK)
    ? (await readFile(KOPIE_KENMERK, 'utf8')).trim()
    : ''
  if (kenmerk === vorigKenmerk && existsSync(KOPIE_BESTAND)) {
    return
  }
  await mkdir(VERSLAG_MAP, { recursive: true })
  noteer()
  noteer('▶ Kopie van de bouwstenen maken voor Claude (alleen na wijzigingen)')
  const { code, uitvoer } = await voerUit(
    `tar -czf "${KOPIE_BESTAND}" --exclude=node_modules/.cache --exclude=node_modules/.vite --exclude=node_modules/.tmp node_modules`,
    { stil: true },
  )
  if (code === 0) {
    await writeFile(KOPIE_KENMERK, `${kenmerk}\n`, 'utf8')
    noteer('✓ Gelukt: kopie gemaakt')
  } else {
    // Geen ramp: de kopie is alleen een hulpmiddel voor Claude.
    verslag.push(uitvoer.trimEnd())
    noteer('! De kopie lukte niet; de stap gaat gewoon door.')
  }
}

async function voerStapUit() {
  noteer(`Lingua Atlas: npm run klaar (${new Date().toLocaleString('nl-NL')})`)

  const opdracht = await leesStap()
  noteer(
    opdracht.vanClaude
      ? `Stap van Claude: ${opdracht.bericht.split('\n')[0]}`
      : 'Geen stapbestand van Claude gevonden; standaardbeschrijving gebruikt.',
  )

  const mislukt = {
    gelukt: false,
    uitleg:
      'Er is niets vastgelegd en niets gepubliceerd. Je app online is niet veranderd.',
  }

  const teVerwijderen = opdracht.verwijderen.filter((pad) => existsSync(pad))
  for (const pad of opdracht.verwijderen) {
    if (!teVerwijderen.includes(pad)) {
      noteer(`  (al verwijderd: ${pad})`)
    }
  }
  if (teVerwijderen.length > 0) {
    const resultaat = await stap(
      'Oude bestanden verwijderen',
      `git rm --quiet -- ${teVerwijderen.map(tussenAanhalingstekens).join(' ')}`,
    )
    if (!resultaat.gelukt) {
      return mislukt
    }
  }

  const stappen = []
  if (opdracht.installeren.length > 0) {
    stappen.push([
      'Nieuwe bouwstenen installeren',
      `npm install ${opdracht.installeren.map(tussenAanhalingstekens).join(' ')}`,
    ])
  }
  if (opdracht.installerenDev.length > 0) {
    stappen.push([
      'Nieuwe ontwikkelbouwstenen installeren',
      `npm install --save-dev ${opdracht.installerenDev.map(tussenAanhalingstekens).join(' ')}`,
    ])
  }
  stappen.push(['Bouwstenen bijwerken', 'npm install'])

  for (const [titel, regel] of stappen) {
    if (!(await stap(titel, regel)).gelukt) {
      return mislukt
    }
  }

  try {
    await maakKopieVoorClaude()
  } catch (fout) {
    noteer(
      `! De kopie voor Claude lukte niet (${fout instanceof Error ? fout.message : String(fout)}); de stap gaat gewoon door.`,
    )
  }

  for (const [titel, regel] of [
    ['Bestanden opmaken', 'npm run format'],
    ['Alle controles', 'npm run check'],
  ]) {
    if (!(await stap(titel, regel)).gelukt) {
      return mislukt
    }
  }

  let nieuwBewaarpunt = false
  const status = await voerUit('git status --porcelain', { stil: true })
  if (status.uitvoer.trim() === '') {
    noteer()
    noteer('Geen nieuwe wijzigingen om vast te leggen.')
  } else {
    await mkdir(VERSLAG_MAP, { recursive: true })
    await writeFile(BERICHT_BESTAND, `${opdracht.bericht.trim()}\n`, 'utf8')
    if (
      !(await stap('Wijzigingen klaarzetten', 'git add -A')).gelukt ||
      !(await stap('Bewaarpunt maken', `git commit -F "${BERICHT_BESTAND}"`))
        .gelukt
    ) {
      return {
        gelukt: false,
        uitleg: 'Er is niets gepubliceerd. Je app online is niet veranderd.',
      }
    }
    nieuwBewaarpunt = true
    const laatste = await voerUit('git log -1 --oneline', { stil: true })
    noteer(`  Bewaarpunt: ${laatste.uitvoer.trim()}`)
  }

  const push = await stap('Naar GitHub sturen', 'git push')
  if (!push.gelukt) {
    return {
      gelukt: false,
      uitleg:
        'De wijzigingen staan wel vastgelegd op je pc, maar zijn nog niet naar GitHub gestuurd.',
    }
  }

  if (opdracht.vanClaude) {
    await rm(STAP_BESTAND, { force: true })
  }
  const nietsNieuws =
    !nieuwBewaarpunt && push.uitvoer.includes('Everything up-to-date')
  return {
    gelukt: true,
    uitleg: nietsNieuws
      ? 'Er was niets nieuws om te publiceren.'
      : 'GitHub controleert alles nog een keer en zet de nieuwe versie over een à twee minuten online.',
  }
}

let uitkomst
try {
  uitkomst = await voerStapUit()
} catch (fout) {
  uitkomst = {
    gelukt: false,
    uitleg: `Onverwachte fout: ${fout instanceof Error ? fout.message : String(fout)}`,
  }
}

noteer()
noteer('────────────────────────────────────────')
if (uitkomst.gelukt) {
  noteer('✓ Alles gelukt.')
  noteer(uitkomst.uitleg)
} else {
  noteer('✗ Er ging iets mis.')
  noteer(uitkomst.uitleg)
  noteer('Zeg tegen Claude "klaar"; Claude leest dan zelf het verslag.')
  process.exitCode = 1
}

await mkdir(VERSLAG_MAP, { recursive: true })
await writeFile(VERSLAG_BESTAND, `${verslag.join('\n')}\n`, 'utf8')
