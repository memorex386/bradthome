---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D163
---

# The essay's title drops "one person"

## Context and problem statement

The essay at `/vindecoded-agents` was titled "How one person runs a 1.4M-download product with AI agents". The site leads with Brad as a senior mobile and full-stack engineer (D2), not as a lone engineer. Which title ships with v2.0?

## Considered options

The options are listed in the builder's ranked order.

1. "Running a 1.4M-download product with AI agents" (recommended)
2. "How VINDecoded ships with AI agents"
3. "The system that lets AI agents ship a 1.4M-download product"
4. Keep today's title

## Decision outcome

Chosen option 1. The front matter's title becomes "Running a 1.4M-download product with AI agents". The essay's description, date, address and body don't change. The pre-release check allows exactly this rename (`TITLE_CHANGES`).

### Consequences

- Good, because it keeps the number and the subject and drops the framing.
- Bad, because a link someone shared shows the old title until it's fetched again.

### Confirmation

Spec 019's S3.1 and spec 006's tests check the title and the unchanged words.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.11 session, 2026-11-06.
- Spec: [spec 019, the v2.0 relaunch](../../specs/019-relaunch/spec.md).
