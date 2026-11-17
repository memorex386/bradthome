---
status: accepted
date: 2026-11-17
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D241
---

# "What I'm looking for" is a fit list between On the side and Get in touch

## Context and problem statement

On 2026-11-17 Brad wrote down what Brad wants in the next role, in Brad's private notes, and asked for it to reach employers: standards stated openly, as a positive, never rude, so a team that doesn't match can see that for itself. No page said what kind of role Brad wants. D152 had left availability and reply-time lines out of Get in touch, since no public fact said either. Where should the wants show, in what words, and what may go public?

## Decision drivers

- Brad wants the standards seen, stated only as wants: never an exclusion, a comparison with other teams, pay or travel.
- Every line on the site is a public fact as written, which reaches the site through the export only when tagged public (D44).
- A want is about the future, so it's never a claim about Brad's past work, a receipt, or a line in Experience or Hopper.
- A role page reorders the same words for its role, and never says different things (D134).

## Considered options

The options are the career session's study, in its ranked order. Brad chose on cards there on 2026-11-17, and approved the words on spec 042's Gate 1 cards the same day.

1. A fit list of its own between On the side and Get in touch: a heading, one welcoming line and two buttons, then six rows and a card for each track, with a role page's track first and lit (recommended)
2. How Brad builds, as four steps and chips
3. One paragraph inside Get in touch

## Decision outcome

Chosen option 1, with the heading "What I'm looking for", and location and terms made public (Brad's cards, 2026-11-17). It amends D152's note: location and terms are now public wants, shown in this section, while Get in touch still holds only the address, the profiles and the PDF.

- The section, `#looking-for`, sits between On the side and Get in touch on the home and each role page. The eyebrow "Next", the heading, the lede, "Email Brad" (to `#contact`) and "Ask about this" (the chat, with "What kind of role is Brad looking for?" in its box, unsent, D230) on the left; the rows Role, Team, How I build, Fields, People and Where, then the Mobile, Full-stack and Applied AI cards, on the right.
- On a role page its own track is first, lit with the accent bar and "This page", and not a link; the other two follow, dimmed at 4.5:1 or more, each linking its page.
- Every row and track line, and the lede, is one of ten public wants, in the words Brad approved, with IDs from `looking-for-lede` to `looking-for-ai`. How I build says agents write "most of the code", as the essay does (D222). The labels need no source.
- The lines live in `content/wants.yaml`, apart from the claims, which `pnpm content:export` writes from the notes' `wants/` subfolder: only bullets under "Public lines", with their ID and a `public · confirmed` tag. Anything else is counted and never written.
- The header keeps its four links (Brad's card): the section leads straight into Contact, which the header links, and the header marks On the side while it's read.
- It reveals once on the existing reveal (D211), by CSS: 8 px in 260 ms, 60 ms apart, with no new script.

### Consequences

- Good, because an employer reads, before the contact section, what role, team and work Brad wants, and sees for themselves whether theirs matches.
- Good, because every line is Brad's approved public want, written once in the notes and exported, never typed into the site.
- Bad, because the home is about 1,020 px longer on a desktop and 1,740 px on a phone.
- Bad, because a change to a line needs the notes, an export and the tests that pin its words, as a claim does.

### Confirmation

Spec 042's tests check the section's place, order and words against `wants.yaml`, the lit track on each role page, the buttons, the reveal, the page with no script, the header, axe and contrast in both themes, layout shift, and the export's planted lines.

## Pros and cons of the options

### A fit list of its own

- Good, because each want is one short row a reader can scan, and the tracks link the role pages.
- Bad, because it's the tallest of the three.

### How Brad builds, as steps and chips

- Good, because it shows the way of working most of all.
- Bad, because the role, team and place don't fit four steps.

### A paragraph in Get in touch

- Good, because it adds the least height.
- Bad, because one paragraph reads as fine print, and Get in touch stays about contact.

## More information

- Spec: [spec 042](../../specs/042-looking-for/spec.md), slice 5.15.
- Amends: [D152](0152-contact-shows-in-the-hero-and-closes-each-page.md)'s note on availability lines.
- Related: [D242](0242-a-want-source-kind-and-rule-11.md), [D243](0243-preps-fixed-card-of-wants.md), D44, D134, D209, D211, D222, D230.
