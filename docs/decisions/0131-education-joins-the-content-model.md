---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D131
---

# Education joins the content model now

## Context and problem statement

The Home v2 board has a dated line for Brad's degree, under the older roles. Spec 005 left education out of the content model until a slice needed it, so the export reported the degree's public bullet as unmatched, and no claim could back the line.

## Decision drivers

- Every sentence on the site is a public claim (D129).
- Slice 3.7's résumé PDFs need education too.
- The change should be small, and follow the jobs' pattern (D109).

## Considered options

The options are listed in the builder's ranked order.

1. Add education to the model now: a hand-written file in `content/education/`, named for the notes' heading, that a claim can name as its subject, then export (recommended)
2. Leave it out until slice 3.7, and list it for Brad

## Decision outcome

Chosen option 1. `content/education/education.yaml` holds the school, degree and year, written by hand like a job. A claim can name it as its subject, and the export now writes the degree's public bullet as the claim `education-1`. The Experience section shows that claim as written, on a line labeled "Education".

### Consequences

- Good, because the degree shows with a claim behind it, and slice 3.7 can read it.
- Bad, because spec 005's schema and its list of subject folders change, so its tests cover one more folder.

### Confirmation

Spec 012's tests check the education file, its claim and the line. Spec 005's tests still pass.

## More information

- Decided by: Brad Thome, on the slice 3.4 session's card, 2026-11-05.
