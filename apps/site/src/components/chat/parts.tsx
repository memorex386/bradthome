import type { ReactNode } from 'react'
import { costOf, dollarsOf, secondsOf } from './inspect.ts'
import type { Meta, Source } from './types.ts'
import { INSPECT } from './words.ts'

// Pieces the chat's answers and prep's result share (specs 022 and 024).

/**
 * React's IDs start with an underscore, which HTML's id rule refuses; this one
 * starts with a letter. The dialog names the window, so the window itself
 * isn't another landmark.
 */
export function idFrom(reactId: string): string {
  return `chat${reactId.replace(/[^A-Za-z0-9-]/g, '')}`
}

export function Inspect({ id, meta, sources: cited }: { id: string; meta: Omit<Meta, 'state'>; sources: readonly Source[] }): ReactNode {
  // A source cited by two matches counts once.
  const sources = cited.filter((source, index) => cited.findIndex((each) => each.id === source.id) === index)
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
        <li>{INSPECT.sources(sources.length)}</li>
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
            {INSPECT.checkedDetail(sources.length)}
            {sources.length > 0 && <span className="chat__mono chat__ids">{sources.map((source) => source.id).join(' · ')}</span>}
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

export function Svg({ path }: { path: string }): ReactNode {
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
