## What and why

[One or two sentences.]

**Track:** Full · Light · Trivial
**Spec:** [specs/NNN-name/spec.md] · **Issue:** [#N]

## Acceptance

- [ ] Every S, FR and SC ID in the spec has a passing test. The traceability check lists them.
- [ ] Locked tests are unchanged, or they changed along with an approved spec change: [link]
- [ ] `ci / gate`, `pr-text / text` and `locked-tests / lock` pass on the last push. The gate covers `ci / lint`, `ci / format`, `ci / site-types`, `ci / build`, `ci / e2e`, `ci / lighthouse`, `ci / html` and `ci / links` beside spec 002's checks.
- [ ] The checks CI can't cover pass, with their output in this pull request: `pnpm setup:check`, `pnpm ruleset:check` when `.github/` changes, and the address log for commits not yet pushed.

## Review

[The reviewer agent's findings. Mark each one fixed or answered.]

## Preview

[The preview link from `preview / deploy`'s comment, on the pull request's `pr-N` channel, or why it skipped] · [Screenshots of anything visible, on phone and desktop, in light and dark]

## Decisions

[New records in docs/decisions, or "none". Also list any tier-3 details chosen in this PR.]

## Done

- [ ] Required checks pass.
- [ ] The docs and the decision log are updated.
- [ ] Brad merges. Agents never merge.
