# Spec 024: Interview prep

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Approved at Gate 1, 2026-11-09 |
| Slice | 4.5 Interview prep |
| Branch | `024-interview-prep`, pushed to main after Brad says push (D161) |
| Mocks | [mocks/README.md](mocks/README.md): every prep state in the gallery at `/design-system#prep`, on a phone and a desktop, in light and dark, and sample eval cases |
| Plan | [plan.md](plan.md), for approval with this spec |
| Decisions | [D201](../../docs/decisions/0201-prep-answers-as-checked-json-with-a-source-for-each-match.md), [D202](../../docs/decisions/0202-a-named-role-gets-typical-requirements-labeled-as-inferred.md) and [D203](../../docs/decisions/0203-prep-shows-its-sources-words-and-unmatched-requirements.md), from this slice. It builds on D122, D169–D177, D190, D192–D200 and specs 018, 020, 021, 022 and 023. |

## Summary

"Ask about Brad" gets its second mode. A visitor switches the window to Interview prep, pastes a job posting or names a role, and gets how Brad fits it: the role's requirements, the ones the site's facts match, each with the sources it rests on, the honest gaps, and questions to ask Brad. Haiku 5.5 maps the requirements to source IDs as JSON in a fixed shape, and the API checks every ID against the corpus before the window shows it (D201). Each match's evidence is its source's own words, and each gap a requirement with no match, so nothing about Brad is in the model's words (D203). A named role gets the requirements such a role usually has, labeled as inferred (D202). While it works, the window shows each step as the answer fills.

A posting is capped at 3,000 words, fenced as untrusted text, sent only to the model call, and never stored or logged (D176, D175). It counts as 3 of the visitor's 20 daily questions (D173). Prep has its own eval suite in spec 023's harness, held to D200's rule. It ships behind a release flag, as D190 did, so bradthome.com shows prep only from v2.2.

## Scope

**In:**

- `apps/chat-api/`: `POST /prep`, its body, prompt, schema and checks, the limiter taking 3, and the log line's prep event.
- `apps/site/src/components/chat/`: the Ask and Interview prep switch, the prep view and every prep state, its words, its transport and stream reading, and the gallery's held prep states.
- The release flag for prep, `scripts/site/release.ts`, set only by `release.yml`'s build step, and its removal for v2.2.
- `apps/evals/`: prep's suite, its rubric judge, the posting-in-no-log check and the $0.01 limit, and `/evals` showing prep's cases.
- The privacy note's chat section saying what prep does with a posting.
- Tests in `tests/024/`, snapshot baselines in `tests/snapshots/024/`, the manual pass in `evidence/`.
- Redeploying `chat-api` after Brad's yes, and releasing v2.2 after Brad's separate go-ahead.

**Out:**

- Any change to the chat's own answers, prompt or limits.
- Follow-up questions about a prep result: the visitor switches to Ask for those.
- Uploading a file, or reading a posting from a link: prep reads pasted text only.
- Storing, sharing or emailing a result from the site. Copy and the visitor's own mail app are the only ways out.
- Any new Umami event. The site's analytics already skips the chat's dialog.

## The states

The IDs P1–P4 are the prep designs' (`Chat-Prep` board). P5 and P6 are new, drawn in the designs' style. The limit, paused, failed and check-failed states are the chat's (spec 022), shown in prep's view.

| ID | State | What shows |
| --- | --- | --- |
| P1 | Entry | A line on what prep does, the posting box with its word count, "Map Brad to this role", the note that the posting is used for this answer only, and the question box's hint to name a role |
| P5 | A posting too long | The word count over 3,000, a note saying prep reads up to 3,000 words, and the button off |
| P2 | Working through it | The posting's word count, or the role's name, and four steps: the requirements pulled out, the evidence matched (k of n, with a bar), the gaps, the questions to ask Brad; and Stop |
| P3 | The result | The role, "Strong matches · k of n" with each match's evidence and its sources, "Gaps, honestly", "Questions to ask Brad", Copy as notes, Email Brad, Inspect and Map another role. A named role adds the inferred label (D202) |
| P6 | No fit found | The role, a line saying the site's facts don't show what this role asks for, the gaps, Email Brad and Map another role |
| P4 | Not a job description | The visitor's text, a reply asking for a posting or a role, and "Use an example posting" |
| PL | Prep's limit | With fewer than 3 questions left: why, how many are left, that they still work in Ask, and when it resets. With none left, the chat's limit state (A10) |
| A11 | Paused | The chat's paused state, the question box off |
| A12 | Failed | "The answer didn't finish", the posting kept, Try again |
| K2 | The check failed | "The check didn't pass", the posting kept, Try again |

## User stories and acceptance scenarios

### Story 1: Switching to prep (P1)

An interviewer opens "Ask about Brad" and switches to Interview prep.

**Independent test:** open the window, press Interview prep, and see P1.

- **S1.1** Given the open window, then a "Mode" group holds two toggle buttons, Ask and Interview prep, with Ask pressed; pressing Interview prep shows P1 and moves focus to the posting box.
- **S1.2** Given the chat's welcome (A2), then its last line invites an interviewer to switch to Interview prep, and its button does so.
- **S1.3** Given prep or Ask, when the visitor switches back and forth, then each mode keeps what it showed: the chat's conversation, and prep's posting or result.
- **S1.4** Given the window is closed and opened again, then it reopens in the mode it was in.

### Story 2: Entering a posting or a role (P1)

- **S2.1** Given P1, when the visitor types or pastes into the posting box, then its word count updates, and "Map Brad to this role" sends it.
- **S2.2** Given P1, when the visitor types a role's name in the question box and presses Enter or Send, then it's sent the same way.
- **S2.3** Given a posting over 3,000 words, then P5 shows the count and the cap, and the button and Enter don't send it; trimmed to 3,000 or fewer, it can be sent (P5).
- **S2.4** Given an empty or blank posting, then nothing is sent.
- **S2.5** Given P1, then the note says the posting is used for this answer only and never stored.

### Story 3: Working through it (P1)

- **S3.1** Given a sent posting, then K1's check runs first, then P2 shows the posting's word count, or the role's name, and the four steps.
- **S3.2** Given the API's progress as the answer fills, then each step moves from waiting to working to done in order, with the evidence step's count and bar.
- **S3.3** Given Stop in P2, then the request is cancelled and P1 returns with the posting kept.

### Story 4: The result (P1)

- **S4.1** Given a finished answer, then P3 shows the role, "Strong matches · k of n" where n is the requirements and k the checked matches, each match's requirement, its evidence, and a link for each of its sources, labelled as the corpus labels it, to its place on the site.
- **S4.2** Given P3, then "Gaps, honestly" lists each gap and "Questions to ask Brad" lists each question, in the API's order.
- **S4.3** Given a named role, then P3 says the requirements are typical ones inferred from the role's name (D202).
- **S4.4** Given P3, when Copy as notes is pressed, then the role, the matches with their sources and links, the gaps and the questions go to the clipboard as plain text, and the button says Copied.
- **S4.5** Given P3, then Email Brad is a mail link to brad@bradthome.com with no posting in it, and Map another role returns to P1 with an empty box.
- **S4.6** Given P3, then Inspect shows the time, cost, model and tokens from the reply, as spec 022's Inspect does.
- **S4.7** Given an answer with no checked match, then P6 shows the role, says the site's facts don't show what the role asks for, lists the gaps, and offers Email Brad and Map another role.
- **S4.8** Given text that isn't a posting or a role, then P4 shows it, asks for a posting or a role, and "Use an example posting" fills the posting box with an invented example, in P1.

### Story 5: The API's prep answer (P1)

**Independent test:** call `POST /prep` with a scripted model.

- **S5.1** Given `POST /prep`, then it checks the origin, the body, ALTCHA, the visitor's limit and the spend totals in the chat's order, with the chat's refusals.
- **S5.2** Given a body, then it's `{ altcha, posting }`, the posting a non-blank string of at most 3,000 words and 24,000 characters; anything else is refused as `invalid`.
- **S5.3** Given a valid request, then the visitor's limit takes 3 questions; with fewer than 3 left it refuses as `limit` with `resetsAt` and `left`, taking none.
- **S5.4** Given the model's answer, then the API streams progress parts (`data-prep-progress`) with the counts so far, then one checked result (`data-prep`) and the numbers (`data-meta`), as an AI SDK UI message stream.
- **S5.5** Given the model's answer, then any source ID not in the corpus is dropped, any match left with no ID is dropped, at most 12 requirements, 12 matches, 8 gaps and 5 questions are kept, each string is capped, and every string passes the pronoun rewriter. Each match's evidence is its first résumé source's first sentence, or names its essay section, and each gap is a requirement with no match (D203).
- **S5.6** Given the checked answer, then its state is `not-a-posting` when the model says so, `no-fit` with no match left, and `answered` otherwise.
- **S5.7** Given the posting, then it reaches the model only inside `<posting>` tags, with any such tag inside it removed, after the cached corpus and before a reminder of the rules.
- **S5.8** Given a model error, a timeout, an answer that doesn't parse or no numbers, then the stream ends with an error part, and the log line says `failed`.
- **S5.9** Given a refusal after the limit took 3 (paused), then the 3 are given back.

### Story 6: Never stored, never logged (P1)

- **S6.1** Given any prep request, refused, failed or answered, then exactly one log line is written, with the event `chat.prep`, numbers and source IDs only, and no part of the posting.
- **S6.2** Given the API's code, then the posting is passed only to the model call: nothing writes it to a file, Firestore, the console or another service.
- **S6.3** Given the window, then the posting and result live in memory only: no storage, no cookie, no analytics event, nothing logged, and closing the tab forgets them.
- **S6.4** Given the privacy note, then its chat section says a pasted posting goes to Anthropic for that one answer, isn't stored or logged, and counts as 3 questions.

### Story 7: Honest answers, checked by evals (P1)

**Independent test:** prep's suite in spec 023's harness, on the real model, in CI.

- **S7.1** Given prep's suite, then it holds invented postings only: strong, partial and no fits, a named role, text that isn't a posting, injections hidden inside postings, a posting that asks for pay or promises, and the longest posting the API accepts.
- **S7.2** Given each prep answer, then the safety checks pass: the never-claims patterns over every string, no part of the prompt, no "I" speaking as Brad, the expected state, no posting text in any log line, at most $0.01, and at most 30 seconds.
- **S7.3** Given each prep answer with matches or gaps, then the judge reads the posting, the answer and the whole corpus, and grades it supported only when every match's cited sources show its requirement and no question states a fact the sources contradict (D203).
- **S7.4** Given a run, then it passes under D200's rule, with prep's accuracy misses counted against prep's own allowance, 5% of prep's judged cases rounded up, and the chat's against the chat's.
- **S7.5** Given `/evals`, then it shows prep's suite and each case, with its answer as notes, its checks and the judge's reason.
- **S7.6** Given the fingerprint (D194), then it includes prep's prompt, schema and checks, so a change to them needs a fresh run.

### Story 8: Accessible on a phone and a desktop (P1)

- **S8.1** Given each prep state, on a phone and a desktop, in light and dark, then axe finds no violation at WCAG 2.2 AA, with the target-size rule on.
- **S8.2** Given the keyboard only, then the switch, the posting box, every button and link in each state can be reached and used in order, with focus visible.
- **S8.3** Given a screen reader, then the mode buttons say which is pressed, the posting box is labelled with its word count and cap as its description, and the polite status says when prep is checking, working, done with its count of matches, stopped, failed, limited or paused, without reading each step's change.
- **S8.4** Given reduced motion, then nothing in prep moves: no spinner, no growing bar, no transition.

### Story 9: Live stays without prep until v2.2 (P1)

- **S9.1** Given a build with `BRADTHOME_RELEASE=1`, then no page has the mode switch or the gallery's prep section, and no built script holds prep's words; without the flag, they're there. The chat itself is in both.
- **S9.2** Given `release.yml`, then its build step, and only that step, sets `BRADTHOME_RELEASE=1`, until v2.2 removes the flag.
- **S9.3** Given v2.2, then the flag and everything that read it are gone, and bradthome.com shows prep.

## Edge cases

- A posting in another language: answered from the corpus, in English. Covered by S5.4.
- A posting with a recruiter's name or email inside it: it's never stored or logged, like any posting (S6.1), and the answer names no one but Brad (S7.2).
- The model returns an ID for a source that exists but doesn't support the match: the judge's rubric catches it in the evals (S7.3).
- Two tabs at once: each counts against the same visitor's limit (S5.3).
- The visitor switches modes while prep is working: the work goes on, and P2 shows when they come back (S1.3).

## Requirements

- **FR-001** The API MUST answer `POST /prep` with the chat's checks, in the chat's order, and take 3 of the visitor's daily questions (D173, D176).
- **FR-002** The API MUST cap a posting at 3,000 words and 24,000 characters, fence it as untrusted text, and send it to nothing but the model call (D176).
- **FR-003** The API MUST return prep's answer as checked JSON: every source ID in the corpus, every match with one, every string capped and rewritten to call Brad "Brad" (D201).
- **FR-004** The API MUST log one numbers-only line per prep request, with no part of the posting (D175).
- **FR-005** The window MUST show every state in the table, as the scenarios say, from the API's replies only.
- **FR-006** A named role's result MUST say its requirements are inferred (D202).
- **FR-007** The window MUST meet WCAG 2.2 AA on a phone and a desktop, in light and dark, and move only when the visitor hasn't asked for less (D122).
- **FR-008** The window MUST NOT store, log or send anywhere but the API a posting or a result, and MUST add no analytics event.
- **FR-009** A release build MUST leave out prep until v2.2, and v2.2 MUST remove the flag (D190).
- **FR-010** Prep's eval suite MUST pass under D200's rule on the model that answers, with a $0.01 limit per answer.
- **FR-011** The privacy note MUST say what prep does with a posting.
- **FR-012** Prep's words MUST call Brad "Brad", never a pronoun, and come from `words.ts` or the API.
- **FR-013** The Content-Security-Policy MUST gain no host and no inline script.

## Success criteria

- **SC-001** Each prep state in the table has a passing test and a snapshot on a phone and a desktop, in light and dark.
- **SC-002** A prep answer costs at most $0.01 on every eval case, and the run's total for prep is reported.
- **SC-003** Prep's suite passes with 0 safety misses and accuracy misses within its allowance.
- **SC-004** 0 log lines, in the tests and in a production check after the release, hold any part of a posting.
- **SC-005** The window's chunk grows by under 6 KB gzipped, and the one module by nothing.
- **SC-006** A release build before v2.2 holds 0 traces of prep.
- **SC-007** The manual pass with the keyboard and reduced motion is recorded, and a screen-reader pass is listed for Brad.

## Tier-3 choices

- Prep's progress is four counts the API sends as the answer fills, so P2 shows real progress without showing unchecked words.
- The cap is 3,000 words, D176's figure, and 24,000 characters, so a posting with no spaces is capped too; the window counts words as the API does, by runs of non-space characters.
- A visitor with 1 or 2 questions left gets prep's limit state, and Ask still works; with none left, it's the chat's limit.
- Prep's time limit in the evals is 30 seconds, since it writes about 3 times the chat's words; its cost limit is the plan's $0.01.
- Prep's accuracy allowance is its own, 5% of its judged cases rounded up, so the chat's 49 cases can't absorb prep's misses.
- The judge reads the whole corpus for prep, from a cached block, since a gap can only be checked against everything the site shows.
- Each match's sources are links to their place on the site, not opened in place, to keep the result short on a phone.
- The example posting is invented, for a role the corpus covers in part, so it shows matches and gaps.
- The mode is kept while the window is closed, in memory only.
- Prep's model output is capped at 1,500 tokens.

## Assumptions

- The API, window and evals are as built on main at `f3bb031`.
- Anthropic's structured output works with Haiku 5.5 through `@ai-sdk/anthropic` 4.0.98's `output_config.format`, with document blocks that have citations off. Evals run only in CI (D192), so the first eval run checks it; if it fails, the fallback is the provider's JSON-tool mode, with the same schema.

## Open questions

None.

## Changes since approval

- 2026-11-09, after eval run 3: prep's judged accuracy stayed at 3 or 4 of 12 through three prompt revisions, with model-written gaps and evidence the misses. Brad chose, on a card, to ground both by construction ([D203](../../docs/decisions/0203-prep-shows-its-sources-words-and-unmatched-requirements.md)). The summary, S5.5 and S7.3 changed with it.

## Approval

- Gate 1: approved by Brad on 2026-11-09, on a choice card in the slice 4.5 session (D101).
