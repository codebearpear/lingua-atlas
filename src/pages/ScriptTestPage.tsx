import { usePageTitle } from '../app/usePageTitle'
import { SCRIPT_TESTS, type ScriptTest } from '../content/scriptSamples'

function ScriptTestSection({ test }: { test: ScriptTest }) {
  const headingId = `schrift-${test.id}`

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2
          id={headingId}
          className="font-serif text-2xl font-semibold tracking-tight"
        >
          {test.title}
        </h2>
        <p className="text-sm text-ink-muted">{test.fontNote}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <ul className="divide-y divide-line">
          {test.samples.map((sample) => (
            <li key={sample.label} className="space-y-2 px-6 py-5">
              <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                {sample.label}
              </p>
              <p
                lang={sample.locale}
                dir={test.direction}
                className={`text-3xl leading-[1.8] ${test.serif ? 'font-serif' : ''}`}
              >
                {sample.text}
              </p>
              <p className="text-ink-muted">{sample.meaning}</p>
            </li>
          ))}
        </ul>

        {test.mixedExample !== undefined && (
          <div className="space-y-2 border-t border-line px-6 py-5">
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
              Gemengde zin
            </p>
            <p className="text-xl leading-relaxed">
              {test.mixedExample.before}
              <bdi lang={test.mixedExample.wordLocale}>
                {test.mixedExample.word}
              </bdi>
              {test.mixedExample.after}
            </p>
          </div>
        )}

        <div className="border-t border-line bg-surface-muted/50 px-6 py-5">
          <h3 className="font-semibold">Waar let je op?</h3>
          <ul className="mt-2 list-disc space-y-1 ps-5 leading-relaxed text-ink-muted">
            {test.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function ScriptTestPage() {
  usePageTitle('Schrifttest')

  return (
    <div className="space-y-12">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Schrifttest
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Controleer of elk schrift goed op het scherm komt, nu op je computer
          en later op je iPad. Onder elk schrift staat waar je op let.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          De voorbeelden testen alleen de weergave; het is geen lesstof.
          Validatiestatus: Concept.
        </p>
      </header>

      {SCRIPT_TESTS.map((test) => (
        <ScriptTestSection key={test.id} test={test} />
      ))}
    </div>
  )
}
