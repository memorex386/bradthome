# Plan 037: Evals run the cases a change touches

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

## How it's built

| Part | Files | Approach |
| --- | --- | --- |
| Each case's hash | `apps/evals/src/run.ts` | `caseHash()` is a SHA-256 of the case's JSON, with each `RegExp` written as its text, since JSON drops a pattern's words. Every result records `hash`. |
| One retry | `run.ts`, `results.ts` | `run()` and `runPrep()` ask a failing case once more. The second try's result stands. `retried` keeps the first try's failed checks, and the case's cost counts both tries. |
| Two kinds of run | `run.eval.ts` | `EVALS_MODE=full` asks every case and writes `results.json`. Otherwise `changedCases()` compares each case's hash with the committed `results.json`, asks only the new and edited ones, and writes `changed.json`, which records `mode: 'changed'`. A full run's last test applies D221's pooled bar, and a changed run's requires every case to pass. The per-suite accuracy tests go. |
| The workflow | `.github/workflows/evals.yml` | `workflow_dispatch` gains a boolean `full`. The run step sets `EVALS_MODE` from it, and the upload takes the file that mode writes. |
| The gate | `scripts/lib/evals.ts` | It compares only the fingerprint's `cases` part. It passes when `results.json`'s matches the code's, or when `changed.json`'s matches and passed. Each failure ends with its fix. It still uses only Node's built-ins (spec 001's FR-029). |
| The deploy check | `scripts/chat-api/deploy.ts` | Before anything else, it reads `results.json`. It stops unless the run passed and its `prompt` and `model` parts equal the code's, naming what differs. |
| `/evals` | `components/evals/evals.ts`, `pages/evals.astro`, `styles/evals.css` | `sinceOf()` compares the run's fingerprint with the code's at build time. The note sits under the verdict, with the changed run's date when one covers the cases. A retried case's mark reads "Passed on the second try" or "Failed twice", and its body lists the first try's failed checks. Two lines of "How it works" change. |
| The record | `apps/evals/results.json` | Each case gains `hash`, from main's cases. A test checks every hash against `caseHash()` and the run's cases fingerprint against the code's. |

## Risks

- **A hash that misses an edit.** JSON drops `RegExp`s, so the hash writes each one as its text. A unit test edits each kind of field and checks that the hash changes.
- **A gate that fails open.** The gate's tests cover a missing file, an unreadable file, a stale changed run, a failed changed run and a match. Each must fail closed.
- **Old runs on `/evals`.** `results.json` files without `hash` or `retried` still parse, so older runs and fixtures render as before.

## Tasks

| ID | Task | Covers |
| --- | --- | --- |
| T001 | `tests/037/`: unit tests of `caseHash()`, `changedCases()`, the retry, both pass rules, the gate and the deploy check; static tests of the workflow and the eval file; e2e tests and baselines of `/evals`' note and marks | every ID |
| T002 | Amend the tests of specs 023, 024, 033 and 035 that need a fresh full run before main | FR-009 |
| T003 | The runner's hash, retry and modes, and the workflow | FR-001–FR-003, FR-005, FR-008 |
| T004 | The gate and the deploy check | FR-004, FR-006 |
| T005 | `/evals`' note, marks and lines | FR-007 |
| T006 | `results.json`'s hashes, D228 and its notes, `AGENTS.md` and `docs/plan.md` | FR-009 |
