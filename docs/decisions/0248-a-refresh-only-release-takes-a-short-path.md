---
status: accepted
date: 2026-11-18
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D248
---

# A refresh-only release takes a short path

## Context and problem statement

Since D247, the link previews and VINDecoded's PR count are refreshed by hand on Brad's PC, and the numbers are built into the page, so a refresh reaches bradthome.com only with a release. Every release since v2.0 has also been rehearsed on preview channels and given its own version card, which suits code changes but is a lot for a push that changed only numbers and days. How should a release that carries only a refresh run?

## Decision drivers

- A refresh should reach the site with little ceremony, or the numbers go stale.
- Brad still approves every production release (D113).
- The pre-release check still compares the pages, since the home's numbers and days change.

## Considered options

The options are listed in the builder's ranked order.

1. A short path for a release whose only changes since the last tag are the refresh's files (recommended)
2. Every release the usual way, refresh or not

## Decision outcome

Chosen option 1, on Brad's Gate 1 card of 2026-11-18, with two details Brad chose on cards the same day, after the review and the browser run. A refresh also remakes the screenshot baselines that show its numbers, since the site's CSP keeps the tests from hiding them ("Refresh remakes them"). And the diff starts at the commit that recorded the last release, since that record lands after the tag ("From the record"). So when `git diff --name-only` from the commit that added `docs/releases/<last tag>.md` to main lists only `apps/site/content/previews/`, `apps/site/public/previews/` and `tests/snapshots/`, the release:

- takes the next patch version, with no version card;
- skips the rollback rehearsal on preview channels, since no code, script or setting changed;
- still pushes the tag, runs `release.yml` with `words-may-change=home`, reads the pre-release check, and waits for Brad's approval in the `production` environment;
- gets a short record in `docs/releases/`, saying what the refresh changed.

Any other file in the diff means the usual release. `docs/release.md` says how.

### Consequences

- Good, because a refresh reaches the site in one run and one approval.
- Bad, because a refresh also remakes a few screenshot baselines, which Brad's push carries.
- Bad, because a refresh release isn't rehearsed; the rollback target is the release before it, and `pnpm release:rollback` still works the same.

### Confirmation

Spec 044's tests check that `docs/release.md` names the short path, its files and what it skips.

## More information

- Decided by: Brad Thome, on spec 044's Gate 1 card, 2026-11-18.
- Spec: [spec 044](../../specs/044-pulse-manual/spec.md).
- Builds on [D113](0113-releases-run-from-a-tag-behind-brads-approval.md) and [D247](0247-the-previews-and-the-pr-count-refresh-by-hand-on-brads-pc.md).
