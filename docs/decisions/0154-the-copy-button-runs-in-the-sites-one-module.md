---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D154
---

# The copy button runs in the site's one module

## Context and problem statement

Copying to the clipboard needs script. D147 let phase 3's pages ship one first-party module, loaded from `PreviewLink.astro`, and spec 003's locked check allows exactly that one `<script>`. Should the copy button add a second script, or ride in the first?

## Considered options

The options are listed in the builder's ranked order.

1. Import the copy code into the one module, beside the previews' code (recommended)
2. A second module from `Email.astro`, amending and relocking spec 003

## Decision outcome

Chosen option 1, with the plan at Gate 1. `PreviewLink.astro`'s one `<script>` imports `previews.client.ts` and `ds/email.client.ts`, which Astro bundles as one external file under `_astro/`. Every phase 3 page loads it through the header's previewed profile links. The Content-Security-Policy and spec 003 don't change.

### Consequences

- Good, because there's no new script, no new hash and no relock, and the module grows by under 1 KB.
- Bad, because the copy button depends on a page loading the previews' module; a page with contact and no header must load it itself, and a test checks that.

### Confirmation

Spec 017's tests check each page with a Copy button loads exactly the one module, and `pnpm lock --check` still passes on spec 003.

## More information

- Decided by: Brad Thome, approving spec 017's plan at Gate 1 on a choice card in the slice 3.9 session, 2026-11-05.
