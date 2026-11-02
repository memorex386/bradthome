import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import { expectBlock, expectOneLine, findLine } from '../../001/helpers/messages.ts'
import { describeRun } from '../../001/helpers/run.ts'
import { withoutOnPath } from '../../001/helpers/sandbox.ts'
import { ciRepos, commitFiles, pullRequestEnv, pushEnv, runCi, short } from '../helpers/ci-repo.ts'
import { K5_HEADER, K5_TAIL, PASS } from '../helpers/messages.ts'
import { CI } from '../helpers/paths.ts'

// The secrets job's script: gitleaks over every commit in the pull request,
// with values redacted (S2.3). The fake token is built at run time, so no file
// in the repo holds one, and gitleaks reports it as a GitHub token.

const scratch = ciRepos()

const FAKE_TOKEN = ['ghp', createHash('sha256').update('bradthome spec 002 made-up token').digest('hex').slice(0, 36)].join('_')

function deployScript(line: number, total = line + 2): string {
  const lines: string[] = []
  for (let n = 1; n <= total; n += 1) lines.push(n === line ? `const token = "${FAKE_TOKEN}"` : `// Line ${n} of a deploy script.`)
  return `${lines.join('\n')}\n`
}

describe('K5: a possible secret', () => {
  test("S2.3 FR-009 SC-003 K5 names the commit, file, line and rule, with the value redacted, in the mock's words", () => {
    const repo = scratch()
    const sha = commitFiles(repo, 'feat(002): add the deploy script', { 'scripts/deploy.ts': deployScript(14) })
    const result = runCi(repo, CI.secrets, pullRequestEnv(repo, { title: 'feat(002): add the deploy script' }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expectBlock(result.stdout, [K5_HEADER, new RegExp(`^ {2}${short(sha)} {2}scripts/deploy\\.ts:14 {2}rule [\\w-]+ {2}value REDACTED$`), ...K5_TAIL])
    expect(result.stdout).not.toContain(FAKE_TOKEN)
    expect(result.stdout).not.toContain(FAKE_TOKEN.slice(4, 20))
  })

  test('S2.3 FR-009 K5 checks every commit, so a secret added and then removed on the branch is still found', () => {
    const repo = scratch()
    const added = commitFiles(repo, 'feat(002): add the deploy script', { 'scripts/deploy.ts': deployScript(3) })
    commitFiles(repo, 'fix(002): drop the token', { 'scripts/deploy.ts': '// A deploy script.\n' })
    const result = runCi(repo, CI.secrets, pullRequestEnv(repo, { title: 'feat(002): add the deploy script' }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, K5_HEADER), result.stdout).toBeGreaterThanOrEqual(0)
    expect(findLine(result.stdout, new RegExp(`^ {2}${short(added)} {2}scripts/deploy\\.ts:3 `)), result.stdout).toBeGreaterThanOrEqual(0)
    expect(result.stdout).not.toContain(FAKE_TOKEN)
  })

  test('FR-001 FR-009 K5 a push to main scans the pushed commits the same way', () => {
    const repo = scratch({ branch: false })
    const before = repo.gitOk(['rev-parse', 'origin/main'])
    const sha = commitFiles(repo, 'feat(002): add the deploy script (#6)', { 'scripts/deploy.ts': deployScript(5) })
    const result = runCi(repo, CI.secrets, pushEnv(repo, { before, after: sha }))
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, new RegExp(`^ {2}${short(sha)} {2}scripts/deploy\\.ts:5 `)), result.stdout).toBeGreaterThanOrEqual(0)
    expect(result.stdout).not.toContain(FAKE_TOKEN)
  })

  test('S2.3 FR-009 passes in one line when no commit holds a secret', () => {
    const repo = scratch()
    commitFiles(repo, 'feat(002): add the deploy script', { 'scripts/deploy.ts': '// A deploy script.\nconst token = process.env.TOKEN\n' })
    const result = runCi(repo, CI.secrets, pullRequestEnv(repo, { title: 'feat(002): add the deploy script' }))
    expect(result.status, describeRun(result)).toBe(0)
    expectOneLine(result.stdout, PASS.secrets)
  })

  test("S2.3 FR-009 fails, and never passes, when gitleaks can't run", () => {
    const repo = scratch()
    commitFiles(repo, 'feat(002): add the deploy script', { 'scripts/deploy.ts': deployScript(2) })
    const env = pullRequestEnv(repo, { title: 'feat(002): add the deploy script' })
    const result = runCi(repo, CI.secrets, withoutOnPath({ env, root: repo.sandbox.root }, 'gitleaks'))
    expect(result.status, describeRun(result)).not.toBe(0)
    expect(findLine(result.stdout, /^✖ secrets {2}/), result.stdout).toBeGreaterThanOrEqual(0)
    expect(findLine(result.stdout, PASS.secrets)).toBe(-1)
  })
})
