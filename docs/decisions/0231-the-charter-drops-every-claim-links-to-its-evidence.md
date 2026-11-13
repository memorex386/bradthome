---
status: accepted
date: 2026-11-13
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D231
---

# The charter drops "Every claim links to its evidence"

## Context and problem statement

The charter's first product principle, from D35, said every claim links to its evidence: a source, the code, a screenshot or a document. Most of the Hopper story's claims come from Brad's résumé, and no public page shows them, so the receipts that followed the principle mostly said "Ask me" or "No public link yet" (D129, D229). Should the principle stay?

## Decision drivers

- The charter should describe the site as it is built and maintained.
- Proof that is public should still show, and nothing should announce what isn't.

## Considered options

The options are listed in the builder's ranked order.

1. Drop the first product principle, and number the other five 1 to 5 (recommended)
2. Keep it as written

## Decision outcome

Chosen option 1, which Brad picked on the receipts study's card (2026-11-13), with spec 038's Gate 1 the same day. The charter's product principles are now phone first; fast and accessible by default; purposeful motion; public facts only; and the site as a work sample. Records that quote the old principle, such as D218's drivers, stay as history.

### Consequences

- Good, because the charter matches a page that shows its public proof at rest and reads plainly where there's none (D229).
- Bad, because the charter no longer asks for evidence on each claim, so a future claim with a public source relies on its slice to link it.

### Confirmation

Spec 038's static test reads the charter's product principles: the old first is gone, the others are numbered 1 to 5, and its changes cite this record.

## More information

- Decided by: Brad Thome, on the receipts study's card (2026-11-13), with spec 038's Gate 1 (2026-11-13).
- Spec: [spec 038](../../specs/038-proof-on-the-card/spec.md).
- Amends: [D35](0035-purposeful-motion.md) and the charter approved in [D36](0036-approve-the-charter.md).
