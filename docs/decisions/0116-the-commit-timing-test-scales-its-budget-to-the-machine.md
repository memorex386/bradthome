---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D116
---

# The commit-timing test scales its budget to the machine

## Context and problem statement

Spec 001's SC-003 test, "the commit hooks add under 3 seconds to a commit of 50 changed files", failed twice on 2026-11-04 on a busy `windows-2025` runner in the sandbox, at 3.9 to 5.3 seconds. A re-run alone passed. SC-003 is a budget for Brad's PC, and the test checks it on every machine that runs the suite.

A probe on the sandbox's 2-core runners ([run](https://github.com/bradthome-agent/bradthome-ci-sandbox/actions/runs/41913529880)) showed that the hooks use the CPU. They add about 1.8 seconds on an idle runner and about 7.2 seconds when both cores are busy. A commit with no hooks slows by a similar factor, from about 0.14 to 0.45 seconds. The first round of a job is often slow too, before anything is cached.

## Decision drivers

- Make the hooks faster before loosening the test.
- A real slowdown in the hooks still fails, on any machine.
- SC-003's wording, which is about Brad's PC, stays as it is.

## Considered options

1. A lighter commit-msg, plus a warm-up commit, the median of 5 rounds, and a budget scaled by the machine's commits with no hooks (recommended, chosen).
2. The same lighter commit-msg, warm-up and median, plus up to 3 attempts at a fixed 3 seconds. That covers short bursts, but a runner that stays busy still fails.
3. Only the lighter commit-msg. That saves about 15%, which isn't enough on a busy runner.
4. Time the commit hooks on Brad's PC only, and skip the test on CI's Windows runner.

## Decision outcome

Option 1, which Brad approved at [#34](https://github.com/memorex386/bradthome/issues/34)'s Gate 1 in the session on 2026-11-04.

- `scripts/commitlint.ts` reads `commitlint.config.ts` and the configs it extends directly, without `@commitlint/load`. It loads `@commitlint/format` only for a message that fails. A unit test holds its rules, parser options, plugins, ignores and help link equal to what `@commitlint/load` resolves.
- The commit test makes one warm-up commit that it doesn't count, then takes the median of 5 rounds.
- The budget is 3 seconds × the median commit with no hooks ÷ 150 ms, and never under 3 seconds. A commit with no hooks takes about 130 ms on Brad's PC, so there the budget is 3 seconds.

### Consequences

- Good, because the test passes on idle and busy runners, and still fails hooks that add more than the budget. A test with a planted wait checks that.
- Good, because commit-msg starts about 150 to 250 ms sooner for everyone.
- Bad, because the hook copies the conventional preset's parser options. The unit test catches a change on either side.
- Neutral: on a slow machine the budget is larger than 3 seconds. It stays 3 seconds on a machine as fast as Brad's PC.

### Confirmation

- Spec 001's re-locked tests: the timing test, the budget's arithmetic, the planted wait and the config check.
- Repeated runs on loaded `windows-2025` runners, linked in the pull request.

## More information

- Decided by: Brad Thome, at #34's Gate 1, 2026-11-04.
