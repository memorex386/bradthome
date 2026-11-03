---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D95
---

# Spec 002's locked tests check rules instead of lists

## Context and problem statement

Spec 002's locked tests pin today's CI exactly: `ci.yml`'s eight jobs and the gate's needs, the gate's expected jobs as a fixed list, a workflow folder holding only `ci.yml` and `locked-tests.yml`, and checkout and setup-node as the only actions. Spec 003 adds eight jobs to the gate, a preview workflow and a nightly workflow, and its build needs GitHub's artifact actions. A locked test changes only with a spec change Brad approves ([D21](0021-lock-tests-written-from-approved-scenarios.md)). How far should spec 002's change go?

## Decision drivers

- The hard rules are held by machines, not by trust ([D22](0022-enforce-hard-rules-in-three-layers.md)).
- Every check that gives the same answer every time is required, however long it takes ([D55](0055-split-the-required-checks-by-determinism.md)), and later slices keep adding them.
- Workflows use GitHub's own actions, pinned by commit hash, and a read-only token unless a job needs more ([D82](0082-the-conventions-batch-for-building-ci.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Rules instead of lists (recommended)
2. Add this slice's names to the lists

## Decision outcome

Chosen option: "Rules instead of lists", the recommended option. Brad added no note.

- The gate needs every other job in `ci.yml`, and the gate's expected jobs in `scripts/ci/gate.ts` match `ci.yml`'s jobs.
- Every workflow in `.github/workflows/` meets spec 002's FR-014: GitHub's own actions only (`actions/…`), each pinned to a full commit hash, pinned runners and tools, a read-only token by default, and checkouts that don't keep it.
- A job holds a write permission only where a spec names it. Spec 003 names two: `id-token: write` for the preview's deploy job, and `issues: write` for its comment job.
- Spec 002's other rules stay as they are, including the ban on `pull-requests: write` and on any workflow that merges or approves.
- Spec 002's FR-002 and FR-014 are edited to say this, its two test files change to match, and spec 002 is relocked once, in pull request #12, before spec 003's tests are locked.

### Consequences

- Good, because a later slice adds a CI job without touching a locked test.
- Good, because the rules cover every workflow, not just the first two.
- Bad, because the tests no longer catch a job that's renamed or dropped by mistake. The gate still fails on a missing job, and the reviewer reads every change to `.github/`.
- Neutral: a new workflow or write permission still needs a spec that names it.

### Confirmation

Spec 002's relocked `tests/002/static/workflows.test.ts` and `tests/002/unit/gate.test.ts` pass on spec 003's workflows. Spec 003's own static tests name the preview's two permissions.

## Pros and cons of the options

### Rules instead of lists

- Good, because the tests keep their meaning as CI grows.
- Bad, because a fixed list catches an accidental rename, and rules don't.

### Add this slice's names to the lists

- Good, because it's the smallest edit, and the tests stay as strict as they are.
- Bad, because every slice that adds a job repeats a spec 002 change and a relock.

## More information

- Decided by: Brad Thome, on slice 2.1's plan decision page, question Q1, on 2026-11-03.
- Changes: spec 002's FR-002 and FR-014, its locked tests and `tests.lock`, and [spec 003's plan](../../specs/003-skeleton-and-pipeline/plan.md).
