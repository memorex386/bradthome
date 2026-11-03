// The cost guard's decision from one budget notice (spec 004, FR-002 to
// FR-006). Pure: it reads the notice and says what to do. Cloud Billing sends
// the notice to the topic several times a day, with the month's actual spend
// (costAmount) and the budget (budgetAmount). The guard decides from those two
// alone and never reads the forecast.

/** The one project the guard can ever name (FR-004, S2.2). */
export const PROJECT = 'projects/bradthome'

/** The Pub/Sub message as the trigger hands it over: attributes, and base64 JSON data. */
export interface BudgetMessage {
  attributes?: Record<string, string>
  data?: string
}

export interface GuardConfig {
  /** The budget whose notices count, read from Google Cloud at deploy time (FR-013). */
  budgetId: string
  /** On unless the deploy turns it off (FR-006). */
  dryRun: boolean
}

export type Decision =
  | { action: 'unlink' | 'dry-run'; project: typeof PROJECT; costAmount: number; budgetAmount: number }
  | { action: 'below-budget'; costAmount: number; budgetAmount: number }
  | { action: 'ignore'; reason: string }

const ignore = (reason: string): Decision => ({ action: 'ignore', reason })

function readData(data: string | undefined): Record<string, unknown> | undefined {
  if (data === undefined || data === '') return undefined
  try {
    const parsed: unknown = JSON.parse(Buffer.from(data, 'base64').toString('utf8'))
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

/** What the guard does with one notice. */
export function decide(message: BudgetMessage, config: GuardConfig): Decision {
  if (config.budgetId === '') return ignore('no budget ID is configured')
  const budgetId = message.attributes?.budgetId
  if (budgetId !== config.budgetId) return ignore(budgetId === undefined ? 'the notice names no budget' : 'the notice is from another budget')
  const data = readData(message.data)
  if (data === undefined) return ignore("the notice's data isn't a JSON object")
  if (data.currencyCode !== 'USD') return ignore("the notice's currency isn't USD")
  const { costAmount, budgetAmount } = data
  if (typeof costAmount !== 'number' || !Number.isFinite(costAmount) || costAmount < 0) return ignore("the notice's spend isn't a number of dollars")
  if (typeof budgetAmount !== 'number' || !Number.isFinite(budgetAmount) || budgetAmount <= 0) return ignore("the notice's budget isn't above zero")
  if (costAmount < budgetAmount) return { action: 'below-budget', costAmount, budgetAmount }
  return { action: config.dryRun ? 'dry-run' : 'unlink', project: PROJECT, costAmount, budgetAmount }
}
