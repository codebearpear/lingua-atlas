import { describe, expect, it } from 'vitest'
import {
  backupFileName,
  BACKUP_FORMAT_VERSION,
  canonicalJson,
  createBackup,
  serializeBackup,
  sha256Hex,
  type BackupInput,
} from './backup'
import { readBackup } from './readBackup'

// 28 oktober 2026, 12:30 in Nederland
const NOW = new Date(Date.UTC(2026, 9, 28, 11, 30, 0))

function input(overrides: Partial<BackupInput> = {}): BackupInput {
  return {
    now: NOW,
    appVersion: 'f9208d5',
    databaseVersion: 1,
    settings: { theme: 'dark' },
    tables: {},
    ...overrides,
  }
}

const READ = { databaseVersion: 1 }

describe('canonicalJson', () => {
  it('zet de sleutels op volgorde, ook dieper in het bestand', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { f: 1, e: 2 }], c: 2 } })).toBe(
      '{"a":{"c":2,"d":[3,{"e":2,"f":1}]},"b":1}',
    )
  })
})

describe('sha256Hex', () => {
  it('geeft de bekende uitkomst voor "abc"', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})

describe('createBackup', () => {
  it('maakt een bestand met formaat, versies, inhoud en controlegetal', async () => {
    const backup = await createBackup(input())
    const { checksum, ...content } = backup
    expect(content).toEqual({
      format: 'lingua-atlas-backup',
      formatVersion: BACKUP_FORMAT_VERSION,
      createdAt: '2026-10-28T11:30:00.000Z',
      app: { version: 'f9208d5' },
      database: { version: 1 },
      settings: { theme: 'dark' },
      tables: {},
    })
    expect(checksum).toEqual({
      algorithm: 'SHA-256',
      value: await sha256Hex(canonicalJson(content)),
    })
  })
})

describe('backupFileName', () => {
  it('noemt het bestand naar de datum en de tijd op het apparaat', () => {
    expect(backupFileName(NOW, 'Europe/Amsterdam')).toBe(
      'lingua-atlas-backup-2026-10-28-1230.json',
    )
  })
})

describe('readBackup', () => {
  it('leest een back-up terug zoals hij is gemaakt', async () => {
    const backup = await createBackup(
      input({ tables: { kaarten: [{ id: 'a', stap: 2 }] } }),
    )
    expect(await readBackup(serializeBackup(backup), READ)).toEqual({
      ok: true,
      backup,
    })
  })

  it('negeert inspringing en de volgorde van sleutels', async () => {
    const backup = await createBackup(input())
    const reordered = JSON.stringify({
      checksum: backup.checksum,
      tables: backup.tables,
      settings: backup.settings,
      database: backup.database,
      app: backup.app,
      createdAt: backup.createdAt,
      formatVersion: backup.formatVersion,
      format: backup.format,
    })
    expect((await readBackup(reordered, READ)).ok).toBe(true)
  })

  it('ontdekt een aangepast bestand aan het controlegetal', async () => {
    const text = serializeBackup(await createBackup(input()))
    const changed = text.replace('"dark"', '"light"')
    expect(await readBackup(changed, READ)).toMatchObject({
      ok: false,
      problem: 'checksum',
    })
  })

  it('weigert een half opgeslagen bestand', async () => {
    const text = serializeBackup(await createBackup(input()))
    expect(
      await readBackup(text.slice(0, text.length / 2), READ),
    ).toMatchObject({ ok: false, problem: 'json' })
  })

  it('weigert een ander soort bestand', async () => {
    expect(
      await readBackup('{"naam": "boodschappenlijst"}', READ),
    ).toMatchObject({ ok: false, problem: 'format' })
  })

  it('weigert een back-up uit een nieuwere versie van de app', async () => {
    const newerFormat = await createBackup(input())
    const text = serializeBackup({
      ...newerFormat,
      formatVersion: BACKUP_FORMAT_VERSION + 1,
    })
    expect(await readBackup(text, READ)).toMatchObject({
      ok: false,
      problem: 'version',
    })

    const newerDatabase = await createBackup(input({ databaseVersion: 2 }))
    expect(
      await readBackup(serializeBackup(newerDatabase), READ),
    ).toMatchObject({ ok: false, problem: 'version' })
  })
})
