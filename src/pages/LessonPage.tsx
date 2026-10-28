import { CourseLoadError, CourseLoading } from '../app/CourseStates'
import { count, joinList, regionName } from '../app/format'
import { SymbolIcon } from '../app/Icons'
import { MarkedText } from '../app/MarkedText'
import { pageHref } from '../app/routes'
import {
  BackLink,
  ContentUnavailable,
  GroupedRow,
  GroupedSection,
  StatusBadge,
} from '../app/ui'
import { usePageTitle } from '../app/usePageTitle'
import {
  findLesson,
  sentencesOf,
  wordsOf,
  type LessonPlace,
} from '../content/course'
import { useCoursePack } from '../content/coursePacks'
import {
  languageInfo,
  type Language,
  type LanguageCode,
} from '../content/languages'
import type {
  CompiledLesson,
  CompiledPack,
  CompiledSentence,
  CompiledWord,
  InlineText,
  Register,
} from '../packs/compiled'
import {
  GENDER_LABELS,
  PART_OF_SPEECH_LABELS,
  REGISTER_LABELS,
} from '../packs/labels'
import {
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  type EffectiveStatus,
} from '../packs/summary'

/** Tekst in de doeltaal, met de juiste taal en schrijfrichting. */
function TargetText({
  language,
  text,
  className,
}: {
  language: Language
  text: string
  className?: string
}) {
  return (
    <span
      lang={language.locale}
      dir={language.direction}
      className={`block ${className ?? ''}`}
    >
      {text}
    </span>
  )
}

function registerLabels(register: readonly Register[] | undefined): string[] {
  return (register ?? []).map((item) => REGISTER_LABELS[item])
}

/** "vooral in Mexico en Colombia" */
function regionsLabel(regions: readonly string[] | undefined): string[] {
  return regions === undefined
    ? []
    : [`vooral in ${joinList(regions.map(regionName))}`]
}

function Goals({
  language,
  goals,
}: {
  language: Language
  goals: readonly InlineText[]
}) {
  return (
    <section
      aria-labelledby="doelen-titel"
      className="rounded-card bg-surface p-5"
    >
      <h2 id="doelen-titel" className="font-semibold">
        Wat je leert
      </h2>
      <ul className="mt-3 space-y-2">
        {goals.map((goal, index) => (
          <li key={index} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-[0.5625rem] size-1.5 shrink-0 rounded-full bg-tint"
            />
            <span>
              <MarkedText text={goal} language={language} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Example({
  language,
  sentence,
}: {
  language: Language
  sentence: CompiledSentence
}) {
  const extra = [
    ...registerLabels(sentence.register),
    ...regionsLabel(sentence.regions),
  ]
  return (
    <li className="rounded-2xl bg-muted px-4 py-3">
      <TargetText
        language={language}
        text={sentence.text}
        className="text-title3 font-medium"
      />
      {sentence.transliteration !== undefined && (
        <span className="mt-0.5 block text-subhead text-secondary italic">
          {sentence.transliteration}
        </span>
      )}
      <span className="mt-0.5 block text-subhead text-secondary">
        {sentence.translation}
      </span>
      {(extra.length > 0 || sentence.notes !== undefined) && (
        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-footnote text-secondary">
          {extra.map((label) => (
            <span
              key={label}
              className="rounded-full border-[0.5px] border-separator px-2 py-px"
            >
              {label}
            </span>
          ))}
          {sentence.notes !== undefined && (
            <span>
              <MarkedText text={sentence.notes} language={language} />
            </span>
          )}
        </span>
      )}
    </li>
  )
}

function Explanation({
  language,
  pack,
  text,
  examples,
}: {
  language: Language
  pack: CompiledPack
  text: InlineText
  examples: readonly string[]
}) {
  const sentences = sentencesOf(pack, examples)
  return (
    <section className="rounded-card bg-surface p-5">
      <p className="leading-[1.6]">
        <MarkedText text={text} language={language} />
      </p>
      {sentences.length > 0 && (
        <ul aria-label="Voorbeelden" className="mt-4 space-y-2">
          {sentences.map((sentence) => (
            <Example
              key={sentence.id}
              language={language}
              sentence={sentence}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function Culture({ language, text }: { language: Language; text: InlineText }) {
  return (
    <section className="rounded-card bg-surface p-5">
      <h2 className="flex items-center gap-2 text-subhead font-semibold text-tint">
        <SymbolIcon name="globe" className="size-5 shrink-0" />
        Cultuur
      </h2>
      <p className="mt-2 leading-[1.6]">
        <MarkedText text={text} language={language} />
      </p>
    </section>
  )
}

/** "tussenwerpsel · Zeg je bij het weggaan." */
function WordDetails({
  language,
  word,
}: {
  language: Language
  word: CompiledWord
}) {
  const labels = [
    PART_OF_SPEECH_LABELS[word.partOfSpeech],
    word.gender === undefined ? undefined : GENDER_LABELS[word.gender],
    word.ipa,
    ...registerLabels(word.register),
    ...regionsLabel(word.regions),
  ].filter((label) => label !== undefined)
  return (
    <>
      {labels.join(' · ')}
      {word.notes !== undefined && (
        <>
          {' · '}
          <MarkedText text={word.notes} language={language} />
        </>
      )}
    </>
  )
}

function Words({
  language,
  words,
}: {
  language: Language
  words: readonly CompiledWord[]
}) {
  return (
    <GroupedSection id="woorden" title="Woorden in deze les">
      {words.map((word) => (
        <GroupedRow key={word.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5">
            <div className="min-w-0">
              <TargetText
                language={language}
                text={word.text}
                className="font-semibold"
              />
              {word.transliteration !== undefined && (
                <span className="block text-subhead text-secondary italic">
                  {word.transliteration}
                </span>
              )}
            </div>
            <p>{word.translations.join(', ')}</p>
          </div>
          <p className="mt-0.5 text-footnote text-secondary">
            <WordDetails language={language} word={word} />
          </p>
        </GroupedRow>
      ))}
    </GroupedSection>
  )
}

/** Oefeningen bestaan al in het pakket, maar de app kan ze nog niet afnemen. */
function Practice({ exerciseCount }: { exerciseCount: number }) {
  return (
    <section
      aria-labelledby="oefenen-titel"
      className="flex gap-4 rounded-card bg-surface p-5"
    >
      <SymbolIcon name="book" className="size-7 shrink-0 text-secondary" />
      <div>
        <h2 id="oefenen-titel" className="font-semibold">
          Oefenen
        </h2>
        <p className="mt-1 text-subhead text-secondary">
          Bij deze les horen {count(exerciseCount, 'oefening', 'oefeningen')}.
          Oefenen kan nog niet; dat komt in een volgende versie van de app.
        </p>
      </div>
    </section>
  )
}

/** Wat het statuslabel bovenaan betekent. */
function StatusNote({ status }: { status: EffectiveStatus }) {
  return (
    <p className="px-1 text-footnote text-secondary">
      <span className="font-semibold">{STATUS_LABELS[status]}</span>:{' '}
      {STATUS_DESCRIPTIONS[status]} Een les krijgt de laagste status van de les
      zelf en alles wat ze toont: woorden, voorbeeldzinnen en oefeningen.
    </p>
  )
}

function LessonLink({
  language,
  lesson,
  direction,
}: {
  language: LanguageCode
  lesson: CompiledLesson
  direction: 'previous' | 'next'
}) {
  const next = direction === 'next'
  return (
    <a
      href={pageHref({ page: 'lesson', language, lesson: lesson.id })}
      rel={next ? 'next' : 'prev'}
      className={`flex items-center gap-2 rounded-card bg-surface p-4 transition-colors hover:bg-muted/50 active:bg-muted ${
        next ? 'flex-row-reverse text-end sm:col-start-2' : ''
      }`}
    >
      <SymbolIcon
        name={next ? 'chevron-right' : 'chevron-left'}
        className="size-5 shrink-0 text-tint"
      />
      <span className="min-w-0">
        <span className="block text-footnote text-secondary">
          {next ? 'Volgende les' : 'Vorige les'}
        </span>
        <span className="block font-semibold">{lesson.title}</span>
      </span>
    </a>
  )
}

function Lesson({
  language,
  pack,
  place,
}: {
  language: Language
  pack: CompiledPack
  place: LessonPlace
}) {
  const { unit, lesson, number, previous, next } = place
  const words = wordsOf(pack, lesson.words)

  return (
    <article aria-labelledby="les-titel" className="max-w-2xl">
      <header className="mb-8">
        <p className="text-subhead text-secondary">
          {unit.level} · {unit.title} · les {number} van {unit.lessons.length}
        </p>
        <h1
          id="les-titel"
          className="mt-1 text-large-title font-bold tracking-[-0.015em]"
        >
          {lesson.title}
        </h1>
        <div className="mt-3">
          <StatusBadge status={lesson.status} />
        </div>
      </header>

      <div className="space-y-6">
        <Goals language={language} goals={lesson.goals} />
        {lesson.blocks.map((block, index) =>
          block.type === 'explanation' ? (
            <Explanation
              key={index}
              language={language}
              pack={pack}
              text={block.text}
              examples={block.examples}
            />
          ) : (
            <Culture key={index} language={language} text={block.text} />
          ),
        )}
        {words.length > 0 && <Words language={language} words={words} />}
        {lesson.exercises.length > 0 && (
          <Practice exerciseCount={lesson.exercises.length} />
        )}
        <StatusNote status={lesson.status} />
        {(previous !== undefined || next !== undefined) && (
          <nav aria-label="Andere lessen" className="grid gap-3 sm:grid-cols-2">
            {previous !== undefined && (
              <LessonLink
                language={language.code}
                lesson={previous}
                direction="previous"
              />
            )}
            {next !== undefined && (
              <LessonLink
                language={language.code}
                lesson={next}
                direction="next"
              />
            )}
          </nav>
        )}
      </div>
    </article>
  )
}

/** Eén les: doelen, uitleg met voorbeelden, cultuur, woorden en de status. */
export function LessonPage({
  language: code,
  lesson: lessonId,
}: {
  language: LanguageCode
  lesson: string
}) {
  const language = languageInfo(code)
  const course = useCoursePack(code)
  const place =
    course.state === 'ready' ? findLesson(course.pack, lessonId) : undefined
  usePageTitle(place?.lesson.title ?? language.dutchName)
  const courseHref = pageHref({ page: 'course', language: code })

  return (
    <>
      <BackLink href={courseHref} label={language.dutchName} />
      {course.state === 'loading' && <CourseLoading />}
      {course.state === 'error' && <CourseLoadError />}
      {course.state === 'ready' &&
        (place === undefined ? (
          <div className="mt-4 rounded-card bg-surface">
            <ContentUnavailable
              icon="question-circle"
              title="Deze les bestaat niet"
            >
              <p>Misschien is de link verouderd of zit er een tikfout in.</p>
              <p className="mt-4">
                <a
                  href={courseHref}
                  className="font-semibold text-tint hover:underline"
                >
                  Naar alle lessen {language.dutchName}
                </a>
              </p>
            </ContentUnavailable>
          </div>
        ) : (
          <Lesson language={language} pack={course.pack} place={place} />
        ))}
    </>
  )
}
