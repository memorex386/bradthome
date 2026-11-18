import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  type Fetcher,
  MERGED_DAYS,
  mergedCountOf,
  pulseOf,
  pulseReportOf,
  REPO_SETTING,
  type Runner,
} from '../../../scripts/previews/refresh-lib.ts'

// Spec 044, Story 1: the PC job counts VINDecoded's merged PRs through the
// PC's own gh, from a setting outside the repo, and refreshes pulse.json with
// counts only (D247). Every command and fetch here is a fake: nothing runs gh
// or reaches GitHub or Apple (FR-008).

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')
const NOW = Date.parse('2026-11-18T15:12:00Z')
// A made-up repo, standing in for the PC's setting.
const REPO = 'example-owner/example-repo'

type Answer = { status: number | null; stdout?: string; stderr?: string }

/** A fake of this PC's commands: the git setting and gh, each answer given, every call kept. */
function runner(options: { setting?: Answer; gh?: Answer } = {}): Runner & { calls: string[][] } {
  const calls: string[][] = []
  const run = ((command: string, args: readonly string[]) => {
    calls.push([command, ...args])
    const answer =
      command === 'git'
        ? (options.setting ?? { status: 0, stdout: `${REPO}\n` })
        : command === 'gh'
          ? (options.gh ?? { status: 0, stdout: '[296,false]\n' })
          : undefined
    if (answer === undefined) throw new Error(`unexpected ${command}`)
    return { status: answer.status, stdout: answer.stdout ?? '', stderr: answer.stderr ?? '' }
  }) as Runner & { calls: string[][] }
  run.calls = calls
  return run
}

/** Every error the counter throws, with the run's calls, for checking what it says. */
function failure(run: Runner): string {
  try {
    mergedCountOf(run, NOW)
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error('expected the count to fail')
}

describe('the count', () => {
  test('S1.2 FR-001 one read-only gh search of the merged pull requests in the 30 days before now, trimmed by gh to the count', () => {
    const run = runner()
    expect(mergedCountOf(run, NOW)).toBe(296)
    expect(run.calls).toEqual([
      ['git', 'config', '--get', REPO_SETTING],
      [
        'gh',
        'api',
        '--method=GET',
        'search/issues',
        '-f',
        `q=repo:${REPO} is:pr is:merged merged:>=2026-10-19T15:12:00Z`,
        '-f',
        'per_page=1',
        '--jq',
        '[.total_count, .incomplete_results]',
      ],
    ])
    expect(MERGED_DAYS).toBe(30)
  })

  test('S1.2 FR-001 no token is read, asked for or passed: gh signs in with its own login', () => {
    const run = runner()
    mergedCountOf(run, NOW)
    const words = run.calls.flat().join(' ')
    expect(words).not.toMatch(/token|auth|Bearer|GH_TOKEN|GITHUB_TOKEN/i)
    const lib = read('scripts', 'previews', 'refresh-lib.ts') + read('scripts', 'previews', 'refresh.ts')
    expect(lib).not.toMatch(/process\.env\.(GH_TOKEN|GITHUB_TOKEN)|Authorization/)
  })

  test('S1.3 FR-002 the repo comes only from the git setting bradthome.pulseRepo on this PC', () => {
    expect(REPO_SETTING).toBe('bradthome.pulseRepo')
    const run = runner({ setting: { status: 0, stdout: 'other-owner/other-name\n' } })
    mergedCountOf(run, NOW)
    expect(run.calls[1]?.join(' ')).toContain('repo:other-owner/other-name ')
  })

  test.each([
    ['the setting missing', { setting: { status: 1 } }, /setting bradthome\.pulseRepo isn't on this PC/],
    ['the setting empty', { setting: { status: 0, stdout: '\n' } }, /isn't on this PC/],
    ['the setting not owner/name', { setting: { status: 0, stdout: 'example-owner/x is:pr repo:y\n' } }, /isn't owner\/name/],
    ['gh missing', { gh: { status: null } }, /gh isn't installed/],
    ['gh not signed in', { gh: { status: 4, stderr: 'To get started with GitHub CLI, please run:  gh auth login' } }, /gh isn't signed in/],
    [
      'GitHub refusing',
      { gh: { status: 1, stderr: `gh: Validation Failed (HTTP 422)\nThe listed users and repositories cannot be searched: ${REPO}` } },
      /^GitHub answered 422$/,
    ],
    ['gh failing with no status', { gh: { status: 2, stderr: `could not reach ${REPO}` } }, /^gh failed \(exit 2\)$/],
    ['an unreadable answer', { gh: { status: 0, stdout: 'oops' } }, /didn't parse/],
    ['an answer that isn’t a count', { gh: { status: 0, stdout: '["296",false]' } }, /isn't a count/],
    ['a negative count', { gh: { status: 0, stdout: '[-1,false]' } }, /isn't a count/],
    ['an incomplete count', { gh: { status: 0, stdout: '[296,true]' } }, /incomplete/],
  ])('S1.4 FR-002 %s: the count fails in the job’s own words, never naming the repo', (_name, options, words) => {
    const message = failure(runner(options as { setting?: Answer; gh?: Answer }))
    expect(message).toMatch(words)
    expect(message).not.toContain('example-owner')
    expect(message).not.toContain('example-repo')
    expect(message).not.toContain('Validation Failed')
  })

  test('S1.4 a bad setting is never handed to gh', () => {
    const run = runner({ setting: { status: 0, stdout: 'not a repo\n' } })
    failure(run)
    expect(run.calls.map((call) => call[0])).toEqual(['git'])
  })
})

describe('the pulse file', () => {
  const OLD = {
    appStore: { fetched: '2026-11-17', version: '12.7.8', released: '2026-11-10' },
    github: { fetched: '2026-11-17', merged: 296 },
  }
  const LOOKUP_URL = 'https://itunes.apple.com/lookup?id=1191483515&country=us'
  const LOOKUP = { results: [{ version: '12.7.9', currentVersionReleaseDate: '2026-11-17T17:02:11Z' }] }
  const fetcher = (answers: Record<string, unknown>): Pick<Fetcher, 'json'> & { calls: string[] } => {
    const calls: string[] = []
    return {
      calls,
      json: async (url) => {
        calls.push(url)
        if (!(url in answers)) throw new Error(`${new URL(url).hostname} answered 503`)
        return answers[url]
      },
    }
  }

  test("S1.1 S1.5 the release from Apple's lookup and the count from the PC, each dated today, and nothing asked of the site's API", async () => {
    const apple = fetcher({ [LOOKUP_URL]: LOOKUP })
    const result = await pulseOf(OLD, apple, LOOKUP_URL, () => 301, '2026-11-18')
    expect(result.pulse).toEqual({
      appStore: { fetched: '2026-11-18', version: '12.7.9', released: '2026-11-17' },
      github: { fetched: '2026-11-18', merged: 301 },
    })
    expect(result.changed).toEqual(['pulse-appstore', 'pulse-github'])
    expect(result.failed).toEqual([])
    expect(apple.calls).toEqual([LOOKUP_URL])
  })

  test('S1.5 numbers that didn’t change still take today’s day, since the day says when they were last true', async () => {
    const same = fetcher({ [LOOKUP_URL]: { results: [{ version: '12.7.8', currentVersionReleaseDate: '2026-11-10T17:02:11Z' }] } })
    const result = await pulseOf(OLD, same, LOOKUP_URL, () => 296, '2026-11-18')
    expect(result.pulse).toEqual({
      appStore: { ...OLD.appStore, fetched: '2026-11-18' },
      github: { ...OLD.github, fetched: '2026-11-18' },
    })
    expect(result.changed).toEqual([])
  })

  test('S1.4 S1.5 a part that fails keeps its last numbers and day, and the other still refreshes', async () => {
    const result = await pulseOf(
      OLD,
      fetcher({ [LOOKUP_URL]: LOOKUP }),
      LOOKUP_URL,
      () => {
        throw new Error("the setting bradthome.pulseRepo isn't on this PC")
      },
      '2026-11-18',
    )
    expect(result.pulse.github).toEqual(OLD.github)
    expect(result.pulse.appStore.version).toBe('12.7.9')
    expect(result.failed).toEqual([{ key: 'pulse-github', reason: "the setting bradthome.pulseRepo isn't on this PC" }])
    const down = await pulseOf(OLD, fetcher({}), LOOKUP_URL, () => 300, '2026-11-18')
    expect(down.pulse.appStore).toEqual(OLD.appStore)
    expect(down.pulse.github).toEqual({ fetched: '2026-11-18', merged: 300 })
  })

  test('S1.6 the report is counts, versions and days only, one line a part, saying what changed', async () => {
    const changed = await pulseOf(OLD, fetcher({ [LOOKUP_URL]: LOOKUP }), LOOKUP_URL, () => 301, '2026-11-18')
    expect(pulseReportOf(OLD, changed)).toEqual([
      '✓ pulse-appstore v12.7.9, shipped 2026-11-17, checked 2026-11-18 (was v12.7.8)',
      '✓ pulse-github 301 merged in the 30 days to 2026-11-18 (was 296)',
    ])
    const failed = await pulseOf(
      OLD,
      fetcher({}),
      LOOKUP_URL,
      () => {
        throw new Error('GitHub answered 422')
      },
      '2026-11-18',
    )
    const lines = pulseReportOf(OLD, failed)
    expect(lines[0]).toMatch(/^✖ pulse-appstore failed, so v12\.7\.8 as of 2026-11-17 stays: /)
    expect(lines[1]).toBe('✖ pulse-github failed, so 296 as of 2026-11-17 stays: GitHub answered 422')
  })

  test('S1.1 S1.6 the job writes the file, prints the report and its last line, exits 1 on a failure, and keeps gh’s own messages to itself', () => {
    const script = read('scripts', 'previews', 'refresh.ts')
    expect(script).toMatch(/mergedCountOf\(run, now\)/)
    expect(script).toMatch(/pulseReportOf\(last, pulse\)/)
    expect(script).toMatch(/result\.failed\.length > 0 \|\| pulseFailed \? 1 : 0/)
    expect(script).toMatch(/Nothing changed, so nothing to push\./)
    expect(script).toMatch(/A release builds it into bradthome\.com \(docs\/release\.md\)/)
    // The runner keeps gh's output in memory; nothing prints its stderr or stdout.
    expect(script).not.toMatch(/stdio: 'inherit'|process\.stderr\.write|console\.(log|error)\(.*stderr/)
    expect(script).not.toMatch(/GITHUB_OUTPUT|CHAT_API_ORIGIN|\/pulse`/)
  })
})
