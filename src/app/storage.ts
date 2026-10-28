/**
 * De opslag van de browser: hoeveel ruimte Lingua Atlas gebruikt, wat de
 * bovengrens is en of de gegevens blijvend bewaard worden.
 *
 * Zonder blijvende opslag mag de browser de gegevens van de app wissen,
 * bijvoorbeeld bij plaatsgebrek of als je de app een tijd niet gebruikt. Met
 * blijvende opslag doet hij dat niet. De browser beslist of de app dat krijgt;
 * Safari en Edge geven het onder meer aan een geïnstalleerde app.
 */

/** Wat de browser over de opslag vertelt; undefined als hij het niet weet. */
export interface StorageInfo {
  /** In gebruik, in bytes. */
  usage: number | undefined
  /** Bovengrens van de browser, in bytes. Een schatting, geen garantie. */
  quota: number | undefined
  /** Of de gegevens blijvend bewaard worden. */
  persisted: boolean | undefined
}

/** Het deel van navigator.storage dat de app gebruikt. Oudere browsers missen delen. */
export type StorageApi = Partial<
  Pick<StorageManager, 'estimate' | 'persist' | 'persisted'>
>

/** navigator.storage, of undefined in een browser die het niet kent. */
export function browserStorage(): StorageApi | undefined {
  return 'storage' in navigator ? navigator.storage : undefined
}

/** Voert een aanroep uit; bij een fout is de uitkomst undefined. */
async function attempt<T>(
  call: () => Promise<T> | undefined,
): Promise<T | undefined> {
  try {
    return await call()
  } catch {
    return undefined
  }
}

export async function readStorageInfo(
  api: StorageApi | undefined = browserStorage(),
): Promise<StorageInfo> {
  const [estimate, persisted] = await Promise.all([
    attempt(() => api?.estimate?.()),
    attempt(() => api?.persisted?.()),
  ])
  return { usage: estimate?.usage, quota: estimate?.quota, persisted }
}

/** Vraagt blijvende opslag aan. De uitkomst is undefined als de browser het niet kent. */
export function requestPersistence(
  api: StorageApi | undefined = browserStorage(),
): Promise<boolean | undefined> {
  return attempt(() => api?.persist?.())
}

/** Of de app als geïnstalleerde app draait, en niet in een browsertabblad. */
export function isInstalledApp(): boolean {
  // navigator.standalone is de oudere aanduiding van Safari voor het beginscherm.
  const safari = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    safari.standalone === true
  )
}

/**
 * Vraagt bij het opstarten blijvende opslag aan, maar alleen in de
 * geïnstalleerde app: daar vragen Safari en Edge niets aan jou. In een gewoon
 * tabblad kun je het zelf aanvragen in Instellingen.
 */
export async function persistWhenInstalled(
  installed: boolean,
  api: StorageApi | undefined = browserStorage(),
): Promise<boolean | undefined> {
  if (!installed) {
    return undefined
  }
  const persisted = await attempt(() => api?.persisted?.())
  if (persisted !== false) {
    return persisted
  }
  return requestPersistence(api)
}

/** Eenheden met hun grootte. Decimaal, zoals Apple: 1 kB is 1000 bytes. */
const UNITS = [
  ['kilobyte', 1e3],
  ['megabyte', 1e6],
  ['gigabyte', 1e9],
  ['terabyte', 1e12],
] as const

/** Een aantal bytes in het Nederlands, zoals "1,2 MB". */
export function formatBytes(bytes: number): string {
  // De grootste eenheid waarin het getal, afgerond, minstens 1 is.
  const [unit, size] =
    UNITS.findLast(([, unitSize]) => bytes >= unitSize * 0.95) ?? UNITS[0]
  return new Intl.NumberFormat('nl-NL', {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(bytes / size)
}
