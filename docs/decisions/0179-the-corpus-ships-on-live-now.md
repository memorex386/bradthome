---
status: accepted
date: 2026-11-07
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D179
---

# The corpus ships on live now

## Context and problem statement

Slice 4.1 builds `/corpus.json` and `/llms.txt` from Brad's public facts. Every build is the release's (spec 019), so the next release puts them on bradthome.com. Should that be a release now, or should they wait for the chat in v2.1?

## Decision drivers

- Both files hold only facts the site already shows.
- A model that reads the site can use `llms.txt` before the chat exists.
- D168 settled which pages are indexable, and this slice shouldn't reopen it.

## Considered options

The options are listed in the builder's ranked order.

1. Release now, as v2.0.1, with no indexing changes (recommended)
2. Wait for v2.1, with the files on previews and `next` only

## Decision outcome

Chosen option 1, as recommended. Once main is green, v2.0.1 releases both files, behind Brad's approval in the `production` environment as for every release (D113). The sitemap and `robots.txt` stay as D168 left them, and no page links either file.

### Consequences

- Good, because the corpus is checked on live before the chat depends on it.
- Bad, because it's one more release to run before phase 4's next slice.

### Confirmation

Spec 020's S4.4 and S5.1, and v2.0.1's release record.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.1 session, 2026-11-07.
- Spec: [spec 020, the corpus](../../specs/020-corpus/spec.md).
