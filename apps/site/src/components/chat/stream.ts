import type { PrepAnswer, PrepProgress } from '../../../../chat-api/src/prep-shape.ts'
import type { Meta, PrepMeta, Source } from './types.ts'

// Reads the API's answer, an AI SDK UI message stream (spec 021's FR-007):
// server-sent events, each a JSON part, ending with [DONE]. It keeps only the
// parts the window shows, so it needs none of the AI SDK in the browser (D188).

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'source'; source: Source }
  | { type: 'meta'; meta: Meta }
  | { type: 'prep-progress'; progress: PrepProgress }
  | { type: 'prep'; answer: PrepAnswer }
  | { type: 'prep-meta'; meta: PrepMeta }
  | { type: 'error' }

/** The events in one server-sent event's data, or none for a part the window doesn't use. */
export function eventOf(data: string): StreamEvent | undefined {
  if (data === '[DONE]') return undefined
  let part: Record<string, unknown>
  try {
    part = JSON.parse(data) as Record<string, unknown>
  } catch {
    return { type: 'error' }
  }
  if (part === null || typeof part !== 'object') return { type: 'error' }
  switch (part.type) {
    case 'text-delta':
      return typeof part.delta === 'string' ? { type: 'text', delta: part.delta } : undefined
    case 'source-url':
      return typeof part.sourceId === 'string' && typeof part.url === 'string'
        ? {
            type: 'source',
            source: { id: part.sourceId, url: part.url, label: typeof part.title === 'string' ? part.title : part.sourceId },
          }
        : undefined
    case 'data-meta':
      if (isMeta(part.data)) return { type: 'meta', meta: part.data }
      return isPrepMeta(part.data) ? { type: 'prep-meta', meta: part.data } : undefined
    case 'data-prep-progress':
      return isProgress(part.data) ? { type: 'prep-progress', progress: part.data } : undefined
    case 'data-prep':
      return isPrepAnswer(part.data) ? { type: 'prep', answer: part.data } : { type: 'error' }
    case 'error':
      return { type: 'error' }
    default:
      return undefined
  }
}

function numbersOf(value: unknown): value is Omit<Meta, 'state'> & { state: unknown } {
  const meta = value as Partial<Meta> | null
  return (
    meta !== null &&
    typeof meta === 'object' &&
    typeof meta.model === 'string' &&
    [meta.inputTokens, meta.cacheReadTokens, meta.cacheWriteTokens, meta.outputTokens, meta.ms].every((n) => typeof n === 'number')
  )
}

function isMeta(value: unknown): value is Meta {
  return numbersOf(value) && (value.state === 'answered' || value.state === 'no-source' || value.state === 'boundary')
}

function isPrepMeta(value: unknown): value is PrepMeta {
  return numbersOf(value) && (value.state === 'answered' || value.state === 'no-fit' || value.state === 'not-a-posting')
}

function isProgress(value: unknown): value is PrepProgress {
  const progress = value as Partial<PrepProgress> | null
  return (
    progress !== null &&
    typeof progress === 'object' &&
    [progress.requirements, progress.matches, progress.gaps, progress.questions].every((n) => typeof n === 'number')
  )
}

const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string')

/** A checked prep answer, in the API's shape (spec 024's S5.4). */
export function isPrepAnswer(value: unknown): value is PrepAnswer {
  const answer = value as Partial<PrepAnswer> | null
  return (
    answer !== null &&
    typeof answer === 'object' &&
    (answer.state === 'answered' || answer.state === 'no-fit' || answer.state === 'not-a-posting') &&
    (answer.kind === 'posting' || answer.kind === 'role' || answer.kind === 'not-a-posting') &&
    typeof answer.role === 'string' &&
    strings(answer.requirements) &&
    strings(answer.gaps) &&
    strings(answer.questions) &&
    Array.isArray(answer.matches) &&
    answer.matches.every(
      (match) =>
        typeof match?.requirement === 'string' &&
        typeof match.evidence === 'string' &&
        Array.isArray(match.sources) &&
        match.sources.every(
          (source) => typeof source?.id === 'string' && typeof source.url === 'string' && typeof source.label === 'string',
        ),
    )
  )
}

/** The blank line that ends each server-sent event. */
const BLANK_LINE = /\r?\n\r?\n/

/** Each event in a stream of server-sent events, as it arrives. */
export async function* eventsOf(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.pipeThrough(new TextDecoderStream() as TransformStream<Uint8Array, string>).getReader()
  let buffer = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      for (let gap = BLANK_LINE.exec(buffer); gap !== null; gap = BLANK_LINE.exec(buffer)) {
        const block = buffer.slice(0, gap.index)
        buffer = buffer.slice(gap.index + gap[0].length)
        const event = eventOf(dataOf(block))
        if (event !== undefined) yield event
      }
    }
    const rest = dataOf(buffer)
    if (rest !== '') {
      const event = eventOf(rest)
      if (event !== undefined) yield event
    }
  } finally {
    reader.releaseLock()
  }
}

/** The data lines of one server-sent event, joined. */
function dataOf(block: string): string {
  return block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n')
}
