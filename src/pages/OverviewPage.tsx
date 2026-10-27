import { usePageTitle } from '../app/usePageTitle'
import { LANGUAGES, type Language } from '../content/languages'

function LanguageCard({ language }: { language: Language }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5">
      <p className="text-3xl leading-tight">
        <span lang={language.locale} dir={language.direction}>
          {language.nativeName}
        </span>
      </p>
      <h3 className="mt-2 font-semibold">{language.dutchName}</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-ink-muted">Beginniveau</dt>
          <dd>{language.startLevel}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Variant</dt>
          <dd>{language.variant}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Schrift</dt>
          <dd>{language.scriptName}</dd>
        </div>
      </dl>
      <p className="mt-auto pt-5">
        <span className="inline-flex rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-muted">
          Nog geen lessen
        </span>
      </p>
    </article>
  )
}

export function OverviewPage() {
  usePageTitle('Overzicht')

  return (
    <div className="space-y-12">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Overzicht
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Je persoonlijke taalatlas, met het Nederlands als vertrekpunt. Lessen,
          herhalingen en statistieken komen in de volgende versies.
        </p>
      </header>

      <section aria-labelledby="vandaag-titel" className="space-y-4">
        <h2
          id="vandaag-titel"
          className="font-serif text-2xl font-semibold tracking-tight"
        >
          Vandaag
        </h2>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="font-semibold">Nog niets te herhalen</p>
          <p className="mt-1 leading-relaxed text-ink-muted">
            Zodra je lessen hebt gedaan, zie je hier wat je vandaag herhaalt en
            wat je daarna het beste kunt oefenen.
          </p>
        </div>
      </section>

      <section aria-labelledby="talen-titel" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="talen-titel"
            className="font-serif text-2xl font-semibold tracking-tight"
          >
            Jouw talen
          </h2>
          <p className="text-sm text-ink-muted">{LANGUAGES.length} talen</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {LANGUAGES.map((language) => (
            <li key={language.code}>
              <LanguageCard language={language} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
