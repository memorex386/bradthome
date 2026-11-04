---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D111
---

# The home page drops its second Work item

## Context and problem statement

Today's home page lists two items under Work: VINDecoded, and a second project that's still in progress. Slice 2.5 ports the home page to the new stack with today's words ([D58](0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md)). Should the second item come along? The project's name is on Brad's private-term list, so this record and the repo don't name it.

## Decision drivers

- v1.0 keeps today's content, so any change to the words needs a reason.
- The project isn't live, and it isn't something Brad shows people.
- The positioning (what leads and what's a side project) waits for the phase 3 redesign.

## Considered options

1. Port today's words, without the second Work item (chosen)
2. Port today's words exactly, both items included

## Decision outcome

Chosen option: "port today's words, without the second Work item", because the project isn't live and Brad doesn't show it, so listing it on the home page points visitors at something that isn't there to see.

### Consequences

- Good, because the Work list shows only something visitors can use.
- Good, because every other word on the page stays as it is today.
- Bad, because the home page now differs from today's page, so spec 007's words check compares with today's text minus that one item, not today's text as it stands.

### Confirmation

Spec 007's tests check that the home page's text equals today's minus the item, that the site links no outside address but the four it allows, and, wherever the private-term list is available, that nothing in the site's source, content or build names the project.

## Pros and cons of the options

### Port without the item

- Good, because nothing on the page points at a project that isn't live.
- Bad, because the port isn't word for word.

### Port exactly

- Good, because the port is word for word.
- Bad, because it keeps a link Brad doesn't want visitors to follow.
