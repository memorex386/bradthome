---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D176
---

# Interview prep ships as designed, and never stores a posting

## Context and problem statement

What does slice 4.5's interview-prep tool do, and are pasted job descriptions ever stored?

## Decision drivers

- An interviewer gets the most from a real posting.
- Pasted text is the likeliest place for a prompt injection.

## Considered options

The options are listed in the builder's ranked order.

1. As designed, with the posting never stored (recommended)
2. Roles from a list, with nothing pasted
3. Drop prep from phase 4

## Decision outcome

Chosen option 1, as recommended. A visitor pastes a job description or names a role, and gets the fit with evidence from the corpus, honest gaps, and questions to ask Brad, as in the prep designs. Text that isn't a posting gets a request for one. A posting is used for that one answer, then dropped: it's never stored or logged ([D175](0175-the-chat-logs-numbers-only-never-what-visitors-type.md)). It's capped at about 3,000 words, fenced as untrusted text, and counts as 3 of the visitor's 20 daily questions ([D173](0173-limits-show-the-designed-states-at-20-questions-a-day.md)).

### Consequences

- Good, because it's the most useful version for an interviewer.
- Bad, because pasted text needs its own injection cases in the evals.

### Confirmation

Slice 4.5's tests show a posting reaches no log, and slice 4.4's injection suite gains cases hidden in postings.

## Pros and cons of the options

### As designed

- Good, because it maps a real posting to cited work.

### Roles from a list

- Good, because nothing pasted means nothing to inject.
- Bad, because it's much less useful.

### Drop it

- Bad, because it gives up the tool most aimed at interviewers.

## More information

- Decided by: Brad Thome, on a choice card in the phase 4 planning session, 2026-11-06.
