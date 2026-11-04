# The live check, in dry-run

With Brad's go-ahead, the builder published a simulated notice to the topic `cost-guard` with `gcloud pubsub topics publish`: the budget's real ID as `budgetId`, $26 spent of a $25 budget, in USD. The guard was in dry-run.

## The first try, 2026-11-03

Published at 22:50:46 UTC. Pub/Sub's pushes were refused with HTTP 403 until 23:43, because the trigger signs in as `cost-guard`, which had no Cloud Run Invoker role on its own service. With Brad's yes the role was granted on the service `costguard` only. Pub/Sub's retries then delivered it: the dry-run line was logged at 23:46:42 and the alert email arrived at 23:47:04, 22 seconds later. A real budget notice also arrived at 23:43:51 and logged `below-budget`, $0 of $25.

## The timed run, 2026-11-04

These lines are the one the test reads.

- mode: dry-run
- published: 2026-11-04T01:03:52Z
- logged outcome: dry-run
- logged at: 2026-11-04T01:03:55Z
- logged call: updateProjectBillingInfo projects/bradthome billingAccountName=''
- alert email received: 2026-11-04T01:04:21Z
- minutes from publish to email: 0.5
- billing still linked after the check: yes
