---
status: accepted
date: 2026-11-01
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D80
---

# Land the checks now, and the ruleset when the repo goes public

## Context and problem statement

Slice 1.4 was planned to end with a ruleset on main, so a pull request from the agent's account can't merge without Brad's approval and passing checks. GitHub serves rulesets for a private repo only on GitHub Pro, and this repo is private on the free plan until slice 1.5 ([D11](0011-build-privately-then-go-public-after-a-leak-scan.md)). Pro wouldn't bring CodeQL or secret scanning to a private repo either. How does main get its ruleset?

## Decision drivers

- Gate 3 is Brad's alone, and GitHub's ruleset is the hard stop that Claude Code's rules can't be ([D73](0073-keep-the-agent-on-its-own-github-account.md)).
- The foundation is built privately and goes public after a full leak scan (D11).
- The repo goes public in the very next slice.
- Spending is allowed where it buys something real ([D34](0034-no-fixed-spending-ceiling.md), [D53](0053-allow-paid-infrastructure-that-buys-scale.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Land the checks now, and turn the ruleset on the moment the repo goes public (recommended)
2. Go public first, then do slice 1.4 as planned
3. Pay for GitHub Pro now

## Decision outcome

Chosen option: "Land the checks now, and turn the ruleset on the moment the repo goes public", the recommended option. Brad added no note. It costs nothing, keeps D11's order, and the gap it leaves is one slice long and already covered by the local rules.

- Slice 1.4 lands CI with its gate, the lock check, Dependabot and CODEOWNERS, and keeps main's ruleset as a reviewed file in `.github/rulesets/`, with a check that compares it with GitHub's live ruleset.
- Slice 1.5 applies the ruleset, turns on CodeQL default setup and secret scanning with push protection, right after the switch to public and before anything else merges.
- Slice 1.4's done-when becomes: every pull request shows the gate, and the ruleset file is ready. The blocked merge is shown in slice 1.5.

### Consequences

- Good, because nothing is paid for, and the repo goes public in the order D11 set.
- Good, because the ruleset is reviewed as code before it's applied.
- Bad, because until slice 1.5, GitHub shows the checks without blocking a merge. Brad reads the gate before merging, and Claude Code's rules keep an agent from merging (spec 001).

### Confirmation

Spec 002's Story 5 checks the ruleset file, and its SC-005 is met the day slice 1.5 applies it, when `pnpm ruleset:check` passes against the live ruleset with no change to the file. Slice 1.5's spec shows a blocked merge.

## Pros and cons of the options

### Land the checks now, and the ruleset when the repo goes public

- Good, because it's free and keeps the order of the slices.
- Bad, because the merge isn't blocked on GitHub for one more slice.

### Go public first, then do slice 1.4 as planned

- Good, because it's free and slice 1.4 lands everything, with Actions free too.
- Bad, because the repo is public for a few days with only the local rules and no CI, and D11's order changes.

### Pay for GitHub Pro now

- Good, because the ruleset and the required approval work now, while the repo is private.
- Bad, because it's a monthly cost for one slice, and CodeQL and secret scanning still wait for slice 1.5.

## More information

- Decided by: Brad Thome, on the slice 1.4 decision page (Q1).
- Evidence: on 2026-11-01, GitHub's API refused to list this repo's rulesets until it's public or on Pro, main had no branch protection, and bradthome-agent had write access without admin.
- Evidence: [GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans) lists protected branches on private repos under Pro, and [GitHub's pricing](https://github.com/pricing) limits repository rules, required reviewers, code owners and CodeQL on the free plan to public repos, read 2026-11-01.
- Evidence: [About code scanning](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning) says code scanning on a private repo needs a GitHub Code Security license, read 2026-11-01.
- Spec: [002, CI and rulesets](../../specs/002-ci-and-rulesets/spec.md), Story 5.
