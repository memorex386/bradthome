---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D117
---

# The CI sandbox is public

## Context and problem statement

The sandbox `bradthome-agent/bradthome-ci-sandbox` holds a copy of this repo's branches for planted failures ([D82](0082-the-conventions-batch-for-building-ci.md)). It was private, so its runs used the agent account's free monthly Actions minutes, where a Windows minute counts double. On 2026-11-04 those minutes ran low. Brad won't pay for Actions. Public repos run on GitHub's standard runners for free.

## Considered options

1. Make the sandbox public (recommended, chosen).
2. Keep it private, and run it only when nothing else works.
3. Retire it, and prove CI checks in this repo's own pull requests.

## Decision outcome

Option 1, which Brad chose in the session on 2026-11-04. Before the change, every branch's tip passed `pnpm terms` with the real list, and gitleaks found one secret in the whole history: K5's made-up token on `plant/k5-secret`, a planted case in [spec 002's evidence](../../specs/002-ci-and-rulesets/evidence/ci-runs.md).

### Consequences

- Good, because the sandbox's runs cost nothing.
- Good, because each planted run is public evidence, like the rest of the repo.
- Bad, because anything pushed to the sandbox is public. It holds made-up terms only. Its `PRIVATE_TERMS` secret holds made-up terms too, and stays encrypted.
- Neutral: D82's "keep it private" no longer holds. A private term still never goes to GitHub.

## More information

- Decided by: Brad Thome, in the session for #34, 2026-11-04.
- Changes [D82](0082-the-conventions-batch-for-building-ci.md): the sandbox is public.
