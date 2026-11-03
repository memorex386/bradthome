---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D101
---

# A lighter loop: one session and two gates

## Context and problem statement

Slice 2.1 took six sessions, three gates, three relocks of locked tests, decision pages for every question, and a sandbox round of planted failures. Brad found the process too slow to ship anything, and asked for it to be streamlined without losing what shows real workflow practice.

## Decision drivers

- Keep what shows good practice: spec first, tests from the scenarios before the build, a fresh-context review, CI gates and previews.
- Cut the hand-offs, waits and relocks that slowed slice 2.1.

## Considered options

Four questions, each with the recommendation first, asked as choice cards in the session.

1. Sessions and gates: one session and two gates (recommended), one session and three gates, or no change.
2. Test locks: tests first with no lock files for new specs (recommended), or keep locking.
3. Decisions: choice cards in the session (recommended), or decision pages.
4. Real-run evidence: only when a slice changes CI (recommended), or every slice.

## Decision outcome

Brad chose the recommendation for each, on 2026-11-03.

- A slice runs in one session, from interview to pull request. Gate 1 approves the spec and plan together, and Gate 2 is the merge. The reviewer is still a subagent with fresh context.
- New specs' tests are written from the scenarios before the build and traced to every ID, but not locked. The reviewer flags any test the build weakened. Specs 001 to 003 keep their locks and the checks that enforce them.
- Decisions are asked as choice cards in the session, replacing D28's decision pages. Tier-1 answers still become records here.
- Planted failures in the sandbox run only when a slice adds or changes a CI check.

### Consequences

- Good, because a slice needs one session and two waits on Brad instead of six sessions and three.
- Good, because a spec change no longer means a relock.
- Bad, because nothing mechanical stops a build from weakening a new spec's test. The reviewer and Brad's review are the check.
- Neutral: the decision-page and lock-tests skills stay for the locked specs and for anyone who wants them.

### Confirmation

`docs/working-agreement.md` and AGENTS.md describe the loop, and the interview skill asks with choice cards. The next slice runs this way.

## More information

- Decided by: Brad Thome, in the slice 2.1 session, 2026-11-03.
- Supersedes the decision-page rule in [D28](0028-every-decision-goes-on-a-decision-page.md). It builds on [D100](0100-the-full-ci-suite-runs-when-a-pull-request-is-ready.md).
