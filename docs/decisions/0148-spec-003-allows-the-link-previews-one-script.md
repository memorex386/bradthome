---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D148
---

# Spec 003 allows the link previews' one script

## Context and problem statement

Spec 003's locked static check failed any `<script` anywhere in the site's source, so the previews' module (D147) failed it. A locked test changes only with its spec, by Brad's choice.

## Considered options

The options are listed in the builder's ranked order.

1. Amend FR-002 to allow the previews' one module, from one component, and relock spec 003 (recommended)
2. Keep spec 003, and build previews with no script

## Decision outcome

Chosen option 1. FR-002 now says the site ships no script but the link previews' one module, from `src/components/previews/PreviewLink.astro`. `tests/003/static/site.test.ts` allows exactly one `<script>` there, and spec 003 was relocked in spec 016's pull request.

### Consequences

- Good, because the check still fails any other script, anywhere in the site.
- Bad, because the skeleton's rule now names a phase 3 component.

### Confirmation

`pnpm lock --check` passes on spec 003, and its static check runs in every CI run.

## More information

- Decided by: Brad Thome, on the slice 3.8 session's card, 2026-11-05.
