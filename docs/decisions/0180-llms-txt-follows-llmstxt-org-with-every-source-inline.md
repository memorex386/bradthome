---
status: accepted
date: 2026-11-07
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D180
---

# llms.txt follows llmstxt.org, with every source inline

## Context and problem statement

What format should `/llms.txt` use? It's public, and models outside the chat may read it.

## Considered options

The options are listed in the builder's ranked order.

1. llmstxt.org's format, with every source's text inline (recommended)
2. llmstxt.org's link index, plus the full text in `/llms-full.txt`
3. Plain paragraphs, without llmstxt.org's structure

## Decision outcome

Chosen option 1, as recommended. `/llms.txt` has an H1 with Brad's name, a blockquote describing Brad, a paragraph on how to cite, then an H2 for the résumé, one for the essay and an Optional one. Every source is one list item that links its page and anchor, with its ID and its text on one line.

### Consequences

- Good, because one file holds everything, and it parses as llmstxt.org describes.
- Bad, because the essay's tables and code fall onto one line there. `/corpus.json` keeps them as Markdown.

### Confirmation

Spec 020's S4.2 and S4.3.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.1 session, 2026-11-07.
- Format: [llmstxt.org](https://llmstxt.org/).
- Spec: [spec 020, the corpus](../../specs/020-corpus/spec.md).
