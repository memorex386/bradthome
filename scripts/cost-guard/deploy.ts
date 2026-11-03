import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// pnpm cost-guard:deploy [--dry-run | --live]: deploys the cost guard to
// bradthome by hand, never from CI (spec 004, FR-012, FR-013, S4.2, D105).
//
// - No flag: from a clean checkout at a commit on origin/main, with dry-run on.
// - --live: the same, with dry-run off. Only after the live check and Brad's yes.
// - --dry-run: from any clean commit, with dry-run on.
//
// It reads the budget's ID from Google Cloud with Brad's gcloud login and
// writes it to apps/cost-guard/.env.bradthome, which git ignores, so no ID
// enters the repo or the output. Every command goes through deps.run, which
// tests replace with a fake.

export interface RunResult {
  status: number | null
  stdout: string
  stderr: string
}

export interface DeployDeps {
  root: string
  run(command: string, args: readonly string[]): RunResult
  writeFile(file: string, text: string): void
  print(line: string): void
}

const PROJECT = 'bradthome'
const BUDGET_NAME = 'bradthome monthly'
const CONFIG = 'apps/cost-guard/firebase.json'
const ENV_FILE = path.join('apps', 'cost-guard', '.env.bradthome')
const USAGE = 'Usage: pnpm cost-guard:deploy [--dry-run | --live]'

class Refusal extends Error {
  readonly headline: string
  readonly fix: string
  readonly detail: readonly string[]

  constructor(headline: string, fix: string, detail: readonly string[] = []) {
    super(headline)
    this.headline = headline
    this.fix = fix
    this.detail = detail
  }
}

function step(deps: DeployDeps, command: string, args: readonly string[], headline: string, fix: string): string {
  const result = deps.run(command, args)
  if (result.status !== 0) {
    const first = `${result.stderr}\n${result.stdout}`.split(/\r?\n/).find((line) => line.trim() !== '')
    throw new Refusal(headline, fix, first === undefined ? [] : [first.trim()])
  }
  return result.stdout
}

/** Runs the deploy and returns the exit code: 0 deployed, 1 refused or failed, 2 bad flags. */
export function deploy(argv: readonly string[], deps: DeployDeps): number {
  const unknown = argv.filter((arg) => arg !== '--dry-run' && arg !== '--live')
  const dryRunFlag = argv.includes('--dry-run')
  const live = argv.includes('--live')
  if (unknown.length > 0 || (dryRunFlag && live)) {
    deps.print(USAGE)
    return 2
  }
  try {
    const status = step(deps, 'git', ['status', '--porcelain'], "couldn't read the checkout's status", 'run it from the repo.')
    if (status.trim() !== '') throw new Refusal('the checkout has changes', 'commit or set them aside, then deploy again.')
    if (!dryRunFlag) {
      step(deps, 'git', ['fetch', 'origin', 'main'], "couldn't fetch origin/main", 'check the network, then deploy again.')
      step(
        deps,
        'git',
        ['merge-base', '--is-ancestor', 'HEAD', 'origin/main'],
        "this commit isn't on origin/main",
        'deploy from main, or use --dry-run to deploy a branch with dry-run on.',
      )
    }
    const account = step(
      deps,
      'gcloud',
      ['billing', 'projects', 'describe', PROJECT, '--format=value(billingAccountName)'],
      "couldn't read bradthome's billing",
      'gcloud auth login with an account that can read it.',
    ).trim()
    if (account === '') {
      throw new Refusal(
        "bradthome's billing is unlinked, and a deploy builds in Cloud Build, which needs it",
        "follow spec 004's runbook to relink billing first.",
      )
    }
    const accountId = account.replace(/^billingAccounts\//, '')
    const budgets = step(
      deps,
      'gcloud',
      ['billing', 'budgets', 'list', `--billing-account=${accountId}`, '--format=value(name,displayName)'],
      "couldn't read the budgets",
      'gcloud auth login with an account that can read them.',
    )
      .split(/\r?\n/)
      .map((line) => line.trim().split('\t'))
      .filter(([, name]) => name?.trim() === BUDGET_NAME)
      .map(([id]) => id ?? '')
    if (budgets.length !== 1) {
      throw new Refusal(
        `found ${budgets.length} budgets named "${BUDGET_NAME}", not one`,
        'name exactly one budget that, then deploy again.',
      )
    }
    const budgetId = budgets[0]?.split('/').at(-1) ?? ''
    const dryRun = !live
    deps.writeFile(path.join(deps.root, ENV_FILE), `BUDGET_ID=${budgetId}\nDRY_RUN=${dryRun}\n`)
    step(
      deps,
      'pnpm',
      ['exec', 'tsc', '-p', 'apps/cost-guard/tsconfig.json'],
      "the guard didn't compile",
      'pnpm typecheck, then deploy again.',
    )
    step(
      deps,
      'pnpm',
      ['exec', 'firebase', 'deploy', '--only', 'functions:costGuard', '--project', PROJECT, '--config', CONFIG, '--non-interactive'],
      'the Firebase deploy failed',
      'read the error above, then deploy again.',
    )
    deps.print(`✓ cost-guard:deploy  deployed to ${PROJECT}, with dry-run ${dryRun ? 'on' : 'off'}`)
    return 0
  } catch (error) {
    if (!(error instanceof Refusal)) throw error
    deps.print(`✖ cost-guard:deploy  ${error.headline}`)
    for (const line of error.detail) deps.print(`  ${line}`)
    deps.print(`  Fix: ${error.fix}`)
    return 1
  }
}

function main(): number {
  const root = process.cwd()
  return deploy(process.argv.slice(2), {
    root,
    // gcloud and pnpm are .cmd files on Windows, which only a shell runs. The
    // arguments are this script's own, never the caller's.
    run: (command, args) => {
      const shell = process.platform === 'win32'
      const quoted = shell ? args.map((arg) => (/[\s"()=]/.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg)) : args
      const result = spawnSync(command, quoted, { cwd: root, encoding: 'utf8', shell, stdio: ['ignore', 'pipe', 'pipe'] })
      return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
    },
    writeFile: (file, text) => writeFileSync(file, text),
    print: (line) => console.log(line),
  })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main()
