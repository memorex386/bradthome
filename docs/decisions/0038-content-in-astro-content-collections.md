---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D38
---

# Content in Astro content collections

## Context and problem statement

**The question:** Where does the content live?

The charter calls for a single source of truth. The evidence links double as the chat's citations.

## Considered options

The options are listed in the builder's ranked order.

1. Astro content collections (recommended, chosen)
2. Plain YAML or JSON with a shared schema
3. JSON Resume

## Decision outcome

Chosen option: "Astro content collections".

Content lives in Astro content collections. Jobs, projects and claims are typed entries with roles, a per-role order and evidence links. The same entries feed the pages, the PDFs, /corpus.json and llms.txt.

## More information

- Decided by: Brad Thome, on the foundation decision page (R2).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
