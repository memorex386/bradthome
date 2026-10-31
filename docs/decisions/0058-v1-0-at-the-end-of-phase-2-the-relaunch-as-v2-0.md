---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D58
---

# v1.0 at the end of phase 2, the relaunch as v2.0

## Context and problem statement

**The question:** When does the rebuilt site go live?

Continuous delivery: every change is ready to ship, and shipping is a choice. Going live first proves the pipeline early, and visitors never see a half-done redesign. This changes the charter's scope: v1.0 replaces the prototype first.

## Considered options

The options are listed in the builder's ranked order.

1. Go live at the end of phase 2 (v1.0), relaunch at the end of phase 3 (v2.0) (recommended, chosen)
2. Go live only at the relaunch
3. Ship each phase 3 slice live as it merges

## Decision outcome

Chosen option: "Go live at the end of phase 2 (v1.0), relaunch at the end of phase 3 (v2.0)".

Releases: the rebuilt site goes live as v1.0 at the end of phase 2, with today's content on the new stack. Phase 3 merges into main and deploys to a preview channel named `next`. The relaunch is the tagged release v2.0 at the end of phase 3, and the chat follows as v2.x.

## More information

- Decided by: Brad Thome, on the slice-plan decision page (P1).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
