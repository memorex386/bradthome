# Spec 035: The essay's framing lines, and Brad by name in the judge's notes

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|           |                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track     | Light: a copy change, one phrase list and one display rule, with no new layout                                                                                                                              |
| Status    | Approved                                                                                                                                                                                                    |
| Branch    | `035-essay-and-judge-notes`                                                                                                                                                                                 |
| Gate 1    | Approved by Brad on 2026-11-12. In the career session, on cards: reword the lines, and fix the judge's notes before the release. In this session, on a card: the wording and the check, each as recommended |
| Decisions | D222, from this spec. It amends D199's scope and builds on D163, D194, D200 and D221, and spec 021's FR-008                                                                                                 |

## Summary

Slice 5.9 reached main on 2026-11-12. A check of that push found two problems that came before the slice:

- **The essay framed Brad's work as one person's.** Its summary said Brad runs VINDecoded "as a one-person engineering team where AI agents write most of the code". Its constraint section opened "The constraint is that I am the whole engineering team."
  - The chat quoted both lines when asked "So Brad is just one engineer running a team of AI agents?"
  - The eval passed that answer, since the framing check looked only for "one engineer" and "a team of AI agents".
  - Brad doesn't want that framing.
- **`/evals` showed the judge's notes as the judge wrote them,** with "he" and "his" for Brad. The site calls Brad "Brad".

On the cards, Brad chose:

- To reword the two lines, before slice 5.9's release.
- The wording: "where AI agents write most of the code and I review and approve the work", and "The constraint is that the work waits for my review and approval."
- That the framing check also fails "one-person" and "whole engineering team".
- To make `/evals` show "Brad" in the judge's notes before the release.

## Scope

**In:**

- **The essay** (`pages/vindecoded-agents.mdx`): the two sentences. Every other word stays as it is. The corpus and `/llms.txt` follow from the essay.
- **`tests/006/`:** the article fixture's two sentences, and the essay's baselines.
- **`apps/evals/src/checks.ts`:** two phrases added to the framing check, and a fresh eval run (D194).
- **`components/evals/evals.ts` and `pages/evals.astro`:** each judge's note goes through the chat's pronoun rewriter, and one line in "How it works" says so.
- **Docs:**
  - Record D222.
  - Add notes to D199 and to specs 006 and 023.
  - Add an entry to `docs/plan.md`'s log.

**Out:**

- **The release and the chat API's redeploy.** Each waits for Brad's go-ahead. The release runs with `words-may-change=home-and-essay` and updates the README's "What's live" line. The redeploy comes after it, since the API bundles live's corpus.
- **The chat's prompt.** Its rule 4 still names "one engineer" and "a team of AI agents", and it doesn't change. The corpus no longer contains the old framing, and the check now fails it.
- **The judge's prompt and `results.json`.** The judge's words stay as each run recorded them, so this needs no other eval run.

## User stories and acceptance scenarios

### Story 1: The essay says what Brad does, not how many people do it (P1)

A recruiter reads the essay's summary, or asks the chat whether Brad is "just one engineer". They learn that AI agents write most of the code and that Brad reviews and approves the work.

- **S1.1** Given the essay's summary, then its first sentence reads "I run VINDecoded, a profitable vehicle-research product on Android, iOS and the web, where AI agents write most of the code and I review and approve the work."
- **S1.2** Given the essay's section "The product and the constraint", then its third paragraph opens "The constraint is that the work waits for my review and approval."
- **S1.3** Given the essay, then:
  - none of its text reads "one-person", "whole engineering team", "one engineer", "a team of AI agents" or "solo";
  - every other word is as it was, which spec 006's article fixture checks with these two sentences changed.
- **S1.4** Given the chat's corpus, built from this commit, then:
  - the essay's summary source holds the new sentence;
  - no source reads "one-person" or "whole engineering team".

### Story 2: The eval fails the old framing (P1)

- **S2.1** Given an answer that says "one-person" or "whole engineering team", in any suite, then the framing check fails it, as it fails "one engineer".
- **S2.2** Given an answer that quotes either phrase in a sentence that turns it down, as in 'the documents don't call Brad "one-person"', then the framing check passes it. The other labels have the same allowance (D200, spec 034's S3.5).
- **S2.3** Given this code, then `apps/evals/results.json` is a passing run with its fingerprint (D194, D200, D221), and its framing case's answer contains neither phrase.

### Story 3: `/evals` calls Brad by name in the judge's notes (P1)

A visitor opens a case on `/evals` and reads the judge's note. It calls Brad "Brad", as the rest of the site does.

- **S3.1** Given a judge's note that contains "he", "him", "his" or "himself", then `/evals` shows "Brad" in its place, or "Brad's" for "his", and no note on the page contains one of those words.
- **S3.2** Given any case, then its verdict and its checks show as the run recorded them, and `results.json` keeps the judge's own words.
- **S3.3** Given `/evals`' "How it works", then one line says that the judge's notes are its own words, except that each pronoun for Brad becomes Brad's name.

## Edge cases

- A word that only contains the letters, such as "the", "this" or "history", isn't a pronoun. The rewriter matches whole words (spec 021).
- "They", "their" and "them" stay as they are. In the judge's notes they mean the sources, as in "follows from them".
- The judge reads only answers about Brad, so a "he" in a note means Brad, as it does in the chat's answers (spec 021's FR-008). No note today uses "he" for anyone else.
- D199's "with one person reviewing" stays in the essay. The check looks for "one-person", hyphenated, so an answer that quotes that line still passes.

## Functional requirements

- **FR-001** The essay's two sentences MUST read as Brad chose them, and every other word MUST stay as it was.
- **FR-002** No text in the essay or the corpus MUST read "one-person" or "whole engineering team".
- **FR-003** The framing check MUST fail "one-person", with a hyphen or a non-breaking hyphen, and "whole engineering team", as it fails "one engineer". A label quoted in a sentence that turns it down MUST still pass, as before.
- **FR-004** A fresh eval run MUST pass on this code's fingerprint before the change ships (D194, D200, D221).
- **FR-005** `/evals` MUST show each judge's note through the chat's pronoun rewriter. It MUST NOT change a verdict, a check, or the note in `results.json`.
- **FR-006** `/evals` MUST say how the notes' wording differs from the judge's.

## Success criteria

- **SC-001** The essay's text matches spec 006's fixture word for word, and the fixture differs from the old one only in the two sentences.
- **SC-002** The run passes the gate, and no judge's note on `/evals` contains "he", "him", "his" or "himself".

## Decisions to record

- **D222:** the essay says Brad reviews and approves the work, in place of "a one-person engineering team" and "the whole engineering team". The framing check also fails those two phrases. This amends D199's scope.

## Changes to other specs

- **Spec 006:**
  - The article fixture's two sentences change.
  - The baselines change where the summary shows.
  - Its approval section has a note.
- **Spec 023:**
  - The framing check has two more phrases.
  - `/evals` shows the judge's notes through the rewriter, and adds one line under "How it works".
  - Its tier-3 note on exact phrases now names D199's "one person reviewing", which the essay still contains.
  - A note under "Changes since approval" says what changed.
