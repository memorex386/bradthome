---
status: proposed
date: 2026-11-01
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D82
---

# The conventions batch for building CI

## Context and problem statement

Slice 1.4 adds the repo's first GitHub Actions workflows. [D49](0049-the-ci-and-safety-batch.md), [D55](0055-split-the-required-checks-by-determinism.md), [D80](0080-land-the-checks-now-and-the-ruleset-when-the-repo-goes-public.md) and [D81](0081-the-conventions-batch-for-ci-and-the-ruleset.md) settle what CI checks. The [plan for spec 002](../../specs/002-ci-and-rulesets/plan.md) needs a few conventions for how it's built, which later slices' workflows will reuse:

- which actions a workflow may use, and how tools are pinned
- where the checks' logic lives
- how the lock check reads a pull request without running it
- where planted failures run, and where the evidence of real runs goes

Conventions are tier 2, so they go to Brad as one batch, with the plan at Gate 2. Approve the batch?

## Considered options

The options are listed in the builder's ranked order.

1. Approve all (recommended)
2. Approve all except the ones Brad names
3. Discuss each one

## Decision outcome

Proposed: "Approve all".

- **First-party actions only, pinned by commit hash.** A workflow uses GitHub's own actions, such as checkout and setup-node, each pinned to a full commit hash. pnpm comes through Corepack, which reads the hash-pinned `packageManager`. gitleaks comes from its release, checked against a pinned SHA-256 hash. No third-party code runs with a job's token.
- **The checks' logic lives in `scripts/ci/`.** Each job runs one script, and the scripts share `scripts/lib/` with the git hooks. The hooks and CI apply the same rules with the same messages, and the logic is unit-tested like the rest.
- **The lock check reads the pull request as data.** It runs on `pull_request_target` from main's checkout, fetches the pull request's head as git objects, and reads them with git. It never checks out, installs or runs the pull request's code, uses no secrets, and its token is read-only.
- **Planted failures run in a private sandbox.** A private repo under the agent's account holds a copy of the branch and a made-up term list as its secrets. A real private term never goes to GitHub, and the sandbox's runs don't spend this repo's minutes.
- **Evidence from real CI runs is committed.** Each run that proves a state only GitHub can show is recorded, with its link and result, in `specs/NNN-name/evidence/ci-runs.md`, and a locked test reads it, as [D78](0078-the-conventions-batch-for-tests-locks-and-machine-setup.md) set for other evidence.

### Consequences

- Good, because the workflows trust only GitHub's own code, and every tool's version is fixed.
- Good, because a rule changes in one place for both the hooks and CI.
- Good, because a pull request can't change the lock check's verdict, even by editing the check.
- Good, because every kind of leak can be planted on GitHub without a real term leaving Brad's PC.
- Bad, because installing gitleaks by hand takes a few more workflow lines than an action would.
- Bad, because the sandbox is one more repo to keep private and archive later.

### Confirmation

Spec 002's tests confirm the batch:

- A static test checks every action's pin, the permissions and the lock workflow's shape (FR-011, FR-014).
- The lock test shows a pull request that edits the check doesn't change its verdict (S3.3).
- The evidence test reads the sandbox's planted-failure runs (SC-001, SC-003).

## More information

- Proposed in: the [plan for spec 002](../../specs/002-ci-and-rulesets/plan.md), for Brad's approval at Gate 2 on [#6](https://github.com/memorex386/bradthome/pull/6).
- Builds on: [D21](0021-lock-tests-written-from-approved-scenarios.md) (locked tests), [D27](0027-the-conventions-batch-for-templates-ids-and-records.md) (the private-term list), [D49](0049-the-ci-and-safety-batch.md) (CI and safety), [D73](0073-keep-the-agent-on-its-own-github-account.md) (the agent's account) and [D78](0078-the-conventions-batch-for-tests-locks-and-machine-setup.md) (evidence).
