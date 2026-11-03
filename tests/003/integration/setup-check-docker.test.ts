import { afterEach, describe, expect, test } from 'vitest'
import { createRepo, type ScratchRepo } from '../../001/helpers/repo.ts'
import { describeRun, filledLines, runMerged, type RunResult } from '../../001/helpers/run.ts'
import { createSandbox, type Sandbox, withoutOnPath } from '../../001/helpers/sandbox.ts'
import { copiesSeed } from '../../001/helpers/seeds.ts'
import { installFakeDocker } from '../helpers/fake-docker.ts'
import { SCRIPTS } from '../helpers/paths.ts'

// The setup check's Docker line (FR-022), run as `node scripts/setup-check.ts`
// in a scratch checkout on an isolated machine. It shows only in a checkout
// that has apps/site, so spec 001's and 002's setup-check tests, whose scratch
// repos have none, keep their exact lines. A fake docker answers; nothing
// starts a container.

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
})

const SITE_PACKAGE = `${JSON.stringify({ name: '@bradthome/site', private: true, type: 'module' }, null, 2)}\n`
const IMAGE = /mcr\.microsoft\.com\/playwright:v1\.64\.1-noble/

function checkout(withSite: boolean): { sandbox: Sandbox; repo: ScratchRepo } {
  const sandbox = createSandbox()
  sandboxes.push(sandbox)
  const seed = withSite ? { ...copiesSeed(), 'apps/site/package.json': SITE_PACKAGE } : copiesSeed()
  return { sandbox, repo: createRepo(sandbox, { seed, hooks: false }) }
}

function check(sandbox: Sandbox, repo: ScratchRepo, env: NodeJS.ProcessEnv): RunResult {
  return runMerged(process.execPath, [SCRIPTS.setupCheck], { cwd: repo.dir, env, scratch: sandbox.root })
}

/** The Docker line and the lines under it, up to the next check's line. */
function dockerLines(result: RunResult): string[] {
  const lines = filledLines(result.stdout)
  const at = lines.findIndex((line) => /^[✓✖] .*\bDocker\b/i.test(line))
  expect(at, describeRun(result)).toBeGreaterThanOrEqual(0)
  const next = lines.findIndex((line, index) => index > at && /^(?:[✓✖…] |\d+ problems?\.$|Ready\.$)/.test(line))
  return lines.slice(at, next < 0 ? undefined : next)
}

describe("the setup check's Docker line", () => {
  test('FR-022 passes when Docker answers, naming the container pnpm test:visual runs', () => {
    const { sandbox, repo } = checkout(true)
    const docker = installFakeDocker(sandbox, { daemon: true })
    const lines = dockerLines(check(sandbox, repo, docker.env))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^✓ /)
    expect(lines[0]).toMatch(IMAGE)
    expect(docker.calls().some((args) => args.includes('version') || args.includes('info'))).toBe(true)
  })

  test('FR-022 is a problem with its fix when Docker is installed but its engine is not running', () => {
    const { sandbox, repo } = checkout(true)
    const docker = installFakeDocker(sandbox, { daemon: false })
    const result = check(sandbox, repo, docker.env)
    const lines = dockerLines(result)
    expect(lines[0]).toMatch(/^✖ /)
    expect(lines.some((line) => /^ {2}Fix: .*Docker Desktop/.test(line)), lines.join('\n')).toBe(true)
    expect(result.status).not.toBe(0)
  })

  test('FR-022 is a problem with its fix when Docker is not installed', () => {
    const { sandbox, repo } = checkout(true)
    const result = check(sandbox, repo, withoutOnPath(sandbox, 'docker'))
    const lines = dockerLines(result)
    expect(lines[0]).toMatch(/^✖ /)
    expect(lines.some((line) => /^ {2}Fix: .*Docker Desktop/.test(line)), lines.join('\n')).toBe(true)
    expect(result.status).not.toBe(0)
  })

  test('FR-022 a checkout with no site shows no Docker line, so earlier specs keep their exact lines', () => {
    const { sandbox, repo } = checkout(false)
    const docker = installFakeDocker(sandbox, { daemon: false })
    const result = check(sandbox, repo, docker.env)
    expect(filledLines(result.stdout).some((line) => /docker/i.test(line)), describeRun(result)).toBe(false)
    expect(docker.calls()).toEqual([])
  })
})
