---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D100
---

# The full CI suite runs when a pull request is ready

## Context and problem statement

Spec 002 ran every CI job on every pull request event (D55, D82), and an edit to a pull request's title or description started the whole run again. Slice 2.1 added eight jobs, and `tests (windows-2025)` takes 15 to 20 minutes, so each push cost a long wait, mostly for checks the git hooks had already run before the push. Brad asked for the full suite to run only at a gate point.

## Decision drivers

- Nothing merges without every check passing.
- A draft gets fast feedback on the checks that fail most.
- Privacy checks still read every change to a pull request's text.

## Considered options

1. Draft pull requests run the quick jobs. The slow ones run once a pull request is ready for review and on every push after that. An edit runs only privacy and commits, and the gate adds the commit's latest code results (chosen).
2. Run CI only at merge, through GitHub's merge queue. It isn't offered for a repo owned by a personal account.
3. Keep every job on every event.

## Decision outcome

Option 1, which Brad asked for in the slice 2.1 session on 2026-11-03 ([#17](https://github.com/memorex386/bradthome/issues/17)).

- `ci.yml` also runs on `ready_for_review`. On a draft, e2e, lighthouse, html and links don't run, and the Windows leg of the tests reports in without running them.
- An edit runs only privacy and commits, in its own concurrency group, so it doesn't cancel a code run.
- The gate expects the quick jobs on a draft and says the full suite runs once it's ready. On an edit's run it adds each job's latest result from the earlier runs for the same commit, so a failed code run still fails it. A ready pull request and a push to main need every job, as before.

### Consequences

- Good, because a draft's run takes a few minutes instead of about 20.
- Good, because the gate a merge depends on still needs every job, and a draft can't merge.
- Bad, because a draft's Windows and site problems show up only when it's marked ready.
- Neutral: marking a pull request ready starts its first full run.

### Confirmation

`tests/002/static/workflows.test.ts` checks each job's condition and the `ready_for_review` trigger, `tests/003/static/ci.test.ts` the new jobs' conditions, and `tests/002/unit/gate-modes.test.ts` the gate's draft and edit runs.

## More information

- Decided by: Brad Thome, in the slice 2.1 session, 2026-11-03, as a request in chat after PR #12 merged.
- Changed by [D115](0115-the-gate-reads-its-own-results-and-pr-text-has-its-own-check.md) on 2026-11-04. An edit to a pull request's text no longer runs `ci.yml`, and its gate no longer combines runs. `pr-text.yml`'s text check reads the title and description. The draft rule above still holds.
- Specs: [002, CI and rulesets](../../specs/002-ci-and-rulesets/spec.md) (FR-001, FR-003) and [003, skeleton and pipeline](../../specs/003-skeleton-and-pipeline/spec.md) (FR-007).
- Amended for now by [D161](0161-changes-go-straight-to-main.md) on 2026-11-06: changes push straight to main, so there's no draft-then-ready step. The rule holds again for any pull request that's still opened.
