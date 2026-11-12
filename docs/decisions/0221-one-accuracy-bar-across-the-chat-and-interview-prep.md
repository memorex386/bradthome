---
status: accepted
date: 2026-11-11
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D221
---

# One 95% accuracy bar across the chat and interview prep

## Context and problem statement

D200 lets accuracy checks miss on 5% of the cases that have them, rounded up. Spec 024's S7.4 then gave interview prep its own allowance, apart from the chat's. Prep has 12 judged cases, so its 5% is one miss; the chat's 55 allow three.

Slice 5.9's runs of 2026-11-11, on code that changes neither the prep prompt nor its cases, then failed three times running on prep's accuracy alone: 10 of 12, then 10 of 12, then 10 of 12, each time on different cases. Every safety check passed in those runs, and the chat's accuracy was 52, 55 and 54 of 55. With so few cases, one extra miss in prep fails a run that's 95% accurate across all its judged answers. How should a run's accuracy be judged?

## Decision drivers

- Safety must still pass on every case (D200).
- A suite's small size shouldn't decide a run that's 95% accurate overall.
- Re-running until a pass, with no fix, is what D200 set out to stop.

## Considered options

The options are listed in the builder's ranked order.

1. Ship slice 5.9's card now, and move bradthome.com's chat facts, cases and D220's code to a later slice, so main's passing run holds (recommended)
2. One 95% bar across every judged answer, the chat's and prep's together
3. Two more re-runs of the same code, each an exception to D200
4. Hold the slice

## Decision outcome

Chosen option 2, on the site-build-story session's card of 2026-11-11. A run passes when every case is safe and its accuracy misses, the chat's and interview prep's together, are within 5% of all its judged answers, rounded up: 4 of 67 today. Each run records the pooled count as `totals.judged`, and each suite's own counts stay on record. `/evals`' verdict and its "Accurate answers" read the pooled count. It amends D200, which first set one bar across all accuracy cases, and spec 024's S7.4, which split it.

### Consequences

- Good, because a run is judged on all its answers, as D200 first wrote it, and a 12-case suite no longer fails a run that's 95% accurate overall.
- Good, because safety still has to pass on every case.
- Bad, because prep may miss more when the chat misses fewer: four prep misses and none in the chat would pass.
- Neutral: the per-suite counts stay in `results.json`, so a suite that slips still shows.

### Confirmation

Spec 033's S4.7 tests check the pooled allowance and what `/evals` shows from it, spec 024's S7.4 test checks that prep alone still has 5% of its own answers when nothing else is judged, and spec 033's fresh run passes under it.

## Pros and cons of the options

### Ship the card now, and the chat part later

- Good, because no rule changes under pressure, and main's passing run holds.
- Bad, because the chat can't answer about the site until a later slice's run passes, and that run faces the same prep allowance.

### One 95% bar across every judged answer

- Good, because a run's verdict rests on all its answers.
- Bad, because one suite can use more of the allowance than its share.

### Two more re-runs

- Good, because no rule changes.
- Bad, because the last three runs failed the same way, and re-running until a pass is what D200 stopped.

### Hold

- Bad, because nothing ships.

## More information

- Decided by: Brad Thome, on the site-build-story session's card, 2026-11-11, after the runs of that day.
- Spec: [spec 033](../../specs/033-site-build-story/spec.md).
- Amends: [D200](0200-safety-must-pass-every-case-accuracy-95-percent.md), and spec 024's S7.4.
- Amended by [D228](0228-evals-run-the-cases-a-change-touches.md), 2026-11-12: the pooled bar holds a full run, and the eval file's tests now apply it alone, with no suite's own bar. A changed run passes only when every case it asks passes.
