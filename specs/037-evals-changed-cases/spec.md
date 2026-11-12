# Spec 037: Evals run the cases a change touches, and the full set when Brad asks

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|           |                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| Track     | Full: the evals' gate, a second kind of run, one retry, the chat API's deploy check and two changes to `/evals`         |
| Status    | Approved                                                                                                                |
| Branch    | `037-evals-changed-cases`                                                                                               |
| Gate 1    | Approved by Brad on 2026-11-12, on cards in spec 036's session, each as recommended                                     |
| Decisions | D228, from this spec. It amends D193, D194, D197, D200 and D221, and builds on D192, D195 and D196                      |

## Summary

On 2026-11-12 spec 036's eval run failed three times on one commit, for $1.08 in all. Twice one judged answer missed beyond D221's allowance, on cases spec 036 didn't touch. Once two answers that refused were flagged unsafe. The three cases spec 036 added passed every time.

A run costs about $0.36, and $0.31 of that is the judge. Under D194, any change to the cases, prompt, model, judge or checks needs a fresh full run that passes before it reaches main. The chat sits at D200's 95% bar, so about every other run fails on a miss or two in older cases. Every slice that adds a case pays for every rerun.

Brad called the evals "super flaky" and "super expensive", and asked for a real fix. On a card Brad chose to gate only the changed cases:

> Main stops needing a full run. A change that adds or edits cases runs just those cases before it lands, for cents. The full suite runs when you ask and before a prompt or model change is deployed, with each failing case retried once. /evals shows the last full run and whether the code changed since.

## Scope

**In:**

- **Each case's hash** (`apps/evals/src/run.ts`): a SHA-256 of the case's own definition, recorded with its result.
- **Two kinds of run** (`apps/evals/src/run.eval.ts`):
  - A **changed run**, on a push to `evals/…`, asks only the cases that are new, or whose hash differs from the last full run's. It writes `apps/evals/changed.json`.
  - A **full run**, only by hand with `full` set, asks every case. It writes `apps/evals/results.json`, as today.
- **One retry** (`run.ts`): a case that fails any check runs once more, and the second try decides it. Its result keeps both tries.
- **The gate** (`scripts/lib/evals.ts`, run by ci / hygiene and the pre-push hook): it checks only the cases. Main needs either the last full run's cases fingerprint or a passing changed run's to match the code's.
- **The deploy check** (`scripts/chat-api/deploy.ts`): `pnpm chat-api:deploy` stops unless the last full run passed with the code's prompt and model.
- **The workflow** (`.github/workflows/evals.yml`): `workflow_dispatch` gains a `full` input. A push runs a changed run.
- **`/evals`:**
  - a note under the verdict naming what changed since the run;
  - each retried case's tries;
  - two lines of "How it works".
- **The record:** `results.json`, spec 035's run on main, gains each case's hash. Main's cases fingerprint matches the run's, which proves those are the cases it ran.
- **Tests:** amended tests in specs 023, 024, 033 and 035, and new ones in `tests/037/`.
- **Docs:** record D228, add notes to D193, D194, D197, D200 and D221, and update `AGENTS.md`'s evals lines and `docs/plan.md`.

**Out:**

- **Any eval run.** This slice adds and edits no case, and the record's hashes come from main's own cases. Spec 036 lands after it, with a changed run of its three cases.
- **The two checks that flagged refusals** in spec 036's third run, the framing check's quotation marks and the injection case's state. They aren't part of the plan Brad chose. A full run will show whether one more try settles them.
- **The chat's prompt, model and judge,** and the cases.

## User stories and acceptance scenarios

### Story 1: A change that adds or edits cases runs just those cases (P1)

A builder adds a case. Before the change reaches main, only the new case runs on the real model, for cents, and its result is committed.

- **S1.1** Given a push to a branch named `evals/…`, then the run hashes every case, chat and prep. It asks only the cases with no hash in the last full run, or a different one. It writes `apps/evals/changed.json` with those cases' results, their hashes, the code's fingerprint, the commit and the run's link.
- **S1.2** Given a push where no case is new or edited, then the changed run asks nothing, costs nothing, passes, and its log says no case changed.
- **S1.3** Given a changed run, then it passes only when every case it asked passes every check, safety and accuracy, each after at most one retry (S4.1).
- **S1.4** Given a case removed or renamed, then a removed case is never asked, and a renamed case counts as new.

### Story 2: Main needs no full run (P1)

- **S2.1** Given a commit whose cases fingerprint matches the last full run's, then ci / hygiene and the pre-push hook pass, whatever changed in the prompt, the model, the judge or the checks.
- **S2.2** Given a commit whose cases differ from the last full run's, then they pass only when `changed.json`'s cases fingerprint matches the code's and its run passed. Otherwise they fail, and their fix line says to push the commit to `evals/…` and commit `changed.json` from the run's artifact.
- **S2.3** Given a changed run that failed, then they fail, and say how many of its cases passed.

### Story 3: The full set runs when Brad asks (P1)

- **S3.1** Given a run by hand with `full` set, then every case runs, and `results.json` is written as today, with each case's hash. A push never runs the full set.
- **S3.2** Given a full run, then it passes under D200 and D221: every case safe, and accuracy misses within 5% of every judged answer, the chat's and prep's together, rounded up. The eval file's own tests apply the same pooled bar, not each suite's own.

### Story 4: A failing case gets one more try, in plain view (P1)

- **S4.1** Given a case that fails any check, in either kind of run, then it's asked once more, and the second try decides the case.
- **S4.2** Given a retried case, then its result keeps the first try's failed checks. On `/evals` its row keeps its "Passed" or "Failed" mark and reads "Passed on the second try" or "Failed twice" under its title. Opened, it lists the first try's failed checks, then the second try's checks (M3, M4).
- **S4.3** Given a case that passes the first time, then it's asked once.

### Story 5: A prompt or model change needs a full run before it reaches the chat (P1)

- **S5.1** Given `pnpm chat-api:deploy`, when there's no full run, it didn't pass, or its prompt or model differs from the code's, then the deploy stops before it builds or changes anything. It names what differs and says to run the full set by hand.
- **S5.2** Given a full run that passed with the code's prompt and model, then the deploy goes on as today. A judge, check or case change alone doesn't stop it.

### Story 6: `/evals` shows the last full run, and whether the code changed since (P1)

- **S6.1** Given code whose fingerprint differs from the last full run's, then under the verdict `/evals` says "Since this run, the checks changed.", naming each part that differs in the fingerprint's order: the prompt, the model, the judge, the checks, the cases (M1).
- **S6.2** Given that the cases changed and a passing changed run matches them, then the note adds "The new and edited questions passed their own run on" and the run's date, linked to its log (M2).
- **S6.3** Given no difference, then there's no note.
- **S6.4** Given "How it works", then its last line reads: "A new or edited question must pass its own run before it reaches the site, and a change to the prompt or the model must pass a full run before it reaches the chat." A line before it reads: "A question that fails is asked once more. Both tries are shown, and the second decides it." (M5)
- **S6.5** Given the page in both themes, on a phone and a desktop, then axe finds no violation at WCAG 2.2 AA, and each new state matches its baseline in the pinned container.

### Story 7: The record carries over (P2)

- **S7.1** Given `results.json` as committed by this slice, then each of its cases has a hash. Each hash equals the one main's cases give, since the run's cases fingerprint is main's.
- **S7.2** Given the docs, then D228 records Brad's choice, D193, D194, D197, D200 and D221 note what it amends, and `AGENTS.md` and `docs/plan.md` describe the two kinds of run.

## Edge cases

- `results.json` has no hashes, as before this slice: every case counts as new, so a changed run would ask them all. S7.1's record means that never happens on main.
- A changed run that's older than a later full run doesn't count once the full run matches the code. The gate checks the full run first.
- A failed full run still records and shows, as today. Main doesn't need it to pass, but the deploy does.
- A changed run on a commit whose prompt differs from the full run's asks its cases on the new prompt. Its fingerprint records that.

## Requirements

- **FR-001** The runner MUST hash each case's definition and record the hash with its result. A changed run MUST ask only the cases new or edited since the last full run.
- **FR-002** A case that fails MUST be asked once more, with the second try deciding it and both tries recorded.
- **FR-003** A changed run MUST write `apps/evals/changed.json`, and pass only when every case it asked passes.
- **FR-004** The gate MUST pass a commit whose cases match the last full run's, or a passing changed run's. A prompt, model, judge or check change alone MUST NOT block main.
- **FR-005** The workflow MUST run a changed run on a push to `evals/**`, and a full run only by hand with `full`.
- **FR-006** `pnpm chat-api:deploy` MUST stop unless the last full run passed with the code's prompt and model.
- **FR-007** `/evals` MUST name the parts that changed since its run, note a passing changed run that covers new cases, and show each retried case's tries.
- **FR-008** A full run MUST pass on D221's pooled bar alone, in the eval file's tests too.
- **FR-009** The tests of specs 023, 024, 033 and 035 that need a fresh full run before main MUST be amended. `tests/037/` MUST cover every ID here. `results.json` MUST gain its hashes, and the docs D228 and its notes.

## Success criteria

- **SC-001** A change that adds three of the chat's cases spends under $0.05 on eval runs before it lands, when its cases pass. A prep case costs more, about $0.07 for the first, since its judge reads the whole corpus.
- **SC-002** No full run is needed to land a change that leaves the prompt and model alone.
- **SC-003** A full run asks a case a second time only when it fails, so it costs about as much as before at today's miss rate.
- **SC-004** `/evals`' note names exactly the parts in which the code's fingerprint differs from its run's.

## Gate 1

Approved by Brad on 2026-11-12, on cards in spec 036's session. Brad chose the plan on an earlier card the same day, after spec 036's three failed runs. On the Gate 1 cards, each as recommended:

- A changed run passes only when every case it asked passes, after one retry, rather than under D221's 5%.
- A changed run needs no card, since it costs cents. A full run runs only when Brad asks.
- `/evals`' new words, as S4.2, S6.1, S6.2 and S6.4 give them.
- The spec and its mocks.

## Changes since Gate 1

Tier-3 details decided during the build:

- **SC-001 names the chat's cases.** The last full run's dearest chat cases cost $0.013, $0.006 and $0.006, answer and judging together. Its dearest prep case cost $0.07, since prep's judge writes the whole corpus to its cache on the first call. So three new chat cases stay under $0.05, and a new prep case may not.
- **A retried case's own cost, time and tokens are its second try's,** the answer `/evals` shows and the per-answer limits apply to. Its first try's spend is kept in `retried`, and the run's totals count both tries.
- **A changed run with no chat or no prep case to ask registers no suite for it,** since Vitest fails a suite with no test, and a run without a result for every case it asked can't pass, as when a case times out. Each case's test allows two tries' time.
- **M2–M4 show only when a record has them.** The committed full run has no retried case, and no changed run is committed yet, so the browser tests check M1, and "How it works" with M5's lines, on the real page. The mocks and the unit tests check M2–M4's words and markup. Spec 036's changed run puts M2's note on the page, and the next full run with a retry puts M3 or M4 there. Spec 037's summary shots, spec 023's page shots and their axe checks then cover them.
- **The deploy reads the record through a `readRepo` it can be given,** so spec 021's tests, which deploy a stand-in checkout, read the repo's own record.
- **`AGENTS.md` counts eight workflows outside the gate.** It now names the evals workflow, which it hadn't counted, and spec 016's test of that line follows.
- **`firebase.json`'s policy changes:** `/evals`' new styles change its inlined stylesheet's hash, and `pnpm csp` writes it.
