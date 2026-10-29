import { count, dueLabel } from '../app/format'
import { SymbolIcon } from '../app/Icons'
import { LanguageIcon } from '../app/LanguageIcon'
import { pageHref } from '../app/routes'
import { ContentUnavailable, PageHeader, SectionHeading } from '../app/ui'
import { usePageTitle } from '../app/usePageTitle'
import { useMemory, type MemorySnapshot } from '../app/useMemory'
import { LANGUAGES, type Language } from '../content/languages'
import { packSummary } from '../content/packs'
import {
  endOfDay,
  isLearning,
  summarize,
  type MemorySummary,
} from '../engine/memory'

/** Hoeveel lessen er voor een taal klaarstaan. */
function lessonsLabel(language: Language): string {
  const { lessons } = packSummary(language.code).counts
  if (lessons === 0) {
    return 'Nog geen lessen'
  }
  return `${lessons} ${lessons === 1 ? 'les' : 'lessen'}`
}

/** Een regel met een naam links en een waarde rechts. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-secondary">{label}</dt>
      <dd className="text-end text-balance">{value}</dd>
    </div>
  )
}

/** Per taal wat je nu kunt herhalen en wanneer de rest terugkomt. */
function TodayTile({
  language,
  summary,
  now,
}: {
  language: Language
  summary: MemorySummary
  now: number
}) {
  const { next } = summary
  return (
    <article className="flex h-full flex-col rounded-card bg-surface p-5">
      <div className="flex items-center gap-3">
        <LanguageIcon language={language} className="size-9 text-body" />
        <h3 className="text-body font-semibold">{language.dutchName}</h3>
      </div>
      <p className="mt-4 flex items-baseline gap-2">
        <span
          className={`text-large-title font-bold tabular-nums ${summary.due === 0 ? 'text-secondary' : ''}`}
        >
          {summary.due}
        </span>
        <span className="text-secondary">nu te herhalen</span>
      </p>
      <dl className="mt-3 divide-y-[0.5px] divide-separator text-subhead">
        {summary.laterToday > 0 && (
          <Row
            label="Later vandaag"
            value={count(summary.laterToday, 'kaart', 'kaarten')}
          />
        )}
        {next !== undefined && (
          <Row
            label={summary.due > 0 ? 'Daarna' : 'Volgende'}
            value={dueLabel(next.fsrs.due.getTime(), now, !isLearning(next))}
          />
        )}
        <Row
          label="Herkennen"
          value={count(summary.recognition, 'kaart', 'kaarten')}
        />
        <Row
          label="Zelf maken"
          value={count(summary.production, 'kaart', 'kaarten')}
        />
      </dl>
    </article>
  )
}

/** Wat je vandaag herhaalt, per taal waarin je hebt geoefend. */
function Today({ memory }: { memory: MemorySnapshot | null | undefined }) {
  if (memory === undefined) {
    return null
  }
  if (memory === null) {
    return (
      <div className="rounded-card bg-surface">
        <ContentUnavailable
          icon="exclamation-circle"
          title="Herhalen is nu niet te zien"
        >
          Het berekenen van je herhaalkaarten lukte niet. De melding staat in
          het foutenlogboek onder Instellingen.
        </ContentUnavailable>
      </div>
    )
  }

  const endOfToday = endOfDay(memory.now)
  const cards = [...memory.cards.values()]
  const tiles = LANGUAGES.flatMap((language) => {
    const own = cards.filter((card) => card.language === language.code)
    return own.length === 0
      ? []
      : [{ language, summary: summarize(own, memory.now, endOfToday) }]
  })

  if (tiles.length === 0) {
    return (
      <div className="rounded-card bg-surface">
        <ContentUnavailable icon="calendar-check" title="Nog niets te herhalen">
          Oefen een les. Daarna zie je hier wat je vandaag herhaalt en wanneer
          de rest terugkomt.
        </ContentUnavailable>
      </div>
    )
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(({ language, summary }) => (
          <li key={language.code}>
            <TodayTile language={language} summary={summary} now={memory.now} />
          </li>
        ))}
      </ul>
      <p className="mt-3 px-1 text-footnote text-secondary">
        Elk woord en elke zin die je oefent, krijgt een herhaalkaart voor
        herkennen of voor zelf maken. FSRS plant wanneer een kaart terugkomt:
        wat je goed kent later, wat lastig was eerder. Herhalen doe je vanaf de
        volgende versie hier.
      </p>
    </>
  )
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
        <Row label="Beginniveau" value={language.startLevel} />
        <Row label="Variant" value={language.variant} />
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
  const memory = useMemory()

  return (
    <>
      <PageHeader title="Overzicht">
        <p>
          Je persoonlijke taalatlas, met het Nederlands als vertrekpunt. Open
          een taal voor de lessen en de oefeningen. Onder Vandaag zie je wanneer
          wat je hebt geoefend, terugkomt.
        </p>
      </PageHeader>

      <div className="space-y-10">
        <section aria-labelledby="vandaag-titel">
          <SectionHeading id="vandaag-titel">Vandaag</SectionHeading>
          <Today memory={memory} />
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
