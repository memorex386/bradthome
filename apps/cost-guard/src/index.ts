import { CloudBillingClient } from '@google-cloud/billing'
import { logger } from 'firebase-functions'
import { defineBoolean, defineString } from 'firebase-functions/params'
import { onMessagePublished } from 'firebase-functions/v2/pubsub'
import { cloudBilling } from './billing.ts'
import { runGuard } from './guard.ts'

// The cost guard: D57's disaster stop (spec 004). The budget "bradthome
// monthly" sends its notices to the topic cost-guard, and this function
// unlinks billing from bradthome when the month's actual spend reaches the
// budget. It's capped so it can't run up a bill itself (FR-011, D104): one
// instance at most, none kept warm, the smallest memory and CPU, a minute, and no
// retries, since the next notice is the retry (FR-010). pnpm cost-guard:deploy
// writes the two params into .env.bradthome (FR-013, D105).

/** The budget's ID, read from Google Cloud at deploy time, never committed. */
export const budgetId = defineString('BUDGET_ID')
/** Dry-run unless a deploy from main turns it off (FR-006). */
export const dryRun = defineBoolean('DRY_RUN', { default: true })

export const SERVICE_ACCOUNT = 'cost-guard@bradthome.iam.gserviceaccount.com'

let billing: ReturnType<typeof cloudBilling> | undefined

export const costGuard = onMessagePublished(
  {
    topic: 'cost-guard',
    region: 'us-central1',
    maxInstances: 1,
    minInstances: 0,
    memory: '256MiB',
    // A sixth of a vCPU, Cloud Functions' first-generation size for 256 MiB.
    // Without it a 2nd gen function gets a whole one, at six times the price.
    cpu: 'gcf_gen1',
    timeoutSeconds: 60,
    retry: false,
    serviceAccount: SERVICE_ACCOUNT,
  },
  async (event) => {
    billing ??= cloudBilling(new CloudBillingClient())
    const { attributes, data } = event.data.message
    await runGuard(
      { attributes, data },
      {
        billing,
        // The entry's fields become the log's jsonPayload, which the alert matches.
        log: {
          info: (entry) => logger.info(`cost-guard ${entry.outcome}`, entry),
          error: (entry) => logger.error(`cost-guard ${entry.outcome}`, entry),
        },
        config: { budgetId: budgetId.value(), dryRun: dryRun.value() },
      },
    )
  },
)
