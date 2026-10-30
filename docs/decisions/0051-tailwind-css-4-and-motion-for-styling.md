---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D51
---

# Tailwind CSS 4 and Motion for styling

## Context and problem statement

**The question:** Styling, fonts and motion, with the industry standard first

Replaces R3, which Brad answered with a note instead of a pick. Under [D50](0050-industry-standard-by-default.md), Tailwind is the 2026 standard (about 168M downloads a week).

## Considered options

The options are listed in the builder's ranked order.

1. Tailwind CSS 4, Motion for React parts, CSS for the rest, self-hosted fonts (recommended, chosen)
2. Plain CSS with design tokens and CSS motion
3. CSS Modules with Motion

## Decision outcome

Chosen option: "Tailwind CSS 4, Motion for React parts, CSS for the rest, self-hosted fonts".

Styling uses Tailwind CSS 4, with design tokens as CSS variables. Motion animates the React parts, and CSS handles simple transitions. Fonts are self-hosted through Astro's Fonts API. The hero's main text paints in the first frame so it doesn't hold back LCP.

## More information

- Decided by: Brad Thome, on the foundation decision page (F1).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
