---
status: accepted
date: 2026-11-10
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D211
---

# Sections reveal their evidence once, and the figures carry a rule

## Context and problem statement

Below the hero, the home and role pages sit still. A reader scrolling past Hopper, Experience and the side projects gets no cue to where the evidence is. The landing study's direction A, which Brad chose on 2026-11-09, has each section settle into place the first time it comes into view (T7; MA-9–MA-11, MA-13, MA-14, MA-17 and MA-19's light on cards). How should the sections reveal without breaking the rule that content is readable and complete from the first frame?

## Decision drivers

- Nothing is ever hidden: content is in its final state at rest, with no script, under reduced motion and before it comes near (D126, the brief's motion rules).
- Motion only when the visitor hasn't asked for less (D122), CSS before script, and no scroll handler.
- Each reveal plays once per load, so scrolling back never replays it.
- Layout shift stays 0, and the one module stays small (D147).

## Considered options

The options are listed in the builder's ranked order.

1. CSS reveals keyed by one IntersectionObserver that poses a block only once its edge enters, and plays it at 18% in view (recommended)
2. The study's reveal, which poses each block half a screen before it arrives
3. Plain CSS scroll-driven reveals (`animation-timeline: view()`)
4. No reveals

## Decision outcome

Chosen option 1, which Brad approved at spec 028's Gate 1 (2026-11-10).

- With motion allowed, a section's eyebrow rises 10 px over 480 ms and its heading 14 px over 600 ms, from muted to ink. Cards rise 18 px over 560 ms, 90 ms apart, and their receipt markers pop from 0.8 scale 220 ms later, 45 ms apart. The timeline's bars draw from the left, oldest first. The figures' and the address's rules draw from the left.
- A block on screen when the page loads stays as it is. A block whose edge enters is posed, moved a few pixels and never hidden, and plays once it's 18% in view, once per load. Option 2 would leave blocks posed in a full-page capture; option 3 would replay on scrolling back.
- Each figure in a stat (10M+, Promoted, 1M+, 400K+) carries a permanent 3 px accent rule, everywhere the stat shows (T7). The address's underline becomes a drawn 2 px rule in its color.
- Copying the address swaps its icon for a check that draws, and slides the label. "Copied" holds for 2.6 s, in place of spec 017's 2 s (Brad's Gate 1 card).
- On a pointer device a soft light follows the pointer over a card. The cards aren't links, so they don't lift or press (Brad's Gate 1 card).
- `reveal.client.ts` joins the one module: one IntersectionObserver, one passive `pointermove` listener, and no scroll handler. On Brad's Gate 1 card the module may grow by at most 1,024 bytes for it; it measured 990.
- Under reduced motion or with no script, nothing is posed or played.

### Consequences

- Good, because each section draws the eye to its evidence once, and nothing is ever hidden.
- Good, because layout shift stays 0, and the CSP doesn't change.
- Bad, because the one module grows by about 1 KB.
- Bad, because a reader who stops with a block's edge just on screen leaves it posed a few pixels low until they scroll on.

### Confirmation

Spec 028's tests read the running animations as each section arrives, check the pose, a full-page capture, no replay, deep links, reduced motion and no script, count the listeners and observers, and measure the module.

## More information

- Decided by: Brad Thome, on the landing study's cards (2026-11-09) and at spec 028's Gate 1 (2026-11-10).
- Builds on [D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md), [D126](0126-the-heros-text-is-readable-from-the-first-frame.md), [D147](0147-link-previews-ship-one-small-script.md), [D154](0154-the-copy-button-runs-in-the-sites-one-module.md) and [D209](0209-a-sticky-header-that-marks-the-section.md).
