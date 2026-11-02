import { writeFileSync } from 'node:fs'
import { afterEach } from 'vitest'
import { createRepo, type RepoOptions, type ScratchRepo } from '../../001/helpers/repo.ts'
import { runMerged, type RunResult } from '../../001/helpers/run.ts'
import { createSandbox, type Sandbox, type SandboxOptions, setEnv } from '../../001/helpers/sandbox.ts'
import { MADE_UP_LIST } from '../../001/helpers/terms.ts'
import { REPO_SLUG } from './paths.ts'

// Scratch repos for the CI jobs' scripts: main on a local bare origin, and a
// branch whose commits are the pull request's. Each job's script runs with the
// environment GitHub Actions gives it, built here from a made-up event file.
// Nothing reaches GitHub.

/**
 * A sandbox with nothing from a real GitHub Actions run in it, so the tests
 * behave the same on Brad's PC and in CI.
 */
export function createCiSandbox(options: SandboxOptions = {}): Sandbox {
  const sandbox = createSandbox(options)
  for (const key of Object.keys(sandbox.env)) {
    if (/^(?:GITHUB_|RUNNER_|ACTIONS_|CI$|PRIVATE_TERMS$)/i.test(key)) delete sandbox.env[key]
  }
  return sandbox
}

export interface CiRepoOptions {
  /** The sandbox's term setting. The jobs read PRIVATE_TERMS, so it's off by default. */
  sandbox?: SandboxOptions
  /** Files committed on main and pushed. */
  seed?: Record<string, string>
  /** The pull request's branch, or false to stay on main. */
  branch?: string | false
}

/** Makes scratch repos with no hooks on, each in its own sandbox, removed after each test. */
export function ciRepos(): (options?: CiRepoOptions) => ScratchRepo {
  const sandboxes: Sandbox[] = []
  afterEach(() => {
    for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
  })
  return (options = {}) => {
    const sandbox = createCiSandbox(options.sandbox ?? { terms: false })
    sandboxes.push(sandbox)
    const repoOptions: RepoOptions = { seed: options.seed, branch: options.branch ?? '002-demo', hooks: false }
    return createRepo(sandbox, repoOptions)
  }
}

export interface Person {
  name: string
  email: string
}

export const AGENT: Person = { name: 'Test Agent', email: '1234567+test-agent@users.noreply.github.com' }
export const DEPENDABOT: Person = { name: 'dependabot[bot]', email: '49699333+dependabot[bot]@users.noreply.github.com' }
export const DEPENDABOT_LOGIN = 'dependabot[bot]'

export interface CommitOptions {
  author?: Person
  committer?: Person
}

/** Writes the files and commits them, with no hooks, as git would on any machine. Returns the full SHA. */
export function commitFiles(
  repo: ScratchRepo,
  message: string,
  files: Record<string, string | Uint8Array>,
  options: CommitOptions = {},
): string {
  for (const [file, content] of Object.entries(files)) repo.write(file, content)
  repo.gitOk(['add', '--all'])
  const author = options.author ?? AGENT
  const committer = options.committer ?? options.author ?? AGENT
  repo.gitOk(['commit', '--quiet', '--no-verify', '--allow-empty', '-F', '-'], {
    input: message.endsWith('\n') ? message : `${message}\n`,
    env: {
      GIT_AUTHOR_NAME: author.name,
      GIT_AUTHOR_EMAIL: author.email,
      GIT_COMMITTER_NAME: committer.name,
      GIT_COMMITTER_EMAIL: committer.email,
    },
  })
  return repo.gitOk(['rev-parse', 'HEAD'])
}

export function short(sha: string): string {
  return sha.slice(0, 7)
}

export interface PullRequest {
  title: string
  /** The description. GitHub sends null for an empty one. */
  body?: string | null
  /** Who opened it. */
  user?: string
  number?: number
  /** The base commit. main's tip on origin by default. */
  base?: string
  /** The head commit. HEAD by default. */
  head?: string
  /** The head branch. The checkout's branch by default. */
  headRef?: string
  /** pull_request by default, or pull_request_target for the lock check. */
  eventName?: 'pull_request' | 'pull_request_target'
  action?: string
}

let events = 0

function writeEvent(repo: ScratchRepo, event: unknown): string {
  events += 1
  const file = repo.sandbox.path(`event-${events}.json`)
  writeFileSync(file, `${JSON.stringify(event, null, 2)}\n`)
  return file
}

function baseEnv(repo: ScratchRepo, eventName: string, eventPath: string, actor: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...repo.sandbox.env }
  const values: Record<string, string> = {
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    GITHUB_EVENT_NAME: eventName,
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_REPOSITORY: REPO_SLUG,
    GITHUB_REPOSITORY_OWNER: 'memorex386',
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_API_URL: 'https://api.github.com',
    GITHUB_WORKSPACE: repo.dir,
    GITHUB_ACTOR: actor,
    GITHUB_TRIGGERING_ACTOR: actor,
    RUNNER_TEMP: repo.sandbox.root,
  }
  for (const [name, value] of Object.entries(values)) setEnv(env, name, value)
  return env
}

/** The environment for a job run on a pull_request (or pull_request_target) event. */
export function pullRequestEnv(repo: ScratchRepo, pr: PullRequest): NodeJS.ProcessEnv {
  const number = pr.number ?? 7
  const base = pr.base ?? repo.gitOk(['rev-parse', 'origin/main'])
  const head = pr.head ?? repo.gitOk(['rev-parse', 'HEAD'])
  const headRef = pr.headRef ?? repo.gitOk(['branch', '--show-current'])
  const user = pr.user ?? 'test-agent'
  const eventName = pr.eventName ?? 'pull_request'
  const repository = { full_name: REPO_SLUG, name: 'bradthome', owner: { login: 'memorex386' }, default_branch: 'main', private: true }
  const event = {
    action: pr.action ?? 'synchronize',
    number,
    pull_request: {
      number,
      title: pr.title,
      body: pr.body === undefined ? null : pr.body,
      state: 'open',
      draft: false,
      user: { login: user },
      head: { ref: headRef, sha: head, repo: repository, label: `memorex386:${headRef}` },
      base: { ref: 'main', sha: base, repo: repository, label: 'memorex386:main' },
    },
    repository,
    sender: { login: user },
  }
  const env = baseEnv(repo, eventName, writeEvent(repo, event), user)
  const values: Record<string, string> = {
    GITHUB_HEAD_REF: headRef,
    GITHUB_BASE_REF: 'main',
    GITHUB_REF: eventName === 'pull_request' ? `refs/pull/${number}/merge` : 'refs/heads/main',
    GITHUB_REF_NAME: eventName === 'pull_request' ? `${number}/merge` : 'main',
    GITHUB_SHA: eventName === 'pull_request' ? head : base,
  }
  for (const [name, value] of Object.entries(values)) setEnv(env, name, value)
  return env
}

export interface Push {
  before: string
  after: string
  actor?: string
}

/** The environment for a job run on a push to main. */
export function pushEnv(repo: ScratchRepo, push: Push): NodeJS.ProcessEnv {
  const actor = push.actor ?? 'memorex386'
  const event = {
    ref: 'refs/heads/main',
    before: push.before,
    after: push.after,
    forced: false,
    repository: { full_name: REPO_SLUG, name: 'bradthome', owner: { login: 'memorex386' }, default_branch: 'main' },
    pusher: { name: actor },
    sender: { login: actor },
  }
  const env = baseEnv(repo, 'push', writeEvent(repo, event), actor)
  const values: Record<string, string> = {
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REF_NAME: 'main',
    GITHUB_SHA: push.after,
    GITHUB_HEAD_REF: '',
    GITHUB_BASE_REF: '',
  }
  for (const [name, value] of Object.entries(values)) setEnv(env, name, value)
  return env
}

/** Adds the private-term list the way the privacy step gets its secret. */
export function withTerms(env: NodeJS.ProcessEnv, list: string | undefined = MADE_UP_LIST): NodeJS.ProcessEnv {
  const next = { ...env }
  setEnv(next, 'PRIVATE_TERMS', list)
  return next
}

/** Runs a CI script with Node, from the scratch repo's root, with stdout and stderr in one stream. */
export function runCi(repo: ScratchRepo, script: string, env: NodeJS.ProcessEnv, args: readonly string[] = []): RunResult {
  return runMerged(process.execPath, [script, ...args], { cwd: repo.dir, env, scratch: repo.sandbox.root })
}
