---
status: accepted
date: 2026-11-12
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D228
---

# Evals run the cases a change touches, and the full set when Brad asks

## Context and problem statement

Under D194, a change to the chat's cases, prompt, model, judge or checks needed a fresh full eval run that passed before it reached main. A full run costs about $0.36, and $0.31 of that is the judge. The chat answers at about D200's 95% bar, so about every other run fails on a miss or two in older cases.

On 2026-11-12 spec 036 added three cases and ran the evals three times on one commit, for $1.08:

- Twice, one judged answer missed beyond D221's allowance.
- Once, two answers that refused were flagged unsafe.

The three new cases passed every time. Brad called the evals "super flaky" and "super expensive" and asked for a real fix. How should the evals run, and what should they hold back?

## Decision drivers

- A change that adds a case shouldn't pay for reruns of cases it didn't touch.
- What reaches the live chat must still have passed the full set.
- A failure must stay visible, never retried quietly (D197).
- The check stays something CI and the pre-push hook can run from files alone.

## Considered options

1. Gate only the changed cases. Main stops needing a full run. A change that adds or edits cases runs just those cases before it lands, for cents. The full set runs when Brad asks, and before a prompt or model change is deployed, with each failing case retried once. `/evals` shows the last full run and whether the code changed since.
2. Run the full set two nights a week, never blocking.
3. Run the full set only when Brad asks, never blocking.
4. Keep the gate, with one retry for each failing case and the two checks that flagged refusals fixed.

## Decision outcome

Chosen option 1, on Brad's card of 2026-11-12, with spec 037's Gate 1 cards the same day. Each result records its case's hash. A push to an `evals/` branch runs a changed run. It asks only the cases with no hash in the last full run, or a different one, and writes `apps/evals/changed.json`. It passes only when every case it asked passes, each after at most one retry. A changed run needs no card, since it costs cents. A run by hand with `full` set asks every case and writes `results.json`, under D221's pooled bar.

The gate, run by ci / hygiene and the pre-push hook, checks only the cases. The last full run's cases fingerprint, or a passing changed run's, must match the code's. `pnpm chat-api:deploy` stops unless the last full run passed with the code's prompt and model. A failing case is asked once more in either kind of run, the second try decides it, and `/evals` shows both. `/evals` also notes what changed in the code since its run.

### Consequences

- Good, because a change that adds cases spends cents on evals, not dollars on reruns of older cases.
- Good, because the live chat still gets only a prompt and model a full run passed.
- Good, because a retry is shown with its first try's failed checks, so a flaky case is visible, not quiet.
- Bad, because main can carry a prompt or check change no run has checked yet. `/evals` says so, and the deploy won't take the prompt or model until a full run passes.
- Bad, because a second try can pass a case that's flaky for a real reason. `/evals`' "Passed on the second try" keeps it on record.

### Confirmation

Spec 037's tests check each case's hash, the changed set, the retry, both pass rules, the gate and the deploy check. `/evals`' note and marks are checked too. Its record holds each case's hash, from main's own cases.

## Pros and cons of the options

### Gate only the changed cases

- Good, because the cost follows what changed.
- Neutral: a full run still happens, when Brad asks and before a deploy that needs it.

### Twice a week, never blocking

- Good, because nothing waits on a run.
- Bad, because a new case reaches main unchecked, and the nights cost about $3 a month whether or not anything changed.

### Only when Brad asks

- Good, because it costs nothing unless asked.
- Bad, because nothing checks a new case before main, and the deploy has no run to rely on.

### Keep the gate, add retries

- Good, because every change is still checked in full.
- Bad, because each change still pays for a full run, and a run at the bar still fails about every other time.

## More information

- Decided by: Brad Thome, on cards in spec 036's session, 2026-11-12, after its three runs.
- Spec: [spec 037](../../specs/037-evals-changed-cases/spec.md).
- Amends: [D193](0193-eval-runs-start-from-an-evals-branch.md), [D194](0194-a-prompt-or-model-change-needs-a-fresh-eval-run.md), [D197](0197-every-eval-suite-must-pass-before-release.md), [D200](0200-safety-must-pass-every-case-accuracy-95-percent.md) and [D221](0221-one-accuracy-bar-across-the-chat-and-interview-prep.md).
