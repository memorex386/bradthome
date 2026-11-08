import { createUIMessageStream, createUIMessageStreamResponse, type LanguageModel, streamText } from 'ai'
import { type Context, Hono } from 'hono'
import { addressOf } from './address.ts'
import { createAltcha, type Work } from './altcha.ts'
import { MAX_BODY_BYTES, MAX_OUTPUT_TOKENS, MODEL_TIMEOUT_MS } from './constants.ts'
import { type Corpus, parseCorpus } from './corpus.ts'
import { createLimiter } from './limit.ts'
import { type LogFields, lineOf, type State, writeToStdout } from './log.ts'
import { isAllowedOrigin } from './origin.ts'
import { promptOf, stateOf } from './prompt.ts'
import { parseChatRequest } from './request.ts'
import { assertPriced, checkSpend, costOf, dayKey, monthKey, type SpendStore } from './spend.ts'

// The chat API (spec 021). A question passes, in order: the origin (FR-001),
// the body (FR-003), ALTCHA (FR-004), the visitor's limit (FR-005) and the
// spend totals (FR-006), then the model streams an answer with checked
// sources (FR-007). Each question writes one numbers-only log line (FR-009).

export interface AppDeps {
  model: LanguageModel
  /** The model's ID, for pricing and the log. */
  modelId: string
  store: SpendStore
  corpus: Corpus
  altchaKey: string
  /** ALTCHA's work. Tests make it tiny. */
  altchaCost?: Work
  /** Where each log line goes: stdout, for Cloud Logging. */
  write?: (line: string) => void
  /** The connection's address, when there's no X-Forwarded-For. */
  connection?: (c: Context) => string | undefined
}

const MESSAGES: Record<'origin' | 'invalid' | 'altcha' | 'limit' | 'paused-day' | 'paused-month' | 'paused-unknown', string> = {
  origin: 'This chat isn’t available here yet.',
  invalid: 'That question couldn’t be read. Try a shorter one.',
  altcha: 'The check didn’t pass. Try again.',
  limit: 'That’s today’s 20 questions.',
  'paused-day': 'The chat is resting until tomorrow.',
  'paused-month': 'The chat is resting until next month.',
  'paused-unknown': 'The chat is resting for now.',
}

const ZERO = { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, costUsd: 0, sources: [], droppedSources: 0 }

export function createApp(deps: AppDeps): Hono {
  assertPriced(deps.modelId)
  const corpus = parseCorpus(deps.corpus)
  const byId = new Map(corpus.sources.map((source) => [source.id, source]))
  const altcha = createAltcha(deps.altchaKey, deps.altchaCost)
  const limiter = createLimiter()
  const write = deps.write ?? writeToStdout
  const log = (fields: Omit<LogFields, 'model'>) => write(lineOf({ ...fields, model: deps.modelId }))

  const cors = (origin: string) => ({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin' })

  const app = new Hono()

  app.get('/health', (c) => c.body(null, 200))

  app.options('/chat', (c) => {
    const origin = c.req.header('origin')
    if (!isAllowedOrigin(origin)) return c.body(null, 403)
    return c.body(null, 204, {
      ...cors(origin),
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    })
  })

  app.get('/challenge', async (c) => {
    const origin = c.req.header('origin')
    if (!isAllowedOrigin(origin)) return c.json({ state: 'origin', message: MESSAGES.origin }, 403)
    return c.json(await altcha.challenge(), 200, { ...cors(origin), 'Cache-Control': 'no-store' })
  })

  app.post('/chat', async (c) => {
    const started = performance.now()
    const ms = () => performance.now() - started
    const origin = c.req.header('origin')
    const refuse = (
      state: State,
      status: 400 | 403 | 413 | 429 | 503,
      body: Record<string, string>,
      headers: Record<string, string> = {},
    ) => {
      log({ ...ZERO, state, ms: ms() })
      return c.json(body, status, headers)
    }

    if (!isAllowedOrigin(origin)) return refuse('origin', 403, { state: 'origin', message: MESSAGES.origin })
    const headers = cors(origin)

    const parsed = await readBody(c)
    if (parsed === undefined) return refuse('invalid', 400, { state: 'invalid', message: MESSAGES.invalid }, headers)
    const request = parseChatRequest(parsed)
    if (!request.ok) return refuse('invalid', 400, { state: 'invalid', message: MESSAGES.invalid }, headers)

    if (!(await altcha.verify(request.altcha))) return refuse('altcha', 403, { state: 'altcha', message: MESSAGES.altcha }, headers)

    const address = addressOf(c.req.header('x-forwarded-for'), deps.connection?.(c))
    // Taken before the spend check's await, so questions in flight together
    // can't pass the limit (S4.1). A paused refusal gives it back (S5.1).
    const allowed = limiter.take(address)
    if (!allowed.ok) return refuse('limit', 429, { state: 'limit', message: MESSAGES.limit, resetsAt: allowed.resetsAt }, headers)

    const now = new Date()
    const spend = await checkSpend(deps.store, now)
    if (!spend.ok) {
      limiter.giveBack(address)
      const body: Record<string, string> = { state: 'paused', scope: spend.scope, message: MESSAGES[`paused-${spend.scope}`] }
      if (spend.resetsAt !== undefined) body.resetsAt = spend.resetsAt
      return refuse('paused', 503, body, headers)
    }

    const prompt = promptOf(corpus, request.messages)
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const cited: string[] = []
        let dropped = 0
        let text = ''
        try {
          const result = streamText({
            model: deps.model,
            system: prompt.system,
            messages: prompt.messages,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            maxRetries: 1,
            abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
            // The AI SDK prints a model's error to stderr by default, and a
            // provider's error can quote the prompt. The failure is logged as
            // numbers below instead (FR-009).
            onError: () => {},
          })
          let usage: Parameters<typeof tokensOf>[0] | undefined
          for await (const part of result.fullStream) {
            if (part.type === 'text-start') writer.write({ type: 'text-start', id: part.id })
            else if (part.type === 'text-delta') {
              text += part.text
              writer.write({ type: 'text-delta', id: part.id, delta: part.text })
            } else if (part.type === 'text-end') writer.write({ type: 'text-end', id: part.id })
            else if (part.type === 'source') {
              const id = part.sourceType === 'document' ? part.title : undefined
              if (id !== undefined && byId.has(id)) {
                if (!cited.includes(id)) cited.push(id)
              } else dropped++
            } else if (part.type === 'error') throw new Error('model error')
            else if (part.type === 'finish') usage = part.totalUsage
          }
          if (usage === undefined) throw new Error('no usage')
          for (const id of cited) {
            const source = byId.get(id)
            if (source !== undefined) writer.write({ type: 'source-url', sourceId: id, url: source.url, title: source.label })
          }
          const tokens = tokensOf(usage)
          const costUsd = costOf(deps.modelId, tokens)
          const state = stateOf(text, cited)
          writer.write({
            type: 'data-meta',
            data: {
              state,
              model: deps.modelId,
              inputTokens: tokens.noCache,
              cacheReadTokens: tokens.cacheRead,
              cacheWriteTokens: tokens.cacheWrite,
              outputTokens: tokens.output,
              ms: Math.round(ms()),
            },
          })
          try {
            await deps.store.add(dayKey(now), monthKey(now), costUsd)
          } catch {
            // The totals missed one answer. The next read still sees the rest,
            // and Anthropic's workspace limit sits behind them (D169).
          }
          log({
            state,
            inputTokens: tokens.noCache,
            cacheReadTokens: tokens.cacheRead,
            cacheWriteTokens: tokens.cacheWrite,
            outputTokens: tokens.output,
            costUsd,
            ms: ms(),
            sources: cited,
            droppedSources: dropped,
          })
        } catch {
          writer.write({ type: 'error', errorText: 'failed' })
          log({ ...ZERO, state: 'failed', ms: ms(), droppedSources: dropped })
        }
      },
      onError: () => 'failed',
    })
    return createUIMessageStreamResponse({ stream, headers })
  })

  app.notFound((c) => c.body(null, 404))
  app.onError((_error, c) => c.body(null, 500))
  return app
}

function tokensOf(usage: {
  inputTokenDetails: { noCacheTokens?: number; cacheReadTokens?: number; cacheWriteTokens?: number }
  outputTokens?: number
}) {
  return {
    noCache: usage.inputTokenDetails.noCacheTokens ?? 0,
    cacheRead: usage.inputTokenDetails.cacheReadTokens ?? 0,
    cacheWrite: usage.inputTokenDetails.cacheWriteTokens ?? 0,
    output: usage.outputTokens ?? 0,
  }
}

/** The body as JSON, or undefined when it's too large or not JSON. */
async function readBody(c: Context): Promise<unknown> {
  const declared = Number(c.req.header('content-length') ?? '0')
  if (declared > MAX_BODY_BYTES) return undefined
  const text = await c.req.text()
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}
