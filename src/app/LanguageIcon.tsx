import type { Language, LanguageCode } from '../content/languages'

/** Een kleur per taal voor het pictogram; alleen ter herkenning, zonder betekenis. */
const TILE_COLORS: Record<LanguageCode, string> = {
  en: 'from-[#4a8dff] to-[#1763e4]',
  de: 'from-[#ff5a5f] to-[#e9152d]',
  es: 'from-[#ff9a3d] to-[#c55300]',
  ko: 'from-[#8a80ff] to-[#564ade]',
  hi: 'from-[#2fbf68] to-[#008932]',
  fa: 'from-[#25b9cc] to-[#008198]',
  my: 'from-[#d660e8] to-[#b02fc2]',
}

/**
 * Het pictogram van een taal: een of twee tekens uit het schrift op een
 * gekleurd vlak, afgerond zoals een app-pictogram. De grootte en de
 * tekstgrootte komen via className.
 */
export function LanguageIcon({
  language,
  className,
}: {
  language: Language
  className: string
}) {
  return (
    <span
      aria-hidden="true"
      lang={language.locale}
      className={`flex shrink-0 items-center justify-center rounded-[22.5%] bg-linear-to-b font-semibold text-white ${TILE_COLORS[language.code]} ${className}`}
    >
      {language.glyph}
    </span>
  )
}
