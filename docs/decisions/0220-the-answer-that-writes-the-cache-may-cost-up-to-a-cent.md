---
status: accepted
date: 2026-11-11
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D220
---

# In the evals, the answer that writes the prompt cache may cost up to $0.01

## Context and problem statement

D169 set the evals' cost limit at $0.005 an answer, and spec 023's S2.4 held the first answer to it too, though it writes the prompt cache and costs the most. The chat caches the whole corpus for an hour, so the answer that writes it pays for every source once, at Haiku 5.5's $0.20 per million tokens, and every answer after it reads the cache for a twentieth of that.

Slice 5.9 adds bradthome.com's project and six facts to the corpus, 70 sources in all. In its first run, on 2026-11-11, the first answer wrote 24,853 tokens to the cache, $0.00497 before a word of the answer, and cost $0.0051 in all, so the run failed that safety check. Each source adds about 120 tokens of framing as a cited document besides its words, so trimming the new facts couldn't make room. On main's corpus, 23,573 tokens, the same answer had room for about 550 output tokens, and every new fact takes from that. Spec 034's run passed because it read a cache its earlier runs had written, so no answer wrote it.

The chat API has no limit per answer: its spend shutoffs at $2.50 a day and $20 a month (D169) bound what visitors can cost. The $0.005 is the evals' test that each answer stays cheap. How should it treat the answer that writes the cache?

## Decision drivers

- Every answer that reads the cache should still be held to $0.005, so a change that makes answers dearer still fails.
- The corpus grows with each fact Brad makes public.
- A run's verdict shouldn't depend on whether another run warmed the cache in the past hour.
- The evals workspace is capped at $5 a month (D169).

## Considered options

The options are listed in the builder's ranked order.

1. The one answer that writes the cache may cost up to $0.01, interview prep's limit; every other answer stays at $0.005 (recommended)
2. Raise every answer's limit to $0.006
3. Keep $0.005, and leave bradthome.com out of the chat until there's room

## Decision outcome

Chosen option 1, as recommended, on the site-build-story session's card of 2026-11-11. In the evals, an answer that wrote tokens to the prompt cache fails over $0.01, and every other answer still fails over $0.005. Each run records both limits, and `/evals` shows them. It amends D169's first layer and spec 023's S2.4, its edge case and FR-004.

### Consequences

- Good, because every answer that reads the cache is held to $0.005 as before.
- Good, because the corpus can about double before the answer that writes the cache reaches $0.01.
- Bad, because `/evals` explains two limits, not one.
- Bad, because a run that starts on a warm cache has no answer that writes it, so only the unit tests check the higher limit.
- Neutral: nothing changes for visitors. The API caches the corpus as before, and its spend shutoffs still bound the month.

### Confirmation

Spec 023's S2.4 test checks that an answer that writes the cache passes at $0.0051 and fails over $0.01, and that any other answer fails over $0.005. Spec 033's S4.6 checks the run records both limits and `/evals` shows them, and its fresh run passes under them.

## Pros and cons of the options

### The answer that writes the cache may cost up to $0.01

- Good, because the limit matches what the answer pays for: the whole corpus, once an hour at most.
- Bad, because there are two limits to explain.

### $0.006 for every answer

- Good, because there's one limit.
- Bad, because it loosens the check on every answer by a fifth, and leaves room for about 20 more facts before this comes back.

### Keep $0.005, and leave bradthome.com out of the chat

- Good, because no limit changes and no run is needed.
- Bad, because the chat can't answer how the site is built, and the corpus has room for only two or three more facts at $0.005.

## More information

- Decided by: Brad Thome, on the site-build-story session's card, 2026-11-11, after the run of that day failed on the limit.
- Prices: `apps/chat-api/src/spend.ts`, Haiku 5.5 at list price, with the cache's 1-hour writes.
- Spec: [spec 033](../../specs/033-site-build-story/spec.md).
- Amends: [D169](0169-the-chats-budget-is-25-a-month-plus-5-for-evals.md), and the cost limit in [D200](0200-safety-must-pass-every-case-accuracy-95-percent.md)'s safety checks.
