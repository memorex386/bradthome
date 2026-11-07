---
status: accepted
date: 2026-11-07
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D181
---

# The essay goes in by section

## Context and problem statement

Should the essay at `/vindecoded-agents` go into the corpus as one source or as one source per section?

## Considered options

The options are listed in the builder's ranked order.

1. By section, each with a fixed ID and its heading's anchor (recommended)
2. Whole, as one source linking the top of the page

## Decision outcome

Chosen option 1, as recommended. Each of the essay's 13 level-2 sections is a source. Its ID is fixed in a table, so it stays the same when the section's words change, and a renamed heading keeps its ID by changing its entry. A heading with no entry, or an entry no heading has, fails the build.

### Consequences

- Good, because a citation lands on the section that says it.
- Bad, because renaming a heading means changing its entry too.

### Confirmation

Spec 020's S2.3 and S3.2.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.1 session, 2026-11-07.
- Spec: [spec 020, the corpus](../../specs/020-corpus/spec.md).
