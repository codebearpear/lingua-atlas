import { THEME_PREFERENCES, type ThemePreference } from '../app/theme'
import { setThemePreference, useThemePreference } from '../app/themeStore'
import { GroupedRow, GroupedSection, PageHeader } from '../app/ui'
import { usePageTitle } from '../app/usePageTitle'

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
