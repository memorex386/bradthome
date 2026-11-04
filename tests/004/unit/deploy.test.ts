import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { deploy, type RunResult } from '../../../scripts/cost-guard/deploy.ts'

// pnpm cost-guard:deploy (FR-012, FR-013, S4.2, D105). Every command goes
// through a fake runner, so nothing reaches git's remote, gcloud or Firebase.
// The IDs here are made up.

const ROOT = path.resolve('/repo')
const ACCOUNT = 'billingAccounts/000000-000000-000000'
const BUDGET = '00000000-0000-4000-8000-000000000004'

interface Fake {
  calls: string[]
  files: Map<string, string>
  printed: string[]
  code: number
}

const BUDGETS = 'gcloud billing budgets list --billing-account=000000-000000-000000 --format=value(name,displayName)'
const ok = (stdout = ''): RunResult => ({ status: 0, stdout, stderr: '' })
const fail = (stderr = ''): RunResult => ({ status: 1, stdout: '', stderr })

function run(argv: string[], answers: Record<string, RunResult> = {}): Fake {
  const calls: string[] = []
  const files = new Map<string, string>()
  const printed: string[] = []
  const defaults: Record<string, RunResult> = {
    'git status --porcelain': ok(''),
    'git fetch origin main': ok(),
    'git merge-base --is-ancestor HEAD origin/main': ok(),
    'gcloud billing projects describe bradthome --format=value(billingAccountName)': ok(`${ACCOUNT}\n`),
    [BUDGETS]: ok(`${ACCOUNT}/budgets/${BUDGET}\tbradthome monthly\n${ACCOUNT}/budgets/11111111-0000-4000-8000-0000000000bb\tMy budget\n`),
    'pnpm exec tsc -p apps/cost-guard/tsconfig.json': ok(),
    'pnpm exec firebase deploy --only functions:costGuard --project bradthome --config apps/cost-guard/firebase.json --non-interactive': ok(),
  }
  const code = deploy(argv, {
    root: ROOT,
    run: (command, args) => {
      const line = [command, ...args].join(' ')
      calls.push(line)
      const answer = answers[line] ?? defaults[line]
      if (answer === undefined) throw new Error(`unexpected command: ${line}`)
      return answer
    },
    writeFile: (file, text) => void files.set(file, text),
    print: (line) => void printed.push(line),
  })
  return { calls, files, printed, code }
}

const ENV_FILE = path.join(ROOT, 'apps', 'cost-guard', '.env.bradthome')
const FIREBASE = 'pnpm exec firebase deploy --only functions:costGuard --project bradthome --config apps/cost-guard/firebase.json --non-interactive'

describe('where it deploys from', () => {
  test('S4.2 FR-012 deploys from a clean commit on origin/main, with dry-run still on', () => {
    const result = run([])
    expect(result.code).toBe(0)
    expect(result.files.get(ENV_FILE)).toBe(`BUDGET_ID=${BUDGET}\nDRY_RUN=true\n`)
    expect(result.calls.at(-1)).toBe(FIREBASE)
  })

  test('S4.2 FR-012 --live from main turns dry-run off', () => {
    const result = run(['--live'])
    expect(result.code).toBe(0)
    expect(result.files.get(ENV_FILE)).toBe(`BUDGET_ID=${BUDGET}\nDRY_RUN=false\n`)
  })

  test('S4.2 FR-012 refuses a checkout with changes, before anything else', () => {
    const result = run(['--live'], { 'git status --porcelain': ok(' M apps/cost-guard/src/guard.ts\n') })
    expect(result.code).toBe(1)
    expect(result.calls).toEqual(['git status --porcelain'])
    expect(result.printed[0]).toMatch(/^✖ cost-guard:deploy {2}/)
    expect(result.printed.at(-1)).toMatch(/^ {2}Fix: /)
  })

  test('S4.2 FR-012 refuses a commit that is not on origin/main', () => {
    const result = run([], { 'git merge-base --is-ancestor HEAD origin/main': fail() })
    expect(result.code).toBe(1)
    expect(result.calls).not.toContain(FIREBASE)
    expect(result.files.size).toBe(0)
  })

  test('S4.2 FR-012 --dry-run deploys from any clean commit, with dry-run on', () => {
    const result = run(['--dry-run'], { 'git merge-base --is-ancestor HEAD origin/main': fail() })
    expect(result.code).toBe(0)
    expect(result.calls).not.toContain('git merge-base --is-ancestor HEAD origin/main')
    expect(result.files.get(ENV_FILE)).toBe(`BUDGET_ID=${BUDGET}\nDRY_RUN=true\n`)
  })

  test('S4.2 FR-012 refuses --live with --dry-run, and an unknown flag', () => {
    expect(run(['--live', '--dry-run']).code).toBe(2)
    expect(run(['--force']).code).toBe(2)
    expect(run(['--live', '--dry-run']).calls).toEqual([])
  })

  test('S4.2 FR-012 deploys only the guard, only to bradthome, with its own Firebase config', () => {
    const deploys = run([]).calls.filter((call) => call.includes('firebase'))
    expect(deploys).toEqual([FIREBASE])
  })

  test('S4.2 builds before it deploys, and stops when the build fails', () => {
    const result = run([], { 'pnpm exec tsc -p apps/cost-guard/tsconfig.json': fail('error TS2322') })
    expect(result.code).toBe(1)
    expect(result.calls).not.toContain(FIREBASE)
  })

  test('S4.2 reports a failed Firebase deploy with exit 1', () => {
    const result = run([], { [FIREBASE]: fail('Error: HTTP 403') })
    expect(result.code).toBe(1)
    expect(result.printed[0]).toMatch(/^✖ cost-guard:deploy {2}/)
  })

  test("S4.2 shows the Firebase CLI's error line, not its first progress line, without colors", () => {
    const output = "\x1b[1m=== Deploying to 'bradthome'...\x1b[22m\ni  functions: preparing\n\x1b[31mError:\x1b[39m could not set up cleanup policy\n"
    const result = run([], { [FIREBASE]: { status: 1, stdout: output, stderr: '' } })
    expect(result.printed).toContain('  Error: could not set up cleanup policy')
  })
})

describe('the budget ID', () => {
  test('FR-013 reads the budget ID from Google Cloud at deploy time, and never prints it or the billing account', () => {
    const result = run([])
    expect(result.files.get(ENV_FILE)).toContain(`BUDGET_ID=${BUDGET}`)
    const printed = result.printed.join('\n')
    expect(printed).not.toContain(BUDGET)
    expect(printed).not.toContain('000000-000000-000000')
  })

  test("FR-013 hides addresses and IDs in a failing tool's error line", () => {
    const describe = 'gcloud billing projects describe bradthome --format=value(billingAccountName)'
    const stderr = `ERROR: (gcloud.billing.projects.describe) User [someone@example.com] does not have permission on ${ACCOUNT}/budgets/${BUDGET}`
    const result = run([], { [describe]: fail(stderr) })
    expect(result.code).toBe(1)
    const printed = result.printed.join('\n')
    expect(printed).toContain('ERROR: (gcloud.billing.projects.describe) User [[address]] does not have permission on billingAccounts/[billing account]/budgets/[budget]')
    for (const secret of ['someone@example.com', '000000-000000-000000', BUDGET]) expect(printed).not.toContain(secret)
  })

  test('FR-013 refuses when no budget is named "bradthome monthly"', () => {
    const result = run([], { [BUDGETS]: ok(`${ACCOUNT}/budgets/${BUDGET}\tMy budget\n`) })
    expect(result.code).toBe(1)
    expect(result.files.size).toBe(0)
  })

  test('FR-013 refuses when two budgets share the name', () => {
    const result = run([], {
      [BUDGETS]: ok(`${ACCOUNT}/budgets/${BUDGET}\tbradthome monthly\n${ACCOUNT}/budgets/11111111-0000-4000-8000-000000000004\tbradthome monthly\n`),
    })
    expect(result.code).toBe(1)
    expect(result.files.size).toBe(0)
  })

  test("FR-013 refuses while billing is unlinked, since Cloud Build needs it, and says to follow the spec's runbook", () => {
    const result = run([], { 'gcloud billing projects describe bradthome --format=value(billingAccountName)': ok('\n') })
    expect(result.code).toBe(1)
    expect(result.printed.join('\n')).toContain('runbook')
    expect(result.calls).not.toContain(FIREBASE)
  })
})
