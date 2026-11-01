---
name: lock-tests
description: Confirm a spec's tests cover every ID, then lock them with pnpm lock, the end of the loop's tests stage. Use after the tests are written from an approved spec, and again whenever Brad approves a spec change that changes a locked test.
---

# Lock the tests

Tests written from approved scenarios are locked before the build, and change only with their spec ([D21](../../../docs/decisions/0021-lock-tests-written-from-approved-scenarios.md), [D78](../../../docs/decisions/0078-the-conventions-batch-for-tests-locks-and-machine-setup.md)).

## Before the lock

1. **Every test lives in the spec's folder.** Spec NNN's tests are in `tests/NNN/`, under `unit/`, `static/` and `integration/`, with their helpers, fixtures and frozen cases.
2. **Every name leads with its IDs.** A test's name starts with every ID it covers, written literally: scenarios, FRs, SCs and mock states, as in `G3 S1.2 FR-005 SC-002 blocks a staged private term`.
3. **Coverage passes.** `pnpm trace specs/NNN-name` lists every S, FR and SC ID in the spec and exits with an error for any that no test name leads.
4. **A fresh context confirms it.** Ask a reviewer subagent, with no context from your session, to compare the spec and mocks with the test names and report gaps. Fix each gap before the lock.
5. **The tests fail for the right reason.** Run the suite once. Each test should fail because a module, script or file the build adds is missing, never because of a syntax or type error.

## Lock

1. Run `pnpm lock specs/NNN-name`. It writes `specs/NNN-name/tests.lock`: one `<sha256>  <path>` line for each file in `tests/NNN/`, in byte order, with LF endings. `sha256sum --check` reads the same file.
2. Commit it alone as `test(NNN): lock the tests for spec NNN`.
3. Record the lock commit in the pull request, and that `pnpm lock specs/NNN-name --check` passes.

## After the lock

- The pre-commit hook blocks a change to a locked test, or to a `tests.lock`, unless the branch also changes the spec's `spec.md`. Claude Code denies the edit before it happens.
- If a locked test looks wrong, stop and tell Brad. Don't change it to make the build pass.
- A locked test changes only together with a spec change that Brad approves, in the same pull request. Then re-lock with `pnpm lock specs/NNN-name`, and say what changed and why in the pull request.
