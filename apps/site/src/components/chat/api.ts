import type { Challenge } from 'altcha-lib'
import { CHAT_API_ORIGIN, MAX_ANSWER_CHARS, MAX_MESSAGES, MAX_QUESTION_CHARS } from '../../../../chat-api/src/constants.ts'
import { isAllowedOrigin } from '../../../../chat-api/src/origin.ts'
import { solve } from './altcha.ts'
import { eventsOf, type StreamEvent } from './stream.ts'
import type { Off, Turn } from './types.ts'

// The chat API's client (spec 022, against spec 021's API). Each question
// fetches a challenge, solves it, then posts the conversation with the
// solution, and the reply is a stream or a refusal. Nothing is stored: the
// conversation lives in the window's memory, and each question sends what
// the API needs to follow it.

export { MAX_QUESTION_CHARS }

/** What one question came to. */
export type Outcome =
  | { kind: 'stream'; events: AsyncIterable<StreamEvent> }
  | { kind: 'check-failed' }
  | { kind: 'off'; off: Off }
  | { kind: 'unavailable'; reason: 'origin' | 'invalid' }
  | { kind: 'failed' }

/** How the window reaches the API. Tests and the gallery pass their own. */
export interface Transport {
  /** Asks one question. onChecked runs once the check is solved and the question is on its way. */
  ask(question: string, earlier: readonly Turn[], signal: AbortSignal, onChecked: () => void): Promise<Outcome>
}

interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  parts: { type: 'text'; text: string }[]
}

/**
 * The messages sent with a question: the finished turns before it, newest
 * kept, within the API's limits (spec 021's FR-003), then the question. A
 * stopped, failed or refused turn has no whole answer, so it's left out.
 */
export function messagesOf(question: string, earlier: readonly Turn[]): UiMessage[] {
  const pairs: UiMessage[][] = []
  for (const turn of earlier) {
    if (turn.status !== 'done' || turn.text.trim() === '' || turn.text.length > MAX_ANSWER_CHARS) continue
    if (turn.question.length > MAX_QUESTION_CHARS) continue
    pairs.push([
      { id: `${turn.id}-q`, role: 'user', parts: [{ type: 'text', text: turn.question }] },
      { id: `${turn.id}-a`, role: 'assistant', parts: [{ type: 'text', text: turn.text }] },
    ])
  }
  const room = Math.floor((MAX_MESSAGES - 1) / 2)
  return [...pairs.slice(-room).flat(), { id: 'q', role: 'user', parts: [{ type: 'text', text: question }] }]
}

/** A refusal's JSON body, read into what the window shows. */
export function refusalOf(status: number, body: unknown): Outcome {
  const refusal = (body ?? {}) as { state?: unknown; scope?: unknown; resetsAt?: unknown }
  const resetsAt = typeof refusal.resetsAt === 'string' ? refusal.resetsAt : undefined
  switch (refusal.state) {
    case 'altcha':
      return { kind: 'check-failed' }
    case 'limit':
      return { kind: 'off', off: { kind: 'limit', ...(resetsAt && { resetsAt }) } }
    case 'paused': {
      const scope = refusal.scope === 'day' || refusal.scope === 'month' ? refusal.scope : 'unknown'
      return { kind: 'off', off: { kind: 'paused', scope, ...(resetsAt && { resetsAt }) } }
    }
    case 'origin':
      return { kind: 'unavailable', reason: 'origin' }
    case 'invalid':
      return { kind: 'unavailable', reason: 'invalid' }
    default:
      return status === 429 ? { kind: 'off', off: { kind: 'limit' } } : { kind: 'failed' }
  }
}

/**
 * The real API, at its Cloud Run address (D170, D183). The API refuses any
 * page that isn't a preview or next with no CORS header, so the browser sees
 * only a failed fetch; on such a page that failure means the origin, not the
 * check (S6.5).
 */
export function apiTransport(
  origin: string = CHAT_API_ORIGIN,
  fetcher: typeof fetch = fetch.bind(globalThis),
  pageOrigin: string = (globalThis as { location?: { origin: string } }).location?.origin ?? '',
): Transport {
  return {
    async ask(question, earlier, signal, onChecked) {
      let challenge: Challenge
      try {
        const response = await fetcher(`${origin}/challenge`, { signal, cache: 'no-store' })
        if (!response.ok) return response.status === 403 ? { kind: 'unavailable', reason: 'origin' } : { kind: 'check-failed' }
        challenge = (await response.json()) as Challenge
      } catch {
        if (signal.aborted) throw signal.reason
        return isAllowedOrigin(pageOrigin) ? { kind: 'check-failed' } : { kind: 'unavailable', reason: 'origin' }
      }
      let altcha: string | undefined
      try {
        altcha = await solve(challenge, signal)
      } catch {
        altcha = undefined
      }
      if (signal.aborted) throw signal.reason
      if (altcha === undefined) return { kind: 'check-failed' }
      onChecked()

      let response: Response
      try {
        response = await fetcher(`${origin}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ altcha, messages: messagesOf(question, earlier) }),
          signal,
        })
      } catch {
        if (signal.aborted) throw signal.reason
        return { kind: 'failed' }
      }
      if (!response.ok) {
        let body: unknown
        try {
          body = await response.json()
        } catch {
          body = undefined
        }
        return refusalOf(response.status, body)
      }
      if (response.body === null) return { kind: 'failed' }
      return { kind: 'stream', events: eventsOf(response.body) }
    },
  }
}
