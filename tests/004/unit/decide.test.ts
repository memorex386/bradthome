import { describe, expect, test } from 'vitest'
import { decide } from '../../../apps/cost-guard/src/decide.ts'
import { BUDGET_ID, notice, OTHER_BUDGET_ID, PROJECT, rawNotice } from '../helpers/notices.ts'

// The guard's decision from one budget notice (FR-002 to FR-006, S1.1–S1.3,
// S1.5, S2.1, S2.2, SC-001, SC-002). decide is pure: it reads the notice and
// returns what to do, and never calls anything.

const LIVE = { budgetId: BUDGET_ID, dryRun: false }
const DRY = { budgetId: BUDGET_ID, dryRun: true }

describe('a notice at or above the budget', () => {
  test('S1.1 FR-004 unlinks projects/bradthome when the spend passes the budget', () => {
    expect(decide(notice({ costAmount: 25.01 }), LIVE)).toEqual({ action: 'unlink', project: PROJECT, costAmount: 25.01, budgetAmount: 25 })
  })

  test('S1.1 FR-004 unlinks when the spend equals the budget exactly', () => {
    expect(decide(notice({ costAmount: 25, alertThresholdExceeded: 1 }), LIVE)).toMatchObject({ action: 'unlink', project: PROJECT })
  })

  test('S1.5 FR-006 in dry-run, decides dry-run instead of unlink, with the same project', () => {
    expect(decide(notice({ costAmount: 40 }), DRY)).toEqual({ action: 'dry-run', project: PROJECT, costAmount: 40, budgetAmount: 25 })
  })
})

describe('a notice below the budget', () => {
  test('S1.2 FR-005 decides below-budget at $3 of $25 with a threshold passed', () => {
    expect(decide(notice({ costAmount: 3, alertThresholdExceeded: 0.12 }), LIVE)).toEqual({ action: 'below-budget', costAmount: 3, budgetAmount: 25 })
  })

  test('S1.2 FR-005 decides below-budget a cent under the budget', () => {
    expect(decide(notice({ costAmount: 24.99 }), LIVE)).toMatchObject({ action: 'below-budget' })
  })

  test('S1.2 FR-005 decides below-budget for a spend below zero, as credits and refunds can make it', () => {
    expect(decide(notice({ costAmount: -1.5 }), LIVE)).toEqual({ action: 'below-budget', costAmount: -1.5, budgetAmount: 25 })
  })

  test('S1.3 FR-002 ignores the forecast, however far past the budget it is', () => {
    expect(decide(notice({ costAmount: 4, forecastThresholdExceeded: 1 }), LIVE)).toMatchObject({ action: 'below-budget' })
    expect(decide(notice({ costAmount: 4, forecastThresholdExceeded: 9, alertThresholdExceeded: 1 }), LIVE)).toMatchObject({ action: 'below-budget' })
  })

  test('FR-002 decides from costAmount even when alertThresholdExceeded says 100%', () => {
    expect(decide(notice({ costAmount: 10, alertThresholdExceeded: 1 }), LIVE)).toMatchObject({ action: 'below-budget' })
  })
})

describe('a notice the guard must not act on', () => {
  const cases: [string, ReturnType<typeof notice>][] = [
    ['another budget', notice({ costAmount: 99 }, { budgetId: OTHER_BUDGET_ID })],
    ['no budget ID', { ...notice({ costAmount: 99 }), attributes: {} }],
    ['no data', { attributes: { budgetId: BUDGET_ID } }],
    ['data that is not JSON', rawNotice('not json')],
    ['JSON that is not an object', rawNotice('[1, 2]')],
    ['another currency', notice({ costAmount: 99, currencyCode: 'EUR' })],
    ['no currency', notice({ costAmount: 99, currencyCode: undefined })],
    ['a spend as text', notice({ costAmount: '99' })],
    ['a spend that is not finite', rawNotice('{"costAmount": 1e999, "budgetAmount": 25, "currencyCode": "USD"}')],
    ['a budget of zero', notice({ costAmount: 1, budgetAmount: 0 })],
    ['a negative budget', notice({ costAmount: 1, budgetAmount: -25 })],
    ['a missing budget', notice({ costAmount: 99, budgetAmount: undefined })],
  ]

  for (const [name, message] of cases) {
    test(`S2.1 FR-003 ignores ${name}, with a reason`, () => {
      const decision = decide(message, LIVE)
      expect(decision.action).toBe('ignore')
      if (decision.action === 'ignore') expect(decision.reason).toMatch(/\S/)
    })
  }

  test('S2.1 FR-003 ignores every notice when no budget ID is configured', () => {
    expect(decide(notice({ costAmount: 99 }), { budgetId: '', dryRun: false })).toMatchObject({ action: 'ignore' })
  })
})

describe('the project the guard names', () => {
  test('S2.2 FR-004 names projects/bradthome whatever the notice says about other projects', () => {
    const tricky = notice(
      { costAmount: 99, budgetDisplayName: 'projects/another-project' },
      { projectId: 'another-project', project: 'projects/another-project', name: 'projects/another-project' },
    )
    expect(decide(tricky, LIVE)).toMatchObject({ project: PROJECT })
  })
})

describe('across many notices', () => {
  // A fixed grid of spends and budgets, so the run is the same every time.
  const spends = [0, 0.01, 1, 3, 5, 12.5, 24.99, 25, 25.01, 50, 1000]
  const budgets = [1, 25, 50, 100]

  test('SC-001 every notice at or above its budget unlinks, and every one below it does not', () => {
    for (const budgetAmount of budgets) {
      for (const costAmount of spends) {
        const decision = decide(notice({ costAmount, budgetAmount }), LIVE)
        expect(decision.action, `${costAmount} of ${budgetAmount}`).toBe(costAmount >= budgetAmount ? 'unlink' : 'below-budget')
      }
    }
  })

  test('SC-002 FR-004 no notice makes the guard name a project other than bradthome', () => {
    const attributes = ['projects/a', 'another-project', '../other', 'projects/bradthome-2', '']
    for (const attribute of attributes) {
      for (const costAmount of spends) {
        const decision = decide(notice({ costAmount, budgetDisplayName: attribute }, { project: attribute, projectId: attribute }), LIVE)
        if ('project' in decision) expect(decision.project).toBe(PROJECT)
      }
    }
  })

  test('S1.1 FR-006 dry-run never decides unlink', () => {
    for (const costAmount of spends) expect(decide(notice({ costAmount }), DRY).action).not.toBe('unlink')
  })
})
