import { type ReactNode, type RefObject, useId } from 'react'
import { MAX_POSTING_WORDS } from '../../../../chat-api/src/constants.ts'
import { notesOf, type PrepAnswer, type PrepProgress, postingFits, wordsOf } from '../../../../chat-api/src/prep-shape.ts'
import { hrefOf } from './corpus.ts'
import { idFrom, Inspect, Svg } from './parts.tsx'
import type { PrepInput, PrepState } from './types.ts'
import { ACTIONS, CHECK_FAILED, FAILED, MODES, mailtoOf, PREP, PROGRESS, resetOf, UNAVAILABLE } from './words.ts'

// Interview prep's view (spec 024): every prep state, drawn from the window's
// state. The window holds the state and talks to the API, so switching modes
// keeps what each one showed (S1.3). Nothing here stores or logs a posting.

export interface PrepProps {
  prep: PrepState
  /** The posting box, which the window focuses when prep opens. */
  posting: RefObject<HTMLTextAreaElement | null>
  inspect: boolean
  copied: boolean
  timeZone?: string
  onDraft(text: string): void
  onSend(text: string, via: PrepInput['via']): void
  onStop(): void
  onExample(): void
  onAnother(): void
  onInspect(): void
  onCopy(answer: PrepAnswer): void
  onAsk(): void
}

export const NO_PROGRESS: PrepProgress = { requirements: 0, matches: 0, gaps: 0, questions: 0 }

/** The result as notes, in prep's words (S4.4). */
export const prepNotes = (answer: PrepAnswer): string =>
  notesOf(answer, { matches: PREP.matchesPlain, gaps: PREP.gaps, questions: PREP.questions, inferred: PREP.inferred })

export default function Prep(props: PrepProps): ReactNode {
  const { prep } = props
  const view = prep.view
  switch (view.phase) {
    case 'entry':
      return <Entry {...props} />
    case 'checking':
    case 'working':
      return (
        <div className="prep">
          <Chip input={view.input} />
          {view.phase === 'checking' ? (
            <p className="chat__progress">
              <span className="chat__spinner" aria-hidden="true" />
              {PROGRESS.checking}
            </p>
          ) : (
            <Steps progress={view.progress} />
          )}
          <button type="button" className="chat__chip-button prep__stop" onClick={props.onStop}>
            <span className="chat__stop" aria-hidden="true" />
            {PROGRESS.stop}
          </button>
        </div>
      )
    case 'done':
      return <Result {...props} input={view.input} answer={view.answer} meta={view.meta} />
    case 'failed':
    case 'check-failed': {
      const words = view.phase === 'failed' ? FAILED : CHECK_FAILED
      return (
        <div className="prep">
          <Chip input={view.input} />
          <div className="chat__notice chat__notice--warm" role="group" aria-label={words.heading}>
            <p className="chat__notice-heading">{words.heading}</p>
            <p className="chat__notice-body">{view.phase === 'failed' ? PREP.failedBody : PREP.checkFailedBody}</p>
            <div className="chat__notice-actions">
              <button
                type="button"
                className="ds-button ds-button--primary chat__small-button"
                onClick={() => props.onSend(view.input.text, view.input.via)}
              >
                {FAILED.retry}
              </button>
            </div>
          </div>
        </div>
      )
    }
    case 'limited':
      return (
        <div className="prep">
          <div className="chat__notice chat__notice--warm" role="group" aria-label={PREP.limit.heading} data-off="prep-limit">
            <p className="chat__notice-heading">{PREP.limit.heading}</p>
            <p className="chat__notice-body">{PREP.limit.body(view.left, resetOf(view.resetsAt, props.timeZone))}</p>
            <div className="chat__notice-actions">
              <button type="button" className="ds-button ds-button--primary chat__small-button" onClick={props.onAsk}>
                {MODES.ask}
              </button>
              <a className="ds-button ds-button--secondary chat__small-button" href={mailtoOf()}>
                {PREP.email}
              </a>
            </div>
          </div>
        </div>
      )
    case 'unavailable':
      return (
        <div className="prep">
          <Chip input={view.input} />
          <p className="chat__text">{UNAVAILABLE[view.reason]}</p>
        </div>
      )
  }
}

function Entry({ prep, posting, onDraft, onSend }: PrepProps): ReactNode {
  const fieldId = idFrom(useId())
  const countId = idFrom(useId())
  const words = wordsOf(prep.draft)
  const empty = prep.draft.trim() === ''
  // The API's own test, so a posting over 24,000 characters is too long even within 3,000 words (FR-002).
  const tooLong = !empty && !postingFits(prep.draft)
  const send = () => {
    if (!empty && !tooLong) onSend(prep.draft, 'posting')
  }
  return (
    <div className="prep" data-prep="entry">
      <p className="prep__intro">{PREP.intro}</p>
      <label className="prep__label" htmlFor={fieldId}>
        {PREP.label}
      </label>
      <textarea
        id={fieldId}
        ref={posting}
        className="prep__posting"
        rows={9}
        value={prep.draft}
        aria-describedby={countId}
        aria-invalid={tooLong || undefined}
        onChange={(event) => onDraft(event.target.value)}
        onKeyDown={(event) => {
          // Enter makes a new line in a posting; Ctrl or Cmd with Enter sends it.
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            send()
          }
        }}
      />
      <p className={`prep__count${tooLong ? ' prep__count--over' : ''}`} id={countId}>
        {tooLong ? (words > MAX_POSTING_WORDS ? PREP.tooLong(words) : PREP.tooManyCharacters) : PREP.count(words)}
      </p>
      <button type="button" className="ds-button ds-button--primary prep__map" aria-disabled={empty || tooLong} onClick={send}>
        {PREP.map}
      </button>
      <p className="prep__note">{PREP.note}</p>
    </div>
  )
}

function Chip({ input, role }: { input: PrepInput; role?: string }): ReactNode {
  const text = role !== undefined && role !== '' ? role : input.via === 'role' ? PREP.named(input.text) : PREP.posting(input.words)
  return <p className="prep__chip">{text}</p>
}

/** The four steps (P2): each waits, works, then is done, in order, from the API's counts. */
function Steps({ progress }: { progress: PrepProgress }): ReactNode {
  const active = progress.questions > 0 ? 3 : progress.gaps > 0 ? 2 : progress.matches > 0 ? 1 : 0
  const share = progress.requirements === 0 ? 0 : Math.min(1, progress.matches / progress.requirements)
  const labels = [
    PREP.steps.requirements(progress.requirements),
    PREP.steps.matches(progress.matches, progress.requirements),
    PREP.steps.gaps,
    PREP.steps.questions,
  ]
  return (
    <ol className="prep__steps" aria-label={PREP.progressLabel}>
      {labels.map((label, index) => {
        const status = index < active ? 'done' : index === active ? 'active' : 'waiting'
        return (
          <li key={index} className="prep__step" data-step={status}>
            <span className="prep__step-line">
              {status === 'done' ? (
                <span className="prep__tick" aria-hidden="true">
                  <Svg path="M5 12.5l4.5 4.5L19 7.5" />
                </span>
              ) : (
                <span className={status === 'active' ? 'chat__spinner' : 'prep__ring'} aria-hidden="true" />
              )}
              {label}
            </span>
            {index === 1 && status === 'active' && progress.requirements > 0 && (
              <span className="prep__bar" aria-hidden="true">
                {/* In tenths, by a data attribute, since the page allows no inline style (spec 009's FR-013). */}
                <span className="prep__bar-fill" data-share={Math.round(share * 10)} />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function Result({
  input,
  answer,
  meta,
  inspect,
  copied,
  onExample,
  onAnother,
  onInspect,
  onCopy,
}: PrepProps & { input: PrepInput; answer: PrepAnswer; meta: Parameters<typeof Inspect>[0]['meta'] }): ReactNode {
  const inspectId = idFrom(useId())
  if (answer.state === 'not-a-posting') {
    return (
      <div className="prep" data-prep="not-a-posting">
        <p className="chat__question prep__asked">
          <span className="chat__sr">{PROGRESS.asked}</span>
          {input.text}
        </p>
        <p className="chat__text">{PREP.notPosting}</p>
        <button type="button" className="chat__chip-button prep__example" onClick={onExample}>
          {PREP.example}
        </button>
      </div>
    )
  }
  const another = (
    <button type="button" className="chat__chip-button" onClick={onAnother}>
      {PREP.another}
    </button>
  )
  const email = (
    <a
      className={`ds-button chat__small-button ${answer.state === 'no-fit' ? 'ds-button--primary' : 'ds-button--secondary'}`}
      href={mailtoOf()}
    >
      {PREP.email}
    </a>
  )
  const gaps = (
    <section className="prep__section" aria-labelledby={`${inspectId}-gaps`}>
      <h3 className="prep__heading prep__heading--gaps" id={`${inspectId}-gaps`}>
        {PREP.gaps}
      </h3>
      {answer.gaps.length === 0 ? (
        <p className="prep__gap">{PREP.noGaps}</p>
      ) : (
        <ul className="prep__list">
          {answer.gaps.map((gap) => (
            <li key={gap} className="prep__gap">
              {gap}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
  return (
    <div className="prep" data-prep={answer.state}>
      <div className="prep__role">
        <Chip input={input} role={answer.role} />
        {answer.kind === 'role' && <p className="prep__inferred">{PREP.inferred}</p>}
      </div>

      {answer.state === 'no-fit' ? (
        <>
          <p className="chat__text">{PREP.noFit}</p>
          {gaps}
          <div className="chat__actions">
            {email}
            {another}
          </div>
        </>
      ) : (
        <>
          <section className="prep__section" aria-labelledby={`${inspectId}-matches`}>
            <h3 className="prep__heading prep__heading--matches" id={`${inspectId}-matches`}>
              {PREP.matches(answer.matches.length, answer.requirements.length)}
            </h3>
            <ul className="prep__list">
              {answer.matches.map((match) => (
                <li key={match.requirement} className="prep__match">
                  <span className="prep__requirement">{match.requirement}</span>
                  <span className="prep__evidence">
                    {match.evidence}
                    {match.sources.map((source) => (
                      <span key={source.id}>
                        {' · '}
                        <a className="ds-link" href={hrefOf(source.url)}>
                          {source.label}
                        </a>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {gaps}
          <section className="prep__section" aria-labelledby={`${inspectId}-questions`}>
            <h3 className="prep__heading" id={`${inspectId}-questions`}>
              {PREP.questions}
            </h3>
            <ol className="prep__questions">
              {answer.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          </section>
          <div className="chat__actions">
            <button type="button" className="chat__chip-button" onClick={() => onCopy(answer)}>
              {copied ? PREP.copied : PREP.copy}
            </button>
            {email}
            <button type="button" className="chat__chip-button" aria-expanded={inspect} aria-controls={inspectId} onClick={onInspect}>
              <Svg path="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM20 20l-4.5-4.5" />
              {ACTIONS.inspect}
            </button>
            {another}
          </div>
          {inspect && <Inspect id={inspectId} meta={meta} sources={answer.matches.flatMap((match) => match.sources)} />}
        </>
      )}
    </div>
  )
}
