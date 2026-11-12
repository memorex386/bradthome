import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parseResults } from '../../../apps/evals/src/results.ts'
import { fingerprintOf } from '../../../scripts/lib/fingerprint.ts'

// Spec 035's eval run (S2.3): the essay and the framing check changed, so a
// fresh run on this code must pass (D194, D200, D221), and its framing case
// must not bring back the old framing.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')
const fingerprint = () => fingerprintOf((file) => (existsSync(path.join(ROOT, file)) ? read(file) : undefined))

/** The fingerprint's parts before this spec: slice 5.9's passing run on main at 9adafd8 (43150483510). */
const BEFORE = {
  prompt: '4ec2af92b9ee2109485cbb6e7372b92becf73578f2ef0305e4110793d4db0022',
  model: 'f74ff86f9dda33e35645bee96d33dd2a11a439478e5e997a64f08d52c355e240',
  judge: '3d38d166d410d6399797c128e18db84c1dafc3b75bafa9e3b1e02993488adc5f',
  checks: 'd06273984a640184488fba220470fc0326e67c99862c1cbc0d1b1f35e903b482',
  cases: 'da144556ab8afebd59d0e7a6a255790a83bff92587eb79028dc9b7a14cc739b7',
} as const

describe("spec 035's eval run", () => {
  test('S2.3 FR-004 SC-002 the committed run passed on this code, and only the checks changed', () => {
    const results = parseResults(JSON.parse(read('apps/evals/results.json')) as unknown)
    const code = fingerprint()
    const { checks, ...unchanged } = code?.parts ?? BEFORE
    const { checks: checksBefore, ...unchangedBefore } = BEFORE
    expect(unchanged).toEqual(unchangedBefore)
    expect(checks).not.toBe(checksBefore)
    expect(results.fingerprint).toEqual(code)
    expect(results.passed).toBe(true)
  })

  test('S2.3 FR-002 the framing case’s answer reads neither old phrase', () => {
    const results = parseResults(JSON.parse(read('apps/evals/results.json')) as unknown)
    const framing = results.cases.find((item) => item.id === 'never-framing')
    expect(framing?.pass).toBe(true)
    expect(framing?.answer).not.toMatch(/one[-‑]person|whole engineering team/i)
  })
})
