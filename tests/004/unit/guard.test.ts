import { describe, expect, test } from 'vitest'
import { cloudBilling } from '../../../apps/cost-guard/src/billing.ts'
import { MARKER, runGuard } from '../../../apps/cost-guard/src/guard.ts'
import { BUDGET_ID, fakeBilling, fakeLog, notice, OTHER_BUDGET_ID, PROJECT } from '../helpers/notices.ts'

// The guard acting on a decision, with a fake billing client and logger
// (FR-004, FR-005, FR-008, FR-010, S1.1, S1.2, S1.4, S1.5, S2.1, S2.2,
// S3.1–S3.3). The real project's billing is never touched.

const LIVE = { budgetId: BUDGET_ID, dryRun: false }
const DRY = { budgetId: BUDGET_ID, dryRun: true }

describe('over the budget', () => {
  test('S1.1 FR-004 makes exactly one unlink call, naming projects/bradthome', async () => {
    const billing = fakeBilling()
    await runGuard(notice({ costAmount: 26 }), { billing, log: fakeLog(), config: LIVE })
    expect(billing.calls).toEqual([PROJECT])
  })

  test('S3.1 FR-008 logs one info line with the marker and the outcome unlinked', async () => {
    const log = fakeLog()
    await runGuard(notice({ costAmount: 26 }), { billing: fakeBilling(), log, config: LIVE })
    expect(log.lines).toEqual([
      { severity: 'info', entry: { marker: MARKER, outcome: 'unlinked', project: PROJECT, costAmount: 26, budgetAmount: 25 } },
    ])
    expect(MARKER).toBe('cost-guard')
  })

  test('S1.4 a repeat notice once billing is off calls unlink again and still ends as done', async () => {
    const billing = fakeBilling()
    const log = fakeLog()
    await runGuard(notice({ costAmount: 26 }), { billing, log, config: LIVE })
    await runGuard(notice({ costAmount: 27 }), { billing, log, config: LIVE })
    expect(billing.calls).toEqual([PROJECT, PROJECT])
    expect(log.lines.map((line) => line.entry.outcome)).toEqual(['unlinked', 'unlinked'])
  })

  test('S1.5 FR-006 S3.1 in dry-run makes no call and logs the exact call it would have made, with the marker', async () => {
    const billing = fakeBilling()
    const log = fakeLog()
    await runGuard(notice({ costAmount: 26 }), { billing, log, config: DRY })
    expect(billing.calls).toEqual([])
    expect(log.lines).toEqual([
      {
        severity: 'info',
        entry: {
          marker: MARKER,
          outcome: 'dry-run',
          project: PROJECT,
          costAmount: 26,
          budgetAmount: 25,
          call: "updateProjectBillingInfo projects/bradthome billingAccountName=''",
        },
      },
    ])
  })
})

describe('a failed unlink call', () => {
  test('S3.2 FR-008 FR-010 logs an error with the marker and outcome failed, and resolves so Pub/Sub does not retry', async () => {
    const log = fakeLog()
    const billing = fakeBilling(new Error('PERMISSION_DENIED: the caller lacks a permission'))
    await expect(runGuard(notice({ costAmount: 26 }), { billing, log, config: LIVE })).resolves.toBeDefined()
    expect(log.lines).toEqual([
      {
        severity: 'error',
        entry: {
          marker: MARKER,
          outcome: 'failed',
          project: PROJECT,
          costAmount: 26,
          budgetAmount: 25,
          error: 'PERMISSION_DENIED: the caller lacks a permission',
        },
      },
    ])
  })

  test('S3.2 FR-010 the next notice tries again', async () => {
    const failing = fakeBilling(new Error('UNAVAILABLE'))
    await runGuard(notice({ costAmount: 26 }), { billing: failing, log: fakeLog(), config: LIVE })
    const working = fakeBilling()
    await runGuard(notice({ costAmount: 26 }), { billing: working, log: fakeLog(), config: LIVE })
    expect(failing.calls).toEqual([PROJECT])
    expect(working.calls).toEqual([PROJECT])
  })
})

describe('below the budget, or not the budget', () => {
  test('S1.2 FR-005 makes no call and logs one info line with the spend and the budget, without the alert outcomes', async () => {
    const billing = fakeBilling()
    const log = fakeLog()
    await runGuard(notice({ costAmount: 3, alertThresholdExceeded: 0.12 }), { billing, log, config: LIVE })
    expect(billing.calls).toEqual([])
    expect(log.lines).toEqual([{ severity: 'info', entry: { marker: MARKER, outcome: 'below-budget', costAmount: 3, budgetAmount: 25 } }])
  })

  test('S2.1 FR-003 makes no call for another budget, and logs an error saying why', async () => {
    const billing = fakeBilling()
    const log = fakeLog()
    await runGuard(notice({ costAmount: 99 }, { budgetId: OTHER_BUDGET_ID }), { billing, log, config: LIVE })
    expect(billing.calls).toEqual([])
    expect(log.lines).toHaveLength(1)
    expect(log.lines[0]?.severity).toBe('error')
    expect(log.lines[0]?.entry).toMatchObject({ marker: MARKER, outcome: 'ignored' })
    expect(log.lines[0]?.entry.reason).toMatch(/\S/)
  })

  test('S3.3 after the budget is raised and billing relinked, a notice under the new budget makes no call', async () => {
    const billing = fakeBilling()
    await runGuard(notice({ costAmount: 30, budgetAmount: 50 }), { billing, log: fakeLog(), config: LIVE })
    expect(billing.calls).toEqual([])
  })
})

describe("the guard's project", () => {
  test('S2.2 FR-004 unlinks only projects/bradthome, whatever the notice says', async () => {
    const billing = fakeBilling()
    await runGuard(notice({ costAmount: 99, budgetDisplayName: 'projects/another-project' }, { project: 'projects/another-project' }), {
      billing,
      log: fakeLog(),
      config: LIVE,
    })
    expect(billing.calls).toEqual([PROJECT])
  })
})

describe('the Cloud Billing call', () => {
  test("FR-004 asks Cloud Billing to set the project's billing account to none, with the project's name", async () => {
    const requests: unknown[] = []
    const client = { updateProjectBillingInfo: (request: unknown) => (requests.push(request), Promise.resolve([{}])) }
    await cloudBilling(client).unlink(PROJECT)
    expect(requests).toEqual([{ name: PROJECT, projectBillingInfo: { billingAccountName: '' } }])
  })

  test('FR-004 refuses to unlink any project but bradthome, even if asked', async () => {
    const requests: unknown[] = []
    const client = { updateProjectBillingInfo: (request: unknown) => (requests.push(request), Promise.resolve([{}])) }
    await expect(cloudBilling(client).unlink('projects/another-project')).rejects.toThrow()
    expect(requests).toEqual([])
  })

  test("S3.2 FR-010 passes Cloud Billing's error up, for the guard to log", async () => {
    const client = { updateProjectBillingInfo: () => Promise.reject(new Error('PERMISSION_DENIED')) }
    await expect(cloudBilling(client).unlink(PROJECT)).rejects.toThrow('PERMISSION_DENIED')
  })
})
