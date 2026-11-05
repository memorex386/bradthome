---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D130
---

# Experience gives each job the room its job file sets

## Context and problem statement

Slice 3.4 builds the Experience section of the new home page, after the Hopper story. Six jobs come before or beside Hopper, and they don't deserve the same space. Some public claims about them are notes to the site rather than sentences a visitor should read, such as BookShout's "startup bet" and RealPage's "only this dated line". How much room does each job get, and what does a visitor read where a claim is a note?

## Decision drivers

- A recruiter should see the strongest work first, and the older roles in one glance.
- Every sentence on the site is a public claim as written, or comes from a job file (D129).
- The weighting should live in content, so a later change is a content change.

## Considered options

The options are listed in the builder's ranked order.

1. Weight by each job file's `display`: Bleacher Report featured, Bottle Rocket and BookShout as cards, RealPage and enterprise IT as one dated line each, with a timeline of every job, Hopper at the top (recommended)
2. One card per job, the same size
3. Only the timeline, with no cards

## Decision outcome

Chosen option 1, Brad's weighting, given in the slice's brief and paraphrased here:

- **Bleacher Report** is featured: Senior Android Developer, promoted in Dec 2020, with its public claims. The app's 10M+ Google Play installs show as a stat, and the claim keeps its caveat that the figure counts the whole app, with the Play listing as its proof receipt.
- **Bottle Rocket** shows the range of brands it shipped for.
- **BookShout** is the startup bet. Its claim in Brad's voice is a note, so it shows only as the card's label, "Startup bet", over its two public claims (Brad's answer on the slice's card, 2026-11-05).
- **RealPage** is one dated line with no description, and **Harley-Davidson and Infosys** one line, "Enterprise IT", 2008–2015.
- **The timeline** lists every job newest first with its dates, from the job files, and Hopper's row links the Hopper section.

### Consequences

- Good, because the section reads from strongest to oldest, and the weighting is the job files' `display`.
- Good, because no note to the site reaches the page.
- Bad, because some public claims, such as Bottle Rocket's architecture and VR work, don't show on the home page. They stay in the content for the résumé PDFs.

### Confirmation

Spec 012's tests check the weighting against the job files, every sentence against `content/claims.yaml` and the job files, and that no note to the site shows.

## More information

- Decided by: Brad Thome, in the slice 3.4 brief and on the session's card, 2026-11-05.
