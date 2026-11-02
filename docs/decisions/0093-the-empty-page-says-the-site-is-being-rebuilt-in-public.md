---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D93
---

# The empty page says the site is being rebuilt in public

## Context and problem statement

Slice 2.1's page is public on every preview link until slice 2.5 replaces it with today's home content, and it never reaches bradthome.com. It needs a real heading, title and description, so the accessibility, HTML and Lighthouse checks have something to check. What should it say?

## Decision drivers

- Public facts only ([D32](0032-non-goals.md)).
- The site is a work sample, and its process is public ([D9](0009-the-site-repo-is-the-public-portfolio.md)).
- The checks need real content to check ([D55](0055-split-the-required-checks-by-determinism.md)).

## Considered options

The options are listed in the builder's ranked order.

1. Brad's name, one line, and a link to the repo (recommended)
2. Brad's name and v0's opening line
3. Brad's name only

## Decision outcome

Chosen option: "Brad's name, one line, and a link to the repo", the recommended option. Brad added no note.

- The heading is "Brad Thome".
- The line is "bradthome.com is being rebuilt in public, one reviewed slice at a time."
- The link reads "Read the source on GitHub" and goes to the repo.
- The title is "Brad Thome", and the description is the same line.
- Previews ask search engines not to index them.

### Consequences

- Good, because the page says why it's empty and points to the work.
- Good, because it repeats none of v0's copy before slice 2.5 checks it.
- Neutral: slice 2.5 replaces the page.

### Confirmation

Spec 003's scenarios check the words, title and description, and the visual snapshots show them.

## Pros and cons of the options

### Brad's name, one line, and a link to the repo

- Good, because it explains the page and links the repo.

### Brad's name and v0's opening line

- Good, because it looks finished.
- Bad, because it repeats copy before slice 2.5 checks it.

### Brad's name only

- Good, because it's the smallest page that passes the checks.
- Bad, because it says nothing about why it's empty.

## More information

- Decided by: Brad Thome, on the slice 2.1 interview page (Q3).
