import { solveChallenge, type Challenge } from 'altcha-lib'
import { deriveKey } from 'altcha-lib/algorithms/web/pbkdf2'

// ALTCHA's proof of work, solved in the browser before each question (D172).
// The API's challenge is PBKDF2 at a low cost, so WebCrypto solves it on the
// page in about a second without workers, and the CSP needs nothing new.

/** How long a solve may take before the check fails, in milliseconds. */
export const SOLVE_TIMEOUT_MS = 30_000

/** The payload the API checks, base64 JSON of the challenge and its solution, or undefined when it couldn't be solved. */
export async function solve(challenge: Challenge, signal?: AbortSignal): Promise<string | undefined> {
  const controller = new AbortController()
  signal?.addEventListener('abort', () => controller.abort(), { once: true })
  const solution = await solveChallenge({ challenge, deriveKey, controller, timeout: SOLVE_TIMEOUT_MS })
  if (solution === null) return undefined
  const { codeChallenge: _, ...rest } = challenge
  return btoa(JSON.stringify({ challenge: rest, solution }))
}
