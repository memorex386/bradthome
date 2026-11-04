import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

// Evidence from the real Google Cloud settings and the live check, committed
// in specs/004-cost-guard/evidence/ (FR-007, FR-009, FR-014, S2.3, SC-003 to
// SC-005). Each file is a list of "- key: value" lines written from real
// command output, with no billing account ID, budget ID or email address.
// The real project's billing is never unlinked: the live check runs in
// dry-run, and the permission test asks Google what the identity may do.

const SPEC = path.resolve('specs/004-cost-guard')

function facts(file: string): Map<string, string> {
  const full = path.join(SPEC, 'evidence', file)
  expect(existsSync(full), `specs/004-cost-guard/evidence/${file}`).toBe(true)
  const lines = readFileSync(full, 'utf8').split(/\r?\n/)
  const found = new Map<string, string>()
  for (const line of lines) {
    const match = /^- ([^:]+): (.+)$/.exec(line)
    if (match?.[1] !== undefined && match[2] !== undefined) found.set(match[1].trim(), match[2].trim())
  }
  return found
}

describe("the guard's identity", () => {
  test('S2.3 FR-007 holds one custom role on bradthome with one permission, invoker on its own service, no key, and no role on the billing account', () => {
    const iam = facts('iam.md')
    expect(iam.get('custom role costGuardUnlinker permissions')).toBe('resourcemanager.projects.deleteBillingAssignment')
    expect(iam.get('cost-guard roles on bradthome')).toBe('projects/bradthome/roles/costGuardUnlinker')
    expect(iam.get('cost-guard roles on the billing account')).toBe('none')
    expect(iam.get('cost-guard user-managed keys')).toBe('none')
    expect(iam.get('cost-guard roles on its own service costguard')).toBe('roles/run.invoker')
  })

  test("SC-005 can remove bradthome's billing link, and can't create one, there or on another project", () => {
    const permissions = facts('permissions.md')
    expect(permissions.get('bradthome deleteBillingAssignment')).toBe('granted')
    expect(permissions.get('bradthome createBillingAssignment')).toBe('denied')
    expect(permissions.get('another project deleteBillingAssignment')).toBe('denied')
    expect(permissions.get('another project createBillingAssignment')).toBe('denied')
  })
})

describe('the live check, in dry-run', () => {
  test('SC-004 FR-009 a simulated over-budget notice reached Brad as an email within 15 minutes, with no billing call', () => {
    const check = facts('live-check.md')
    expect(check.get('mode')).toBe('dry-run')
    expect(check.get('logged outcome')).toBe('dry-run')
    expect(check.get('billing still linked after the check')).toBe('yes')
    const minutes = Number(check.get('minutes from publish to email'))
    expect(Number.isFinite(minutes)).toBe(true)
    expect(minutes).toBeLessThanOrEqual(15)
  })
})

describe("the guard's own cost", () => {
  test('SC-003 runs, image and alert together are under $0.25 a month at list prices, before any free tier', () => {
    const cost = facts('cost.md')
    const dollars = Number(cost.get('monthly total at list prices in dollars'))
    expect(Number.isFinite(dollars)).toBe(true)
    expect(dollars).toBeLessThan(0.25)
  })
})

describe('the runbook', () => {
  test('FR-014 the spec says how to get billing back: fix, raise the budget, relink, then $25 next month', () => {
    const spec = readFileSync(path.join(SPEC, 'spec.md'), 'utf8')
    const runbook = /## Runbook: getting billing back\n([\s\S]*?)\n## /.exec(spec)?.[1] ?? ''
    const steps = runbook.split('\n').filter((line) => /^\d+\. /.test(line))
    expect(steps).toHaveLength(5)
    expect(steps[1]).toMatch(/Raise "bradthome monthly"/)
    expect(steps[2]).toMatch(/Relink billing/)
    expect(steps[4]).toMatch(/\$25/)
  })
})
