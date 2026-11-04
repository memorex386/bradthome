import { type BudgetMessage, decide, type GuardConfig } from './decide.ts'

// The cost guard acting on its decision (spec 004, FR-004, FR-005, FR-008,
// FR-010). The billing client and the logger are passed in, so tests use
// fakes and the real project's billing is never touched. Each run writes one
// structured line; Cloud Monitoring's alert matches the marker and the
// outcomes unlinked, dry-run and failed (FR-009).

export const MARKER = 'cost-guard'

export interface BillingClient {
  /** Removes the project's billing link. Resolves when it's done, including when it was already off. */
  unlink(project: string): Promise<void>
}

export interface LogEntry {
  marker: typeof MARKER
  outcome: 'unlinked' | 'dry-run' | 'failed' | 'below-budget' | 'ignored'
  project?: string
  costAmount?: number
  budgetAmount?: number
  call?: string
  error?: string
  reason?: string
}

export interface Logger {
  info(entry: LogEntry): void
  error(entry: LogEntry): void
}

export interface GuardDeps {
  billing: BillingClient
  log: Logger
  config: GuardConfig
}

/** Runs the guard on one notice. It never rejects, so Pub/Sub never retries a run (FR-010). */
export async function runGuard(message: BudgetMessage, { billing, log, config }: GuardDeps): Promise<LogEntry> {
  const decision = decide(message, config)
  let entry: LogEntry
  switch (decision.action) {
    case 'ignore':
      entry = { marker: MARKER, outcome: 'ignored', reason: decision.reason }
      log.error(entry)
      return entry
    case 'below-budget':
      entry = { marker: MARKER, outcome: 'below-budget', costAmount: decision.costAmount, budgetAmount: decision.budgetAmount }
      log.info(entry)
      return entry
    case 'dry-run':
      entry = {
        marker: MARKER,
        outcome: 'dry-run',
        project: decision.project,
        costAmount: decision.costAmount,
        budgetAmount: decision.budgetAmount,
        call: `updateProjectBillingInfo ${decision.project} billingAccountName=''`,
      }
      log.info(entry)
      return entry
    case 'unlink': {
      const base = { marker: MARKER, project: decision.project, costAmount: decision.costAmount, budgetAmount: decision.budgetAmount } as const
      try {
        await billing.unlink(decision.project)
        entry = { ...base, outcome: 'unlinked' }
        log.info(entry)
      } catch (error) {
        entry = { ...base, outcome: 'failed', error: error instanceof Error ? error.message : String(error) }
        log.error(entry)
      }
      return entry
    }
  }
}
