---
name: decision-page
description: Put a decision for Brad on a private decision page that saves Brad's answer, instead of asking in chat. Use for every tier-1 question, one at a time, and every tier-2 batch, from an interview, a plan's open choices or a review.
---

# Decision page

Every decision for Brad goes on a decision page, never in chat ([D28](../../../docs/decisions/0028-every-decision-goes-on-a-decision-page.md)). A decision page is a private web page that shows each question with its context and options, and saves Brad's answer where you can read it back.

## Build the page

Use the host's way to publish a private page that keeps state, such as an artifact with a stored answer. If the host has none, tell Brad what's missing; don't fall back to chat.

For each question, show:

1. **The question**, in one sentence that reads on its own.
2. **Context:** what's being decided and why now, in a few sentences, with links to the spec, plan or records it rests on.
3. **Options**, two to four, in your ranked order. Each says what it leads to, with its main good and bad points. The first is your recommendation, and it's labelled.
4. **A free-text answer**, so Brad can answer in Brad's own words.

Tier-1 questions go one at a time, each on its own page or step. A tier-2 batch can share a page, with "Approve all" as the first option.

## Read the answer

1. Read the saved answer from the page; don't guess it from a chat message.
2. Act on it as given. If a free-text answer leaves the decision unclear, ask one short follow-up on the page.
3. Record it with the record-decision skill, in the pull request that makes the decision.
4. If the answer changes an approved spec or issue, edit the live text and comment on why.

## Keep it private

- The page is private. Don't share its link outside the pull request or chat with Brad.
- No private term, personal detail, machine path or secret, ever. Paraphrase Brad's notes ([D68](../../../docs/decisions/0068-paraphrase-brads-notes-in-public-records.md)).
- Public records quote no page text that Brad wrote; they paraphrase it.
