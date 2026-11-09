import type { Transport } from './api.ts'

// The chat window's model of a conversation (spec 022). It's built in the
// browser from the API's replies (spec 021) and kept in memory only, so
// closing the tab forgets it (D175).

/** A source the answer cited, as the API sends it: an ID from /corpus.json, its page and its label. */
export interface Source {
  id: string
  url: string
  label: string
}

/** The API's numbers for one answer, its data-meta part, which Inspect shows (A6). */
export interface Meta {
  state: 'answered' | 'no-source' | 'boundary'
  model: string
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  ms: number
}

/**
 * Where one question's answer stands:
 * - checking: the browser is solving ALTCHA's challenge.
 * - writing: the answer is streaming (A3).
 * - done: it finished, as answered (A4), no source (A8) or a boundary (A9).
 * - stopped: the visitor pressed Stop; the words so far stay.
 * - failed: it didn't finish (A12).
 * - check-failed: the challenge couldn't be fetched, solved or passed.
 * - unavailable: the API refused the origin or the request.
 */
export type Status = 'checking' | 'writing' | 'done' | 'stopped' | 'failed' | 'check-failed' | 'unavailable'

export interface Turn {
  id: string
  question: string
  status: Status
  text: string
  sources: Source[]
  meta?: Meta
  /** Why the API refused, for unavailable. */
  reason?: 'origin' | 'invalid'
}

/** The chat switched off for this visitor: their daily limit (A10), or a spending cap (A11). */
export type Off = { kind: 'limit'; resetsAt?: string } | { kind: 'paused'; scope: 'day' | 'month' | 'unknown'; resetsAt?: string }

export interface ChatState {
  turns: Turn[]
  off?: Off
}

/** One source opened in place, and its words once they've loaded. */
export type Opened = { turn: string; source: string; text?: string | 'loading' | 'missing' }

export interface ChatWindowProps {
  /** The PDF the limit and paused states offer, the page's own résumé. */
  resumeHref: string
  /** Where the conversation starts: empty, or one of the gallery's held states. */
  initial?: ChatState
  /** The gallery's held states: a source open, Inspect open or Copy confirmed. */
  held?: { opened?: Opened; inspect?: string; copied?: string; draft?: string }
  /** How it reaches the API. Defaults to the real one. */
  transport?: Transport
  /** Closes the window, when it's in the page's dialog. */
  onClose?: () => void
  /** The time zone the limit's reset is written in, for the gallery's fixed snapshot. */
  timeZone?: string
}
