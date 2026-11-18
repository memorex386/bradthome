// The one log line per question (FR-009, D175): numbers and source IDs only,
// with spec 045's count of dropped pills,
// as JSON, which Cloud Logging reads from stdout. Each field is copied by
// name, so nothing else a caller passes can reach the log. This is the only
// file in the API that writes to stdout.

export type State =
  | 'answered'
  | 'no-source'
  | 'boundary'
  | 'chat'
  | 'failed'
  | 'origin'
  | 'invalid'
  | 'altcha'
  | 'limit'
  | 'paused'
  | 'no-fit'
  | 'not-a-posting'

/** Which request the line is for: a chat question, or interview prep (spec 024). */
export type Event = 'chat.answer' | 'chat.prep'

export interface LogFields {
  /** chat.answer unless it's prep's. */
  event?: Event
  state: State
  model: string
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  costUsd: number
  ms: number
  sources: readonly string[]
  droppedSources: number
  /** The pills the guard dropped (spec 045): a count, never their words. */
  pillsDropped?: number
}

export const LOG_FIELDS = [
  'severity',
  'event',
  'state',
  'model',
  'inputTokens',
  'cacheReadTokens',
  'cacheWriteTokens',
  'outputTokens',
  'costUsd',
  'ms',
  'sources',
  'droppedSources',
  'pillsDropped',
] as const

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MODEL_ID = /^[a-z0-9.-]+$/
const count = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0)

export function lineOf(f: LogFields): string {
  return JSON.stringify({
    severity: 'INFO',
    event: f.event === 'chat.prep' ? 'chat.prep' : 'chat.answer',
    state: f.state,
    model: MODEL_ID.test(f.model) ? f.model : 'unknown',
    inputTokens: count(f.inputTokens),
    cacheReadTokens: count(f.cacheReadTokens),
    cacheWriteTokens: count(f.cacheWriteTokens),
    outputTokens: count(f.outputTokens),
    costUsd: Math.round(count(f.costUsd) * 1e7) / 1e7,
    ms: Math.round(count(f.ms)),
    sources: f.sources.filter((id) => ID.test(id)),
    droppedSources: count(f.droppedSources),
    // A chat line's count of dropped pills (spec 045); prep's line keeps its fields (spec 024).
    ...(f.event === 'chat.prep' ? {} : { pillsDropped: count(f.pillsDropped ?? 0) }),
  })
}

/**
 * The pulse's line, one per refresh of the App Store's numbers (spec 041,
 * D240; spec 044, D247): the source, how it went and how long it took.
 * Never a visitor's, and never the numbers.
 */
export function pulseLineOf(_source: 'appstore', state: 'refreshed' | 'failed', ms: number): string {
  return JSON.stringify({
    severity: state === 'failed' ? 'WARNING' : 'INFO',
    event: 'pulse.refresh',
    source: 'appstore',
    state: state === 'failed' ? 'failed' : 'refreshed',
    ms: Math.round(count(ms)),
  })
}

export function writeToStdout(line: string): void {
  console.log(line)
}
