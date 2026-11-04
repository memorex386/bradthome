# Plan for spec 004: Cost guard

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved with this plan at Gate 1 |
| Status | Approved |

## Approach

**The package.** The guard is the workspace package `@bradthome/cost-guard` in `apps/cost-guard`, private, ES modules, with exact versions: `firebase-functions` 7.4.0, its peer `firebase-admin` 14.5.0, and `@google-cloud/billing` 6.2.0 for the unlink call (FR-001). Its code is in three files:

- `src/decide.ts` is pure. It reads a Pub/Sub message's attributes and data, and returns one decision: `unlink`, `dry-run`, `below-budget` or `ignore` with a reason (FR-002, FR-003, FR-005, FR-006, S1.1–S1.3, S1.5, S2.1). It compares `costAmount` with `budgetAmount`, at or above unlinks, and never reads `forecastThresholdExceeded`. It needs the configured budget ID to match the `budgetId` attribute, the currency to be `USD`, both numbers finite and the budget above zero.
- `src/guard.ts` takes a decision and acts, with the billing client and the logger passed in, so tests use fakes (S1.4, S3.1, S3.2). The project name is the constant `projects/bradthome`, and no notice field reaches it (FR-004, S2.2). Each run writes one structured line: `{ marker: 'cost-guard', outcome, costAmount, budgetAmount, reason? }`. An unlink, a dry-run and a failed call use the outcomes `unlinked`, `dry-run` and `failed` (FR-008). A failed call is logged and swallowed, so the run ends without an error and Pub/Sub doesn't retry it (FR-010). A response that billing is already off counts as done (S1.4).
- `src/index.ts` wires it to Firebase: `onMessagePublished` on topic `cost-guard`, region `us-central1`, `maxInstances: 1`, `minInstances: 0`, `memory: '256MiB'`, `cpu: 'gcf_gen1'`, `timeoutSeconds: 60`, `retry: false`, and `serviceAccount: 'cost-guard@bradthome.iam.gserviceaccount.com'` (FR-001, FR-011, S4.1). It reads two Firebase params: `BUDGET_ID`, a string, and `DRY_RUN`, a boolean that defaults to `true` (FR-006, FR-013).

**The unlink call.** `CloudBillingClient.updateProjectBillingInfo({ name: 'projects/bradthome', projectBillingInfo: { billingAccountName: '' } })`, the call Google's own sample makes. Cloud Billing checks `resourcemanager.projects.deleteBillingAssignment` on the project for it.

**The role, and why it's the narrowest.** Google's guide gives the function Billing Account Administrator on the billing account. That role can change every project the account pays for, so the guard doesn't get it. The guard's identity gets one custom project role, `costGuardUnlinker`, with the single permission `resourcemanager.projects.deleteBillingAssignment`, granted on `bradthome` only (FR-007, S2.3). That's the only permission Cloud Billing checks to remove a project's billing link. The predefined Project Billing Manager role adds `createBillingAssignment`, which the guard never needs. With no role on the billing account, the identity can't link any project to it, read its costs, or touch another project. SC-005 proves it with `projects.testIamPermissions` as the identity, on `bradthome` and on another of Brad's projects, without unlinking anything.

**The build and deploy.** `pnpm cost-guard:deploy` runs `scripts/cost-guard/deploy.ts` (FR-012, S4.2, D105):

1. It refuses unless the working tree is clean, and, without `--dry-run`, unless `HEAD` is on `origin/main`.
2. It reads the budget "bradthome monthly" with gcloud and takes its ID (FR-013). It refuses if there isn't exactly one.
3. It writes `apps/cost-guard/.env.bradthome`, ignored by git, with `BUDGET_ID` and `DRY_RUN` (true with `--dry-run`, otherwise false only when `--live` is passed too).
4. It compiles `src/` to `lib/` with the root TypeScript (`rewriteRelativeImportExtensions`), and runs `firebase deploy --only functions:costGuard --project bradthome --config apps/cost-guard/firebase.json` with the CLI the root already pins.

`apps/cost-guard/firebase.json` holds only the `functions` block, so the root `firebase.json`, the preview and spec 003's tests stay as they are. Each step's command goes through a runner that tests replace with a fake.

**The alert.** One Cloud Monitoring log alert policy with one condition, matching `jsonPayload.marker="cost-guard"` and an outcome of `unlinked`, `dry-run` or `failed` on the guard's Cloud Run service. It emails Brad's channel, at most once every 5 minutes (FR-009, D106). Brad's address lives only in the channel, never in the repo.

**Checks.** The root tsconfig includes `apps/cost-guard/src`, so `pnpm typecheck` and the Stop hook cover it. ESLint and Prettier keep their current scope (the site and scripts), which `scripts/cost-guard/` falls under.

## What exists today

- The `bradthome` project, on Blaze, with Pub/Sub, Cloud Billing, Logging and Monitoring APIs on, and none of Cloud Functions, Cloud Run, Cloud Build, Artifact Registry, Eventarc or Budgets.
- The budget "bradthome monthly": $25 a month, `bradthome` only, credits included, with current-spend emails at 4, 12, 20 and 100% and a forecast email at 100%, and no topic.
- Spec 003's keyless sign-in for previews. The guard doesn't reuse it: D105 keeps every deploy out of CI, so CI gets no new identity.
- `firebase-tools` 15.34.2 at the root, and gcloud on Brad's PC, signed in as Brad.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Billing Account Administrator, Google's sample role | It reaches every project on the account, which this slice must never do |
| Project Billing Manager | Works, but carries `createBillingAssignment`, which the guard doesn't need |
| A plain Cloud Run function with gcloud, or Python | Brad left the runtime open with cost as the only concern. All three cost the same, and Firebase keeps one deploy tool and one language (D104) |
| Deploy from CI on merge | Gives CI an identity that can change the guard, which D91 already flagged as a risk for previews (D105) |
| A pause label in place of raising the budget | A second switch Brad must remember (D107) |
| Checking billing first with `getBillingInfo` | Needs another permission. Unlinking twice is safe, so the guard doesn't check |
| Cloud Functions retries on failure | A retry loop on a broken call could run all day. The next notice is the retry |

## Decisions

- [D104](../../docs/decisions/0104-the-cost-guard-is-a-capped-firebase-function.md): a capped Firebase function in TypeScript.
- [D105](../../docs/decisions/0105-the-cost-guard-deploys-by-hand-from-a-repo-script.md): deployed by hand from a repo script.
- [D106](../../docs/decisions/0106-a-monitoring-alert-emails-brad-when-the-guard-fires.md): a Monitoring alert emails Brad.
- [D107](../../docs/decisions/0107-raise-the-budget-to-get-billing-back.md): raise the budget, then relink.

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| The custom role turns out not to be enough for the call | Low | SC-005's permission test before going live, and the dry-run live check. If it fails, fall back to Project Billing Manager on the project, still with no billing-account role, and ask Brad first |
| Cloud Build installs newer transitive packages than the lockfile tested | Low | Exact direct versions. The guard's logic has no dependency of its own apart from the billing client's one call |
| The forecast is mistaken for spend | Low | `decide` never reads it, and S1.3 tests it |
| A deploy arms the guard by accident | Low | Dry-run is the default. Only `--live` from `origin/main` turns it off, after SC-004 and Brad's yes |
| The guard fires on a real bill and something is deleted | Medium, if it ever fires | That's the stop working. The site is rebuilt from the repo; the runbook brings it back |
| The guard's own costs | Low | One instance at most, none warm, 256 MiB, a sixth of a vCPU, 60 seconds. At list prices, before any free tier: runs about $0.08 a month even at 72 notices a day, the image about $0.01, the alert about $0.10 (SC-003) |
| Billing is off when the guard needs redeploying | Low | The runbook relinks first |

## Tests to write

Not locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)). All in `tests/004/`.

| ID | Test file | Test name includes |
| --- | --- | --- |
| S1.1–S1.3, S1.5, S2.1, S2.2, FR-002–FR-006, SC-001, SC-002 | `unit/decide.test.ts` | each ID, over a table of simulated notices |
| S1.4, S2.2, S3.1, S3.2, S3.3, FR-004, FR-008, FR-010 | `unit/guard.test.ts` | each ID, with a fake billing client and logger |
| S4.2, FR-012, FR-013 | `unit/deploy.test.ts` | each ID, with a fake runner and git |
| S4.1, FR-001, FR-006, FR-011, FR-013 | `static/function.test.ts` | each ID, reading the exported function's settings |
| FR-015 | `static/workflows.test.ts` | `FR-015` |
| S2.3, FR-007, FR-009, FR-014, SC-003, SC-004, SC-005 | `static/evidence.test.ts` | each ID, reading `specs/004-cost-guard/evidence/` and the spec's runbook |

## Tasks

- [ ] **T001** Write the tests above, before the code (all IDs).
- [ ] **T002** Add `apps/cost-guard` with its package, tsconfig and Firebase config, and the root tsconfig include (FR-001).
- [ ] **T003** Build `decide.ts` and `guard.ts` until the unit tests pass (FR-002–FR-006, FR-008, FR-010).
- [ ] **T004** Build `index.ts` with the settings and params (FR-001, FR-006, FR-011, FR-013).
- [ ] **T005** Build `scripts/cost-guard/deploy.ts` and `pnpm cost-guard:deploy` (FR-012, FR-013).
- [ ] **T006** Settings 1, 2, 4 and 5 from the spec, each after Brad's yes.
- [ ] **T007** Setting 3, the budget's topic, after Brad's go-ahead for the billing change.
- [ ] **T008** Settings 6 and 7: deploy in dry-run, the cleanup policy, the channel and alert. Record SC-005's permission test.
- [ ] **T009** The live check (SC-004): with Brad's go-ahead, publish one simulated over-budget notice to the topic, and record the dry-run line and the email's arrival time.
- [ ] **T010** Docs: AGENTS.md's repo map, the plan's row and changes, the decision index.
- [ ] **T011** Review with the pinned reviewer, and handle every finding.
- [ ] **T012** After Brad's merge and yes: setting 8, `pnpm cost-guard:deploy --live` from main.

## Preview and rollback

There's nothing to preview: the site doesn't change, and the preview workflow is untouched. To roll back, delete the function, the alert, the channel, the service account and its role binding, the custom role, and the topic, and remove the topic from the budget. The budget's emails go on as before.

## Approval

- Gate 1: approved by Brad, with the spec, in the slice 2.2 session on 2026-11-03 ([recorded on the pull request](https://github.com/memorex386/bradthome/pull/25#issuecomment-6617262116)).
