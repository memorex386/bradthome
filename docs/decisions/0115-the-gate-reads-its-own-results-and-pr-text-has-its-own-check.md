---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D115
---

# The gate reads its own results, and a pull request's text has its own check

## Context and problem statement

On 2026-11-04, `ci / gate` failed six times on #30 and #31, and only one of those failures was real: a title with no spec scope. Two flaws in the design caused the other five.

1. **The gate asked GitHub's REST API for its own run's jobs.** That answer can be out of date. It listed finished jobs as "queued", and it left out the passed jobs GitHub copies into a re-run. A settle-and-retry (#30) only narrowed that window.
2. **An edit to a pull request's title or description ran `ci.yml` again** ([D100](0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md)). That run's gate combined its results with the code run's for the same commit, but it didn't wait for the code run. So whenever the code run was still going, the edit run's gate failed.

Brad asked for a gate that's right every time.

## Decision drivers

- The required checks are deterministic: the same code gets the same verdict every time ([D55](0055-split-the-required-checks-by-determinism.md)).
- A skipped job never reads as a pass. GitHub counts a skipped required check as passing, which is why a gate exists at all.
- No run judges another run's results.

## Considered options

1. The gate decides from its workflow's `needs`, and the pull request's text gets its own workflow and required check (recommended, chosen).
2. Only the gate change, with edits still running `ci.yml`. That's smaller, but an edit run's gate can still race the code run.
3. No gate, with every job required on its own. That's rejected, because draft and edit runs skip jobs, and GitHub counts skipped required checks as passing.

## Decision outcome

Option 1, which Brad approved at #32's Gate 1 in the session on 2026-11-04.

- **`ci.yml`'s gate gets `GATE_NEEDS: ${{ toJSON(needs) }}`** and decides from that alone. It makes no API call and holds only `contents: read`.
  - The tests matrix counts once, as `tests`, which fails when either runner fails. Each runner still shows as its own check.
  - A draft's gate still expects the quick jobs only (D100).
- **`ci.yml` runs on opened, synchronize, reopened, ready_for_review and pushes to main**, and never on `edited`. Its privacy and commits jobs set `PR_TEXT: skip`, so they check the commits and the branch name, never the title or description.
- **`pr-text.yml`'s one job, `text`**, runs on opened, edited, reopened, synchronize and ready_for_review. It runs the same two scripts with `PR_TEXT: only`, on the title and description alone. A fixed title passes on the edit's own run, with nothing else to re-run.
- **`main`'s ruleset requires `gate`, `text` and `lock`.**

### Consequences

- Good, because the gate's verdict depends only on its run's own jobs, which GitHub hands it once they've finished.
- Good, because an edit to a pull request's text runs one short job, and its verdict can't depend on another run's timing.
- Bad, because the gate's message names `tests` rather than the runner that failed. The runner's own check shows which one it was.
- Neutral: three required checks instead of two.

### Confirmation

- Spec 002's re-locked tests check the gate from `needs` and the workflows' triggers, conditions and permissions. They also check the text check's two modes, and the ruleset's three required checks.
- Planted failures in the private sandbox, and real runs on #32's own pull request, are recorded in `specs/002-ci-and-rulesets/evidence/gate-from-needs.md`.

## More information

- Decided by: Brad Thome, at #32's Gate 1, 2026-11-04.
- Changes [D100](0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md): an edit to a pull request's text now runs only the text check, not privacy and commits in `ci.yml`.
- Evidence, checked on 2026-11-04: [the needs context](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#needs-context), [skipped required checks count as passing](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks#handling-skipped-but-required-checks).
