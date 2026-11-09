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
