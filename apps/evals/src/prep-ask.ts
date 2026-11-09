import { randomBytes } from 'node:crypto'
import type { LanguageModel } from 'ai'
import { createApp } from '../../chat-api/src/app.ts'
import type { Corpus } from '../../chat-api/src/corpus.ts'
import type { PrepAnswer } from '../../chat-api/src/prep-shape.ts'
import { costOf, type SpendStore } from '../../chat-api/src/spend.ts'
import { deriveKey, solveChallenge } from '../../chat-api/src/testing.ts'

// One posting, sent through the chat API's own createApp at /prep (spec 024's
// Story 7), as ask.ts does for questions: the same checks, prompt, schema and
// cost measure visitors get. It also keeps every log line the request wrote,
// so the checks can show the posting reached none of them (S7.2).

const ORIGIN = 'https://bradthome--next-evals.web.app'

export interface PrepAsked {
  answer?: PrepAnswer
  state: PrepAnswer['state'] | 'failed'
  costUsd: number
  ms: number
  tokens: { input: number; cacheRead: number; cacheWrite: number; output: number }
  /** Every log line the request wrote. */
  lines: string[]
}

const MEMORY: SpendStore = { totals: async () => ({ day: 0, month: 0 }), add: async () => {} }
const ZERO = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }

export function createPrepAsker(options: {
  model: LanguageModel
  modelId: string
  corpus: Corpus
}): (posting: string) => Promise<PrepAsked> {
  let lines: string[] = []
  const app = createApp({
    model: options.model,
    modelId: options.modelId,
    store: MEMORY,
    corpus: options.corpus,
    altchaKey: randomBytes(32).toString('hex'),
    altchaCost: { cost: 1, maxCounter: 20 },
    write: (line) => lines.push(line),
  })
  let visitor = 0

  return async (posting) => {
    visitor++
    lines = []
    const response = await app.request('/challenge', { headers: { origin: ORIGIN } })
    const challenge = (await response.json()) as Parameters<typeof solveChallenge>[0]['challenge']
    const solution = await solveChallenge({ challenge, deriveKey })
    if (solution === null) throw new Error('no ALTCHA solution')
    const altcha = Buffer.from(JSON.stringify({ challenge, solution })).toString('base64')
    const started = performance.now()
    let body = ''
    try {
      const reply = await app.request('/prep', {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': `198.51.200.${visitor % 250}` },
        body: JSON.stringify({ altcha, posting }),
      })
      body = reply.status === 200 ? await reply.text() : ''
    } catch {
      body = ''
    }
    const ms = performance.now() - started
    return { ...readPrepStream(body, options.modelId), ms, lines: [...lines] }
  }
}

/** The answer, its state and its cost from prep's stream, or failed. */
export function readPrepStream(body: string, modelId: string): Omit<PrepAsked, 'ms' | 'lines'> {
  const failed = { state: 'failed' as const, costUsd: 0, tokens: ZERO }
  let answer: PrepAnswer | undefined
  let meta: { inputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; outputTokens: number } | undefined
  for (const line of body.split('\n')) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice('data: '.length).trim()
    if (data === '[DONE]') continue
    let part: { type?: string; data?: unknown }
    try {
      part = JSON.parse(data) as typeof part
    } catch {
      return failed
    }
    if (part.type === 'error') return failed
    if (part.type === 'data-prep') answer = part.data as PrepAnswer
    else if (part.type === 'data-meta') meta = part.data as typeof meta
  }
  if (answer === undefined || meta === undefined) return failed
  const tokens = { input: meta.inputTokens, cacheRead: meta.cacheReadTokens, cacheWrite: meta.cacheWriteTokens, output: meta.outputTokens }
  const costUsd = costOf(modelId, {
    noCache: tokens.input,
    cacheRead: tokens.cacheRead,
    cacheWrite: tokens.cacheWrite,
    output: tokens.output,
  })
  return { answer, state: answer.state, costUsd, tokens }
}
