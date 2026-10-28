import { StorageSection } from '../app/StorageSection'
import { THEME_PREFERENCES, type ThemePreference } from '../app/theme'
import { setThemePreference, useThemePreference } from '../app/themeStore'
import { GroupedRow, GroupedSection, PageHeader } from '../app/ui'
import { usePageTitle } from '../app/usePageTitle'
import { LANGUAGES, type Language } from '../content/languages'
import { packSummary } from '../content/packs'
import { STATUS_LABELS, lowestStatus, type PackCounts } from '../packs/summary'

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Automatisch',
  light: 'Licht',
  dark: 'Donker',
}

/** Een segmentknop zoals in iOS, gebouwd op gewone keuzerondjes. */
function ThemeSegments() {
  const preference = useThemePreference()

  return (
    <fieldset className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <legend className="sr-only">Thema</legend>
      <span aria-hidden="true">Thema</span>
      <div className="grid grid-cols-3 rounded-[0.65rem] bg-muted p-0.5">
        {THEME_PREFERENCES.map((option) => (
          <label
            key={option}
            className="cursor-pointer rounded-[0.55rem] px-3.5 py-1.5 text-center text-subhead font-medium transition has-[:checked]:bg-segment has-[:checked]:shadow-[var(--segment-shadow)] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tint"
          >
            <input
              type="radio"
              name="theme"
              value={option}
              checked={preference === option}
              onChange={() => {
                setThemePreference(option)
              }}
              className="sr-only"
            />
            {THEME_LABELS[option]}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function count(amount: number, one: string, many: string): string {
  return `${amount} ${amount === 1 ? one : many}`
}

/** Wat er in een pakket staat, in een regel. */
function contentLine(counts: PackCounts): string {
  if (counts.units === 0 && counts.words === 0 && counts.sentences === 0) {
    return 'Alleen taalgegevens'
  }
  return [
    count(counts.lessons, 'les', 'lessen'),
    count(counts.words, 'woord', 'woorden'),
    count(counts.sentences, 'zin', 'zinnen'),
    count(counts.exercises, 'oefening', 'oefeningen'),
  ].join(' · ')
}

function PackRow({ language }: { language: Language }) {
  const summary = packSummary(language.code)
  return (
    <GroupedRow>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <div className="min-w-0">
          <p>{language.dutchName}</p>
          <p className="text-footnote text-secondary">
            {contentLine(summary.counts)}
          </p>
        </div>
        <p className="text-subhead text-secondary">
          {STATUS_LABELS[lowestStatus(summary)]}
        </p>
      </div>
    </GroupedRow>
  )
}

export function SettingsPage() {
  usePageTitle('Instellingen')

  return (
    <>
      <PageHeader title="Instellingen" />

      <div className="space-y-8">
        <GroupedSection
          id="weergave"
          title="Weergave"
          footer="Automatisch volgt de instelling van je iPad of computer."
        >
          <GroupedRow>
            <ThemeSegments />
          </GroupedRow>
        </GroupedSection>

        <GroupedSection
          id="pakketten"
          title="Taalpakketten"
          footer="De status is de laagste van alles in het pakket. Concept: nog niet gecontroleerd. Automatisch gecontroleerd: de vorm klopt, zoals de tekens en de antwoorden; de taal zelf heeft nog geen mens nagekeken. Bron-geverifieerd: nagelopen tegen een gezaghebbende bron. Expert-beoordeeld: beoordeeld door een deskundige."
        >
          {LANGUAGES.map((language) => (
            <PackRow key={language.code} language={language} />
          ))}
        </GroupedSection>

        <StorageSection />

        <GroupedSection
          id="over"
          title="Over Lingua Atlas"
          footer="Wat je instelt, blijft op dit apparaat. Er gaat niets naar een server."
        >
          <GroupedRow>
            <div className="flex justify-between gap-4">
              <span>Status</span>
              <span className="text-secondary">In ontwikkeling</span>
            </div>
          </GroupedRow>
          <GroupedRow>
            <div className="flex justify-between gap-4">
              <span>Gegevens</span>
              <span className="text-secondary">Alleen op dit apparaat</span>
            </div>
          </GroupedRow>
        </GroupedSection>
      </div>
    </>
  )
}
