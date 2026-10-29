import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type SubmitEvent,
} from 'react'
import { CourseLoadError, CourseLoading } from '../app/CourseStates'
import { SymbolIcon } from '../app/Icons'
import { MarkedText } from '../app/MarkedText'
import { pageHref } from '../app/routes'
import {
  BackLink,
  ContentUnavailable,
  GroupedRow,
  GroupedSection,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  StatusBadge,
} from '../app/ui'
import { usePageTitle } from '../app/usePageTitle'
import { countsText, VERDICTS } from '../app/verdicts'
import { findLesson, type LessonPlace } from '../content/course'
import { useCoursePack } from '../content/coursePacks'
import { KEYBOARDS, SPECIAL_CHARACTERS } from '../content/keyboards'
import {
  languageInfo,
  type Language,
  type LanguageCode,
} from '../content/languages'
import { packSummary } from '../content/packs'
import { appDatabase } from '../data/appDatabase'
import { logError } from '../data/errorLog'
import { roundRecord, saveRound } from '../data/rounds'
import {
  checkChoice,
  checkTypedAnswer,
  type AnswerCheck,
} from '../engine/answers'
import {
  finalVerdict,
  practiceReducer,
  startPractice,
  tally,
  type Attempt,
  type PracticeAction,
  type PracticeState,
} from '../engine/practice'
import type {
  CompiledExercise,
  CompiledLesson,
  InlineText,
} from '../packs/compiled'

type ChoiceExercise = Extract<CompiledExercise, { type: 'multiple-choice' }>
type TypedExercise = Extract<CompiledExercise, { type: 'typed-answer' }>

/** Tekst in de doeltaal of in het Nederlands, met de juiste taal en richting. */
function languageProps(
  language: Language,
  target: boolean,
): { lang: string; dir: 'ltr' | 'rtl' } {
  return target
    ? { lang: language.locale, dir: language.direction }
    : { lang: 'nl', dir: 'ltr' }
}

/** Of de uitleg het goede antwoord al noemt. */
function mentions(feedback: InlineText | undefined, expected: string): boolean {
  return (feedback ?? []).some((part) =>
    (typeof part === 'string' ? part : part.text).includes(expected),
  )
}

/** De balk toont hoeveel oefeningen af zijn; de tekst welke aan de beurt is. */
function Progress({
  done,
  current,
  total,
}: {
  done: number
  current: number
  total: number
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label="Voortgang"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-tint-fill transition-[width] duration-300"
          style={{ width: `${(done / Math.max(total, 1)) * 100}%` }}
        />
      </div>
      <span className="text-footnote text-secondary tabular-nums">
        {current} van {total}
      </span>
    </div>
  )
}

function ChoiceForm({
  exercise,
  order,
  language,
  attempt,
  onCheck,
}: {
  exercise: ChoiceExercise
  order: readonly number[]
  language: Language
  attempt: Attempt | undefined
  onCheck: (given: string, check: AnswerCheck) => void
}) {
  const [selected, setSelected] = useState<number>()
  const name = useId()
  const answered = attempt !== undefined
  const target = exercise.direction === 'to-target'

  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    if (answered || selected === undefined) {
      return
    }
    onCheck(
      exercise.choices[selected]?.text ?? '',
      checkChoice(exercise.choices, selected),
    )
  }

  return (
    <form onSubmit={submit} className="mt-5">
      <fieldset>
        <legend className="sr-only">Kies een antwoord</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {order.map((index) => {
            const choice = exercise.choices[index]
            if (choice === undefined) {
              return null
            }
            const chosen = selected === index
            const look = !answered
              ? chosen
                ? 'border-tint bg-tint/10'
                : 'border-transparent bg-muted hover:bg-tint/10'
              : choice.correct
                ? 'border-positive bg-positive/10'
                : chosen
                  ? 'border-destructive bg-destructive/10'
                  : 'border-transparent bg-muted opacity-60'
            return (
              <label
                key={index}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border-2 px-4 py-2.5 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tint/70 ${look} ${answered ? '' : 'cursor-pointer'}`}
              >
                <input
                  type="radio"
                  name={name}
                  value={index}
                  checked={chosen}
                  disabled={answered}
                  onChange={() => {
                    setSelected(index)
                  }}
                  className="sr-only"
                />
                <span {...languageProps(language, target)}>{choice.text}</span>
                {answered && choice.correct && (
                  <SymbolIcon
                    name="checkmark-circle"
                    className="size-6 shrink-0 text-positive"
                  />
                )}
                {answered && chosen && !choice.correct && (
                  <SymbolIcon
                    name="xmark-circle"
                    className="size-6 shrink-0 text-destructive"
                  />
                )}
              </label>
            )
          })}
        </div>
      </fieldset>
      {!answered && (
        <button
          type="submit"
          disabled={selected === undefined}
          className={`${PRIMARY_BUTTON} mt-5`}
        >
          Controleren
        </button>
      )}
    </form>
  )
}

function TypedForm({
  exercise,
  language,
  attempt,
  onCheck,
}: {
  exercise: TypedExercise
  language: Language
  attempt: Attempt | undefined
  onCheck: (given: string, check: AnswerCheck) => void
}) {
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const answered = attempt !== undefined
  const target = exercise.direction === 'to-target'
  const characters = target ? (SPECIAL_CHARACTERS[language.code] ?? []) : []
  const keyboard = target ? KEYBOARDS[language.code] : undefined

  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    if (answered || value.trim() === '') {
      return
    }
    onCheck(
      value,
      checkTypedAnswer(
        value,
        exercise.answers,
        exercise.feedback,
        target ? language.code : 'nl',
      ),
    )
  }

  /** Zet een teken op de plek van de cursor, en houdt het invoerveld actief. */
  const insert = (character: string) => {
    const field = input.current
    const start = field?.selectionStart ?? value.length
    const end = field?.selectionEnd ?? value.length
    setValue(value.slice(0, start) + character + value.slice(end))
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(
        start + character.length,
        start + character.length,
      )
    })
  }

  return (
    <form onSubmit={submit} className="mt-5">
      <label htmlFor={id} className="sr-only">
        Jouw antwoord
      </label>
      <input
        id={id}
        ref={input}
        type="text"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
        }}
        disabled={answered}
        // Op een computer meteen typen; op de iPad verschijnt het toetsenbord.
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder={
          target ? `In het ${language.dutchName}` : 'In het Nederlands'
        }
        {...languageProps(language, target)}
        className={`w-full rounded-xl border-2 bg-muted px-4 py-3 text-title3 placeholder:text-secondary focus:border-tint focus:outline-none disabled:opacity-100 ${
          attempt === undefined
            ? 'border-transparent'
            : VERDICTS[finalVerdict(attempt)].border
        }`}
      />
      {!answered && characters.length > 0 && (
        <div
          role="group"
          aria-label="Speciale tekens"
          className="mt-3 flex flex-wrap gap-2"
        >
          {characters.map((character) => (
            <button
              key={character}
              type="button"
              aria-label={`Voeg ${character} in`}
              // Niet het invoerveld verlaten, zodat het toetsenbord blijft staan.
              onPointerDown={(event) => {
                event.preventDefault()
              }}
              onClick={() => {
                insert(character)
              }}
              lang={language.locale}
              className="min-h-11 min-w-11 rounded-lg bg-muted px-2 text-title3 transition-colors hover:bg-tint/10 active:bg-tint/20"
            >
              {character}
            </button>
          ))}
        </div>
      )}
      {!answered && keyboard !== undefined && (
        <p className="mt-2 text-footnote text-secondary">
          Typ met {keyboard}; dat voeg je toe in de instellingen van je iPad of
          computer.
        </p>
      )}
      {!answered && (
        <button
          type="submit"
          disabled={value.trim() === ''}
          className={`${PRIMARY_BUTTON} mt-5`}
        >
          Controleren
        </button>
      )}
    </form>
  )
}

function Feedback({
  exercise,
  attempt,
  language,
  last,
  dispatch,
}: {
  exercise: CompiledExercise
  attempt: Attempt
  language: Language
  last: boolean
  dispatch: Dispatch<PracticeAction>
}) {
  const next = useRef<HTMLButtonElement>(null)
  const verdict = finalVerdict(attempt)
  const look = VERDICTS[verdict]
  const { check } = attempt
  // Het goede antwoord staat in de taal van het antwoord.
  const target = exercise.direction === 'to-target'
  const showExpected =
    check.verdict !== 'correct' && !mentions(check.feedback, check.expected)
  // Voor een goed antwoord dat niet in de sleutel staat. Bij bijna goed klopt
  // het antwoord niet helemaal, dus daar niet.
  const canOverride =
    exercise.type === 'typed-answer' &&
    check.verdict === 'wrong' &&
    !attempt.overridden

  // Met het toetsenbord meteen door met Enter.
  useEffect(() => {
    next.current?.focus()
  }, [])

  return (
    <div className="mt-5">
      <div role="status" className={`rounded-xl p-4 ${look.panel}`}>
        <p className="flex items-center gap-2 font-semibold">
          <SymbolIcon
            name={look.icon}
            className={`size-6 shrink-0 ${look.tone}`}
          />
          {look.label}
          {attempt.overridden && (
            <span className="font-normal text-secondary">
              (zelf goedgekeurd)
            </span>
          )}
        </p>
        {check.feedback !== undefined && (
          <p className="mt-1.5">
            <MarkedText text={check.feedback} language={language} />
          </p>
        )}
        {showExpected && (
          <p className="mt-1.5">
            {attempt.overridden ? 'In de sleutel:' : 'Goed is:'}{' '}
            <span
              className="font-semibold"
              {...languageProps(language, target)}
            >
              {check.expected}
            </span>
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          ref={next}
          type="button"
          onClick={() => {
            dispatch({ type: 'next', at: Date.now() })
          }}
          className={PRIMARY_BUTTON}
        >
          {last ? 'Naar het resultaat' : 'Volgende'}
        </button>
        {canOverride && (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'override' })
            }}
            className={SECONDARY_BUTTON}
          >
            Mijn antwoord klopt toch
          </button>
        )}
      </div>
    </div>
  )
}

function ExerciseCard({
  exercise,
  state,
  language,
  dispatch,
}: {
  exercise: CompiledExercise
  state: PracticeState
  language: Language
  dispatch: Dispatch<PracticeAction>
}) {
  const card = useRef<HTMLElement>(null)
  const attempt = state.phase === 'feedback' ? state.attempts.at(-1) : undefined
  const headingId = useId()
  const onCheck = (given: string, check: AnswerCheck) => {
    dispatch({ type: 'check', given, check, at: Date.now() })
  }

  // Een nieuwe oefening in beeld, ook als je naar beneden had gescrold.
  useEffect(() => {
    card.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  return (
    <section
      ref={card}
      aria-labelledby={headingId}
      className="scroll-mt-6 rounded-card bg-surface p-5 sm:p-6"
    >
      <Progress
        done={state.attempts.length}
        current={state.index + 1}
        total={state.order.length}
      />
      <h2 id={headingId} className="mt-5 text-subhead text-secondary">
        <MarkedText text={exercise.instruction} language={language} />
      </h2>
      <p
        className="mt-2 text-title1 font-semibold"
        {...languageProps(language, exercise.direction === 'to-dutch')}
      >
        {exercise.prompt}
      </p>
      {exercise.type === 'multiple-choice' ? (
        <ChoiceForm
          exercise={exercise}
          order={state.choiceOrder[exercise.id] ?? []}
          language={language}
          attempt={attempt}
          onCheck={onCheck}
        />
      ) : (
        <TypedForm
          exercise={exercise}
          language={language}
          attempt={attempt}
          onCheck={onCheck}
        />
      )}
      {attempt !== undefined && (
        <Feedback
          exercise={exercise}
          attempt={attempt}
          language={language}
          last={state.index === state.order.length - 1}
          dispatch={dispatch}
        />
      )}
    </section>
  )
}

function Summary({
  state,
  exercises,
  language,
  place,
  saveFailed,
  onRestart,
}: {
  state: PracticeState
  exercises: readonly CompiledExercise[]
  language: Language
  place: LessonPlace
  /** Of het bewaren van de ronde is mislukt. */
  saveFailed: boolean
  onRestart: () => void
}) {
  const lessonHref = pageHref({
    page: 'lesson',
    language: language.code,
    lesson: place.lesson.id,
  })

  return (
    <div className="space-y-6">
      <section className="rounded-card bg-surface px-6 py-8 text-center">
        <SymbolIcon
          name="checkmark-circle"
          className="mx-auto size-12 text-positive"
        />
        <h2 className="mt-3 text-title2 font-bold">Klaar met oefenen</h2>
        <p className="mt-1 text-secondary">
          {countsText(tally(state.attempts))}
        </p>
      </section>

      {saveFailed && (
        <p
          role="alert"
          className="flex gap-3 rounded-card bg-caution/10 p-4 text-subhead"
        >
          <SymbolIcon
            name="exclamation-circle"
            className="size-6 shrink-0 text-caution"
          />
          <span>
            Je antwoorden zijn niet bewaard: opslaan op dit apparaat lukte niet.
            De melding staat in het foutenlogboek onder{' '}
            <a
              href={pageHref({ page: 'settings' })}
              className="font-semibold text-tint hover:underline"
            >
              Instellingen
            </a>
            .
          </span>
        </p>
      )}

      <GroupedSection
        id="antwoorden"
        title="Jouw antwoorden"
        footer={
          saveFailed
            ? 'Antwoorden die niet bewaard zijn, tellen niet mee voor herhalen.'
            : 'Je antwoorden worden op dit apparaat bewaard en gaan mee in je back-up. Ze bepalen wanneer je deze woorden herhaalt; dat zie je in het overzicht onder Vandaag.'
        }
      >
        {state.attempts.map((attempt) => {
          const exercise = exercises.find(
            (item) => item.id === attempt.exerciseId,
          )
          if (exercise === undefined) {
            return null
          }
          const look = VERDICTS[finalVerdict(attempt)]
          return (
            <GroupedRow key={attempt.exerciseId}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p
                    {...languageProps(
                      language,
                      exercise.direction === 'to-dutch',
                    )}
                  >
                    {exercise.prompt}
                  </p>
                  <p className="text-subhead text-secondary">
                    Jij:{' '}
                    <span
                      {...languageProps(
                        language,
                        exercise.direction === 'to-target',
                      )}
                    >
                      {attempt.given}
                    </span>
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-subhead">
                  <SymbolIcon
                    name={look.icon}
                    className={`size-5 ${look.tone}`}
                  />
                  {look.label}
                  {attempt.overridden && (
                    <span className="text-secondary">(zelf)</span>
                  )}
                </span>
              </div>
            </GroupedRow>
          )
        })}
      </GroupedSection>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onRestart} className={PRIMARY_BUTTON}>
          Opnieuw oefenen
        </button>
        <a href={lessonHref} className={SECONDARY_BUTTON}>
          Terug naar de les
        </a>
        {place.next !== undefined && (
          <a
            href={pageHref({
              page: 'lesson',
              language: language.code,
              lesson: place.next.id,
            })}
            className={SECONDARY_BUTTON}
          >
            Volgende les: {place.next.title}
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Bewaart de ronde zodra er iets verandert: na elk antwoord, na zelf
 * goedkeuren en aan het eind. Geeft terug of het laatste bewaren mislukte.
 */
function useSavedRound(
  state: PracticeState,
  code: LanguageCode,
  lesson: CompiledLesson,
): boolean {
  const [failed, setFailed] = useState(false)
  const { id, startedAt, attempts, finishedAt } = state

  useEffect(() => {
    const round = roundRecord(
      { id, startedAt, attempts, finishedAt },
      {
        language: code,
        lesson: lesson.id,
        packVersion: packSummary(code).version,
        exercises: lesson.exercises,
      },
      Date.now(),
    )
    if (round === undefined) {
      return
    }
    let active = true
    saveRound(appDatabase(), round).then(
      () => {
        if (active) {
          setFailed(false)
        }
      },
      (error: unknown) => {
        void logError(error, 'Oefenronde bewaren')
        if (active) {
          setFailed(true)
        }
      },
    )
    return () => {
      active = false
    }
  }, [id, startedAt, attempts, finishedAt, code, lesson])

  return failed
}

function PracticeSession({
  language,
  place,
}: {
  language: Language
  place: LessonPlace
}) {
  const { unit, lesson } = place
  const [state, dispatch] = useReducer(
    practiceReducer,
    lesson.exercises,
    (exercises) => startPractice(exercises),
  )
  const saveFailed = useSavedRound(state, language.code, lesson)
  const exercise = lesson.exercises.find(
    (item) => item.id === state.order[state.index],
  )

  return (
    <article aria-labelledby="oefenen-titel" className="max-w-2xl">
      <header className="mb-6">
        <p className="text-subhead text-secondary">
          {unit.level} · {unit.title}
        </p>
        <h1
          id="oefenen-titel"
          className="mt-1 text-large-title font-bold tracking-[-0.015em]"
        >
          Oefenen
        </h1>
        <div className="mt-3">
          <StatusBadge status={lesson.status} />
        </div>
      </header>

      {lesson.exercises.length === 0 ? (
        <div className="rounded-card bg-surface">
          <ContentUnavailable icon="book" title="Geen oefeningen">
            Bij deze les horen nog geen oefeningen.
          </ContentUnavailable>
        </div>
      ) : state.phase === 'summary' ? (
        <Summary
          state={state}
          exercises={lesson.exercises}
          language={language}
          place={place}
          saveFailed={saveFailed}
          onRestart={() => {
            dispatch({
              type: 'restart',
              state: startPractice(lesson.exercises),
            })
          }}
        />
      ) : (
        exercise !== undefined && (
          <ExerciseCard
            // Elke oefening begint met een leeg antwoord.
            key={state.index}
            exercise={exercise}
            state={state}
            language={language}
            dispatch={dispatch}
          />
        )
      )}
    </article>
  )
}

/** Oefenen bij een les: de oefeningen na elkaar, met uitleg bij elk antwoord. */
export function PracticePage({
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
  usePageTitle(
    place === undefined ? language.dutchName : `Oefenen: ${place.lesson.title}`,
  )
  const lessonHref = pageHref({
    page: 'lesson',
    language: code,
    lesson: lessonId,
  })

  return (
    <>
      <BackLink href={lessonHref} label={place?.lesson.title ?? 'Les'} />
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
            </ContentUnavailable>
          </div>
        ) : (
          <PracticeSession language={language} place={place} />
        ))}
    </>
  )
}
