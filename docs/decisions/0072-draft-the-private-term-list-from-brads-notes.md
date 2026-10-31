---
status: accepted
date: 2026-10-31
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D72
---

# Draft the private-term list from Brad's notes

## Context and problem statement

The private-term check ([D45](0045-a-private-term-script-plus-a-secret-scanner.md)) blocks any term on a private list from entering the repo, and the list itself never enters the repo ([D27](0027-the-conventions-batch-for-templates-ids-and-records.md)). The check catches only what's on the list, and a common word on it would block ordinary commits. What goes on the list, and who writes it?

## Decision drivers

- Brad's privacy rules have no exceptions, because git history is permanent and the repo will be public.
- No term may appear in the repo, in a check's output or on a decision page.
- Few false matches, so that nobody is tempted to switch the check off.

## Considered options

The options are listed in the builder's ranked order.

1. Claude drafts it from Brad's notes, and Brad reviews the file before the pull request (recommended)
2. Contact details only for now
3. Brad writes it

## Decision outcome

Chosen option: "Claude drafts it from Brad's notes, and Brad reviews the file before the pull request", because it covers every kind of private detail the notes hold, while Brad keeps the final say on each term.

The list covers personal contact details in their usual formats, home address details, the user names and folder paths of the machines that build the site, projects kept out of public view, and any name or number in the notes that isn't marked public. Brad adds anything else to keep out. Nothing marked public goes on it.

### Consequences

- Good, because the check starts with broad coverage, instead of growing after a leak.
- Good, because Brad reviews every term on Brad's own machine, and no term reaches a page or the repo.
- Bad, because a broad list risks false matches. The fix is always a better term in the list, never an allowlist in the repo, which would reveal the term.

### Confirmation

`pnpm doctor` reports that the list was found and how many terms it has, never a term (spec 001, S8.2). The spec's tests use made-up terms. The pull request records that Brad reviewed the list before Gate 3.

## Pros and cons of the options

### Claude drafts it, and Brad reviews it

- Good, because it's thorough from the first commit.
- Bad, because Brad has to review every entry.

### Contact details only

- Good, because it's short and rarely matches by mistake.
- Bad, because private career details aren't covered.

### Brad writes it

- Good, because only Brad handles the terms.
- Bad, because it's more work for Brad, and gaps are easier to miss.

## More information

- Decided by: Brad Thome, on the slice 1.3 decision page (Q1).
- Spec: [001, hooks and agent rules](../../specs/001-hooks-and-agent-rules/spec.md), Story 1.
