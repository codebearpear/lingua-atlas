import { CourseLoadError, CourseLoading } from '../app/CourseStates'
import { count } from '../app/format'
import { SymbolIcon } from '../app/Icons'
import { LanguageIcon } from '../app/LanguageIcon'
import { hrefFor, pageHref } from '../app/routes'
import { BackLink, ContentUnavailable, StatusBadge } from '../app/ui'
import { usePageTitle } from '../app/usePageTitle'
import { useCoursePack } from '../content/coursePacks'
import {
  languageInfo,
  type Language,
  type LanguageCode,
} from '../content/languages'
import type { CompiledLesson, CompiledUnit } from '../packs/compiled'

/** Wat er in een les zit, in een regel: "6 woorden · 3 oefeningen". */
function lessonContents(lesson: CompiledLesson): string {
  return [
    lesson.words.length > 0 && count(lesson.words.length, 'woord', 'woorden'),
    lesson.exerciseCount > 0 &&
      count(lesson.exerciseCount, 'oefening', 'oefeningen'),
  ]
    .filter((part) => part !== false)
    .join(' · ')
}

function LessonRow({
  language,
  lesson,
  number,
}: {
  language: LanguageCode
  lesson: CompiledLesson
  number: number
}) {
  const contents = lessonContents(lesson)
  return (
    <li className="group/row">
      <a
        href={pageHref({ page: 'lesson', language, lesson: lesson.id })}
        className="flex items-center gap-3 ps-5 transition-colors hover:bg-muted/50 active:bg-muted"
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-subhead font-semibold text-secondary tabular-nums"
        >
          {number}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-3 border-b-[0.5px] border-separator py-3.5 pe-4 group-last/row:border-b-0">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{lesson.title}</span>
            {contents !== '' && (
              <span className="block text-subhead text-secondary">
                {contents}
              </span>
            )}
            <span className="mt-2 block">
              <StatusBadge status={lesson.status} />
            </span>
          </span>
          <SymbolIcon
            name="chevron-right"
            className="size-5 shrink-0 text-secondary/60"
          />
        </span>
      </a>
    </li>
  )
}

function UnitSection({
  language,
  unit,
  number,
}: {
  language: LanguageCode
  unit: CompiledUnit
  number: number
}) {
  const headingId = `eenheid-${unit.id}`
  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="space-y-2 px-1">
        <p className="text-subhead text-secondary">
          Eenheid {number} · {unit.level}
        </p>
        <h2 id={headingId} className="text-title2 font-bold">
          {unit.title}
        </h2>
        <ul className="max-w-2xl space-y-1 text-subhead text-secondary">
          {unit.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
        <div className="pt-1">
          <StatusBadge status={unit.status} />
        </div>
      </div>
      <ol
        role="list"
        aria-label={`Lessen van ${unit.title}`}
        className="overflow-hidden rounded-card bg-surface"
      >
        {unit.lessons.map((lesson, index) => (
          <LessonRow
            key={lesson.id}
            language={language}
            lesson={lesson}
            number={index + 1}
          />
        ))}
      </ol>
    </section>
  )
}

function CourseContent({ language }: { language: Language }) {
  const course = useCoursePack(language.code)

  if (course.state === 'loading') {
    return <CourseLoading />
  }
  if (course.state === 'error') {
    return <CourseLoadError />
  }
  if (course.pack.units.length === 0) {
    return (
      <div className="rounded-card bg-surface">
        <ContentUnavailable icon="book" title="Nog geen lessen">
          Het taalpakket voor het {language.dutchName} bevat nu alleen de
          gegevens over de taal. Lessen komen in een volgende versie.
        </ContentUnavailable>
      </div>
    )
  }
  return (
    <div className="space-y-10">
      {course.pack.units.map((unit, index) => (
        <UnitSection
          key={unit.id}
          language={language.code}
          unit={unit}
          number={index + 1}
        />
      ))}
      <p className="max-w-2xl px-1 text-footnote text-secondary">
        Elke les en eenheid toont haar status: de laagste van alles wat erin
        staat. Zo belooft de app nooit meer dan voor elk onderdeel geldt.
      </p>
    </div>
  )
}

/** De cursus van één taal: de eenheden en lessen op volgorde. */
export function CoursePage({ language: code }: { language: LanguageCode }) {
  const language = languageInfo(code)
  usePageTitle(language.dutchName)

  return (
    <>
      <BackLink href={hrefFor('overview')} label="Overzicht" />
      <header className="mb-8 flex items-center gap-4">
        <LanguageIcon language={language} className="size-16 text-title1" />
        <div className="min-w-0">
          <h1 className="text-large-title font-bold tracking-[-0.015em]">
            {language.dutchName}
          </h1>
          <p className="text-body text-secondary">
            <span lang={language.locale} dir={language.direction}>
              {language.nativeName}
            </span>
            {' · '}
            {language.variant}
          </p>
        </div>
      </header>
      <CourseContent language={language} />
    </>
  )
}
