---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D174
---

# The chat answers only from the public corpus, with sources

## Context and problem statement

What may the chat answer? The charter's risk table promises the chat answers only from public content ([D5](0005-ship-the-site-first-then-the-chat.md)), and every claim links to its evidence ([D35](0035-purposeful-motion.md)).

## Decision drivers

- A wrong claim about Brad is the chat's main risk.
- A public chat over a fixed corpus is a target for prompt injection.

## Considered options

The options are listed in the builder's ranked order.

1. Only from the corpus, with sources (recommended)
2. The corpus, plus general tech questions

## Decision outcome

Chosen option 1, as recommended. The chat answers only from slice 4.1's corpus, which holds only content marked public, and cites a source for every claim. With no source it says so and offers to email Brad. Salary, start dates and promises go to Brad. Anything else gets a fixed, polite boundary. The chat answers about Brad, never as Brad. It has no tools, the corpus sits in a cached prompt with an ID for each source, what visitors type is fenced as untrusted text, and the API checks that every cited ID exists before it sends the sources.

### Consequences

- Good, because every answer can be checked against its source.
- Good, because it stays cheap and gives an attacker little to work with.
- Bad, because a fair question outside the corpus gets no answer.

### Confirmation

Slice 4.4's suites: facts it must get right, claims it must never make, prompt injection, and boundaries.

## Pros and cons of the options

### Corpus only

- Good, because it's safest, cheapest and what the charter promises.

### Plus general questions

- Bad, because it becomes a free general chatbot, with more cost, more abuse and claims that have no source.

## More information

- Decided by: Brad Thome, on a choice card in the phase 4 planning session, 2026-11-06.
- Evidence, checked 2026-11-06: [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/), [Anthropic: mitigate jailbreaks](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks), [Anthropic: reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations), [citations](https://platform.claude.com/docs/en/build-with-claude/citations).
