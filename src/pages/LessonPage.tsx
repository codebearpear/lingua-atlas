import { useEffect, useState } from 'react'
import { CourseLoadError, CourseLoading } from '../app/CourseStates'
import {
  count,
  dueLabel,
  joinList,
  momentLabel,
  regionName,
} from '../app/format'
import { SymbolIcon } from '../app/Icons'
import { MarkedText } from '../app/MarkedText'
import { pageHref } from '../app/routes'
import {
  BackLink,
  ContentUnavailable,
  GroupedRow,
  GroupedSection,
  PRIMARY_BUTTON,
  StatusBadge,
} from '../app/ui'
import { useMemory, type MemorySnapshot } from '../app/useMemory'
import { usePageTitle } from '../app/usePageTitle'
import { VERDICT_ORDER, VERDICTS } from '../app/verdicts'
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
import { appDatabase } from '../data/appDatabase'
import type { PracticeRound } from '../data/database'
import { logError } from '../data/errorLog'
import { lastFinishedRound, roundCounts } from '../data/rounds'
import type { Verdict } from '../engine/answers'
import {
  cardKey,
  endOfDay,
  isDue,
  isLearning,
  type MemorySkill,
} from '../engine/memory'
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

const SKILL_LABELS: Record<MemorySkill, string> = {
  recognition: 'Herkennen',
  production: 'Zelf maken',
}

/** Wanneer een woord terugkomt, per herhaalkaart die je ervan hebt. */
function WordMemory({
  language,
  item,
  memory,
}: {
  language: LanguageCode
  item: string
  memory: MemorySnapshot
}) {
  const endOfToday = endOfDay(memory.now)
  const cards = (['recognition', 'production'] as const).flatMap((skill) => {
    const card = memory.cards.get(cardKey(language, item, skill))
    return card === undefined ? [] : [card]
  })
  if (cards.length === 0) {
    return null
  }
  return (
    <p className="mt-2 flex flex-wrap gap-1.5 text-footnote">
      {cards.map((card) => {
        const due = isDue(card, memory.now, endOfToday)
        return (
          <span
            key={card.skill}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5"
          >
            <span className="text-secondary">{SKILL_LABELS[card.skill]}:</span>
            <span className={due ? 'font-semibold text-tint' : ''}>
              {due
                ? 'nu aan de beurt'
                : dueLabel(
                    card.fsrs.due.getTime(),
                    memory.now,
                    !isLearning(card),
                  )}
            </span>
          </span>
        )
      })}
    </p>
  )
}

function Words({
  language,
  words,
  memory,
}: {
  language: Language
  words: readonly CompiledWord[]
  /** Je herhaalkaarten, als die er zijn. */
  memory: MemorySnapshot | null | undefined
}) {
  const practiced =
    memory !== null &&
    memory !== undefined &&
    words.some((word) =>
      (['recognition', 'production'] as const).some((skill) =>
        memory.cards.has(cardKey(language.code, word.id, skill)),
      ),
    )
  return (
    <GroupedSection
      id="woorden"
      title="Woorden in deze les"
      footer={
        practiced
          ? 'Bij een woord dat je hebt geoefend, staat wanneer je het weer herhaalt.'
          : undefined
      }
    >
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
          {memory !== null && memory !== undefined && (
            <WordMemory
              language={language.code}
              item={word.id}
              memory={memory}
            />
          )}
        </GroupedRow>
      ))}
    </GroupedSection>
  )
}

/**
 * De laatste afgeronde oefenronde bij een les: undefined zolang die laadt,
 * null als er nog geen is of als het lezen mislukt.
 */
function useLastRound(
  language: LanguageCode,
  lesson: string,
): PracticeRound | null | undefined {
  const [round, setRound] = useState<PracticeRound | null>()

  useEffect(() => {
    let active = true
    lastFinishedRound(appDatabase(), language, lesson).then(
      (found) => {
        if (active) {
          setRound(found ?? null)
        }
      },
      (error: unknown) => {
        void logError(error, 'Laatste oefenronde lezen')
        if (active) {
          setRound(null)
        }
      },
    )
    return () => {
      active = false
    }
  }, [language, lesson])

  return round
}

/** Hoe vaak elk oordeel voorkwam, met zijn pictogram. Wat niet voorkwam, blijft weg. */
function VerdictCounts({ counts }: { counts: Record<Verdict, number> }) {
  const shown = VERDICT_ORDER.filter((verdict) => counts[verdict] > 0)
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {shown.map((verdict, index) => (
        <span
          key={verdict}
          className="inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <SymbolIcon
            name={VERDICTS[verdict].icon}
            className={`size-[1.125rem] shrink-0 ${VERDICTS[verdict].tone}`}
          />
          {counts[verdict]} {VERDICTS[verdict].label.toLowerCase()}
          {/* Zodat een schermlezer de aantallen niet aan elkaar plakt. */}
          {index < shown.length - 1 && <span className="sr-only">, </span>}
        </span>
      ))}
    </span>
  )
}

/** De oefeningen bij de les, met je laatste resultaat en een knop om te beginnen. */
function Practice({
  language,
  lesson,
}: {
  language: LanguageCode
  lesson: CompiledLesson
}) {
  const last = useLastRound(language, lesson.id)
  const finishedAt = last?.finishedAt

  return (
    <section
      aria-labelledby="oefenen-titel"
      className="flex items-start gap-4 rounded-card bg-surface p-5"
    >
      <SymbolIcon name="book" className="-mt-[3px] size-7 shrink-0 text-tint" />
      {/* De knop staat naast de tekst, of eronder als daar geen plek voor is. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-56">
          <h2 id="oefenen-titel" className="font-semibold">
            Oefenen
          </h2>
          <p className="mt-0.5 text-subhead text-secondary">
            {count(lesson.exercises.length, 'oefening', 'oefeningen')}, met
            uitleg bij elk antwoord.
          </p>
          {last && finishedAt !== undefined && (
            <div className="mt-3 text-subhead">
              <p className="text-secondary">
                Laatste ronde {momentLabel(finishedAt)}
              </p>
              <p className="mt-1">
                <VerdictCounts counts={roundCounts(last)} />
              </p>
            </div>
          )}
        </div>
        <a
          href={pageHref({ page: 'practice', language, lesson: lesson.id })}
          className={PRIMARY_BUTTON}
        >
          {last ? 'Opnieuw oefenen' : 'Beginnen'}
        </a>
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
  const memory = useMemory()

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
        {words.length > 0 && (
          <Words language={language} words={words} memory={memory} />
        )}
        {lesson.exercises.length > 0 && (
          <Practice language={language.code} lesson={lesson} />
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
