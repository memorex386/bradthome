import { deriveKey, MockLanguageModelV4, simulateReadableStream, solveChallenge } from '../../../apps/chat-api/src/testing.ts'
import { createApp } from '../../../apps/chat-api/src/app.ts'
import type { Corpus } from '../../../apps/chat-api/src/corpus.ts'
import type { SpendStore } from '../../../apps/chat-api/src/spend.ts'

// Spec 021's fakes: a small corpus, a model that streams what a test scripts,
// a spend store in memory, and a solver for the API's own ALTCHA challenges.
// Nothing here reaches the network.

export const NEXT = 'https://bradthome--next-abc123.web.app'
export const PREVIEW = 'https://bradthome--pr-12-k3j4h5g6.web.app'
export const ALTCHA_KEY = 'test-altcha-key-not-a-secret'
export const NOW = new Date('2026-11-08T15:30:00Z')

export const CORPUS: Corpus = {
  version: 1,
  name: 'Brad Thome',
  about: 'Brad Thome builds Android, iOS and web products end to end.',
  site: 'https://bradthome.com',
  contact: 'brad@bradthome.com',
  essay: { title: 'An essay', url: 'https://bradthome.com/vindecoded-agents', author: 'Brad Thome' },
  sources: [
    {
      id: 'job-hopper',
      kind: 'job',
      label: 'Résumé · Hopper',
      text: 'Senior Software Engineer at Hopper.',
      url: 'https://bradthome.com/#hopper',
      evidence: [],
    },
    {
      id: 'hopper-disruption-assistance-1',
      kind: 'claim',
      label: 'Résumé · Hopper, Disruption Assistance',
      text: 'Launched a purchase flow as sole engineering owner.',
      url: 'https://bradthome.com/#receipt-hopper-disruption-assistance-1',
      evidence: [],
    },
    {
      id: 'essay-dark-launch',
      kind: 'essay',
      label: 'Essay · New features ship dark',
      text: 'New features ship dark.',
      url: 'https://bradthome.com/vindecoded-agents#new-features-ship-dark',
      evidence: [],
    },
  ],
}

export interface Usage {
  noCache?: number
  cacheRead?: number
  cacheWrite?: number
  output?: number
}

export interface Script {
  /** The answer's text, in chunks. */
  text?: string[]
  /** Corpus IDs (or made-up ones) the model cites, as document sources titled with the ID. */
  cites?: string[]
  usage?: Usage
  /** Throw from the model instead of answering. */
  error?: boolean
}

/** A model that streams one scripted answer per call, and records every call. */
export function fakeModel(script: Script = {}): MockLanguageModelV4 {
  const usage = script.usage ?? { noCache: 200, cacheRead: 11_000, cacheWrite: 0, output: 90 }
  return new MockLanguageModelV4({
    provider: 'anthropic.messages',
    modelId: 'claude-haiku-5-5',
    doStream: async () => {
      if (script.error === true) throw new Error('model failed: secret-marker-in-error')
      const text = script.text ?? ['Brad launched a purchase flow.']
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: 'stream-start', warnings: [] },
            { type: 'text-start', id: 't1' },
            ...text.map((delta) => ({ type: 'text-delta' as const, id: 't1', delta })),
            { type: 'text-end', id: 't1' },
            ...(script.cites ?? []).map((id, index) => ({
              type: 'source' as const,
              sourceType: 'document' as const,
              id: `src-${index}`,
              mediaType: 'text/plain',
              title: id,
            })),
            {
              type: 'finish',
              finishReason: { unified: 'stop', raw: 'end_turn' },
              usage: {
                inputTokens: {
                  total: (usage.noCache ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0),
                  noCache: usage.noCache ?? 0,
                  cacheRead: usage.cacheRead ?? 0,
                  cacheWrite: usage.cacheWrite ?? 0,
                },
                outputTokens: { total: usage.output ?? 0, text: usage.output ?? 0, reasoning: 0 },
              },
            },
          ] as never[],
        }),
      }
    },
  })
}

/** A spend store in memory. `fail` makes every read throw. */
export function fakeStore(initial: { day?: number; month?: number } = {}) {
  const start = { ...initial }
  const docs = new Map<string, { usd: number; answers: number }>()
  const added: { day: string; month: string; usd: number }[] = []
  let fail = false
  let dayKeySeen = ''
  let monthKeySeen = ''
  const store: SpendStore = {
    async totals(day, month) {
      if (fail) throw new Error('store down')
      dayKeySeen = day
      monthKeySeen = month
      return { day: (docs.get(day)?.usd ?? 0) + (start.day ?? 0), month: (docs.get(month)?.usd ?? 0) + (start.month ?? 0) }
    },
    async add(day, month, usd) {
      added.push({ day, month, usd })
      for (const key of [day, month]) {
        const doc = docs.get(key) ?? { usd: 0, answers: 0 }
        docs.set(key, { usd: doc.usd + usd, answers: doc.answers + 1 })
      }
    },
  }
  return {
    store,
    start,
    docs,
    added,
    keys: () => ({ day: dayKeySeen, month: monthKeySeen }),
    breaks: () => {
      fail = true
    },
  }
}

export interface Harness {
  app: ReturnType<typeof createApp>
  model: MockLanguageModelV4
  spend: ReturnType<typeof fakeStore>
  lines: string[]
  clock: { now: Date }
}

export interface HarnessOptions {
  script?: Script
  spend?: { day?: number; month?: number }
  altchaKey?: string
  modelId?: string
}

export function harness(options: HarnessOptions = {}): Harness {
  const model = fakeModel(options.script)
  const spend = fakeStore(options.spend)
  const lines: string[] = []
  const clock = { now: NOW }
  const app = createApp({
    model,
    modelId: options.modelId ?? 'claude-haiku-5-5',
    store: spend.store,
    corpus: CORPUS,
    altchaKey: options.altchaKey ?? ALTCHA_KEY,
    altchaCost: { cost: 1, maxCounter: 20 },
    now: () => clock.now,
    write: (line) => lines.push(line),
  })
  return { app, model, spend, lines, clock }
}

/** Fetches a challenge from the app and solves it, returning ALTCHA's base64 payload. */
export async function solved(app: Harness['app'], origin = NEXT): Promise<string> {
  const response = await app.request('/challenge', { headers: { origin } })
  if (response.status !== 200) throw new Error(`challenge ${response.status}`)
  const challenge = (await response.json()) as Parameters<typeof solveChallenge>[0]['challenge']
  const solution = await solveChallenge({ challenge, deriveKey })
  if (solution === null) throw new Error('no solution')
  return Buffer.from(JSON.stringify({ challenge, solution })).toString('base64')
}

export const question = (text: string, id = 'm1') => ({ id, role: 'user', parts: [{ type: 'text', text }] })
export const reply = (text: string, id = 'a1') => ({ id, role: 'assistant', parts: [{ type: 'text', text }] })

export interface Ask {
  origin?: string | null
  address?: string
  altcha?: string | null
  messages?: unknown[]
  body?: string
}

/** POSTs /chat as a browser on `origin` would, solving a fresh challenge unless `altcha` is given. */
export async function ask(h: Harness, options: Ask = {}): Promise<Response> {
  const origin = options.origin === undefined ? NEXT : options.origin
  const altcha = options.altcha === undefined ? await solved(h.app) : options.altcha
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-forwarded-for': options.address ?? '203.0.113.7' }
  if (origin !== null) headers.origin = origin
  const body =
    options.body ?? JSON.stringify({ ...(altcha === null ? {} : { altcha }), messages: options.messages ?? [question('What did Brad build at Hopper?')] })
  return h.app.request('/chat', { method: 'POST', headers, body })
}

/** The UI message stream's parts, parsed from its server-sent events. */
export async function partsOf(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text()
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]')
    .map((line) => JSON.parse(line.slice('data: '.length)) as Record<string, unknown>)
}

export const logged = (h: Harness) => h.lines.map((line) => JSON.parse(line) as Record<string, unknown>)
