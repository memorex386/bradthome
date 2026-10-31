---
status: proposed
date: 2026-10-31
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 2
log-id: D78
---

# The conventions batch for tests, locks and machine setup

## Context and problem statement

Slice 1.3 brings the repo's first tests, its first `tests.lock` and the first machine setup beyond Node and gitleaks. The [plan for spec 001](../../specs/001-hooks-and-agent-rules/plan.md) needs a few conventions that later slices will reuse:

- where a spec's tests live
- how the lock and the traceability check find them
- where evidence from real runs goes
- where machine-specific values live once the repo is public

Conventions are tier 2, so they go to Brad as one batch, with the plan at Gate 2. Approve the batch?

## Considered options

The options are listed in the builder's ranked order.

1. Approve all (recommended)
2. Approve all except the ones Brad names
3. Discuss each one

## Decision outcome

Proposed: "Approve all". Brad decides it with Gate 2.

- **A test folder per spec.** Spec NNN's tests live in `tests/NNN/`, split into `unit/`, `static/` and `integration/`, with their helpers, fixtures and frozen cases beside them. Every spec has its own S1.1, so the folder says which spec a test belongs to.
- **IDs lead each test's name.** A test's name starts with every ID it covers, written literally: scenario, FR, SC and mock state. An example is `G3 S1.2 FR-005 SC-002 blocks a staged private term in any letter case`. The traceability check reads the names with a plain text scan, so it works before the code exists.
- **`tests.lock` covers the whole test folder.** It has one `<sha256>  <path>` line for each file under `tests/NNN/`, sorted by byte order, with LF line endings. That's the format `sha256sum --check` reads, and it locks the helpers and fixtures along with the tests.
- **Evidence from real runs is committed.** Some checks need a real run, such as the reviewer's frozen cases or a check in a real Claude Code session. Each records its result under `specs/NNN-name/evidence/`, and a locked test reads it. Evidence holds no machine paths or private details, and the hooks scan it like any other file.
- **Machine-specific values stay on the machine,** in its global git config:
  - `bradthome.privateTerms` points at the private-term list.
  - `bradthome.agentGhConfigDir` points at the agent's gh login.

  `pnpm install` writes the agent's login into a checkout's ignored `.claude/settings.local.json` only when two things are true: the machine set that value, and the folder holds bradthome-agent's login. Nothing in the repo names a machine path.

### Consequences

- Good, because the lock, traceability and setup checks have the same shape in every slice.
- Good, because anyone can verify a lock with a standard tool.
- Good, because the public repo carries no machine paths, while one install still sets up a fresh clone or worktree on Brad's PC.
- Bad, because test names get long, since the IDs lead them.
- Bad, because the evidence has to be refreshed whenever the reviewer or its model changes.

### Confirmation

Spec 001's tests confirm the batch:

- The lock script reproduces `tests.lock` (S3.5, FR-012).
- The traceability script passes on spec 001 (FR-013).
- The coverage and evidence tests read the evidence (SC-001, SC-004, SC-006).
- `pnpm setup:check` reports the machine's settings (FR-028, SC-005).

## More information

- Decided by: Brad Thome, with Gate 2 on [#5](https://github.com/memorex386/bradthome/pull/5). Until then, this record is proposed.
- Proposed in: the [plan for spec 001](../../specs/001-hooks-and-agent-rules/plan.md).
- Builds on: [D21](0021-lock-tests-written-from-approved-scenarios.md) (locked tests), [D27](0027-the-conventions-batch-for-templates-ids-and-records.md) (IDs and `tests.lock`), [D72](0072-draft-the-private-term-list-from-brads-notes.md) (the private-term list) and [D73](0073-keep-the-agent-on-its-own-github-account.md) (the agent's gh login).
