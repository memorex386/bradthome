---
status: accepted
date: 2026-10-31
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D77
---

# The tooling batch for slice 1.3

## Context and problem statement

Slice 1.3 adds the repo's first code, so it needs a few conventions before the spec. Conventions are tier 2, so they went to Brad as one batch. Approve the batch?

## Considered options

The options are listed in the builder's ranked order.

1. Approve all (recommended)
2. Approve all except the ones Brad names
3. Discuss each one

## Decision outcome

Chosen option: "Approve all".

- **pnpm 12, pinned.** package.json pins it, and Corepack fetches it. npm ships with Node, so [D50](0050-industry-standard-by-default.md) asks for a reason. pnpm won't run a dependency's install script until the repo approves it, and since version 11 it won't install a version published less than a day ago. Those defaults guard against the two usual ways a hijacked package strikes: an install script, or a bad version that's pulled within hours.
- **TypeScript with no build step.** Node 22 runs the checks directly, `tsc` type-checks them, and Vitest 5 tests them ([D48](0048-the-test-and-quality-batch.md)). ESLint and Prettier come with slice 2.1's quality checks.
- **Where things live:** `.husky/` for the git hooks, `scripts/` for the checks they call, `tests/` for the tests, and `.claude/` for Claude Code's settings, hooks and reviewer.
- **Agent hooks for Claude Code only, for now.** Codex and Cursor are covered by the git hooks, and by CI from slice 1.4. Their own hook files can come when either one builds here.
- **The checks reach commit messages and pushes.** Commit messages are checked for private terms and addresses that aren't allowed, and pre-push checks every commit about to leave the PC again, so a commit made with `--no-verify` is still caught before it's pushed. This widens [D45](0045-a-private-term-script-plus-a-secret-scanner.md), which named files, staged changes and the built site.

### Confirmation

Spec 001's requirements FR-006, FR-009 and FR-015.

## More information

- Decided by: Brad Thome, on the slice 1.3 decision page (Q6).
- Evidence: [pnpm 10.0.0](https://github.com/pnpm/pnpm/releases/tag/v10.0.0), released 2025-01-07, stopped running dependencies' install scripts by default. [pnpm 11.0.0](https://github.com/pnpm/pnpm/releases/tag/v11.0.0), released 2026-04-28, made a one-day minimum release age the default. Both read 2026-10-31.
- Spec: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md).
