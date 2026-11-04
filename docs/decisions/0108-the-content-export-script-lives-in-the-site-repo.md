---
status: accepted
date: 2026-11-03
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D108
---

# The content export script lives in the site repo

## Context and problem statement

[D44](0044-an-export-script-brings-public-facts-in.md) put the export script in Brad's private notes, opening its own pull request. Slice 2.3 builds it. Where should it live?

## Decision drivers

- The script must write exactly what the site's schemas accept, so it's safest next to them and tested by the same CI.
- The site repo is a public work sample, and the script is code worth showing.
- No machine path or private fact may reach the repo.

## Considered options

The options are listed in the builder's ranked order.

1. In the site repo, run by hand with the notes folder (recommended)
2. In the private notes, opening its own pull request, as D44 said

## Decision outcome

Chosen option: "In the site repo, run by hand with the notes folder", as recommended. `pnpm content:export` takes the notes folder as an argument or an environment variable, and has no default. It writes the claims file, and the change reaches main through the normal loop and a pull request. The rest of D44 stands: only facts tagged public are copied, a strict schema rejects anything else, and a fact with no tag counts as private.

### Consequences

- Good, because CI tests the script with made-up notes, against the same schemas the build uses.
- Good, because one copy of the schema serves the export and the build.
- Bad, because the script's rules are public, so the notes' format is public too. The format holds nothing private.

### Confirmation

Spec 005's tests run the export over made-up notes with every kind of tag, and check that the script holds no path to the notes.

## Pros and cons of the options

### In the site repo

- Good, because it's tested and reviewed like the rest of the site.
- Bad, because a run needs the notes folder on the machine, which only Brad's PC has.

### In the private notes

- Good, because nothing about the notes is public.
- Bad, because it needs its own copy of the schema, which can drift, and CI never runs it.

## More information

- Decided by: Brad Thome, in the slice 2.3 session, 2026-11-03.
- Amends where [D44](0044-an-export-script-brings-public-facts-in.md)'s script lives, and drops its opening a pull request by itself.
