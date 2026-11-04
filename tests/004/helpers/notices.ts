import type { BillingClient, LogEntry, Logger } from '../../../apps/cost-guard/src/guard.ts'

// Simulated budget notices and fakes for spec 004's tests. A notice is the
// Pub/Sub message Cloud Billing sends: attributes, and base64 JSON data with
// the budget's name, the actual spend, the budget and the currency. None of
// the IDs here is real.

export const BUDGET_ID = '00000000-0000-4000-8000-000000000004'
export const OTHER_BUDGET_ID = '00000000-0000-4000-8000-0000000000aa'
export const PROJECT = 'projects/bradthome'

export interface NoticeData {
  budgetDisplayName?: unknown
  costAmount?: unknown
  costIntervalStart?: unknown
  budgetAmount?: unknown
  budgetAmountType?: unknown
  alertThresholdExceeded?: unknown
  forecastThresholdExceeded?: unknown
  currencyCode?: unknown
}

export interface Message {
  attributes?: Record<string, string>
  data?: string
}

const BASE: NoticeData = {
  budgetDisplayName: 'bradthome monthly',
  costAmount: 3,
  costIntervalStart: '2026-11-01T07:00:00Z',
  budgetAmount: 25,
  budgetAmountType: 'SPECIFIED_AMOUNT',
  currencyCode: 'USD',
}

/** A notice from the configured budget, with any fields replaced. */
export function notice(data: NoticeData = {}, attributes: Record<string, string> = {}): Message {
  return {
    attributes: { billingAccountId: '000000-000000-000000', budgetId: BUDGET_ID, schemaVersion: '1.0', ...attributes },
    data: Buffer.from(JSON.stringify({ ...BASE, ...data })).toString('base64'),
  }
}

/** A notice whose data is the given text, base64 encoded as Pub/Sub sends it. */
export function rawNotice(text: string, attributes: Record<string, string> = { budgetId: BUDGET_ID }): Message {
  return { attributes, data: Buffer.from(text).toString('base64') }
}

/** A billing client that records each unlink, and fails when told to. */
export function fakeBilling(fail?: Error): BillingClient & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    unlink(project: string): Promise<void> {
      calls.push(project)
      return fail === undefined ? Promise.resolve() : Promise.reject(fail)
    },
  }
}

/** A logger that keeps each line with its severity. */
export function fakeLog(): Logger & { lines: { severity: 'info' | 'error'; entry: LogEntry }[] } {
  const lines: { severity: 'info' | 'error'; entry: LogEntry }[] = []
  return {
    lines,
    info: (entry) => void lines.push({ severity: 'info', entry }),
    error: (entry) => void lines.push({ severity: 'error', entry }),
  }
}
