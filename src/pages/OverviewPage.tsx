import { ContentUnavailable, PageHeader, SectionHeading } from '../app/ui'
import { usePageTitle } from '../app/usePageTitle'
import {
  LANGUAGES,
  type Language,
  type LanguageCode,
} from '../content/languages'
import { packSummary } from '../content/packs'

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

/** Wat er voor een taal klaarstaat. Lessen zijn pas te doen als de lesmotor er is. */
function lessonsLabel(code: LanguageCode): string {
  const { lessons } = packSummary(code).counts
  if (lessons === 0) {
    return 'Nog geen lessen'
  }
  return `${lessons} ${lessons === 1 ? 'les' : 'lessen'} in voorbereiding`
}

function LanguageTile({ language }: { language: Language }) {
  return (
    <article className="flex h-full flex-col rounded-card bg-surface p-5">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          lang={language.locale}
          className={`flex size-14 shrink-0 items-center justify-center rounded-[22.5%] bg-linear-to-b text-title2 font-semibold text-white ${TILE_COLORS[language.code]}`}
        >
          {language.glyph}
        </span>
        <div className="min-w-0">
          <h3 className="text-body font-semibold">{language.dutchName}</h3>
          <p className="text-subhead text-secondary">
            <span lang={language.locale} dir={language.direction}>
              {language.nativeName}
            </span>
          </p>
        </div>
      </div>
      <dl className="mt-4 divide-y-[0.5px] divide-separator text-subhead">
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-secondary">Beginniveau</dt>
          <dd className="text-end text-balance">{language.startLevel}</dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-secondary">Variant</dt>
          <dd className="text-end text-balance">{language.variant}</dd>
        </div>
      </dl>
      <p className="mt-auto pt-3">
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-footnote font-medium text-secondary">
          {lessonsLabel(language.code)}
        </span>
      </p>
    </article>
  )
}

export function OverviewPage() {
  usePageTitle('Overzicht')

  return (
    <>
      <PageHeader title="Overzicht">
        <p>
          Je persoonlijke taalatlas, met het Nederlands als vertrekpunt. Lessen,
          herhalingen en statistieken komen in de volgende versies.
        </p>
      </PageHeader>

      <div className="space-y-10">
        <section aria-labelledby="vandaag-titel">
          <SectionHeading id="vandaag-titel">Vandaag</SectionHeading>
          <div className="rounded-card bg-surface">
            <ContentUnavailable
              icon="calendar-check"
              title="Nog niets te herhalen"
            >
              Zodra je lessen hebt gedaan, zie je hier wat je vandaag herhaalt
              en wat je daarna het beste kunt oefenen.
            </ContentUnavailable>
          </div>
        </section>

        <section aria-labelledby="talen-titel">
          <SectionHeading id="talen-titel">Jouw talen</SectionHeading>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {LANGUAGES.map((language) => (
              <li key={language.code}>
                <LanguageTile language={language} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
