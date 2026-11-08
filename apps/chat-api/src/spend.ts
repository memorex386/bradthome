import { DAY_LIMIT_USD, MONTH_LIMIT_USD } from './constants.ts'
import { nextUtcMidnight, utcDay } from './limit.ts'

// What each answer costs, and the day's and month's totals that switch the
// chat off (FR-006, D169, D182).

/** US dollars per million tokens, at list price. The cache writes are the 1-hour kind (FR-012). */
export const PRICES: Record<string, { input: number; cacheWrite: number; cacheRead: number; output: number }> = {
  'claude-haiku-5-5': { input: 0.1, cacheWrite: 0.2, cacheRead: 0.01, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, cacheWrite: 4, cacheRead: 0.1, output: 10 },
}

export interface TokenCounts {
  noCache: number
  cacheWrite: number
  cacheRead: number
  output: number
}

/** Throws for a model with no price, so the API never runs unmetered. */
export function assertPriced(model: string): void {
  if (PRICES[model] === undefined) throw new Error(`The model ${model} has no price in PRICES, so the chat can't measure its cost.`)
}

export function costOf(model: string, tokens: TokenCounts): number {
  const price = PRICES[model]
  if (price === undefined) throw new Error(`The model ${model} has no price.`)
  return (
    (tokens.noCache * price.input +
      tokens.cacheWrite * price.cacheWrite +
      tokens.cacheRead * price.cacheRead +
      tokens.output * price.output) /
    1_000_000
  )
}

export const dayKey = (date: Date) => `day-${utcDay(date)}`
export const monthKey = (date: Date) => `month-${utcDay(date).slice(0, 7)}`
const nextMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString()

/** The shared totals, in Firestore in production (firestore.ts). */
export interface SpendStore {
  totals(day: string, month: string): Promise<{ day: number; month: number }>
  add(day: string, month: string, usd: number): Promise<void>
}

export type SpendCheck = { ok: true } | { ok: false; scope: 'day' | 'month' | 'unknown'; resetsAt?: string }

/** Whether the chat may answer now. A store that can't be read fails closed. */
export async function checkSpend(store: SpendStore, now: Date): Promise<SpendCheck> {
  let totals: { day: number; month: number }
  try {
    totals = await store.totals(dayKey(now), monthKey(now))
  } catch {
    return { ok: false, scope: 'unknown' }
  }
  if (!(totals.month < MONTH_LIMIT_USD)) return { ok: false, scope: 'month', resetsAt: nextMonth(now) }
  if (!(totals.day < DAY_LIMIT_USD)) return { ok: false, scope: 'day', resetsAt: nextUtcMidnight(now) }
  return { ok: true }
}
