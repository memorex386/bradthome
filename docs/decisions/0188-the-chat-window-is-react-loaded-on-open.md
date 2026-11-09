---
status: accepted
date: 2026-11-08
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D188
---

# The chat window is React, loaded when it's opened

## Context and problem statement

Slice 4.3 builds "Ask about Brad", the chat window ([plan](../plan.md), phase 4). The plan calls it a React island. Spec 003's locked script check (FR-002) allows only the link previews' one module and refuses any React import in the site's source ([D148](0148-spec-003-allows-the-link-previews-one-script.md)). How is the window built, and what does it add to the page's JavaScript?

## Decision drivers

- The home's first-load JavaScript and its Lighthouse budgets shouldn't change.
- The window has many states and a streamed answer, so its code should stay easy to test and change.
- A locked test changes only with a spec change Brad approves ([D101](0101-a-lighter-loop-one-session-and-two-gates.md)).

## Considered options

The options are listed in the builder's ranked order.

1. React, loaded on open, with a small hand-written stream reader (recommended)
2. Plain TypeScript in the site's one module, with no React
3. React with the AI SDK's `useChat`

## Decision outcome

Chosen option 1, as recommended. The window is a React component in `apps/site/src/components/chat/`. The site's one module gains a few lines that, on the first press of "Ask about Brad", load the window's own chunk and draw it into a dialog. No `client:` directive is used. React and the window, about 77 KB gzipped, load only then. The answer's stream is read by a short parser of the API's server-sent events, not the AI SDK's 50 KB client. Spec 003's FR-002 and its static check change to allow React imports in that one folder, and spec 003 is relocked.

### Consequences

- Good, because the page's first load gains only the loader's few hundred bytes.
- Good, because the window's states are one component the gallery draws on the server and the tests drive.
- Bad, because the first open waits for about 77 KB, and spec 003's lock changes again.

### Confirmation

Spec 022's tests show the home loads only the one module, that the window's chunk loads on the first open, and spec 003's amended check passes with `pnpm lock --check`.

## Pros and cons of the options

### React, loaded on open

- Good, because it's what the plan names, with code split from the page.
- Bad, because React is about 69 KB gzipped.

### Plain TypeScript

- Good, because it's 10 to 15 KB and spec 003's lock doesn't change.
- Bad, because the window's many states are hand-built DOM.

### React with useChat

- Good, because the SDK handles streaming, stop and retry.
- Bad, because it's about 122 KB on open.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.3 session, 2026-11-08.
