import { createHash } from 'node:crypto'
import { afterEach } from 'vitest'
import { createRepo, type RepoOptions, type ScratchRepo } from './repo.ts'
import { createSandbox, type Sandbox, type SandboxOptions } from './sandbox.ts'

/**
 * A made-up GitHub token that gitleaks reports, built at run time so that no
 * file in the repo holds one.
 */
export const FAKE_TOKEN = ['ghp', createHash('sha256').update('bradthome spec 001 made-up token').digest('hex').slice(0, 36)].join('_')

/** A file with the made-up token on the given line. */
export function fileWithToken(line: number, total = line + 2): string {
  const lines: string[] = []
  for (let n = 1; n <= total; n += 1) lines.push(n === line ? `const token = "${FAKE_TOKEN}"` : `// Line ${n} of a deploy script.`)
  return `${lines.join('\n')}\n`
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export const LOCKED_TEST = 'tests/001/unit/demo.test.ts'
export const LOCKED_SPEC = 'specs/001-demo/spec.md'
export const LOCK_FILE = 'specs/001-demo/tests.lock'
const LOCKED_TEST_TEXT = 'export const demo = 1\n'

/** Main, with spec 001-demo and a test that its tests.lock locks. */
export function lockedSeed(): Record<string, string> {
  return {
    [LOCKED_SPEC]: '# Spec 001: A demo\n\n- **S1.1** Given a demo, when it runs, then it works.\n',
    [LOCKED_TEST]: LOCKED_TEST_TEXT,
    [LOCK_FILE]: `${sha256(LOCKED_TEST_TEXT)}  ${LOCKED_TEST}\n`,
  }
}

export const SKILL_SOURCE = '.agents/skills/interview/SKILL.md'
export const SKILL_COPY = '.claude/skills/interview/SKILL.md'
export const SPEC_TEMPLATE = 'docs/templates/spec.md'
export const SPEC_OVERRIDE = '.specify/templates/overrides/spec-template.md'
export const PLAN_TEMPLATE = 'docs/templates/plan.md'
export const PLAN_OVERRIDE = '.specify/templates/overrides/plan-template.md'
export const SPEC_KIT_SKILL = '.claude/skills/speckit-plan/SKILL.md'

/** Main, with a skill and the two templates, each with an up-to-date copy. */
export function copiesSeed(): Record<string, string> {
  const skill = '---\nname: interview\ndescription: Interview Brad.\n---\n\nAsk until the spec can be written.\n'
  const spec = '# Spec NNN: [Name]\n'
  const plan = '# Plan for spec NNN: [Name]\n'
  return {
    [SKILL_SOURCE]: skill,
    [SKILL_COPY]: skill,
    [SPEC_TEMPLATE]: spec,
    [SPEC_OVERRIDE]: spec,
    [PLAN_TEMPLATE]: plan,
    [PLAN_OVERRIDE]: plan,
    [SPEC_KIT_SKILL]: "---\nname: speckit-plan\ndescription: Spec Kit's plan.\n---\n",
  }
}

export interface ScratchOptions {
  sandbox?: SandboxOptions
  repo?: RepoOptions
}

/** Makes scratch repos, each in its own sandbox, removed after each test. */
export function scratchRepos(): (options?: ScratchOptions) => ScratchRepo {
  const sandboxes: Sandbox[] = []
  afterEach(() => {
    for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
  })
  return (options = {}) => {
    const sandbox = createSandbox(options.sandbox)
    sandboxes.push(sandbox)
    return createRepo(sandbox, options.repo)
  }
}
