---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D37
---

# Astro, React and a separate Hono API

## Context and problem statement

**The question:** What is the site built with, and where does backend code live?

Astro was new to Brad, and the worry was getting boxed in as the site grows more interactive and needs a backend. React works inside Astro, and the separate API package keeps the backend independent of the site framework. Astro needs Node 22.23.4 or later.

## Considered options

The options are listed in the builder's ranked order.

1. Astro for the site, React where it's interactive, and a separate API for the backend (recommended, chosen)
2. TanStack Start for everything
3. Next.js for everything
4. Astro, with the backend inside it

## Decision outcome

Chosen option: "Astro for the site, React where it's interactive, and a separate API for the backend".

The site is built with Astro 7, upgraded from the Astro 6 prototype. React components handle the interactive parts. Backend code lives in its own TypeScript package in the same repo, built with Hono.

## More information

- Decided by: Brad Thome, on the foundation decision page (R1).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
