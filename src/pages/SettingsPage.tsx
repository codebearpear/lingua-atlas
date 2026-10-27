import { THEME_PREFERENCES, type ThemePreference } from '../app/theme'
import { setThemePreference, useThemePreference } from '../app/themeStore'
import { usePageTitle } from '../app/usePageTitle'

interface ThemeOption {
  label: string
  description: string
}

const THEME_OPTIONS: Record<ThemePreference, ThemeOption> = {
  system: {
    label: 'Zoals het apparaat',
    description: 'Licht of donker, net als je iPad of computer.',
  },
  light: {
    label: 'Licht',
    description: 'Warm papier met donkere inkt.',
  },
  dark: {
    label: 'Donker',
    description: 'Rustig voor de ogen bij weinig licht.',
  },
}

export function SettingsPage() {
  usePageTitle('Instellingen')
  const preference = useThemePreference()

  return (
    <div className="space-y-12">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Instellingen
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Je keuzes gelden alleen op dit apparaat.
        </p>
      </header>

      <section aria-labelledby="weergave-titel" className="space-y-4">
        <h2
          id="weergave-titel"
          className="font-serif text-2xl font-semibold tracking-tight"
        >
          Weergave
        </h2>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <fieldset>
            <legend className="font-semibold">Thema</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {THEME_PREFERENCES.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer gap-3 rounded-xl border border-line-strong p-4 transition-colors has-[:checked]:border-accent has-[:checked]:bg-surface-muted"
                >
                  <input
                    type="radio"
                    name="theme"
                    value={option}
                    checked={preference === option}
                    onChange={() => {
                      setThemePreference(option)
                    }}
                    className="mt-1 size-4 shrink-0"
                  />
                  <span>
                    <span className="block font-medium">
                      {THEME_OPTIONS[option].label}
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-ink-muted">
                      {THEME_OPTIONS[option].description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section aria-labelledby="over-titel" className="space-y-4">
        <h2
          id="over-titel"
          className="font-serif text-2xl font-semibold tracking-tight"
        >
          Over Lingua Atlas
        </h2>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="leading-relaxed text-ink-muted">
            Lingua Atlas is in ontwikkeling. Wat je instelt, blijft op dit
            apparaat; er gaat niets naar een server.
          </p>
        </div>
      </section>
    </div>
  )
}
