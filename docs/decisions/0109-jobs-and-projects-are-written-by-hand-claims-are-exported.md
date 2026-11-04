---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D109
---

# Jobs and projects are written by hand, claims are exported

## Context and problem statement

[D38](0038-content-in-astro-content-collections.md) makes jobs, projects and claims typed entries, with roles, a per-role order and evidence links. Where do a job's or project's own fields come from: its name, title, dates, how much space it gets and its order for each role?

## Decision drivers

- In the notes, a fact is public only when its bullet is tagged public. The headings that hold names and dates carry no tag.
- How much space each job gets is an editorial choice from the charter's positioning ([D2](0002-lead-as-a-senior-mobile-and-full-stack-engineer.md), [D8](0008-give-earlier-roles-space-by-relevance.md)), not a fact in the notes.

## Considered options

The options are listed in the builder's ranked order.

1. Hand-written in the repo, with the export writing only claims (recommended)
2. Parsed from the notes' headings by the export

## Decision outcome

Chosen option: "Hand-written in the repo, with the export writing only claims", as recommended. Each job and project is a short YAML file in the site's content folder, seeded from résumé v2 and the positioning, and changed through pull requests. The export turns each bullet tagged public into a claim, and attaches it to the job or project its heading names.

### Consequences

- Good, because positioning lives in reviewed files, and the notes keep their format.
- Good, because a claim can't attach to a job that hasn't been written, so a new job is a deliberate change.
- Bad, because a job's dates live in two places, the notes and the repo, and can drift. A pull request that changes one names the other.

### Confirmation

Spec 005's tests check the seeded jobs and projects against the positioning, and that the build fails on a claim whose job or project doesn't exist.

## Pros and cons of the options

### Hand-written in the repo

- Good, because every editorial choice is visible in a diff.
- Bad, because adding a job takes a small file as well as the notes.

### Parsed from the notes' headings

- Good, because the notes are the only source.
- Bad, because the headings would need public tags, and the positioning would need a new block in the notes.

## More information

- Decided by: Brad Thome, in the slice 2.3 session, 2026-11-03.
