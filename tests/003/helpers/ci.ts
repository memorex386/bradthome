import { readFileSync } from 'node:fs'
import path from 'node:path'
import { SPEC_DIR } from './paths.ts'

// The checks C0 shows, in its order (S2.1). The gate expects every ci job but
// itself; locked-tests / lock and the preview's three jobs sit outside it (D97).

/** Spec 003's new ci jobs. */
export const NEW_JOBS = ['lint', 'format', 'site-types', 'build', 'e2e', 'lighthouse', 'html', 'links'] as const

/** Every check the gate expects, in C0's order. */
export const GATE_JOBS = [
  ...NEW_JOBS,
  'types',
  'tests (ubuntu-24.04)',
  'tests (windows-2025)',
  'trace',
  'privacy',
  'secrets',
  'commits',
  'hygiene',
] as const

/** C0's header count and its checks, read from the mocks, as GitHub names them. */
export function c0Mock(): { count: number; checks: string[] } {
  const mocks = readFileSync(path.join(SPEC_DIR, 'mocks', 'README.md'), 'utf8')
  const block = /### C0[^\n]*\n+```text\n([\s\S]*?)```/.exec(mocks)?.[1] ?? ''
  const [header = '', ...rest] = block.split('\n')
  return {
    count: Number(/(\d+) successful checks/.exec(header)?.[1] ?? 'NaN'),
    checks: rest
      .join(' · ')
      .split('·')
      .map((name) => name.trim())
      .filter((name) => name !== ''),
  }
}
