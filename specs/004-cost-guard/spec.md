# Spec 004: Cost guard

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Draft |
| Slice | 2.2 Cost guard |
| Branch | `004-cost-guard` |
| Mocks and flows | None: nothing a person sees changes, so "Show it" is skipped ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)). The flow is under "How it fits together". |
| Plan | [plan.md](plan.md), approved with this spec at Gate 1 |
| Decisions | [D103](../../docs/decisions/0103-the-cost-guard-is-a-capped-firebase-function.md), [D104](../../docs/decisions/0104-the-cost-guard-deploys-by-hand-from-a-repo-script.md), [D105](../../docs/decisions/0105-a-monitoring-alert-emails-brad-when-the-guard-fires.md) and [D106](../../docs/decisions/0106-raise-the-budget-to-get-billing-back.md), from this slice's interview. It builds on [D50](../../docs/decisions/0050-industry-standard-by-default.md), [D52](../../docs/decisions/0052-firebase-hosting-on-blaze-with-the-api-on-cloud-run.md), [D57](../../docs/decisions/0057-six-layers-of-cost-stops.md), [D91](../../docs/decisions/0091-preview-channels-on-the-live-firebase-project.md) and [D100](../../docs/decisions/0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md). |

## Summary

D57 keeps six layers of cost stops, and the last is the disaster stop: if the `bradthome` project spends more than $25 in a month, billing is unlinked and everything in the project stops. This slice builds it. The project's existing budget, "bradthome monthly", starts sending its notices to a Pub/Sub topic, and a small function reads each one. When the month's actual spend reaches the budget, the function unlinks billing from `bradthome`, and only from `bradthome`. Below it, the function writes one log line and does nothing else. The billing account also pays for other projects, so the guard's identity holds one permission on this project and no role on the billing account. Brad's only concern is runaway cost, so the guard itself is capped to cost nothing, and it's proven with simulated notices and a fake billing client. The real project's billing is never unlinked to test it.

## Scope

**In:**

- The guard: a Cloud Functions for Firebase function (2nd gen) in TypeScript, in the workspace package `apps/cost-guard`, triggered by the budget's Pub/Sub topic, in the `bradthome` project ([D103](../../docs/decisions/0103-the-cost-guard-is-a-capped-firebase-function.md)).
- A dry-run mode that logs the call the guard would make and makes none.
- A repo script, `pnpm cost-guard:deploy`, that Brad's agent runs by hand with Brad's go-ahead ([D104](../../docs/decisions/0104-the-cost-guard-deploys-by-hand-from-a-repo-script.md)). CI never deploys the guard.
- A Cloud Monitoring alert that emails Brad when the guard unlinks billing or would have in dry-run, or when its call fails ([D105](../../docs/decisions/0105-a-monitoring-alert-emails-brad-when-the-guard-fires.md)).
- A runbook for getting billing back ([D106](../../docs/decisions/0106-raise-the-budget-to-get-billing-back.md)).
- The Google Cloud settings listed under "Settings this slice changes", each made at the build after Brad's yes.
- Docs: AGENTS.md's repo map, the plan's slice row and changes, and records D103 to D106.

**Out:**

- D57's $5 Cloud Run spend cap. Nothing runs on Cloud Run yet apart from this guard, which is capped by its own settings, so the cap waits for the API in phase 4, when there's a service to cap. Noted in the plan.
- Any change to the budget's amount or its email thresholds. They stay at $25 with emails at $1, $3, $5 and $25.
- Deploying the guard from CI, and any new permission for CI's identities.
- Unlinking the real project's billing to test the guard.

## How it fits together

1. Cloud Billing sends the budget's notice to the topic several times a day, with the month's actual spend (`costAmount`) and the budget (`budgetAmount`).
2. The topic starts the guard.
3. The guard checks the notice belongs to "bradthome monthly", in US dollars, and compares the actual spend with the budget. It ignores the forecast.
4. At or above the budget, it asks Cloud Billing to unlink billing from `projects/bradthome`. Below it, it logs one line and stops.
5. Its log line about the unlink starts a Monitoring alert, which emails Brad.

## User stories and acceptance scenarios

### Story 1: Spend at the limit unlinks billing (P1)

Brad wants the project to stop costing money once a month's spend reaches $25, without anyone watching.

**Why this priority:** it's the slice: D57's last stop against a runaway bill.

**Independent test:** feed the guard simulated notices with a fake billing client, and check which calls it makes.

- **S1.1** Given a notice from "bradthome monthly" whose actual spend equals or passes its budget, when the guard runs, then it makes exactly one call to unlink billing, and the call names `projects/bradthome`.
- **S1.2** Given a notice whose actual spend is below the budget, such as $3 of $25 with a threshold passed, when the guard runs, then it makes no billing call and logs one line with the spend and the budget.
- **S1.3** Given a notice whose forecast passes the budget but whose actual spend doesn't, when the guard runs, then it makes no billing call.
- **S1.4** Given billing is already unlinked and another notice over the budget arrives, when the guard runs, then it calls unlink again, the call succeeding or reporting nothing to change is treated as done, and nothing fails.
- **S1.5** Given dry-run mode is on and a notice over the budget arrives, when the guard runs, then it makes no billing call and logs the exact call it would have made.

### Story 2: Only `bradthome` can ever be touched (P1)

The billing account also pays for Brad's other projects, so Brad wants a guarantee that no notice, setting or bug can reach them.

**Why this priority:** a guard that could unlink the wrong project is worse than none.

**Independent test:** read the code and the settings script, and send the guard notices that name other budgets, accounts or projects.

- **S2.1** Given a notice from any other budget, or one that can't be read, when the guard runs, then it makes no billing call and logs why.
- **S2.2** Given any notice at all, when the guard decides to unlink, then the project it names is the fixed `projects/bradthome`, and nothing in the notice can change it.
- **S2.3** Given the guard's identity, when its roles are listed, then it holds one custom role on the `bradthome` project, granting only the permission to remove that project's billing link, and no role on the billing account or any other project.

### Story 3: Brad hears it fired and can get billing back (P2)

When the guard fires, Brad wants an email within minutes, and a short, sure way to bring the site back once the cause is fixed.

**Why this priority:** a stopped site Brad doesn't know about is an outage; a guard Brad can't undo is a trap.

**Independent test:** check the log lines the alert matches, and walk the runbook against simulated notices.

- **S3.1** Given the guard unlinks billing, or would have in dry-run, when it logs, then the line carries a fixed marker that the Monitoring alert matches.
- **S3.2** Given the unlink call fails, when the guard runs, then it logs the error with the same marker and a different outcome, so the alert still fires, and the next notice tries again.
- **S3.3** Given Brad has followed the runbook (raised the budget, then relinked billing), when the next notice arrives with spend below the new budget, then the guard makes no billing call.

### Story 4: The guard can't run up a bill itself (P2)

Brad's main worry is runaway cost, so the guard must not become one.

**Why this priority:** a stop that costs money defeats itself.

**Independent test:** read the function's settings and the deploy script.

- **S4.1** Given the function's settings, when they're read, then it runs at most one instance, keeps none warm, uses the smallest memory size, times out in a minute and doesn't retry failed runs.
- **S4.2** Given the deploy script, when it runs, then it deploys only this function, only to `bradthome`, and only from a clean checkout of a commit on `origin/main`, unless asked for a dry-run-only deploy from a branch.

## Edge cases

- A notice in a currency other than US dollars: no billing call, with an error line. Covered by S2.1 and FR-003.
- A notice with a budget of zero or less, or numbers that aren't finite: treated as unreadable. Covered by S2.1 and FR-003.
- Spend exactly at the budget: unlinks, since D57 says the stop is at $25. Covered by S1.1 and FR-004.
- Pub/Sub delivers the same notice twice: two unlink calls, both safe. Covered by S1.4.
- A new month starts after an unlink: billing stays unlinked until Brad relinks it. Covered by the runbook and S3.3.
- Someone with rights on the project publishes a fake notice to the topic: it must name the right budget, and the worst it can do is the stop itself. Only project owners can publish today. Covered by S2.1 and FR-003.
- The guard is redeployed while billing is unlinked: the deploy can't run, since Cloud Build needs billing. The runbook says to relink first.

## Functional requirements

- **FR-001** The guard MUST run as a Cloud Functions for Firebase function (2nd gen), in TypeScript, in the `bradthome` project, triggered by the budget's Pub/Sub topic.
- **FR-002** The guard MUST decide from the notice's actual spend (`costAmount`) and budget (`budgetAmount`), and MUST ignore the forecast.
- **FR-003** The guard MUST act only on a readable notice from the configured budget, in US dollars, with a finite spend and a budget above zero. Anything else MUST make no billing call and log an error line saying why.
- **FR-004** When the actual spend is at or above the budget, the guard MUST ask Cloud Billing to unlink billing from `projects/bradthome`, a name fixed in the code.
- **FR-005** Below the budget, the guard MUST make no billing call and MUST log one line with the spend and the budget.
- **FR-006** A dry-run mode MUST log the exact call the guard would make and MUST make no billing call. The mode MUST be on unless the deploy turns it off.
- **FR-007** The guard's identity MUST be a dedicated service account with no keys, holding only a custom role on the `bradthome` project with the single permission `resourcemanager.projects.deleteBillingAssignment`, and no role on the billing account.
- **FR-008** Each unlink, dry-run unlink and failed call MUST log a line with the marker `cost-guard` and an outcome of `unlinked`, `dry-run` or `failed`.
- **FR-009** A Cloud Monitoring alert MUST email Brad within minutes of a line from FR-008.
- **FR-010** A failed unlink call MUST be logged and MUST NOT make Pub/Sub retry the run. The next notice tries again.
- **FR-011** The function MUST run at most one instance, keep none warm, use 256 MiB or less, and time out within 60 seconds.
- **FR-012** `pnpm cost-guard:deploy` MUST deploy only this function, only to `bradthome`, and only from a clean checkout at a commit on `origin/main`, unless run with `--dry-run`, which allows any clean commit and deploys with dry-run on.
- **FR-013** The guard's code and settings MUST NOT hold a billing account ID, a budget ID or an email address. The deploy reads the budget's ID from Google Cloud at deploy time.
- **FR-014** The spec MUST give a runbook for getting billing back: fix the cause, raise the budget for the rest of the month, relink billing, then set the budget back to $25 at the start of the next month.
- **FR-015** No workflow in `.github/` MUST deploy the guard or hold a Google sign-in that could.

## Success criteria

- **SC-001** Across every simulated notice at or above its budget, the guard makes one unlink call naming `projects/bradthome`, and across every simulated notice below it, it makes none.
- **SC-002** No notice, however it's built, makes the guard name any project but `bradthome`.
- **SC-003** The guard's own cost is under $0.01 a month at the budget's notice rate.
- **SC-004** In the live check, in dry-run, a simulated over-budget notice published to the topic reaches Brad as an email within 15 minutes.
- **SC-005** A permission test as the guard's identity shows it can remove `bradthome`'s billing link and can't create one, on `bradthome` or any other project.

## Runbook: getting billing back

1. Find what spent the money, in the console's billing reports for `bradthome`, and stop it.
2. Raise "bradthome monthly" above this month's spend, with room to spare.
3. Relink billing to `bradthome` in the console (Billing, My projects).
4. Check the site is served, and that the next notice logs "below budget".
5. At the start of next month, set the budget back to $25.

## Key entities

- **Budget notice:** a Pub/Sub message from Cloud Billing. Its data holds the budget's name, the actual spend, the budget, the currency, the period's start and any thresholds passed. Its attributes hold the budget's ID and the billing account's ID.
- **Decision:** what the guard does with a notice: unlink, dry-run, below budget, or ignore with a reason.

## Settings this slice changes

Each is made at the build by the agent with Brad's Google login, after Brad's yes to that step. None is in the repo.

1. Turn on Cloud Functions, Cloud Run, Cloud Build, Artifact Registry, Eventarc and Cloud Billing Budget APIs on `bradthome`.
2. Make the Pub/Sub topic `cost-guard` in `bradthome`.
3. Connect "bradthome monthly" to the topic, keeping its emails as they are. This changes the billing account's budget, so it needs Brad's go-ahead on its own.
4. Make the custom role `costGuardUnlinker` on `bradthome`, with only `resourcemanager.projects.deleteBillingAssignment`.
5. Make the service account `cost-guard` in `bradthome`, with no keys, and grant it that role on `bradthome` only.
6. Deploy the function in dry-run, and set Artifact Registry's cleanup to keep only the latest image.
7. Make the email notification channel for Brad and the log alert from FR-009.
8. After the live check (SC-004) and Brad's yes, redeploy with dry-run off.

## Assumptions

- The budget "bradthome monthly" covers only `bradthome`, with credits included, which it does on 2026-11-03.
- Cloud Billing's notices arrive several times a day, so the stop lags actual spend by hours, as D57 expects of this layer.
- Removing billing stops every paid service in the project, and Google may delete some resources. The site is static and rebuilt from the repo, so nothing is lost that the repo doesn't hold.

## Open questions

None.

## Decisions made while writing this spec

- Tier 1: [D103](../../docs/decisions/0103-the-cost-guard-is-a-capped-firebase-function.md) the runtime, [D104](../../docs/decisions/0104-the-cost-guard-deploys-by-hand-from-a-repo-script.md) the deploy, [D105](../../docs/decisions/0105-a-monitoring-alert-emails-brad-when-the-guard-fires.md) the alert, [D106](../../docs/decisions/0106-raise-the-budget-to-get-billing-back.md) the recovery.
- Tier 3: below the budget the guard only logs, since the budget's own emails cover the lower thresholds. Spend exactly at the budget unlinks. The guard's role is a custom one on the project, not Google's suggested Billing Account Administrator, which could reach the other projects. Dry-run is the default, so a deploy can't arm the guard by accident.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/004/`. The traceability check fails the build if one doesn't. These tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: waiting for Brad's approval of this spec and its plan, as a comment on the pull request.
