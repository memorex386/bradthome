import { spawnSync } from 'node:child_process'
import { envValue } from '../lib/terms.ts'

// The release's first step (spec 008, FR-001, S1.2): the run must be on a
// vX.Y.Z tag whose commit is on main. The build job checks out the whole
// history, so origin/main is there to ask.

export interface TagRef {
  refType: string
  refName: string
  onMain: boolean
}

const SEMVER_TAG = /^v\d+\.\d+\.\d+$/

/** Why the run can't release, or undefined when it can. */
export function tagProblem(ref: TagRef): string | undefined {
  if (ref.refType !== 'tag') return `the release runs only on a release tag, and this run is on the ${ref.refType} ${ref.refName}.`
  if (!SEMVER_TAG.test(ref.refName)) return `${ref.refName} isn't a vX.Y.Z tag.`
  if (!ref.onMain) return `${ref.refName} isn't on main: tag a commit that main already has.`
  return undefined
}

function main(env: NodeJS.ProcessEnv): number {
  const sha = envValue(env, 'GITHUB_SHA') ?? ''
  const onMain = /^[0-9a-f]{40}$/.test(sha) && spawnSync('git', ['merge-base', '--is-ancestor', sha, 'origin/main']).status === 0
  const problem = tagProblem({ refType: envValue(env, 'GITHUB_REF_TYPE') ?? '', refName: envValue(env, 'GITHUB_REF_NAME') ?? '', onMain })
  if (problem !== undefined) {
    console.log([`✖ release  ${problem}`, '  Fix: run the release workflow on a vX.Y.Z tag on main. Nothing was staged.'].join('\n'))
    return 1
  }
  console.log(`✓ release  ${envValue(env, 'GITHUB_REF_NAME') ?? ''} is a release tag on main`)
  return 0
}

if (import.meta.main) process.exitCode = main(process.env)
