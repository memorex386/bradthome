---
status: accepted
date: 2026-11-17
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D244
---

# The evals are off by default, until Brad turns them on for a full run

## Context and problem statement

Under D228, a slice that adds or edits eval cases needs a changed run that passes before it reaches main, and the chat API's deploy needs a full run that passed with the code's prompt and model. In spec 042's session on 2026-11-17, the slice's cases passed a changed run after one round of fixes, but two full runs, $0.44 each, failed on safety: first on two of the slice's own cases, then on an older prep case, while accuracy held. Brad asked for a flag that skips the evals by default, for this slice and all future work, and said a full run would come later. How do the evals turn off, and what still checks a prompt change?

## Decision drivers

- Brad's ask: no eval run in the slices, for now.
- One setting, in the repo, turns them back on as they were, for the full run Brad will ask for.
- The checks D228 sets don't change, so turning them on brings the same gate back.
- The skip is visible: every place that would have checked says the evals are off.

## Considered options

1. Off by default everywhere: the hygiene job, the pre-push hook and the deploy, which warns and goes ahead (recommended)
2. Off for CI and pushes, while the deploy still needs a passing full run

## Decision outcome

Chosen option 1, on Brad's card in spec 042's session, 2026-11-17, landing as its own change before spec 042.

- `apps/evals/settings.json` says `"evals": "off"`. Anything but an exact `"off"`, a missing file or one that can't be read, leaves the evals on.
- While they're off, ci / hygiene's evals check passes with a line saying so, the pre-push hook skips the pushed commit's check, and `pnpm chat-api:deploy` prints that no full run checked the prompt and model, then goes ahead.
- `scripts/lib/evals.ts`'s checks don't change; their callers ask the switch first. The evals workflow still runs by hand or from an `evals/…` branch, and `/evals` still shows the last full run.
- Slices still add and edit the cases their changes need, so a full run checks them when Brad turns the evals on.
- Amends D228 and D193.

### Consequences

- Good, because a slice no longer spends on eval runs or waits on a flaky case.
- Good, because one word turns every check back on as it was.
- Bad, because a prompt change, such as spec 042's rule 11, can reach the live chat with no full run behind it. The deploy says so each time.
- Bad, because a new case can be wrong, and nothing finds out until the next run.

### Confirmation

Tests in `tests/037/unit/switch.test.ts` check the repo's setting, that only an exact `"off"` turns the evals off, that the checks are unchanged with them on, that the hygiene job passes and says so, and that the deploy warns and goes ahead. Specs 023's and 037's amended tests check the hook asks the switch first and that the deploy still refuses a failed run with the evals on.

## Pros and cons of the options

### Off everywhere

- Good, because nothing in the loop waits on an eval.
- Bad, because the deploy may take an unchecked prompt.

### Off but the deploy

- Good, because the live chat never takes an unchecked prompt.
- Bad, because every chat change waits on a full run to go live, which Brad set aside for now.

## More information

- Decided by: Brad Thome, on cards in spec 042's session, 2026-11-17.
- Amends: [D228](0228-evals-run-the-cases-a-change-touches.md), [D193](0193-eval-runs-start-from-an-evals-branch.md).
- Spec: [spec 037](../../specs/037-evals-changed-cases/spec.md), amended.
