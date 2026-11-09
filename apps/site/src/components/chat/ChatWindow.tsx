import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { apiTransport, MAX_QUESTION_CHARS, type Transport } from './api.ts'
import { hrefOf, sourcesText } from './corpus.ts'
import { costOf, dollarsOf, secondsOf } from './inspect.ts'
import type { ChatState, ChatWindowProps, Off, Opened, Source, Turn } from './types.ts'
import {
  ACTIONS,
  CHECK_FAILED,
  CLOSE,
  COMPOSER,
  FAILED,
  HANDOFF,
  INSPECT,
  LIMIT,
  LINKS,
  mailtoOf,
  PAUSED,
  PROGRESS,
  SOURCES,
  STARTERS,
  SUBTITLE,
  TITLE,
  UNAVAILABLE,
  WELCOME,
  resetOf,
} from './words.ts'

// The "Ask about Brad" window (spec 022): the panel, its answers with their
// sources opened in place, Inspect built from the reply, and every designed
// state (A2–A6, A8–A12), plus ALTCHA's check and its failure. It renders on
// the server for the gallery's held states, and in the browser once a visitor
// opens the chat, when ask.client.ts loads it (D188).

let next = 0
const idOf = () => `t${Date.now().toString(36)}${(next++).toString(36)}`

export default function ChatWindow({ resumeHref, initial, held, transport, onClose, timeZone }: ChatWindowProps): ReactNode {
  const [state, setState] = useState<ChatState>(initial ?? { turns: [] })
  const [draft, setDraft] = useState(held?.draft ?? '')
  const [opened, setOpened] = useState<Opened | undefined>(held?.opened)
  const [inspect, setInspect] = useState<string | undefined>(held?.inspect)
  const [copied, setCopied] = useState<string | undefined>(held?.copied)
  const [status, setStatus] = useState('')
  const busy = state.turns.some((turn) => turn.status === 'checking' || turn.status === 'writing')
  const controller = useRef<AbortController | undefined>(undefined)
  const input = useRef<HTMLTextAreaElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const api = useRef<Transport | undefined>(transport)
  const headingId = idFrom(useId())
  const inputId = idFrom(useId())
  const noteId = idFrom(useId())

  useEffect(() => () => controller.current?.abort(), [])

  // Keep the newest turn in view as it grows. With reduced motion, or with no
  // preference set, it jumps rather than scrolls (D122).
  const lastText = state.turns.at(-1)?.text.length ?? 0
  useEffect(() => {
    const element = log.current
    if (element !== null && state.turns.length > 0) element.scrollTop = element.scrollHeight
  }, [state.turns.length, lastText, state.off])

  const update = (id: string, change: Partial<Turn>) =>
    setState((current) => ({ ...current, turns: current.turns.map((turn) => (turn.id === id ? { ...turn, ...change } : turn)) }))

  async function ask(question: string, replacing?: string): Promise<void> {
    const words = question.trim()
    if (words === '' || busy || state.off !== undefined) return
    const id = replacing ?? idOf()
    const turn: Turn = { id, question: words, status: 'checking', text: '', sources: [] }
    const earlier = state.turns.filter((each) => each.id !== id)
    setState((current) => ({
      ...current,
      turns: replacing === undefined ? [...current.turns, turn] : current.turns.map((each) => (each.id === id ? turn : each)),
    }))
    setDraft('')
    setInspect(undefined)
    setStatus(PROGRESS.checking)
    const abort = new AbortController()
    controller.current = abort
    api.current ??= apiTransport()
    let text = ''
    const sources: Source[] = []
    try {
      const outcome = await api.current.ask(words, earlier, abort.signal, () => {
        update(id, { status: 'writing' })
        setStatus(PROGRESS.writing)
      })
      if (outcome.kind === 'off') {
        setState((current) => ({ ...current, off: outcome.off, turns: current.turns.filter((each) => each.id !== id) }))
        setStatus(outcome.off.kind === 'limit' ? LIMIT.heading : PAUSED.heading[outcome.off.scope])
        return
      }
      if (outcome.kind === 'check-failed') return finish(id, { status: 'check-failed' }, CHECK_FAILED.heading)
      if (outcome.kind === 'failed') return finish(id, { status: 'failed' }, FAILED.heading)
      if (outcome.kind === 'unavailable') return finish(id, { status: 'unavailable', reason: outcome.reason }, UNAVAILABLE[outcome.reason])
      update(id, { status: 'writing' })
      let meta: Turn['meta']
      for await (const event of outcome.events) {
        if (event.type === 'text') {
          text += event.delta
          update(id, { text })
        } else if (event.type === 'source') {
          if (!sources.some((each) => each.id === event.source.id)) sources.push(event.source)
        } else if (event.type === 'meta') meta = event.meta
        else return finish(id, { status: 'failed', text: '' }, FAILED.heading)
      }
      if (meta === undefined || text.trim() === '') return finish(id, { status: 'failed', text: '' }, FAILED.heading)
      finish(id, { status: 'done', text, sources: [...sources], meta }, PROGRESS.ready(sources.length))
    } catch {
      if (abort.signal.aborted) finish(id, { status: 'stopped', text, sources: [...sources] }, PROGRESS.stopped)
      else finish(id, { status: 'failed', text: '' }, FAILED.heading)
    } finally {
      if (controller.current === abort) controller.current = undefined
    }
  }

  function finish(id: string, change: Partial<Turn>, note: string): void {
    update(id, change)
    setStatus(note)
  }

  function send(event?: FormEvent): void {
    event?.preventDefault()
    void ask(draft)
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) send(event)
  }

  async function openSource(turn: string, source: string): Promise<void> {
    if (opened?.turn === turn && opened.source === source) return setOpened(undefined)
    setOpened({ turn, source, text: 'loading' })
    try {
      const text = (await sourcesText()).get(source)
      setOpened((current) => (current?.turn === turn && current.source === source ? { turn, source, text: text ?? 'missing' } : current))
    } catch {
      setOpened((current) => (current?.turn === turn && current.source === source ? { turn, source, text: 'missing' } : current))
    }
  }

  async function copy(turn: Turn): Promise<void> {
    const lines = [turn.text.trim(), ...turn.sources.map((source, n) => `[${n + 1}] ${source.label}: ${source.url}`)]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(turn.id)
      setStatus(ACTIONS.copiedNote)
      window.setTimeout(() => setCopied((current) => (current === turn.id ? undefined : current)), 2000)
    } catch {
      setStatus(ACTIONS.copyRefused)
    }
  }

  const empty = state.turns.length === 0 && state.off === undefined
  const offHint = state.off === undefined ? undefined : state.off.kind === 'limit' ? COMPOSER.off.limit : COMPOSER.off.paused

  return (
    <div className="chat">
      <div className="chat__head">
        <span className="chat__mark" aria-hidden="true">
          <Svg path="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
        </span>
        <div className="chat__titles">
          <h2 className="chat__title" id={headingId}>
            {TITLE}
          </h2>
          <p className="chat__subtitle">{SUBTITLE}</p>
        </div>
        {onClose !== undefined && (
          <button type="button" className="chat__icon-button chat__close" aria-label={CLOSE} onClick={onClose}>
            <Svg path="M6 6l12 12M18 6L6 18" />
          </button>
        )}
      </div>

      <div className="chat__log" ref={log}>
        {empty && (
          <div className="chat__welcome">
            <p className="chat__welcome-heading">{WELCOME.heading}</p>
            <p className="chat__welcome-lede">{WELCOME.lede}</p>
            <ul className="chat__starters">
              {STARTERS.map((starter) => (
                <li key={starter}>
                  <button type="button" className="chat__starter" onClick={() => void ask(starter)}>
                    {starter}
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.off?.kind === 'limit' && state.turns.length === 0 && <p className="chat__earlier">{LIMIT.earlier}</p>}

        {state.turns.map((turn) => (
          <article className="chat__turn" key={turn.id} data-status={turn.status} data-state={turn.meta?.state}>
            <p className="chat__question">
              <span className="chat__sr">{PROGRESS.asked}</span>
              {turn.question}
            </p>
            <Answer
              turn={turn}
              opened={opened?.turn === turn.id ? opened : undefined}
              inspect={inspect === turn.id}
              copied={copied === turn.id}
              onStop={() => controller.current?.abort()}
              onRetry={() => void ask(turn.question, turn.id)}
              onOpen={(source) => void openSource(turn.id, source)}
              onCloseSource={() => setOpened(undefined)}
              onInspect={() => setInspect(inspect === turn.id ? undefined : turn.id)}
              onCopy={() => void copy(turn)}
            />
          </article>
        ))}

        {state.off !== undefined && <OffNotice off={state.off} resumeHref={resumeHref} timeZone={timeZone} />}
      </div>

      <p className="chat__sr" role="status" aria-live="polite">
        {status}
      </p>

      <form className="chat__composer" onSubmit={send}>
        <div className="chat__field" data-off={state.off !== undefined || undefined}>
          <label className="chat__sr" htmlFor={inputId}>
            {COMPOSER.label}
          </label>
          <textarea
            id={inputId}
            ref={input}
            className="chat__input"
            rows={1}
            // Lowercase, as HTML writes it, so the gallery's server-drawn copy validates.
            {...{ maxlength: MAX_QUESTION_CHARS }}
            value={draft}
            placeholder={offHint ?? COMPOSER.hint}
            // aria-disabled, not disabled: React draws disabled="" on the server, which HTML's style rule refuses.
            aria-disabled={state.off !== undefined}
            aria-describedby={noteId}
            onChange={(event) => {
              if (state.off === undefined) setDraft(event.target.value)
            }}
            onKeyDown={keyDown}
          />
          <button
            type="submit"
            className="chat__send"
            aria-label={COMPOSER.send}
            aria-disabled={state.off !== undefined || busy || draft.trim() === ''}
          >
            <Svg path="M12 19V5M6 11l6-6 6 6" />
          </button>
        </div>
        <p className="chat__note" id={noteId}>
          {COMPOSER.note}
        </p>
      </form>
    </div>
  )
}

/**
 * React's IDs start with an underscore, which HTML's id rule refuses; this one
 * starts with a letter. The dialog names the window, so the window itself
 * isn't another landmark.
 */
function idFrom(reactId: string): string {
  return `chat${reactId.replace(/[^A-Za-z0-9-]/g, '')}`
}

interface AnswerProps {
  turn: Turn
  opened?: Opened
  inspect: boolean
  copied: boolean
  onStop(): void
  onRetry(): void
  onOpen(source: string): void
  onCloseSource(): void
  onInspect(): void
  onCopy(): void
}

function Answer({ turn, opened, inspect, copied, onStop, onRetry, onOpen, onCloseSource, onInspect, onCopy }: AnswerProps): ReactNode {
  const inspectId = idFrom(useId())
  if (turn.status === 'checking' || turn.status === 'writing') {
    return (
      <div className="chat__answer">
        <p className="chat__progress">
          <span className="chat__spinner" aria-hidden="true" />
          {turn.status === 'checking' ? PROGRESS.checking : PROGRESS.writing}
        </p>
        {turn.text !== '' && (
          <p className="chat__text">
            {turn.text}
            <span className="chat__caret" aria-hidden="true" />
          </p>
        )}
        <button type="button" className="chat__chip-button" onClick={onStop}>
          <span className="chat__stop" aria-hidden="true" />
          {PROGRESS.stop}
        </button>
      </div>
    )
  }

  if (turn.status === 'failed' || turn.status === 'check-failed') {
    const words = turn.status === 'failed' ? FAILED : CHECK_FAILED
    return (
      <div className="chat__notice chat__notice--warm" role="group" aria-label={words.heading}>
        <p className="chat__notice-heading">{words.heading}</p>
        <p className="chat__notice-body">{words.body}</p>
        <div className="chat__notice-actions">
          <button type="button" className="ds-button ds-button--primary chat__small-button" onClick={onRetry}>
            {FAILED.retry}
          </button>
        </div>
      </div>
    )
  }

  if (turn.status === 'unavailable') {
    return <p className="chat__text">{UNAVAILABLE[turn.reason ?? 'origin']}</p>
  }

  const handoff = turn.meta?.state === 'no-source' ? 'noSource' : turn.meta?.state === 'boundary' ? 'boundary' : undefined
  return (
    <div className="chat__answer">
      {turn.text !== '' && <p className="chat__text">{turn.text}</p>}
      {turn.status === 'stopped' && <p className="chat__stopped">{PROGRESS.stopped}</p>}

      {handoff !== undefined && (
        <a
          className={`ds-button chat__small-button ${handoff === 'noSource' ? 'ds-button--primary' : 'ds-button--secondary'}`}
          href={handoff === 'noSource' ? mailtoOf(turn.question) : mailtoOf()}
        >
          {HANDOFF[handoff]}
        </a>
      )}

      {turn.sources.length > 0 && (
        <ol className="chat__sources" aria-label={SOURCES.label}>
          {turn.sources.map((source, n) => (
            <li key={source.id}>
              <button type="button" className="chat__source" aria-expanded={opened?.source === source.id} onClick={() => onOpen(source.id)}>
                <span className="chat__source-n">{n + 1}</span>
                {source.label}
              </button>
              {opened?.source === source.id && <OpenedSource source={source} n={n + 1} text={opened.text} onClose={onCloseSource} />}
            </li>
          ))}
        </ol>
      )}

      {turn.status === 'done' && (
        <div className="chat__actions">
          <button type="button" className="chat__chip-button" onClick={onCopy}>
            {copied ? ACTIONS.copied : ACTIONS.copy}
          </button>
          {turn.meta !== undefined && (
            <button type="button" className="chat__chip-button" aria-expanded={inspect} aria-controls={inspectId} onClick={onInspect}>
              <Svg path="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM20 20l-4.5-4.5" />
              {ACTIONS.inspect}
            </button>
          )}
        </div>
      )}

      {turn.meta !== undefined && inspect && <Inspect id={inspectId} turn={turn} />}
    </div>
  )
}

function OpenedSource({ source, n, text, onClose }: { source: Source; n: number; text?: string; onClose(): void }): ReactNode {
  return (
    <div className="chat__opened">
      <div className="chat__opened-head">
        <span className="chat__opened-title">
          <span className="chat__source-n">{n}</span>
          {source.label}
        </span>
        <button type="button" className="chat__icon-button chat__icon-button--small" aria-label={SOURCES.close} onClick={onClose}>
          <Svg path="M6 6l12 12M18 6L6 18" />
        </button>
      </div>
      <p className="chat__opened-text">
        {text === undefined || text === 'loading' ? SOURCES.loading : text === 'missing' ? SOURCES.missing : text}
      </p>
      <a className="ds-link chat__opened-link" href={hrefOf(source.url)}>
        {SOURCES.open}
      </a>
    </div>
  )
}

function Inspect({ id, turn }: { id: string; turn: Turn }): ReactNode {
  const meta = turn.meta
  if (meta === undefined) return null
  const cost = costOf(meta)
  return (
    <div className="chat__inspect" id={id}>
      <div className="chat__inspect-head">
        <p className="chat__inspect-heading">{INSPECT.heading}</p>
        <span className="chat__mono">
          {secondsOf(meta.ms)}
          {cost !== undefined && ` · ${dollarsOf(cost)}`}
        </span>
      </div>
      <ul className="chat__tags" aria-label={INSPECT.model}>
        <li>{meta.model}</li>
        <li>{INSPECT.sources(turn.sources.length)}</li>
        <li>{INSPECT.tools}</li>
      </ul>
      <dl className="chat__steps">
        <div>
          <dt>{INSPECT.read}</dt>
          <dd>{INSPECT.readDetail(meta.cacheReadTokens, meta.cacheWriteTokens)}</dd>
        </div>
        <div>
          <dt>{INSPECT.question}</dt>
          <dd>{INSPECT.questionDetail(meta.inputTokens)}</dd>
        </div>
        <div>
          <dt>{INSPECT.wrote}</dt>
          <dd>{INSPECT.wroteDetail(meta.outputTokens)}</dd>
        </div>
        <div>
          <dt>{INSPECT.checked}</dt>
          <dd>
            {INSPECT.checkedDetail(turn.sources.length)}
            {turn.sources.length > 0 && <span className="chat__mono chat__ids">{turn.sources.map((source) => source.id).join(' · ')}</span>}
          </dd>
        </div>
      </dl>
      <p className="chat__inspect-note">
        {INSPECT.note}{' '}
        <a className="ds-link" href={INSPECT.codeHref}>
          {INSPECT.code}
        </a>
        {' · '}
        <a className="ds-link" href={INSPECT.evalsHref}>
          {INSPECT.evals}
        </a>
      </p>
    </div>
  )
}

function OffNotice({ off, resumeHref, timeZone }: { off: Off; resumeHref: string; timeZone?: string }): ReactNode {
  const heading = off.kind === 'limit' ? LIMIT.heading : PAUSED.heading[off.scope]
  const body = off.kind === 'limit' ? LIMIT.body(resetOf(off.resetsAt, timeZone)) : PAUSED.body[off.scope]
  return (
    <div
      className={`chat__notice ${off.kind === 'limit' ? 'chat__notice--warm' : ''}`}
      role="group"
      aria-label={heading}
      data-off={off.kind}
    >
      <p className="chat__notice-heading">{heading}</p>
      <p className="chat__notice-body">{body}</p>
      <div className="chat__notice-actions">
        <a className="ds-button ds-button--primary chat__small-button" href={resumeHref}>
          {LINKS.resume}
        </a>
        <a className="ds-button ds-button--secondary chat__small-button" href={mailtoOf()}>
          {LINKS.email}
        </a>
      </div>
    </div>
  )
}

function Svg({ path }: { path: string }): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  )
}
