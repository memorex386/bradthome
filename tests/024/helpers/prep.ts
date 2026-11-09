import type { PrepOutput } from '../../../apps/chat-api/src/prep.ts'
import { type Harness, NEXT, solved } from '../../021/helpers/fakes.ts'

// Spec 024's helpers for the API: a model answer in prep's JSON shape, split
// into chunks as a stream would send it, and a POST to /prep.

export const ANSWER: PrepOutput = {
  kind: 'posting',
  role: 'Senior Engineer, Partner Launches',
  requirements: ['Launch partner flows end to end', 'Ship features turned off first', 'Go and Kubernetes'],
  matches: [
    { requirement: 'Launch partner flows end to end', sources: ['hopper-disruption-assistance-1'] },
    { requirement: 'Ship features turned off first', sources: ['essay-dark-launch'] },
  ],
  questions: ['How did the purchase flow launch go?', 'How does a feature get turned on?'],
}

/** The answer's JSON, cut into chunks of about 40 characters. */
export function chunksOf(output: unknown): string[] {
  const json = JSON.stringify(output)
  const chunks: string[] = []
  for (let i = 0; i < json.length; i += 40) chunks.push(json.slice(i, i + 40))
  return chunks
}

/** A posting with a marker in it, which no log line may hold (S6.1). */
export const CANARY = 'zebra-canary-7Q4 posting text that must never be logged'
export const POSTING = `Senior Engineer, Partner Launches. ${CANARY}. You will launch partner flows, ship features dark, and run Go on Kubernetes.`

export interface Prep {
  origin?: string | null
  address?: string
  altcha?: string | null
  posting?: string
  body?: string
}

/** POSTs /prep as the window would. */
export async function prep(h: Harness, options: Prep = {}): Promise<Response> {
  const origin = options.origin === undefined ? NEXT : options.origin
  const altcha = options.altcha === undefined ? await solved(h.app) : options.altcha
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-forwarded-for': options.address ?? '203.0.113.9' }
  if (origin !== null) headers.origin = origin
  const body = options.body ?? JSON.stringify({ ...(altcha === null ? {} : { altcha }), posting: options.posting ?? POSTING })
  return h.app.request('/prep', { method: 'POST', headers, body })
}
