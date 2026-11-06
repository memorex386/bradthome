---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D151
---

# Spec 003's script check searches without a tag regex

## Context and problem statement

D148 let spec 003's locked static check allow the link previews' one `<script>`. CodeQL flagged the new line with its bad-tag-filter rule (alert 6): a regular expression for HTML tags misses `<SCRIPT>` and other forms. A locked test changes only with its spec, by Brad's choice.

## Considered options

The options are listed in the builder's ranked order.

1. Rewrite the check without the tag regex, and relock spec 003 (recommended)
2. Dismiss the alert as a false positive in a test

## Decision outcome

Chosen option 1. The check lowercases each source file and finds every `<script` by plain search, taking each opening tag to its `>`. `PreviewLink.astro` must have exactly one, `<script>`, and every other file none. Spec 003 says so in its change log, and was relocked in spec 016's pull request.

### Consequences

- Good, because a script tag in any case fails the check, and CodeQL's alert closes.
- Bad, because the locked test changed a second time in one slice.

### Confirmation

`pnpm lock --check` passes on spec 003, and CodeQL's run on the pull request passes.

## More information

- Decided by: Brad Thome, on a choice card in the career session, 2026-11-05, relayed to the slice 3.8 session.
