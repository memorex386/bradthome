import { CappedMap, createChallenge, randomInt, verifySolution, type Challenge, type Payload } from 'altcha-lib'
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2'
import { CHALLENGE_SECONDS } from './constants.ts'

// The bot check (FR-004, D172, D184). Challenges are signed with the
// chat-altcha-key secret, so either instance can check one the other issued.
// Each solved challenge is kept until it expires, so it's spent once on this
// instance.

export interface Work {
  /** PBKDF2's iterations for one try. */
  cost: number
  /** The highest counter the browser may have to reach. */
  maxCounter: number
}

/** About a second on a phone with ALTCHA's workers. Slice 4.3 measures it. */
export const DEFAULT_WORK: Work = { cost: 100, maxCounter: 10_000 }

export interface Altcha {
  challenge(): Promise<Challenge>
  verify(payload: string): Promise<boolean>
}

export function createAltcha(key: string, work: Work = DEFAULT_WORK): Altcha {
  if (key.length < 16) throw new Error('The ALTCHA key is missing or too short.')
  const used = new CappedMap<string, number>({ maxSize: 10_000 })

  return {
    challenge: () =>
      createChallenge({
        algorithm: 'PBKDF2/SHA-256',
        cost: work.cost,
        counter: randomInt(Math.ceil(work.maxCounter / 2), work.maxCounter),
        deriveKey,
        expiresAt: Math.floor(Date.now() / 1000) + CHALLENGE_SECONDS,
        hmacSignatureSecret: key,
      }),

    async verify(encoded) {
      let payload: Payload
      try {
        payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as Payload
      } catch {
        return false
      }
      const signature = payload?.challenge?.signature
      if (typeof signature !== 'string' || payload.solution === undefined) return false
      const nowSeconds = Date.now() / 1000
      for (const [seen, expires] of used) if (expires < nowSeconds) used.delete(seen)
      if (used.has(signature)) return false
      try {
        const result = await verifySolution({
          challenge: payload.challenge,
          solution: payload.solution,
          deriveKey,
          hmacSignatureSecret: key,
        })
        if (!result.verified) return false
      } catch {
        return false
      }
      used.set(signature, payload.challenge.parameters.expiresAt ?? nowSeconds + CHALLENGE_SECONDS)
      return true
    },
  }
}
