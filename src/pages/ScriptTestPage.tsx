import { SymbolIcon } from '../app/Icons'
import { GroupedRow, PageHeader } from '../app/ui'
import { usePageTitle } from '../app/usePageTitle'
import { SCRIPT_TESTS, type ScriptTest } from '../content/scriptSamples'

function ScriptTestSection({ test }: { test: ScriptTest }) {
  const headingId = `schrift-${test.id}`

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="px-1">
        <h2 id={headingId} className="text-title2 font-bold">
          {test.title}
        </h2>
        <p className="mt-0.5 text-footnote text-secondary">{test.fontNote}</p>
      </div>

      <div className="overflow-hidden rounded-card bg-surface">
        {test.samples.map((sample) => (
          <GroupedRow key={sample.label}>
            <p className="text-footnote text-secondary">{sample.label}</p>
            <p
              lang={sample.locale}
              dir={test.direction}
              className={`mt-1 text-[1.75rem] leading-[1.7] ${test.serif ? 'font-serif' : ''}`}
            >
              {sample.text}
            </p>
            <p className="text-subhead text-secondary">{sample.meaning}</p>
          </GroupedRow>
        ))}
        {test.mixedExample !== undefined && (
          <GroupedRow>
            <p className="text-footnote text-secondary">Gemengde zin</p>
            <p className="mt-1 text-title3 leading-relaxed">
              {test.mixedExample.before}
              <bdi lang={test.mixedExample.wordLocale}>
                {test.mixedExample.word}
              </bdi>
              {test.mixedExample.after}
            </p>
          </GroupedRow>
        )}
      </div>

      <div className="rounded-card bg-surface p-5">
        <h3 className="font-semibold">Waar let je op?</h3>
        <ul className="mt-3 space-y-2.5">
          {test.checks.map((check) => (
            <li key={check} className="flex gap-3 text-subhead">
              <SymbolIcon
                name="checkmark-circle"
                className="size-5 shrink-0 text-tint"
              />
              <span>{check}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function ScriptTestPage() {
  usePageTitle('Schrifttest')

  return (
    <>
      <PageHeader title="Schrifttest">
        <p>
          Controleer of elk schrift goed op het scherm komt, nu op je computer
          en later op je iPad. Onder elk schrift staat waar je op let.
        </p>
        <p className="text-footnote">
          Op Apple-apparaten gebruikt de app waar mogelijk de lettertypen van
          Apple; op Windows meegeleverde lettertypen. De voorbeelden testen
          alleen de weergave; het is geen lesstof. Validatiestatus: Concept.
        </p>
      </PageHeader>

      <div className="space-y-10">
        {SCRIPT_TESTS.map((test) => (
          <ScriptTestSection key={test.id} test={test} />
        ))}
      </div>
    </>
  )
}
