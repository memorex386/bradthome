# Spec 011: The Hopper story

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                                                                                                            |
| Status          | Approved                                                                                                                                                                                                                                                                                                                                        |
| Slice           | 3.3 Hopper                                                                                                                                                                                                                                                                                                                                      |
| Branch          | `011-hopper`                                                                                                                                                                                                                                                                                                                                    |
| Mocks and flows | [mocks/README.md](mocks/README.md): the section itself, on `/v2` on this pull request's preview, with screenshots of each state                                                                                                                                                                                                                 |
| Plan            | [plan.md](plan.md), approved with this spec at Gate 1                                                                                                                                                                                                                                                                                           |
| Decisions       | [D129](../../docs/decisions/0129-the-hopper-story-ships-from-the-public-resume-claims.md), from this slice. It builds on [D118](../../docs/decisions/0118-direction-a-with-cs-numbered-evidence-receipts.md)–[D128](../../docs/decisions/0128-the-heros-buttons-link-a-stub-and-linkedin-until-their-slices.md), and on specs 005, 009 and 010. |

## Summary

The new home's Hopper section replaces the stub that the hero's "See the work at Hopper" button points at (D128). It sits in the dark band, as Home v2 draws it (D118). It opens with the eyebrow "Experience · Hopper · Apr 2022 – Oct 2026", a heading, and the role claims: "Senior Software Engineer, remote." and "Founding engineer on the Fintech AI team." Then come the work's topics, each a card: Disruption Assistance, the partner platform, Fintech AI, the human-approved agent workflow, and RemoteUI and WebViews. Every sentence is a public Hopper claim from `content/claims.yaml`, shown as written, and each carries a numbered evidence receipt from spec 009. No Hopper claim has a public link yet, so every receipt is in its ask-me state. Brad chose to build it now from those claims, with Brad's own notes to come later as a content change (D129), so a new claim, topic or quote shows with no layout work. The section has no motion of its own, ships no script, and shows only at `/v2`, which a release build leaves out (D127).

## Scope

**In:**

- The section, `apps/site/src/components/home/Hopper.astro` and `HopperClaim.astro`, its headings, labels and layout rules in `hopper.ts`, and its styles in `apps/site/src/styles/home/hopper.css`.
- `/v2`: the section in place of the stub, and the hero's button reaching it.
- Tests in `tests/011/`, with snapshot baselines from the pinned container.
- Unlocked tests in specs 005 and 010 that name the stub or the hero as the only reader of the claims.

**Out:**

- Brad's notes on Hopper: the team, numbers, the agent workflow step by step and a colleague's quote. They come as a content change after an export (D129).
- Evidence links. No Hopper claim has one yet; the proof state shows once one does.
- Role pages that reorder the topics for a role (3.6), the experience section (3.4) and side projects (3.5).
- Any change to v1's pages, or to the design system's components.
- Motion. The section reads in order at rest.

## User stories and acceptance scenarios

The IDs in brackets, such as (K1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: The Hopper story reads in order (P1)

A recruiter who follows the hero's button should see Brad's role at Hopper and the work, topic by topic.

**Why this priority:** Hopper is the site's main story.

**Independent test:** open `/v2#hopper` at both sizes, with reduced motion on.

- **S1.1** Given a desktop 1280 pixels wide, when `/v2` loads, then under the hero a section `#hopper` shows, in order: the eyebrow "Experience · Hopper · Apr 2022 – Oct 2026" in capitals; a level-2 heading "Fintech products for Hopper and its partners"; the claims "Senior Software Engineer, remote." and "Founding engineer on the Fintech AI team."; and a list of five topic cards, each with a level-3 heading, in this order: "Capital One Travel: Disruption Assistance", "The partner platform", "Fintech AI", "Human-approved agent workflow" and "RemoteUI and WebViews" (K1, K2).
- **S1.2** Given each topic card, then it shows its topic's claims in claim order, then its tags, a list named for the topic. The first card is tinted, as the board's first card is.
- **S1.3** Given a phone 390 pixels wide, or 320, then the same parts stack in the same order, and the page never scrolls sideways (K3, K4).
- **S1.4** Given the section, then it has no animation or transition of its own, and runs no script. Its layout shifts add up to 0 as the page loads, and Lighthouse's median Cumulative Layout Shift for `/v2` stays at 0.

### Story 2: Every sentence is a public claim (P1)

Brad's rule: every sentence on the page comes from a public claim, or is a heading or label (D129).

**Why this priority:** the repo and site are public.

**Independent test:** read the built section's text against `content/claims.yaml`.

- **S2.1** Given the built `/v2`, then every paragraph in `#hopper`, less its receipt marker, equals the text of a claim in `content/claims.yaml` whose subject is Hopper. Every other piece of text is a heading, the eyebrow, a tag, a receipt's title or one of the receipt's fixed labels.
- **S2.2** Given the claims about Hopper, then every one shows in the section once, except the "Stack" topic's note, which shows only through its words in the tags. No claim about another subject shows.
- **S2.3** Given each tag and each receipt title, then every word in it appears in a claim of its topic, or the receipt's own claim.
- **S2.4** Given a new claim about Hopper in an existing topic, in a new topic, or with the topic "Quote", then the section shows it in its place, with the next receipt number, with no change to the section's code. A quote shows as a pull quote after the topics.
- **S2.5** Given the eyebrow, then its dates come from `content/jobs/hopper.yaml`, and the page fails to build without that file or without a public role claim and topic.

### Story 3: Every claim carries its receipt (P1)

D118's numbered receipts: a marker on each claim opens its note.

**Why this priority:** a claim with no evidence asks the visitor to ask, rather than inventing a source.

**Independent test:** open, follow and tab through the receipts at both sizes.

- **S3.1** Given each claim in the section, then it ends with one receipt marker, numbered from 1 in reading order, and has one receipt note with the same number and a short title.
- **S3.2** Given a claim with no evidence link, which is every Hopper claim today, then its marker is outlined and named "Receipt N, ask Brad", and its note reads "Ask me", "No public link yet." and links "Ask Brad about it" to brad@bradthome.com (R1, R2).
- **S3.3** Given a claim with evidence links, then its marker is filled and named "Receipt N, proof", and its note links each source, "See the source". Proven with a planted claim, since none is public yet.
- **S3.4** Given a desktop 1280 pixels wide, then each claim's note sits in the margin to the right of the claim, top-aligned with it. Given a phone, then it sits in line under the claim (K1, K3).
- **S3.5** Given a closed note, when the visitor follows its marker, or clicks its summary, or focuses its summary and presses Enter or Space, then it opens, and pressing again closes it (R1, R2).

### Story 4: It works with a keyboard and a screen reader (P1)

**Why this priority:** WCAG 2.2 AA is the site's floor.

**Independent test:** tab through the section, and run axe.

- **S4.1** Given a keyboard, when the visitor tabs from the hero's buttons, then focus moves through the section in reading order: for each claim, its marker, then its note's summary, then, when the note is open, its link. Each shows a 2-pixel accent ring with at least 3:1 contrast against what's around it, on the band and on a note (F1, F2).
- **S4.2** Given the hero's "See the work at Hopper" button, when the visitor follows it, then the URL ends `#hopper`, and the section's heading is in view. The header's Hopper link goes to the same place.
- **S4.3** Given `/v2` in either theme at either size, with every note closed and with every note open, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S4.4** Given every text pair the section uses, in both themes, then it meets 4.5:1: the band's ink and muted text and accent on the band, and the note's text, kind and link on the note.
- **S4.5** Given reduced motion, then the section at phone 390×844 and desktop 1280×800, in light and dark, matches its committed snapshot with no pixel tolerance, in the pinned container. So do one open note on each size and the focus states (K1–K4, R1, R2, F1, F2).

### Story 5: Live stays v1 (P1)

**Why this priority:** D120 and D127.

**Independent test:** build with and without the release flag.

- **S5.1** Given a build with `BRADTHOME_RELEASE=1`, then it holds no `v2.html`, so the section never reaches live. v1's pages, words and stylesheet don't change, and specs 003, 006, 007 and 009's snapshots match without new baselines. Spec 010's whole-page baselines and its desktop focus baseline are made again, since they show the page under the hero, which this slice changes; its hero-only scenarios are unchanged.

## Edge cases

- A claim's text over several lines, or with a list, as some VINDecoded claims have: no Hopper claim has one, and it would show as one paragraph. Lists in claims are slice 3.5's to lay out, since VINDecoded's claims are the ones that have them.
- A topic with no look in `hopper.ts`: its card takes the topic's name as its heading, with no kicker or tags. Covered by S2.4.
- A claim with two evidence links: two links, "See the source 1" and "See the source 2". Covered by S3.3.
- 200% zoom, or 320 pixels wide: the notes stack under their claims. Covered by S1.3.
- A link to a marker's note in the address bar: the browser opens the note. Covered by S3.5.

## Functional requirements

- **FR-001** `/v2` MUST show the Hopper section, `#hopper`, under the hero, in place of the stub, and the hero's button and the header's link MUST reach it.
- **FR-002** The section MUST read every Hopper claim from the content collection and the dates from the Hopper job, and MUST fail to build without them.
- **FR-003** Every sentence in the section MUST be a public Hopper claim's text, as written. Headings, tags, receipt titles and the receipts' fixed labels MUST live in `hopper.ts`, and every tag and receipt title MUST use only words from its claims.
- **FR-004** The section MUST group claims by topic in claim order, show "Role and dates" under the heading, keep "Stack" out of the sentences, and show "Quote" as pull quotes, so a new claim, topic or quote needs no code change.
- **FR-005** Each claim MUST carry spec 009's receipt marker and note, numbered in reading order. A claim with evidence MUST get a proof note that links it; one without MUST get the ask-me note.
- **FR-006** The section MUST use the design system's components and tokens, with its own rules in `styles/home/hopper.css`, and MUST add no animation, transition, script, inline style or request to another host.
- **FR-007** The section MUST meet WCAG 2.2 AA in both themes at both sizes, notes open or closed, with a visible focus ring on every control.
- **FR-008** The end-to-end tests MUST cover the section's order, receipts, keyboard path, axe, contrast, layout shift and snapshots, in the pinned container.
- **FR-009** `docs/plan.md` MUST show slice 3.3's state, and the decision log MUST hold D129.

## Success criteria

- **SC-001** 0 sentences in the section aren't a public Hopper claim's text.
- **SC-002** 13 of 13 Hopper claims show, less the one "Stack" note: 12 claims, 12 receipts.
- **SC-003** axe finds 0 violations in each of the section's eight checked states: two sizes, two themes, notes closed and open.
- **SC-004** The page's layout shifts add up to 0, and Lighthouse's median Cumulative Layout Shift on `/v2` is 0.
- **SC-005** A planted claim, topic and quote each show with 0 changed lines of the section's code.

## Mocks and flows

[mocks/README.md](mocks/README.md) lists the states with screenshots, and links `/v2` on this pull request's preview.

## Key entities

- **The section:** `components/home/Hopper.astro`, `HopperClaim.astro` and `hopper.ts`, styled by `styles/home/hopper.css`.
- **The claims:** the entries in `content/claims.yaml` whose subject is `hopper`, and `content/jobs/hopper.yaml`.

## Assumptions

- The export keeps the topics' names as they are. A renamed topic loses its kicker and tags, and still shows.
- A colleague's quote, when Brad adds it, arrives as a public claim with the topic "Quote", its words and attribution in its text.

## Open questions

None.

## Decisions made while writing this spec

Tier 3, within D118 and D129:

- The heading is the board's, "Fintech products for Hopper and its partners". The board's lede is a draft, so the two role claims take its place.
- Each topic is a full-width card rather than the board's two-column grid, so each claim keeps its note in the margin, as the C résumé draws receipts. The first card keeps the board's tint, in place of its double width.
- The topics follow the claims' order, which matches the brief's: Disruption Assistance, partner platform, Fintech AI, agent workflow, RemoteUI and WebViews.
- The kickers, headings, tags and receipt titles are labels in `hopper.ts`. Every tag and title is made of its claims' words, and a test checks them.
- The ask-me note reads "No public link yet." and "Ask Brad about it", a link to brad@bradthome.com, the same for every claim.
- The "Stack" claim reads as a note on the other bullets, so it shows only through the tags.
- The section adds no motion. The notes' own transitions are the design system's.

## Facts left out for Brad

The board has facts that no public claim backs. Each needs a public bullet in the notes, then an export:

- "Post-booking protection, payments and partner integrations" in the board's lede, as a summary of the role.
- The tags "LLMs", "Experiments" and "Offers" on the Fintech AI card.
- Evidence links for any Hopper claim, such as a public page about Disruption Assistance or a partner launch.

## Changes to other specs

Specs 001–003 stay locked as they are. Two unlocked tests change, each noted in its spec:

- **Spec 005:** SC-004's test lets the Hopper section read the Hopper claims and job, beside the home page's entry and the hero's claims.
- **Spec 010:** S4.2's tests follow "See the work at Hopper" to the finished section, headed "Fintech products for Hopper and its partners", instead of the stub.

## Changes since approval

- Changed on 2026-11-05, in slice 3.6: the page moves from `v2.astro` into the shared `HomePage.astro`, which `/v2` and the role pages render (spec 014). The static tests read the shared page for the section's place, and check that only it imports the section and that a release build leaves out `/v2` and the role pages. The switch under the header moves the section down, so its baselines are made again. The Hopper story also takes the role: a role page passes its topic order (D134), and `/v2` keeps the claims' order. Brad approved it with spec 014 at its Gate 1.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/011/`. Spec 001's traceability check confirms it, and CI runs it. This spec's tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: approved by Brad in the session on 2026-11-04, with the plan and mocks ([recorded on #40](https://github.com/memorex386/bradthome/pull/40#issuecomment-6648074056))
- Changed in spec 016 (slice 3.8), on 2026-11-05: FR-006's "no script" now allows the link previews' one first-party module and nothing else, and the end-to-end script check changed with it. Brad chose this on a choice card in the slice 3.8 session ([D147](../../docs/decisions/0147-link-previews-ship-one-small-script.md)).
- Changed in spec 019 (slice 3.11), on 2026-11-06: v2.0 retires the release flag (D127) and moves the new home from `/v2` to `/` ([D162](../../docs/decisions/0162-the-new-home-moves-to-the-root-and-v2-redirects-there.md)). This spec's tests that expected a release build to leave phase 3 out, or named `/v2`, now expect the release build to be the same build as every other and read `/`.
