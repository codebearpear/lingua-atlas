import { SymbolIcon } from '../app/Icons'
import { LanguageIcon } from '../app/LanguageIcon'
import { pageHref } from '../app/routes'
import { ContentUnavailable, PageHeader, SectionHeading } from '../app/ui'
import { usePageTitle } from '../app/usePageTitle'
import { LANGUAGES, type Language } from '../content/languages'
import { packSummary } from '../content/packs'

/** Hoeveel lessen er voor een taal klaarstaan. */
function lessonsLabel(language: Language): string {
  const { lessons } = packSummary(language.code).counts
  if (lessons === 0) {
    return 'Nog geen lessen'
  }
  return `${lessons} ${lessons === 1 ? 'les' : 'lessen'}`
}

/**
 * Een tegel per taal. De hele tegel opent de cursus; voor schermlezers is de
 * naam van de taal de link en de rest gewone tekst.
 */
function LanguageTile({ language }: { language: Language }) {
  return (
    <article className="relative flex h-full flex-col rounded-card bg-surface p-5 transition-transform active:scale-[0.98] has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-tint/70">
      <div className="flex items-center gap-4">
        <LanguageIcon language={language} className="size-14 text-title2" />
        <div className="min-w-0 flex-1">
          <h3 className="text-body font-semibold">
            <a
              href={pageHref({ page: 'course', language: language.code })}
              className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none"
            >
              {language.dutchName}
            </a>
          </h3>
          <p className="text-subhead text-secondary">
            <span lang={language.locale} dir={language.direction}>
              {language.nativeName}
            </span>
          </p>
        </div>
        <SymbolIcon
          name="chevron-right"
          className="size-5 shrink-0 text-secondary/60"
        />
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
          {lessonsLabel(language)}
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
          Je persoonlijke taalatlas, met het Nederlands als vertrekpunt. Open
          een taal voor de lessen; oefenen, herhalen en statistieken komen in de
          volgende versies.
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
