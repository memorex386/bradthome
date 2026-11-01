import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { evaluate, formatReport, reviewCommand } from '../../../scripts/review-eval.ts'
import { FROZEN_CASES_DIR, repoPath, SPEC_DIR } from '../helpers/paths.ts'

// pnpm review:eval's runner, with a fake reviewer that returns canned Claude
// Code results. The runner builds each run's folder, scores the review, and
// writes the E1 report.

interface CaseInfo {
  id: string
  title: string
  file: string
  line: number
  scenario: string
  reason: string
}

const CASE_FOLDERS = readdirSync(FROZEN_CASES_DIR).sort()
const CASES: CaseInfo[] = CASE_FOLDERS.map(
  (folder) => JSON.parse(readFileSync(path.join(FROZEN_CASES_DIR, folder, 'case.json'), 'utf8')) as CaseInfo,
)

function caseInfo(id: string): CaseInfo {
  const found = CASES.find((c) => c.id === id)
  if (found === undefined) throw new Error(`no frozen case ${id}`)
  return found
}

/** A headless `claude -p --output-format json` result. */
function claudeResult(text: string, models: readonly string[] = ['claude-opus-5-5']): unknown {
  return {
    type: 'result',
    subtype: 'success',
    is_error: false,
    num_turns: 4,
    result: text,
    session_id: 'review-eval-test',
    modelUsage: Object.fromEntries(
      models.map((model) => [model, { inputTokens: 1200, outputTokens: 300, cacheReadInputTokens: 0, costUSD: 0 }]),
    ),
  }
}

/** What a finding says. It names no ID, so a finding's only ID is the one it's given. */
const FINDING_TEXT = 'This change lets through what the scenario forbids.'

/** A review finding, by default one that names the case's bug. */
function finding(info: CaseInfo, file = info.file, scenario = info.scenario, line = info.line): string {
  return `- ${file}:${line} ${scenario} ${FINDING_TEXT}`
}

function review(...findings: string[]): string {
  return ['## Findings', '', ...findings, '', 'This review is advisory.'].join('\n')
}

/** Which case a run's folder holds, from the file its diff changes. */
function caseIn(workDir: string): CaseInfo {
  const diff = readFileSync(path.join(workDir, 'change.diff'), 'utf8')
  const file = /^\+\+\+ b\/(.+)$/m.exec(diff)?.[1]
  const found = CASES.find((c) => c.file === file)
  if (found === undefined) throw new Error(`no case changes ${file}`)
  return found
}

interface FakeReviewer {
  review(workDir: string): Promise<unknown>
  calls: string[]
  /** Anything the inspection found wrong with a run's folder. */
  problems: string[]
  maxAtOnce(): number
}

/** A reviewer that answers each run with the text `answer` returns. */
function fakeReviewer(
  answer: (info: CaseInfo, run: number) => string,
  models?: readonly string[],
  inspect?: (workDir: string, info: CaseInfo) => void,
): FakeReviewer {
  const calls: string[] = []
  const problems: string[] = []
  const runs = new Map<string, number>()
  let active = 0
  let most = 0
  return {
    calls,
    problems,
    maxAtOnce: () => most,
    async review(workDir) {
      active += 1
      most = Math.max(most, active)
      try {
        const info = caseIn(workDir)
        try {
          inspect?.(workDir, info)
        } catch (error) {
          problems.push(`${info.id}: ${String(error)}`)
        }
        const run = (runs.get(info.id) ?? 0) + 1
        runs.set(info.id, run)
        calls.push(`${info.id}#${run}`)
        await new Promise((resolve) => setTimeout(resolve, 2))
        return claudeResult(answer(info, run), models)
      } finally {
        active -= 1
      }
    },
  }
}

const VERSION = '2.1.316 (Claude Code)'

describe('the frozen cases', () => {
  test('FR-025 SC-004 there are five cases, each a diff with one planted bug drawn from this slice', () => {
    expect(CASES.map((c) => c.id)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5'])
    const spec = readFileSync(path.join(SPEC_DIR, 'spec.md'), 'utf8')
    for (const [index, info] of CASES.entries()) {
      const folder = path.join(FROZEN_CASES_DIR, CASE_FOLDERS[index] ?? '')
      expect(CASE_FOLDERS[index]?.startsWith(`${info.id}-`)).toBe(true)
      expect(info.title.length, info.id).toBeGreaterThan(0)
      expect(info.reason.length, info.id).toBeGreaterThan(0)
      expect(spec.includes(`**${info.scenario}**`), `${info.id} breaks ${info.scenario}`).toBe(true)
      const planted = path.join(folder, 'files', info.file)
      expect(existsSync(planted), `${info.id} holds ${info.file}`).toBe(true)
      const lines = readFileSync(planted, 'utf8').split('\n')
      expect(info.line, info.id).toBeGreaterThan(0)
      expect(info.line, info.id).toBeLessThanOrEqual(lines.length)
      const diff = readFileSync(path.join(folder, 'change.diff'), 'utf8')
      expect(diff).toContain(`+++ b/${info.file}`)
      expect(diff.match(/^diff --git /gm), `${info.id} changes one file`).toHaveLength(1)
    }
  })
})

describe('E1: the frozen-case report', () => {
  test('E1 S6.2 FR-025 SC-004 runs each case three times and reports each score, the pass rate and the target', async () => {
    const reviewer = fakeReviewer((info, run) => (info.id === 'F3' && run === 3 ? review() : review(finding(info))))
    const result = await evaluate({ runs: 3, version: VERSION, review: (workDir) => reviewer.review(workDir) })
    expect(reviewer.calls).toHaveLength(15)
    expect(result.found).toBe(14)
    expect(result.total).toBe(15)
    expect(result.targetMet).toBe(true)
    expect(result.cases.map((c) => [c.id, c.found, c.runs])).toEqual([
      ['F1', 3, 3],
      ['F2', 3, 3],
      ['F3', 2, 3],
      ['F4', 3, 3],
      ['F5', 3, 3],
    ])
    const report = formatReport(result).replace(/\n+$/, '').split('\n')
    expect(report).toHaveLength(7)
    expect(report[0]).toBe('Reviewer: claude-opus-5-5 · 5 frozen cases × 3 runs')
    const scores = ['3/3', '3/3', '2/3', '3/3', '3/3']
    for (const [index, info] of CASES.entries()) {
      const escaped = info.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      expect(report[index + 1]).toMatch(new RegExp(`^ {2}${info.id} {2}${escaped} {2,}${scores[index]}$`))
    }
    expect(report[6]).toBe('Overall 14/15 (93%). Every case found at least 2 of 3 times: target met.')
  })

  test('S6.2 FR-025 SC-004 misses the target when a case is found fewer than 2 of 3 times', async () => {
    const reviewer = fakeReviewer((info, run) => (info.id === 'F3' && run > 1 ? review() : review(finding(info))))
    const result = await evaluate({ runs: 3, version: VERSION, review: (workDir) => reviewer.review(workDir) })
    expect(result.found).toBe(13)
    expect(result.targetMet).toBe(false)
    const last = formatReport(result).replace(/\n+$/, '').split('\n').at(-1) ?? ''
    expect(last).toMatch(/^Overall 13\/15 \(\d+%\)\./)
    expect(last).not.toContain('target met')
  })

  test('S6.2 FR-025 SC-004 misses the target under 12 of 15, even when every case is found 2 of 3 times', async () => {
    const reviewer = fakeReviewer((info, run) => (run === 2 ? review() : review(finding(info))))
    const result = await evaluate({ runs: 3, version: VERSION, review: (workDir) => reviewer.review(workDir) })
    expect(result.found).toBe(10)
    expect(result.cases.every((c) => c.found === 2)).toBe(true)
    expect(result.targetMet).toBe(false)
  })

  test('S6.2 FR-025 runs the reviews one at a time', async () => {
    const reviewer = fakeReviewer((info) => review(finding(info)))
    await evaluate({ runs: 3, version: VERSION, review: (workDir) => reviewer.review(workDir) })
    expect(reviewer.maxAtOnce()).toBe(1)
  })

  test('S6.2 FR-025 runs only the cases it is asked for', async () => {
    const reviewer = fakeReviewer((info) => review(finding(info)))
    const result = await evaluate({ runs: 3, cases: ['F2'], version: VERSION, review: (workDir) => reviewer.review(workDir) })
    expect(reviewer.calls).toEqual(['F2#1', 'F2#2', 'F2#3'])
    expect(result.cases.map((c) => c.id)).toEqual(['F2'])
  })

  test("S6.2 FR-025 builds each run's folder from the spec, its mocks, the reviewer and the case, never case.json", async () => {
    const seen: string[] = []
    const reviewer = fakeReviewer(
      (info) => review(finding(info)),
      undefined,
      (workDir, info) => {
        seen.push(info.id)
        const spec = path.join(workDir, 'specs', '001-hooks-and-agent-rules')
        expect(readFileSync(path.join(spec, 'spec.md'), 'utf8')).toBe(readFileSync(path.join(SPEC_DIR, 'spec.md'), 'utf8'))
        expect(readFileSync(path.join(spec, 'mocks', 'README.md'), 'utf8')).toBe(
          readFileSync(path.join(SPEC_DIR, 'mocks', 'README.md'), 'utf8'),
        )
        expect(readFileSync(path.join(workDir, '.claude', 'agents', 'reviewer.md'), 'utf8')).toBe(
          readFileSync(repoPath('.claude', 'agents', 'reviewer.md'), 'utf8'),
        )
        const folder = path.join(FROZEN_CASES_DIR, CASE_FOLDERS[CASES.indexOf(info)] ?? '')
        expect(readFileSync(path.join(workDir, 'change.diff'), 'utf8')).toBe(
          readFileSync(path.join(folder, 'change.diff'), 'utf8'),
        )
        const planted = readFileSync(path.join(folder, 'files', info.file), 'utf8')
        const copies = [path.join(workDir, info.file), path.join(workDir, 'files', info.file)].filter(existsSync)
        expect(copies.map((copy) => readFileSync(copy, 'utf8'))).toContain(planted)
        const everything = readdirSync(workDir, { recursive: true }).map(String)
        expect(everything.some((entry) => path.basename(entry) === 'case.json'), `${info.id} folder`).toBe(false)
      },
    )
    await evaluate({ runs: 1, version: VERSION, review: (workDir) => reviewer.review(workDir) })
    expect(seen).toEqual(['F1', 'F2', 'F3', 'F4', 'F5'])
    expect(reviewer.problems).toEqual([])
  })
})

describe('the real run', () => {
  test("FR-025 SC-004 starts claude headless as the reviewer, on Brad's plan, with no model override", () => {
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH ?? '',
      HOME: 'a-home-for-the-test',
      ANTHROPIC_API_KEY: 'x',
      ANTHROPIC_AUTH_TOKEN: 'x',
      ANTHROPIC_MODEL: 'claude-sonnet-5-5',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-sonnet-5-5',
      CLAUDE_CODE_SUBAGENT_MODEL: 'claude-haiku-5-5',
    }
    const command = reviewCommand(path.join(FROZEN_CASES_DIR, CASE_FOLDERS[0] ?? ''), env)
    const { args } = command
    expect(args.includes('-p') || args.includes('--print'), args.join(' ')).toBe(true)
    for (const [flag, value] of [
      ['--agent', 'reviewer'],
      ['--output-format', 'json'],
      ['--setting-sources', 'project'],
      ['--permission-mode', 'default'],
      ['--permission-prompts', 'none'],
    ] as const) {
      expect(args[args.indexOf(flag) + 1], `${flag} ${value}`).toBe(value)
    }
    for (const flag of ['--no-session-persistence', '--strict-mcp-config', '--disable-slash-commands']) {
      expect(args, flag).toContain(flag)
    }
    expect(args).not.toContain('--model')
    expect(args).not.toContain('--dangerously-skip-permissions')
    const left = Object.keys(command.env).filter(
      (name) =>
        /^ANTHROPIC_(?:API_KEY|AUTH_TOKEN)$/i.test(name) || (/^(?:ANTHROPIC|CLAUDE_CODE)_/i.test(name) && /MODEL/i.test(name)),
    )
    expect(left).toEqual([])
    expect(command.env.PATH).toBe(env.PATH)
    expect(command.env.HOME).toBe(env.HOME)
  })

  test('FR-025 SC-004 evaluating with a fake reviewer leaves the committed evidence alone', async () => {
    const evidence = path.join(SPEC_DIR, 'evidence', 'review-eval.json')
    const before = existsSync(evidence) ? readFileSync(evidence) : undefined
    const reviewer = fakeReviewer((info) => review(finding(info)))
    await evaluate({ runs: 1, version: VERSION, review: (workDir) => reviewer.review(workDir) })
    const after = existsSync(evidence) ? readFileSync(evidence) : undefined
    expect(before === undefined ? after === undefined : after?.equals(before) === true).toBe(true)
  })
})

describe('which runs count', () => {
  test('S6.2 FR-025 counts a run only when Claude Code is 2.1.280 or later', async () => {
    for (const [version, counts] of [
      ['2.1.272 (Claude Code)', false],
      ['2.1.99', false],
      ['2.1.280 (Claude Code)', true],
      ['2.2.0', true],
      ['3.0.1 (Claude Code)', true],
    ] as const) {
      const reviewer = fakeReviewer((info) => review(finding(info)))
      const result = await evaluate({ runs: 1, cases: ['F1'], version, review: (workDir) => reviewer.review(workDir) })
      expect(result.found, version).toBe(counts ? 1 : 0)
      expect(result.cases[0]?.invalid, version).toBe(counts ? 0 : 1)
    }
  })

  test('S6.2 FR-025 counts a run only when claude-opus-5-5 did the work', async () => {
    for (const [models, counts] of [
      [['claude-sonnet-5-5'], false],
      [[], false],
      [['claude-opus-5-5', 'claude-haiku-5-5'], true],
    ] as const) {
      const reviewer = fakeReviewer((info) => review(finding(info)), models)
      const result = await evaluate({ runs: 1, cases: ['F1'], version: VERSION, review: (workDir) => reviewer.review(workDir) })
      expect(result.found, models.join(',')).toBe(counts ? 1 : 0)
      expect(result.cases[0]?.invalid, models.join(',')).toBe(counts ? 0 : 1)
    }
  })

  test('S6.2 FR-025 reports invalid runs', async () => {
    const reviewer = fakeReviewer((info) => review(finding(info)), ['claude-sonnet-5-5'])
    const result = await evaluate({ runs: 3, cases: ['F1'], version: VERSION, review: (workDir) => reviewer.review(workDir) })
    expect(result.cases[0]?.invalid).toBe(3)
    expect(formatReport(result)).toMatch(/invalid/i)
  })
})

describe('S6.3: scoring a review', () => {
  async function foundBy(text: (info: CaseInfo) => string): Promise<number> {
    const reviewer = fakeReviewer((info) => text(info))
    const result = await evaluate({ runs: 1, cases: ['F1'], version: VERSION, review: (workDir) => reviewer.review(workDir) })
    return result.found
  }

  test("S6.3 FR-025 finds the bug only when a finding names the planted file and the scenario it breaks", async () => {
    expect(await foundBy((info) => review(finding(info)))).toBe(1)
    expect(await foundBy((info) => review(finding(info, info.file, 'S1.3')))).toBe(0)
    expect(await foundBy((info) => review(finding(info, 'scripts/lib/addresses.ts')))).toBe(0)
    expect(await foundBy(() => review())).toBe(0)
  })

  test('S6.3 FR-025 compares paths after normalizing them, and records the line without scoring it', async () => {
    expect(await foundBy((info) => review(finding(info, `./${info.file}`)))).toBe(1)
    expect(await foundBy((info) => review(finding(info, info.file.replaceAll('/', '\\'))))).toBe(1)
    expect(await foundBy((info) => review(`- \`${info.file}:${info.line}\` ${info.scenario}: ${FINDING_TEXT}`))).toBe(1)
    expect(await foundBy((info) => review(finding(info, info.file, info.scenario, info.line + 7)))).toBe(1)
  })

  test('S6.3 FR-025 flags a finding without a file, a line or an ID, and a closing approve, merge or ready verdict', async () => {
    const run = async (text: (info: CaseInfo) => string): Promise<string[]> => {
      const reviewer = fakeReviewer(text)
      const result = await evaluate({ runs: 1, cases: ['F1'], version: VERSION, review: (workDir) => reviewer.review(workDir) })
      return result.cases[0]?.flags ?? []
    }
    expect(await run((info) => review(finding(info)))).toEqual([])
    expect((await run((info) => review(finding(info), `- ${info.scenario} The message is hard to read.`))).length).toBeGreaterThan(0)
    expect((await run((info) => review(finding(info), `- ${info.file} has no line or ID.`))).length).toBeGreaterThan(0)
    expect((await run((info) => `${review(finding(info))}\n\nLooks good otherwise. Approved and ready to merge.`)).length).toBeGreaterThan(0)
  })
})
