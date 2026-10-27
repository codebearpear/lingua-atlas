// Lingua Atlas: één opdracht voor een complete stap.
//
//   npm run klaar
//
// 1. Installeert de bouwstenen, plus nieuwe bouwstenen als Claude die in
//    .claude-stap.json heeft genoemd.
// 2. Maakt alle bestanden netjes op (Prettier).
// 3. Draait alle controles (npm run check).
// 4. Alleen als alles slaagt: legt de wijzigingen vast (commit) en stuurt ze
//    naar GitHub (push). GitHub publiceert daarna zelf de nieuwe versie.
//
// Het volledige verslag komt in .claude-verslag/laatste.txt, zodat Claude het
// zelf kan lezen. Die map en .claude-stap.json gaan niet mee naar GitHub.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const STAP_BESTAND = '.claude-stap.json'
const VERSLAG_MAP = '.claude-verslag'
const VERSLAG_BESTAND = join(VERSLAG_MAP, 'laatste.txt')
const BERICHT_BESTAND = join(VERSLAG_MAP, 'commitbericht.txt')
const STANDAARD_BERICHT = 'Wijzigingen bijgewerkt'

// Alleen gewone pakketnamen, eventueel met versie, zoals "naam@^1.2.3".
const PAKKETNAAM = /^[@a-z0-9][a-z0-9@/._~^+-]*$/i
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
    return true
  }
  noteer(`✗ Mislukt: ${titel} (foutcode ${code})`)
  return false
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

async function leesStap() {
  if (!existsSync(STAP_BESTAND)) {
    return {
      bericht: STANDAARD_BERICHT,
      installeren: [],
      installerenDev: [],
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
    vanClaude: true,
  }
}

const tussenAanhalingstekens = (naam) => `"${naam}"`

async function voerStapUit() {
  noteer(`Lingua Atlas: npm run klaar (${new Date().toLocaleString('nl-NL')})`)

  const opdracht = await leesStap()
  noteer(
    opdracht.vanClaude
      ? `Stap van Claude: ${opdracht.bericht.split('\n')[0]}`
      : 'Geen stapbestand van Claude gevonden; standaardbeschrijving gebruikt.',
  )

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
  stappen.push(['Bestanden opmaken', 'npm run format'])
  stappen.push(['Alle controles', 'npm run check'])

  for (const [titel, regel] of stappen) {
    if (!(await stap(titel, regel))) {
      return {
        gelukt: false,
        uitleg:
          'Er is niets vastgelegd en niets gepubliceerd. Je app online is niet veranderd.',
      }
    }
  }

  const status = await voerUit('git status --porcelain', { stil: true })
  if (status.uitvoer.trim() === '') {
    noteer()
    noteer('Geen nieuwe wijzigingen om vast te leggen.')
  } else {
    await mkdir(VERSLAG_MAP, { recursive: true })
    await writeFile(BERICHT_BESTAND, `${opdracht.bericht.trim()}\n`, 'utf8')
    if (
      !(await stap('Wijzigingen klaarzetten', 'git add -A')) ||
      !(await stap('Bewaarpunt maken', `git commit -F "${BERICHT_BESTAND}"`))
    ) {
      return {
        gelukt: false,
        uitleg: 'Er is niets gepubliceerd. Je app online is niet veranderd.',
      }
    }
    const laatste = await voerUit('git log -1 --oneline', { stil: true })
    noteer(`  Bewaarpunt: ${laatste.uitvoer.trim()}`)
  }

  if (!(await stap('Naar GitHub sturen', 'git push'))) {
    return {
      gelukt: false,
      uitleg:
        'De wijzigingen staan wel vastgelegd op je pc, maar zijn nog niet naar GitHub gestuurd.',
    }
  }

  if (opdracht.vanClaude) {
    await rm(STAP_BESTAND, { force: true })
  }
  return {
    gelukt: true,
    uitleg:
      'GitHub controleert alles nog een keer en zet de nieuwe versie over een à twee minuten online.',
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
