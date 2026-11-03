import { existsSync, readFileSync } from 'node:fs'
import { lycheeBroken } from './site-report.ts'

// The nightly report (FR-020, S5.1, S5.2, N1): the external links lychee
// found broken and StrykerJS's mutation score on the safety scripts, for the
// run's summary. Neither is a gate until there's a baseline (D94).
//
//   node scripts/ci/nightly-summary.ts links <lychee's JSON report>
//   node scripts/ci/nightly-summary.ts mutation <Stryker's JSON report>

export interface NightlyLinks {
  total: number
  broken: readonly { page: string; url: string; reason: string }[]
}

const TAIL = "  Reported in the run's summary. Not a gate until there's a baseline (D94)."
const DETECTED = new Set(['Killed', 'Timeout'])
const UNDETECTED = new Set(['Survived', 'NoCoverage'])

/** Stryker's mutation score from its JSON report, from 0 to 100: detected over valid mutants. */
export function mutationScore(report: unknown): number {
  const files = (report as { files?: unknown } | null | undefined)?.files
  if (files === null || typeof files !== 'object') throw new Error("Stryker's report has no files")
  let detected = 0
  let valid = 0
  for (const file of Object.values(files as Record<string, { mutants?: { status?: string }[] }>)) {
    for (const mutant of file.mutants ?? []) {
      if (DETECTED.has(mutant.status ?? '')) detected += 1
      if (DETECTED.has(mutant.status ?? '') || UNDETECTED.has(mutant.status ?? '')) valid += 1
    }
  }
  if (valid === 0) throw new Error("Stryker's report has no valid mutants")
  return (detected / valid) * 100
}

function linksLine(links: NightlyLinks): string {
  return `nightly  external links: ${links.broken.length} broken of ${links.total}`
}

function scoreLine(score: number | undefined): string {
  return `         mutation score (safety scripts): ${score === undefined ? 'not reported, see the mutation job' : `${Math.round(score)}%`}`
}

function brokenLines(links: NightlyLinks): string[] {
  return links.broken.map((link) => `           ${link.url}  ${link.reason}, on ${link.page}`)
}

/** N1's lines, for the run's summary. score is undefined when the mutation job didn't report. */
export function nightlySummary(links: NightlyLinks, score: number | undefined): string[] {
  return [linksLine(links), ...brokenLines(links), scoreLine(score), TAIL]
}

/** lychee's JSON report, as N1 counts it. */
export function nightlyLinks(report: unknown): NightlyLinks {
  const total = Number((report as { total?: unknown } | null | undefined)?.total ?? 0)
  const broken = lycheeBroken(report, '.').map((link) => ({ page: link.file, url: link.link, reason: link.reason }))
  return { total, broken }
}

function block(lines: readonly string[]): string {
  return ['```text', ...lines, '```', ''].join('\n')
}

function main(args: readonly string[]): number {
  const [kind = '', file = ''] = args
  const report: unknown = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined
  if (kind === 'links') {
    if (report === undefined) {
      console.log(block(['nightly  external links: not reported, lychee wrote no report', TAIL]))
      return 1
    }
    const links = nightlyLinks(report)
    console.log(block([linksLine(links), ...brokenLines(links), TAIL]))
    return 0
  }
  if (kind === 'mutation') {
    let score: number | undefined
    try {
      score = mutationScore(report)
    } catch {
      score = undefined
    }
    console.log(block([`nightly${scoreLine(score).slice('nightly'.length)}`, TAIL]))
    return score === undefined ? 1 : 0
  }
  console.log(['✖ nightly  no such report', '  Fix: name links or mutation, then the report file.'].join('\n'))
  return 1
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2))
