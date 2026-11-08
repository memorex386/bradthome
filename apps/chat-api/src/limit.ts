import { createHmac, randomBytes } from 'node:crypto'
import { QUESTIONS_PER_DAY } from './constants.ts'

// The visitor's daily limit (FR-005, D173). A visitor is counted by an HMAC
// of their address under a random salt that changes each UTC day. The salt,
// the codes and the counts live in this instance's memory only, and the
// address is never kept (D175).

export type Take = { ok: true } | { ok: false; resetsAt: string }

export interface Limiter {
  /** Whether the visitor has a question left today, without using one. */
  check(address: string): Take
  /** Uses one of the visitor's questions, or refuses. */
  take(address: string): Take
  /** Returns a question taken for a request that was then refused. */
  giveBack(address: string): void
  /** The state, for tests: the UTC day and each code with its count. */
  snapshot(): { day: string; entries: [string, number][] }
}

export const utcDay = (date: Date) => date.toISOString().slice(0, 10)
export const nextUtcMidnight = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)).toISOString()

export function createLimiter(options: { perDay?: number; now?: () => Date } = {}): Limiter {
  const perDay = options.perDay ?? QUESTIONS_PER_DAY
  const now = options.now ?? (() => new Date())
  let day = ''
  let salt = randomBytes(32)
  const counts = new Map<string, number>()

  const roll = (date: Date) => {
    const today = utcDay(date)
    if (today !== day) {
      day = today
      salt = randomBytes(32)
      counts.clear()
    }
  }
  const codeOf = (address: string) => createHmac('sha256', salt).update(address).digest('hex')

  const check = (address: string): Take => {
    const date = now()
    roll(date)
    return (counts.get(codeOf(address)) ?? 0) < perDay ? { ok: true } : { ok: false, resetsAt: nextUtcMidnight(date) }
  }

  return {
    check,
    take(address) {
      const result = check(address)
      if (result.ok) {
        const code = codeOf(address)
        counts.set(code, (counts.get(code) ?? 0) + 1)
      }
      return result
    },
    giveBack(address) {
      roll(now())
      const code = codeOf(address)
      const count = counts.get(code) ?? 0
      if (count <= 1) counts.delete(code)
      else counts.set(code, count - 1)
    },
    snapshot: () => ({ day, entries: [...counts.entries()] }),
  }
}
