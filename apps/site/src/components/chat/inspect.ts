import type { Meta } from './types.ts'

// What Inspect shows (A6), worked out in the browser from the reply's numbers
// (D191). The prices are spec 021's, in US dollars per million tokens at list
// price; tests/022 checks they match the API's own table, which can't be
// imported here because its module also holds the server's code.

export const PRICES: Record<string, { input: number; cacheWrite: number; cacheRead: number; output: number }> = {
  'claude-haiku-5-5': { input: 0.1, cacheWrite: 0.2, cacheRead: 0.01, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, cacheWrite: 4, cacheRead: 0.1, output: 10 },
}

/** The answer's cost in US dollars, or undefined for a model with no price. */
export function costOf(meta: Omit<Meta, 'state'>): number | undefined {
  const price = PRICES[meta.model]
  if (price === undefined) return undefined
  return (
    (meta.inputTokens * price.input +
      meta.cacheWriteTokens * price.cacheWrite +
      meta.cacheReadTokens * price.cacheRead +
      meta.outputTokens * price.output) /
    1_000_000
  )
}

/** A cost as Inspect writes it: four places under a cent, so a small answer doesn't read as free. */
export function dollarsOf(usd: number): string {
  return `$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(3)}`
}

/** The time taken, as seconds to one place. */
export function secondsOf(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`
}
