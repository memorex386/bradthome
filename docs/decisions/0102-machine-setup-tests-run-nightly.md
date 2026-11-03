---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D102
---

# Machine-setup tests run nightly

## Context and problem statement

After D100, a ready pull request's full CI run still took about 23 minutes, almost all of it `tests (windows-2025)`. Inside that job, spec 001's install test took 12.8 minutes: it clones the repo three times and runs a full `pnpm install` each time, to prove a new machine needs only that. The setup-check, ruleset-check and Docker-line tests added about 1.5 minutes more. Those tests prove one-time machine setup, which pull requests rarely change. Brad asked whether they're needed on every pull request.

## Decision drivers

- A pull request's wait should go to what it can break.
- Drift in a fresh install, such as a dependency that breaks it, should still be caught within a day.
- The hook tests stay on Windows before merging, since Brad's PC runs the hooks on every commit.

## Considered options

1. Move the machine-setup tests to a nightly workflow on both runners, and keep the rest of the Windows tests at ready-time (recommended).
2. Also run the Windows tests only nightly and on main, not on pull requests.
3. No change.

## Decision outcome

Option 1, which Brad chose in the session on 2026-11-03.

- `pnpm test` leaves out five files: `tests/001/integration/install.test.ts`, `tests/001/integration/setup-check.test.ts`, `tests/002/integration/setup-check-repo.test.ts`, `tests/002/integration/ruleset-check.test.ts` and `tests/003/integration/setup-check-docker.test.ts`. `pnpm test:setup` runs them.
- `.github/workflows/setup.yml` runs `pnpm test:setup` daily and by hand, on Ubuntu and Windows. It isn't required, so a failure shows on the Actions page without blocking a pull request.
- No test changes. The files stay in Vitest's projects, so spec 001's suite test still finds them.

### Consequences

- Good, because the Windows job on a ready pull request drops from about 23 minutes to about 9.
- Bad, because a pull request that breaks a fresh install or the setup check passes CI, and the setup workflow reports it within a day. A pull request that changes the setup check or `package.json` should run `pnpm test:setup` by hand.

### Confirmation

The next ready pull request's `tests (windows-2025)` time, and the first scheduled run of `setup`.

## More information

- Decided by: Brad Thome, in the session after slice 2.1, 2026-11-03.
- Builds on [D100](0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md) and [D101](0101-a-lighter-loop-one-session-and-two-gates.md).
