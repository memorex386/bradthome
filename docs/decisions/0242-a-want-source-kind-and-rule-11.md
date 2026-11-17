---
status: accepted
date: 2026-11-17
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D242
---

# Brad's wants are a `want` source in the corpus, and the chat's rule 11 says how to use them

## Context and problem statement

Brad chose, on 2026-11-17, that the lines of "What I'm looking for" (D241) also flow to the chat and `/llms.txt`. The corpus (spec 020, D174) held four kinds of source, `claim`, `job`, `project` and `essay`, each about Brad's past work, and the chat's rule 6 answered salary, rates, availability, start dates, references and commitments with one fixed reply. How do the wants join the corpus, and how does the chat answer from them without treating a want as experience, judging a team, or saying what Brad doesn't want?

## Decision drivers

- A want is about the future: it's never evidence of what Brad has done.
- The chat answers only from public sources, cited, in the third person (rules 1–3), and rule 6 holds word for word.
- Brad wants the standards seen as positives: a reader whose team doesn't match should see that alone, never be told.
- Every number of a rule stays as it is, since records and specs name them.

## Considered options

1. A fifth kind, `want`, labeled "Looking for", with a new rule 11 after rule 10 (recommended)
2. The wants as claims, under a "Looking for" subject
3. The wants in the system prompt itself

## Decision outcome

Chosen option 1, with Brad's card of 2026-11-17 ("Chat, llms.txt and prep") and spec 042's Gate 1.

- The corpus gains ten `want` sources, after the essay, in the section's order, each with its `looking-for-` ID, the label "Looking for ·" and its row's or track's name ("Overview" for the lede), its words as written, no evidence, and a link to its anchor on the home. The corpus stays version 1: its readers are in this repo and are deployed from it.
- `/llms.txt` gains a "Looking for" section after the essay, which says the lines are Brad's wants in Brad's own words, about the future, not facts about past work.
- A want's document context says it's Brad's words in the first person, a want and not a fact about past work.
- Rule 11, after rule 10: a "Looking for" document is a want, never a fact about past work; questions about the roles, teams, ways of working, fields, people, places or terms Brad is looking for are answered from them alone, restated in the third person and cited; the chat never says what Brad doesn't want, won't do or would turn down, and never says whether a team, company or role is or isn't a fit, leaving any comparison to the visitor; it says what Brad wants in the next role, never that Brad is looking for a job, a role or work, or whether Brad is looking now, which the evals' framing check already fails; rule 6 still holds, word for word. Rules 1–10 don't change.
- New cases check a fit answer cites its want, pay and a start date get the boundary reply alone, and a question for an exclusion or a verdict passes only without one. `never-job-search` now passes with a refusal, or an answer citing the wants that says nothing about timing (Brad's card).
- A full eval run with the new prompt passes in this slice (Brad's card, about $0.40), so the chat API's redeploy, on its own go-ahead after a release, needs no other run (D228).

### Consequences

- Good, because the chat answers "what is Brad looking for?" in Brad's approved words, with links to the section, and still never names pay or dates.
- Good, because a want can't pass for experience: its label, its context and rule 11 all say so.
- Bad, because every answer reads one more rule, and the corpus is ten sources longer, a few hundred cached tokens.
- Bad, because live's chat answers from the wants only after a release and a redeploy.

### Confirmation

Spec 042's tests check the want sources and their order, `/llms.txt`'s section, rules 1–10 against main's hash, rule 11's words, the want's context, and the cases; the changed run and the full run must pass.

## Pros and cons of the options

### A `want` kind and rule 11

- Good, because the chat, `/llms.txt` and prep can each tell a want from a fact.

### Wants as claims

- Good, because one export and one kind.
- Bad, because a claim is past work, with a receipt, and could show in Experience or be cited as evidence in prep.

### Wants in the system prompt

- Good, because no corpus change.
- Bad, because answers couldn't cite them, and a change to a line would change the prompt.

## More information

- Spec: [spec 042](../../specs/042-looking-for/spec.md), slice 5.15.
- Amends: spec 020's corpus and spec 021's prompt; builds on D169–D177, D193, D228.
- Related: [D241](0241-what-im-looking-for-as-a-fit-list.md), [D243](0243-preps-fixed-card-of-wants.md).
