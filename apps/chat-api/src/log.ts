// The one log line per question (FR-009, D175): numbers and source IDs only,
// as JSON, which Cloud Logging reads from stdout. Each field is copied by
// name, so nothing else a caller passes can reach the log. This is the only
// file in the API that writes to stdout.

export type State =
  'answered' | 'no-source' | 'boundary' | 'failed' | 'origin' | 'invalid' | 'altcha' | 'limit' | 'paused' | 'no-fit' | 'not-a-posting'

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
  })
}

export function writeToStdout(line: string): void {
  console.log(line)
}
