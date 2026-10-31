---
status: accepted
date: 2026-10-30
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D61
---

# The agent's email is agent@bradthome.com

## Context and problem statement

**The question:** Which email does the agent's account use?

A role address on Brad's own domain is how companies set up machine accounts, and the brad@ forwarding was needed anyway ([D16](0016-brads-own-commits-use-brad-bradthome-com.md)). bradthome.com had no mail records on 10/30. Brad's pick is the go-ahead for the forwarding and one test email.

## Considered options

The options are listed in the builder's ranked order.

1. agent@bradthome.com (recommended, chosen)
2. A +agent address on Brad's personal email
3. A new Gmail account for the agent

## Decision outcome

Chosen option: "agent@bradthome.com".

The agent's account uses agent@bradthome.com, forwarded to Brad's personal inbox through Squarespace along with brad@bradthome.com. GitHub's private-email setting stays on, and the agent's commits use its GitHub noreply address.

## More information

- Decided by: Brad Thome, on the agent-account decision page (G2).
- This record was written on 2026-10-30 from the project's decision log, when the log moved into this repo. Brad's notes are paraphrased ([D68](0068-paraphrase-brads-notes-in-public-records.md)).
