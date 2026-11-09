---
status: accepted
date: 2026-11-09
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D194
---

# A prompt or model change needs a fresh eval run, checked by a fingerprint

## Context and problem statement

Phase 4's plan says a prompt or model change can't merge or push without a fresh eval run. What's the narrowest check that enforces it?

## Decision drivers

- A change to what the model is told, or which model answers, can't reach main untested.
- Changes the evals don't cover, such as the limits or the log, don't cost a run.

## Considered options

The options are listed in the builder's ranked order.

1. A fingerprint, checked in `ci` and the pre-push hook (recommended).
2. The same fingerprint, checked in `ci` only.
3. Any change under `apps/chat-api/src` needs a run.

## Decision outcome

Chosen option 1, as recommended. The fingerprint is a SHA-256 of what decides an answer: `prompt.ts` (the system prompt, the fixed replies and how the documents and conversation are laid out), the model, its thinking, effort and output limit, the judge's model and rubric, and the frozen cases. Each run records the fingerprint it ran with. A new `ci / evals` job and the pre-push hook fail when the code's fingerprint differs from `evals/results.json`'s, and say to run the evals. The corpus's hash is recorded and shown but not enforced, so a content edit doesn't need a run.

### Consequences

- Good, because a prompt or model change can't reach main without its run.
- Bad, because a comment edit in `prompt.ts` also needs a run.

### Confirmation

Spec 023's tests change each input in turn and see the check fail, change a limit and see it pass, and run the pre-push hook with a stale fingerprint.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.4 session, 2026-11-09.
