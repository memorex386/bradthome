import { createHmac, randomBytes } from 'node:crypto'
import { QUESTIONS_PER_DAY } from './constants.ts'

// The visitor's daily limit (FR-005, D173). A visitor is counted by an HMAC
// of their address under a random salt that changes each UTC day. The salt,
// the codes and the counts live in this instance's memory only, and the
// address is never kept (D175).

/** A refusal for a request that needs several questions says how many are left (spec 024's S5.3). */
export type Take = { ok: true } | { ok: false; resetsAt: string; left?: number }

export interface Limiter {
  /** Whether the visitor has a question left today, without using one. */
  check(address: string): Take
  /** Uses the visitor's questions, one unless prep asks for 3, or refuses and takes none. */
  take(address: string, count?: number): Take
  /** Returns the questions taken for a request that was then refused. */
  giveBack(address: string, count?: number): void
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

  const checkFor = (address: string, count: number): Take => {
    const date = now()
    roll(date)
    const used = counts.get(codeOf(address)) ?? 0
    return used + count <= perDay
      ? { ok: true }
      : { ok: false, resetsAt: nextUtcMidnight(date), ...(count > 1 && { left: Math.max(0, perDay - used) }) }
  }

  return {
    check: (address) => checkFor(address, 1),
    take(address, count = 1) {
      const result = checkFor(address, count)
      if (result.ok) {
        const code = codeOf(address)
        counts.set(code, (counts.get(code) ?? 0) + count)
      }
      return result
    },
    giveBack(address, count = 1) {
      roll(now())
      const code = codeOf(address)
      const used = counts.get(code) ?? 0
      if (used <= count) counts.delete(code)
      else counts.set(code, used - count)
    },
    snapshot: () => ({ day, entries: [...counts.entries()] }),
  }
}
