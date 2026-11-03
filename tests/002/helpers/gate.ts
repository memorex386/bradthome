import { pathToFileURL } from 'node:url'
import { CI } from './paths.ts'

// The gate's logic, loaded by path so the type check passes before the build
// adds scripts/ci/gate.ts. The build exports exactly this shape, and runs its
// command line only when gate.ts is the entry point, so importing it prints
// nothing.

/** One job's conclusion, as GitHub reports it: success, failure, cancelled or skipped. */
export interface JobResult {
  /** The check's name, such as privacy or tests (windows-2025). */
  name: string
  result: string
}

export interface GateVerdict {
  passed: boolean
  /** What the gate prints: the K0 line, or the K1 block. */
  lines: string[]
}

export interface GateModule {
  /** Every check the gate needs, in the order K1 lists them. The gate itself isn't one. */
  EXPECTED_JOBS: readonly string[]
  gateVerdict(results: readonly JobResult[]): GateVerdict
}

export async function loadGate(): Promise<GateModule> {
  const url: string = pathToFileURL(CI.gate).href
  return (await import(url)) as GateModule
}

/** Spec 002's eight checks, which the mocks show before the gate, in their order (K0, K1). Later specs add theirs around them (D95). */
export const CI_JOBS = [
  'types',
  'tests (ubuntu-24.04)',
  'tests (windows-2025)',
  'trace',
  'privacy',
  'secrets',
  'commits',
  'hygiene',
] as const

/** Recorded results for the given jobs, such as the gate's EXPECTED_JOBS, with every job passing apart from the ones given. */
export function recorded(jobs: readonly string[], changes: Partial<Record<string, string>> = {}): JobResult[] {
  return jobs.map((name) => ({ name, result: changes[name] ?? 'success' }))
}
