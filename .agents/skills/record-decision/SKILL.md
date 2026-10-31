---
name: record-decision
description: Write a decision Brad made as a MADR 4.0 record in docs/decisions/, and index it. Use after Brad answers a tier-1 question or approves a tier-2 batch, in the pull request that makes the decision.
---

# Record a decision

Each tier-1 decision, and each approved tier-2 batch, becomes a record in [docs/decisions/](../../../docs/decisions/README.md), in the pull request that makes it.

## Steps

1. **Take the next ID.** Read the log in `docs/decisions/README.md`. The record's number is the next one: decision D79 is `docs/decisions/0079-short-title.md`.
2. **Copy the template.** Start from [docs/templates/decision.md](../../../docs/templates/decision.md) and keep its sections in order.
3. **Fill the front matter:**
   - `status`: `accepted` once Brad answered, or `proposed` while it waits, as in a plan's batch before its gate.
   - `date`: the day Brad answered, as YYYY-MM-DD.
   - `tier` and `log-id`, such as `D79`.
4. **Write the body:**
   - The context and question, in two or three sentences.
   - The drivers.
   - The options in your ranked order, as the decision page showed them.
   - The outcome: the chosen option, Brad's reason in your own words, and its consequences.
   - Confirmation: the scenarios, requirements or checks that show it holds.
   - Where Brad decided it: the decision page and question, or a comment on the pull request.
5. **Index it.** Add its row to the log in `docs/decisions/README.md`.
6. **Link it.** Name it in the spec or plan that it shapes, and in the pull request's Decisions section.
7. **Note what it changes.** If it changes the working agreement or another record, add a "Changes since approval" entry there, or a note on the older record.

## Rules

- Paraphrase Brad. Never quote Brad's notes or page answers ([D68](../../../docs/decisions/0068-paraphrase-brads-notes-in-public-records.md)).
- Public facts only: no private term, personal detail or machine path.
- An accepted record doesn't change. A new decision supersedes it, and the old one's status says so.
- Tier-3 details aren't records. List them in the spec and the pull request.
