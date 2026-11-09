---
status: accepted
date: 2026-11-08
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D189
---

# "Ask about Brad" floats in the corner, and fills a phone's screen

## Context and problem statement

Where does "Ask about Brad" sit, and how does the window open? Home v2 draws the button in the hero's corner, in the flow on a phone. The design system's button has a floating form, fixed to a desktop's corner (spec 009).

## Decision drivers

- A visitor can ask from anywhere on a long page.
- Phone first, at WCAG 2.2 AA.
- No change to the header that every page shares.

## Considered options

The options are listed in the builder's ranked order.

1. A floating button in a desktop's corner, in the hero on a phone, opening a corner panel or a full-screen sheet (recommended)
2. A button in the hero only, which scrolls away with it
3. A button in the hero and an "Ask" item in the header and phone menu

## Decision outcome

Chosen option 1, as recommended. On a desktop the button stays in the screen's corner and opens a 440-pixel panel there, over the page. On a phone it sits in the hero, after its links, and opens a full-screen sheet. It shows on the home and the role pages, which share the hero. The window is a modal dialog, so focus stays in it and Escape closes it.

### Consequences

- Good, because a desktop visitor can ask from any section.
- Good, because a phone's sheet gives the answer the whole screen.
- Bad, because the corner button covers a little of the page on a desktop.

### Confirmation

Spec 022's tests open the window from the button on a phone and a desktop, and check its place and size.

## More information

- Decided by: Brad Thome, on a choice card in the slice 4.3 session, 2026-11-08.
