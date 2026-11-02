import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { findLine } from '../../001/helpers/messages.ts'
import { createRepo, type ScratchRepo } from '../../001/helpers/repo.ts'
import { describeRun, filledLines, runMerged, type RunResult } from '../../001/helpers/run.ts'
import { type Sandbox, withoutOnPath } from '../../001/helpers/sandbox.ts'
import { createCiSandbox } from '../helpers/ci-repo.ts'
import { endpointsRead, installFakeGh, ok, RULESETS_REFUSED, type Scenario } from '../helpers/fake-gh.ts'
import { R1_CODEOWNERS, R1_FILE, R1_PENDING, R1_READY, R2_FIX, R2_HEADER, R_NOT_CHECKED } from '../helpers/messages.ts'
import { BRAD_LOGIN, GITHUB, REPO_REMOTE, REPO_SLUG, SCRIPTS } from '../helpers/paths.ts'

// pnpm ruleset:check, run as `node scripts/ruleset-check.ts` in a scratch
// checkout holding the repo's ruleset file and CODEOWNERS, or a changed copy.
// A fake gh replays what GitHub answers: the refusal for a private repo on the
// free plan, a matching ruleset, a different one, and no network. Nothing
// reaches GitHub.

interface Rule {
  type: string
  parameters?: Record<string, unknown>
}

interface Ruleset {
  name?: string
  target?: string
  enforcement?: string
  bypass_actors?: unknown[]
  conditions?: { ref_name?: { include?: string[]; exclude?: string[] } }
  rules?: Rule[]
  [key: string]: unknown
}

const ACTIONS_APP = 15368

function theFile(): Ruleset {
  return JSON.parse(readFileSync(GITHUB.ruleset, 'utf8')) as Ruleset
}

function rule(ruleset: Ruleset, type: string): Rule | undefined {
  return ruleset.rules?.find((candidate) => candidate.type === type)
}

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
})

interface CheckoutOptions {
  ruleset?: Ruleset | string
  codeowners?: string | false
}

function checkout(options: CheckoutOptions = {}): ScratchRepo {
  const sandbox = createCiSandbox({ terms: false })
  sandboxes.push(sandbox)
  const ruleset = options.ruleset ?? readFileSync(GITHUB.ruleset, 'utf8')
  const seed: Record<string, string> = {
    '.github/rulesets/main.json': typeof ruleset === 'string' ? ruleset : `${JSON.stringify(ruleset, null, 2)}\n`,
  }
  const codeowners = options.codeowners ?? readFileSync(GITHUB.codeowners, 'utf8')
  if (codeowners !== false) seed['.github/CODEOWNERS'] = codeowners
  const repo = createRepo(sandbox, { seed, branch: false, hooks: false })
  repo.gitOk(['remote', 'set-url', 'origin', REPO_REMOTE])
  return repo
}

function check(repo: ScratchRepo, env: NodeJS.ProcessEnv): RunResult {
  return runMerged(process.execPath, [SCRIPTS.rulesetCheck], { cwd: repo.dir, env, scratch: repo.sandbox.root })
}

const LIVE_ID = 4242

/** What GitHub serves for a ruleset built from the given one: the server's own fields added, and the rules in another order. */
function served(ruleset: Ruleset, options: { bypassShown?: boolean } = {}): Scenario {
  const server = {
    id: LIVE_ID,
    source_type: 'Repository',
    source: REPO_SLUG,
    node_id: 'RRS_lACqUmVwb3NpdG9yec4AAAAA',
    created_at: '2026-11-20T10:00:00.000Z',
    updated_at: '2026-11-20T10:00:00.000Z',
    _links: { self: { href: `https://api.github.com/repos/${REPO_SLUG}/rulesets/${LIVE_ID}` } },
  }
  const { bypass_actors: bypass, ...rest } = ruleset
  const detail = {
    ...server,
    ...rest,
    ...(options.bypassShown === false ? {} : { bypass_actors: bypass }),
    rules: [...(ruleset.rules ?? [])].reverse(),
    current_user_can_bypass: 'never',
  }
  const summary = { name: ruleset.name, target: ruleset.target, enforcement: ruleset.enforcement, ...server }
  return {
    routes: {
      [`repos/${REPO_SLUG}/rulesets`]: ok([summary]),
      [`repos/${REPO_SLUG}/rulesets/${LIVE_ID}`]: ok(detail),
    },
  }
}

function changed(change: (ruleset: Ruleset) => void): Ruleset {
  const copy = structuredClone(theFile())
  change(copy)
  return copy
}

function changedRule(type: string, change: (parameters: Record<string, unknown>) => void): Ruleset {
  return changed((ruleset) => {
    const found = rule(ruleset, type)
    if (found === undefined) throw new Error(`the file has no ${type} rule`)
    found.parameters ??= {}
    change(found.parameters)
  })
}

function withoutRule(type: string): Ruleset {
  return changed((ruleset) => {
    ruleset.rules = (ruleset.rules ?? []).filter((candidate) => candidate.type !== type)
  })
}

describe('the ruleset file', () => {
  test("S5.1 FR-017 R1 the file is main's ruleset in the shape GitHub's rulesets API accepts, with every rule", () => {
    const ruleset = theFile()
    expect(typeof ruleset.name).toBe('string')
    expect(ruleset.target).toBe('branch')
    expect(ruleset.enforcement).toBe('active')
    expect(ruleset.bypass_actors).toEqual([])
    expect(ruleset.conditions?.ref_name?.include).toEqual(['refs/heads/main'])
    expect(ruleset.conditions?.ref_name?.exclude ?? []).toEqual([])
    const types = (ruleset.rules ?? []).map((candidate) => candidate.type).sort()
    expect(types).toEqual(
      ['deletion', 'non_fast_forward', 'pull_request', 'required_linear_history', 'required_signatures', 'required_status_checks'].sort(),
    )
    expect(rule(ruleset, 'pull_request')?.parameters).toMatchObject({
      required_approving_review_count: 1,
      require_code_owner_review: true,
      dismiss_stale_reviews_on_push: true,
      allowed_merge_methods: ['squash'],
    })
    const checks = (rule(ruleset, 'required_status_checks')?.parameters?.required_status_checks ?? []) as { context: string; integration_id?: number }[]
    expect(checks.map((entry) => entry.context).sort()).toEqual(['gate', 'lock'])
    for (const entry of checks) expect(entry.integration_id, entry.context).toBe(ACTIONS_APP)
  })
})

describe('R1: the file is ready, and the live ruleset is pending', () => {
  test("S5.1 S5.2 S5.4 FR-018 R1 confirms the file and CODEOWNERS, and reports GitHub's refusal as pending, in the mock's words", () => {
    const repo = checkout()
    const gh = installFakeGh(repo.sandbox, { fallback: RULESETS_REFUSED })
    const result = check(repo, gh.env)
    expect(result.status, describeRun(result)).toBe(0)
    expect(filledLines(result.stdout)).toEqual([...R1_FILE, R1_CODEOWNERS, R1_PENDING, R1_READY])
    expect(endpointsRead(gh.calls())).toContain(`repos/${REPO_SLUG}/rulesets`)
  })

  test('S5.2 FR-018 with no network the live ruleset is not checked, and the check still passes on the file', () => {
    const repo = checkout()
    const gh = installFakeGh(repo.sandbox, { offline: true })
    const result = check(repo, gh.env)
    expect(result.status, describeRun(result)).toBe(0)
    expect(findLine(result.stdout, R1_FILE[0] ?? ''), result.stdout).toBe(0)
    expect(findLine(result.stdout, R1_CODEOWNERS), result.stdout).toBeGreaterThan(0)
    expect(findLine(result.stdout, R_NOT_CHECKED), result.stdout).toBeGreaterThan(0)
  })

  test("S5.2 FR-018 without gh the live ruleset is not checked, and the check still passes on the file", () => {
    const repo = checkout()
    const result = check(repo, withoutOnPath(repo.sandbox, 'gh'))
    expect(result.status, describeRun(result)).toBe(0)
    expect(findLine(result.stdout, R1_CODEOWNERS), result.stdout).toBeGreaterThan(0)
    expect(findLine(result.stdout, R_NOT_CHECKED), result.stdout).toBeGreaterThan(0)
  })
})

describe('the live ruleset matches the file', () => {
  test('S5.3 FR-018 SC-005 passes on a recorded ruleset built from the file, ignoring the fields only GitHub sets and the order of the rules', () => {
    const repo = checkout()
    const gh = installFakeGh(repo.sandbox, served(theFile()))
    const result = check(repo, gh.env)
    expect(result.status, describeRun(result)).toBe(0)
    expect(findLine(result.stdout, /^✓ live ruleset\b/), result.stdout).toBeGreaterThanOrEqual(0)
    expect(findLine(result.stdout, /^✖/)).toBe(-1)
  })

  test("S5.3 FR-018 SC-005 compares bypass actors only when GitHub shows them, which needs admin", () => {
    const repo = checkout()
    const gh = installFakeGh(repo.sandbox, served(theFile(), { bypassShown: false }))
    const result = check(repo, gh.env)
    expect(result.status, describeRun(result)).toBe(0)
    expect(findLine(result.stdout, /^✓ live ruleset\b/), result.stdout).toBeGreaterThanOrEqual(0)
  })
})

describe('R2: the live ruleset differs from the file', () => {
  test("S5.3 FR-018 R2 names each difference, file against live, in the mock's words", () => {
    const repo = checkout()
    const live = changed((ruleset) => {
      const pullRequest = rule(ruleset, 'pull_request')
      if (pullRequest?.parameters !== undefined) pullRequest.parameters.required_approving_review_count = 0
      ruleset.bypass_actors = [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' }]
    })
    const gh = installFakeGh(repo.sandbox, served(live))
    const result = check(repo, gh.env)
    expect(result.status, describeRun(result)).not.toBe(0)
    const lines = filledLines(result.stdout)
    expect(lines[0]).toBe(R1_FILE[0])
    expect(lines).toContain(R1_CODEOWNERS)
    const at = lines.indexOf(R2_HEADER)
    expect(at, result.stdout).toBeGreaterThan(0)
    const differences = lines.slice(at + 1, lines.indexOf(R2_FIX))
    expect(differences.some((line) => /^ {2}required approvals +file 1 · live 0$/.test(line)), differences.join('\n')).toBe(true)
    expect(differences.some((line) => /^ {2}bypass actors +file none · live \S/.test(line)), differences.join('\n')).toBe(true)
    expect(lines).toContain(R2_FIX)
  })

  test('S5.3 FR-018 R2 a live rule the file lacks is a difference too', () => {
    const repo = checkout()
    const live = changed((ruleset) => {
      ruleset.rules = [...(ruleset.rules ?? []), { type: 'creation' }]
    })
    const gh = installFakeGh(repo.sandbox, served(live))
    const result = check(repo, gh.env)
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, R2_HEADER), result.stdout).toBeGreaterThan(0)
    expect(result.stdout).toMatch(/creation/)
  })

  test("S5.1 S5.3 FR-017 R2 a file missing any one rule fails, naming the rule", () => {
    const cases: [string, Ruleset, RegExp][] = [
      ['pull requests only', withoutRule('pull_request'), /pull requests only/i],
      ['squash merges', changedRule('pull_request', (p) => (p.allowed_merge_methods = ['merge', 'squash'])), /squash/i],
      ['linear history', withoutRule('required_linear_history'), /linear history/i],
      ['signed commits', withoutRule('required_signatures'), /signed commits/i],
      ['the gate', changedRule('required_status_checks', (p) => (p.required_status_checks = [{ context: 'lock', integration_id: ACTIONS_APP }])), /\bgate\b/i],
      ['the lock check', changedRule('required_status_checks', (p) => (p.required_status_checks = [{ context: 'gate', integration_id: ACTIONS_APP }])), /\block\b/i],
      ['1 approval', changedRule('pull_request', (p) => (p.required_approving_review_count = 0)), /approval/i],
      ['a code owner', changedRule('pull_request', (p) => (p.require_code_owner_review = false)), /code owner/i],
      ['stale approvals', changedRule('pull_request', (p) => (p.dismiss_stale_reviews_on_push = false)), /stale/i],
      ['no force pushes', withoutRule('non_fast_forward'), /force push/i],
      ['no deletions', withoutRule('deletion'), /deletion/i],
      ['no bypass', changed((r) => (r.bypass_actors = [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' }])), /bypass/i],
      ['main', changed((r) => (r.conditions = { ref_name: { include: ['refs/heads/release'], exclude: [] } })), /targets? main\b|refs\/heads\/main/i],
      ['enforced', changed((r) => (r.enforcement = 'evaluate')), /enforc|active/i],
    ]
    for (const [name, ruleset, named] of cases) {
      const repo = checkout({ ruleset })
      const gh = installFakeGh(repo.sandbox, { fallback: RULESETS_REFUSED })
      const result = check(repo, gh.env)
      expect(result.status, `${name}\n${describeRun(result)}`).not.toBe(0)
      const lines = filledLines(result.stdout)
      const at = lines.findIndex((line) => line.startsWith('✖ ruleset file  '))
      expect(at, `${name}\n${result.stdout}`).toBeGreaterThanOrEqual(0)
      const next = lines.findIndex((line, index) => index > at && /^[✓✖…] /.test(line))
      const block = lines.slice(at, next < 0 ? undefined : next)
      expect(block.join('\n'), name).toMatch(named)
    }
  })

  test('S5.1 FR-017 a ruleset file that is empty or not JSON fails', () => {
    for (const ruleset of ['{ "name": "main", ', '']) {
      const repo = checkout({ ruleset })
      const gh = installFakeGh(repo.sandbox, { fallback: RULESETS_REFUSED })
      const result = check(repo, gh.env)
      expect(result.status, describeRun(result)).not.toBe(0)
      expect(findLine(result.stdout, /^✖ ruleset file {2}/), result.stdout).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('the code owners', () => {
  test("S5.4 FR-016 FR-018 R1 fails when CODEOWNERS is missing, names someone else, or leaves a path to someone else", () => {
    for (const codeowners of [false, '* @someone-else\n', `/docs/ @${BRAD_LOGIN}\n`, `* @${BRAD_LOGIN}\n/.github/ @bradthome-agent\n`] as const) {
      const repo = checkout({ codeowners })
      const gh = installFakeGh(repo.sandbox, { fallback: RULESETS_REFUSED })
      const result = check(repo, gh.env)
      expect(result.status, `${String(codeowners)}\n${describeRun(result)}`).not.toBe(0)
      expect(findLine(result.stdout, /^✖ code owners {2}/), result.stdout).toBeGreaterThanOrEqual(0)
      expect(findLine(result.stdout, R1_FILE[0] ?? '')).toBe(0)
    }
  })

  test('S5.4 FR-016 comments and blank lines in CODEOWNERS are fine', () => {
    const repo = checkout({ codeowners: `# Brad owns every path (D81).\n\n* @${BRAD_LOGIN}\n` })
    const gh = installFakeGh(repo.sandbox, { fallback: RULESETS_REFUSED })
    const result = check(repo, gh.env)
    expect(result.status, describeRun(result)).toBe(0)
    expect(findLine(result.stdout, R1_CODEOWNERS), result.stdout).toBeGreaterThan(0)
  })
})
