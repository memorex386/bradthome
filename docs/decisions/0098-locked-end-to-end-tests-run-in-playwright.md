---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D98
---

# Locked end-to-end tests run in Playwright

## Context and problem statement

Spec 001's suite test requires every file a `tests.lock` names, and that ends in `.test.ts`, to be in one of Vitest's projects, so no locked test drops out of the run. Spec 003's four end-to-end tests are locked and end in `.test.ts`, which the trace check needs. But Playwright runs them, inside the pinned container, and Vitest must leave them out. Both sides were locked, so the build couldn't pass the suite test. The tests stage hadn't caught it, and the build found it.

## Decision drivers

- No locked test drops out of the run, whichever runner runs it.
- The trace check reads only `.test.ts` files.
- The smallest change to locked material.

## Considered options

1. Spec 001's suite test accepts a locked file under `tests/NNN/e2e/` when Playwright's config matches it and Vitest doesn't (recommended).
2. Rename the end-to-end files to `.spec.ts`, which changes the trace check and both specs' locks.

## Decision outcome

Brad chose option 1 in the build session, on 2026-11-03. FR-011 in spec 001 now says every locked test runs in Vitest or, for end-to-end tests under `e2e/`, in Playwright. The suite test changed with it, and spec 001 was re-locked.

### Consequences

- Good, because one test and one sentence change, and spec 003's lock stays as it was.
- Good, because the suite test still fails if Playwright's config stops matching the end-to-end files, or if Vitest picks them up.
- Bad, because the end-to-end tests run only in CI's e2e job and `pnpm test:visual`, not in `pnpm test`.

### Confirmation

`tests/001/integration/suite.test.ts` checks that `playwright.config.ts` matches `*/e2e/**/*.test.ts` and that Vitest lists none of the locked end-to-end files. CI's `ci / e2e` job runs them.

## More information

- Decided by: Brad Thome, in slice 2.1's build session, 2026-11-03. Brad asked to keep the process moving, so the question came as a structured choice in the session rather than on a decision page.
- Specs: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md) and [003, skeleton and pipeline](../../specs/003-skeleton-and-pipeline/spec.md).
