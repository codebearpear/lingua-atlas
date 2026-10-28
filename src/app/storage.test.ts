import { describe, expect, it, vi } from 'vitest'
import {
  formatBytes,
  persistWhenInstalled,
  readStorageInfo,
  requestPersistence,
  type StorageApi,
} from './storage'

/** Een nagebootste navigator.storage. */
function fakeStorage(overrides: StorageApi = {}): StorageApi {
  return {
    estimate: () => Promise.resolve({ usage: 1_300_000, quota: 3e11 }),
    persisted: () => Promise.resolve(false),
    persist: () => Promise.resolve(true),
    ...overrides,
  }
}

describe('formatBytes', () => {
  it('kiest de eenheid en rondt af op één decimaal, in het Nederlands', () => {
    expect(formatBytes(0)).toBe('0 kB')
    expect(formatBytes(512)).toBe('0,5 kB')
    expect(formatBytes(949_000)).toBe('949 kB')
    expect(formatBytes(1_234_567)).toBe('1,2 MB')
    expect(formatBytes(4_560_000_000)).toBe('4,6 GB')
  })

  it('springt naar de volgende eenheid als afronden 1000 zou geven', () => {
    expect(formatBytes(999_950)).toBe('1 MB')
  })
})

describe('readStorageInfo', () => {
  it('leest het gebruik, de bovengrens en of de opslag blijvend is', async () => {
    expect(await readStorageInfo(fakeStorage())).toEqual({
      usage: 1_300_000,
      quota: 3e11,
      persisted: false,
    })
  })

  it('weet niets in een browser zonder deze functies', async () => {
    expect(await readStorageInfo({})).toEqual({
      usage: undefined,
      quota: undefined,
      persisted: undefined,
    })
  })

  it('gaat door als de browser een fout geeft', async () => {
    const api = fakeStorage({
      estimate: () => Promise.reject(new Error('niet beschikbaar')),
    })
    expect(await readStorageInfo(api)).toEqual({
      usage: undefined,
      quota: undefined,
      persisted: false,
    })
  })
})

describe('requestPersistence', () => {
  it('geeft het antwoord van de browser door', async () => {
    expect(await requestPersistence(fakeStorage())).toBe(true)
    expect(
      await requestPersistence(
        fakeStorage({ persist: () => Promise.resolve(false) }),
      ),
    ).toBe(false)
  })

  it('weet het antwoord niet in een browser zonder deze functie', async () => {
    expect(await requestPersistence({})).toBeUndefined()
  })
})

describe('persistWhenInstalled', () => {
  it('vraagt niets aan in een gewoon browsertabblad', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    expect(
      await persistWhenInstalled(false, fakeStorage({ persist })),
    ).toBeUndefined()
    expect(persist).not.toHaveBeenCalled()
  })

  it('vraagt het aan in de geïnstalleerde app', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    expect(await persistWhenInstalled(true, fakeStorage({ persist }))).toBe(
      true,
    )
    expect(persist).toHaveBeenCalledOnce()
  })

  it('vraagt het niet opnieuw aan als de opslag al blijvend is', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    const api = fakeStorage({ persist, persisted: () => Promise.resolve(true) })
    expect(await persistWhenInstalled(true, api)).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })
})
