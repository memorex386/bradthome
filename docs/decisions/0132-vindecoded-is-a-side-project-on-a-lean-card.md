---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D132
---

# VINDecoded is a side project, on a lean card

## Context and problem statement

Slice 3.5 builds the "On the side" section of the new home page, after Experience. VINDecoded has the most public claims of any subject but Hopper: downloads, a re-platform, AI features, agent workflows and the case study's counts. Shown in full, it could read as the page's headline, and Hopper is the main story (D129). How is VINDecoded framed, and how much of it shows?

## Decision drivers

- Hopper is the headline. A recruiter should read VINDecoded as work done on the side.
- Every sentence on the site is a public claim as written, or comes from a content file (D129).
- The case study already tells VINDecoded's whole story, at `/vindecoded-agents`.

## Considered options

The options are listed in the builder's ranked order.

1. A lean card: the platform, the downloads as stats with their claim, and the case study's counts, with links to the site and the case study (recommended)
2. A full card: the lean card plus the shipped AI features and the agent workflows

## Decision outcome

Chosen option 1. Brad's framing, given in the slice's brief and paraphrased here:

- **VINDecoded** is a side project that does well, not Brad's main priority. It gets a full card under "On the side", never the headline, and the page never calls Brad "one engineer" or "a team of AI agents".
- **Sudoku World** gets a small card, as its project file's `display: small` asks.
- VINDecoded's card links the case study, and each card links its project's site.

Brad then chose the lean card on the session's card: the claims `vindecoded-2`, `-3` and `-7`, with `-3`'s downloads as the stats "1M+" and "400K+". The case study's counts show with their date, as the claim has them, and never with the claim's closing rule for the site.

### Consequences

- Good, because Hopper stays the headline, and the case study holds the rest of VINDecoded's story.
- Good, because the weighting is a list of claim IDs in `side.ts`, so a later change is one line.
- Bad, because the AI features and agent workflows don't show on the home page itself. They stay in the content for the role pages and résumé PDFs.

### Confirmation

Spec 013's tests check the framing, the claims each card shows, every sentence against `content/claims.yaml` and the project files, and that the closing rule never shows.

## More information

- Decided by: Brad Thome, in the slice 3.5 brief and on the session's card, 2026-11-05.
