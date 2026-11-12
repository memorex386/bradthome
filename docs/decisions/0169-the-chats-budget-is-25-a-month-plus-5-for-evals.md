---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D169
---

# The chat's budget is $25 a month, plus $5 for evals

## Context and problem statement

The charter gives the chat its own budget decision ([D34](0034-no-fixed-spending-ceiling.md)), and [D41](0041-decide-where-the-chat-runs-in-phase-4.md) left it for phase 4. Anthropic bills the chat's tokens outside Google Cloud, so the $25 cost guard ([D104](0104-the-cost-guard-is-a-capped-firebase-function.md)) never sees them. How much may the chat spend each month, and how do [D57](0057-six-layers-of-cost-stops.md)'s six layers apply at that number?

## Decision drivers

- Every paid feature needs a cap, monitoring and evals before it goes live ([D34](0034-no-fixed-spending-ceiling.md)).
- An Anthropic workspace can have its own monthly spend limit, but the default workspace can't.
- A spike from a shared link shouldn't pause the chat for the rest of the month.

## Considered options

The options are listed in the builder's ranked order.

1. $10 a month for the chat, plus $5 for evals (recommended)
2. $25 a month for the chat, plus $5 for evals
3. $5 for everything, in one workspace

## Decision outcome

Chosen option 2: "$25 a month for the chat, plus $5 for evals". Brad picked more headroom than the recommendation. D57's layers apply like this:

| Layer | At this budget | Slice |
| --- | --- | --- |
| Evals, before release | An answer fails if it costs more than $0.005, or $0.01 for interview prep, and the suite runs in its own evals workspace, capped at $5 a month | 4.4 |
| Cost measured on every answer | The API prices each answer from its token counts and switches the chat off at $2.50 in a day or $20 in a month | 4.2 |
| Anthropic's workspace limit | The chat's workspace stops at $25 a month, and the evals workspace at $5 | Setup, before 4.2 |
| Google's Cloud Run cap | A $5 monthly spend cap on the API's Cloud Run service | Setup, before 4.2 |
| The disaster stop | Unchanged: billing unlinks past $25 in a month on Google Cloud | 2.2, done |
| Budget alerts | Unchanged at $1, $3, $5 and $25 on Google Cloud. The Anthropic workspaces alert at half and at the full limit | Setup, before 4.2 |

### Consequences

- Good, because at about $0.0005–0.002 an answer on Haiku 5.5 ([D171](0171-haiku-5-5-answers-with-sonnet-5-5-only-if-evals-need-it.md)), $20 covers well over 10,000 answers a month.
- Good, because the daily shutoff in code stops a spike within seconds, long before Anthropic's monthly limit.
- Bad, because the worst month costs up to $30 at Anthropic on top of Google Cloud's own caps.

### Confirmation

Slice 4.2's tests show the chat switches off at the daily and monthly totals. Slice 4.4's suite fails an answer over its cost limit. The setup steps in the plan record the workspace limits.

## Pros and cons of the options

### $10 for the chat, plus $5 for evals

- Good, because it's the cheapest budget that still separates evals from visitors.
- Bad, because a busy week could pause the chat until the next month.

### $25 for the chat, plus $5 for evals

- Good, because a spike from a shared link has room.
- Bad, because the worst month costs 2.5 times as much.

### $5 for everything

- Bad, because evals and visitors share one pot, so a few eval runs or one busy day can pause the chat.

## More information

- Decided by: Brad Thome, on a choice card in the phase 4 planning session, 2026-11-06.
- Amended by [D220](0220-the-answer-that-writes-the-cache-may-cost-up-to-a-cent.md), 2026-11-11: in the evals, the one answer that writes the prompt cache may cost up to $0.01; every other answer still fails over $0.005.
- Changed on 2026-11-11: the evals workspace's monthly limit is now $10. Brad raised it on the site-build-story session's card, after spec 034's four runs and [spec 033](../../specs/033-site-build-story/spec.md)'s three spent November's $5.
- Evidence, checked 2026-11-06: [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing), [workspaces and spend limits](https://platform.claude.com/docs/en/manage-claude/workspaces), [rate limits and spend errors](https://platform.claude.com/docs/en/api/rate-limits).
