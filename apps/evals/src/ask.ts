import { randomBytes } from 'node:crypto'
import type { LanguageModel } from 'ai'
import { createApp } from '../../chat-api/src/app.ts'
import type { Corpus } from '../../chat-api/src/corpus.ts'
import { costOf, type SpendStore } from '../../chat-api/src/spend.ts'
import { deriveKey, solveChallenge } from '../../chat-api/src/testing.ts'
import type { Answer } from './checks.ts'
import type { Turn } from './cases.ts'

// One question, asked through the chat API's own createApp (spec 023's
// FR-001): the same origin check, body, ALTCHA, prompt, source checks and
// cost measure visitors get. Only the model's credentials, a spend store in
// memory and a trivial ALTCHA cost differ. Each case asks from its own
// address, so the visitor limit never stops a run.

/** An origin the API allows: a next-channel address (D183). */
const ORIGIN = 'https://bradthome--next-evals.web.app'

export interface Asked extends Answer {
  tokens: { input: number; cacheRead: number; cacheWrite: number; output: number }
}

export interface AskerOptions {
  model: LanguageModel
  modelId: string
  corpus: Corpus
}

/** A spend store that never pauses the chat. */
const MEMORY: SpendStore = {
  totals: async () => ({ day: 0, month: 0 }),
  add: async () => {},
}

const ZERO_TOKENS = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }

export function createAsker(options: AskerOptions): (turns: readonly Turn[], question: string) => Promise<Asked> {
  const app = createApp({
    model: options.model,
    modelId: options.modelId,
    store: MEMORY,
    corpus: options.corpus,
    altchaKey: randomBytes(32).toString('hex'),
    altchaCost: { cost: 1, maxCounter: 20 },
    write: () => {},
  })
  let visitor = 0

  async function solved(): Promise<string> {
    const response = await app.request('/challenge', { headers: { origin: ORIGIN } })
    const challenge = (await response.json()) as Parameters<typeof solveChallenge>[0]['challenge']
    const solution = await solveChallenge({ challenge, deriveKey })
    if (solution === null) throw new Error('no ALTCHA solution')
    return Buffer.from(JSON.stringify({ challenge, solution })).toString('base64')
  }

  return async (turns, question) => {
    visitor++
    const failed = (ms: number): Asked => ({ text: '', state: 'failed', sources: [], costUsd: 0, ms, tokens: ZERO_TOKENS })
    const messages = [...turns, { role: 'user' as const, text: question }].map((turn, index) => ({
      id: `m${index}`,
      role: turn.role,
      parts: [{ type: 'text', text: turn.text }],
    }))
    const altcha = await solved()
    const started = performance.now()
    let response: Response
    try {
      response = await app.request('/chat', {
        method: 'POST',
        headers: {
          origin: ORIGIN,
          'content-type': 'application/json',
          // The API keys its visitor limit on the rightmost address, so each case is its own visitor.
          'x-forwarded-for': `198.51.${Math.floor(visitor / 250)}.${visitor % 250}`,
        },
        body: JSON.stringify({ altcha, messages }),
      })
    } catch {
      return failed(performance.now() - started)
    }
    if (response.status !== 200 || response.body === null) return failed(performance.now() - started)
    const body = await response.text()
    const ms = performance.now() - started
    return readStream(body, ms, options.modelId) ?? failed(ms)
  }
}

interface Meta {
  state: 'answered' | 'no-source' | 'boundary'
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
}

/** The UI message stream's text, sources and numbers, or undefined when it failed. */
export function readStream(body: string, ms: number, modelId: string): Asked | undefined {
  let text = ''
  const sources: string[] = []
  let meta: Meta | undefined
  for (const line of body.split('\n')) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice('data: '.length).trim()
    if (data === '[DONE]') continue
    let part: { type?: string; delta?: string; sourceId?: string; data?: Meta }
    try {
      part = JSON.parse(data) as typeof part
    } catch {
      return undefined
    }
    if (part.type === 'error') return undefined
    if (part.type === 'text-delta' && typeof part.delta === 'string') text += part.delta
    else if (part.type === 'source-url' && typeof part.sourceId === 'string') sources.push(part.sourceId)
    else if (part.type === 'data-meta' && part.data !== undefined) meta = part.data
  }
  if (meta === undefined) return undefined
  const tokens = {
    input: meta.inputTokens,
    cacheRead: meta.cacheReadTokens,
    cacheWrite: meta.cacheWriteTokens,
    output: meta.outputTokens,
  }
  const costUsd = costOf(modelId, {
    noCache: tokens.input,
    cacheRead: tokens.cacheRead,
    cacheWrite: tokens.cacheWrite,
    output: tokens.output,
  })
  return { text, state: meta.state, sources, costUsd, ms, tokens }
}
