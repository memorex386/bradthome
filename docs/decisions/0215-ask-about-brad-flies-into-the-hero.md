---
status: accepted
date: 2026-11-11
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D215
---

# "Ask about Brad" flies into the hero and back on a phone

## Context and problem statement

Since v2.5 ([D214](0214-ask-about-brad-floats-on-phones.md)), a phone shows "Ask about Brad" in the corner whenever the hero's own button is off screen, and swaps the two at once as the hero's comes into view. Two buttons sat in two places, and the hero's was full width while the corner's was a pill. On 2026-11-11, with v2.5 live, Brad asked for the two to read as one button that moves: the corner's flies into the hero's place, and back out. How should it fly?

## Decision drivers

- To a visitor it's one button, and only one is ever seen or heard.
- Layout shift stays 0 ([D126](0126-the-heros-text-is-readable-from-the-first-frame.md)): moving one element between the hero and the corner shifted the layout, which is why D214 has two.
- Motion only when the visitor hasn't asked for less ([D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md)).
- The one module stays small ([D147](0147-link-previews-ship-one-small-script.md)).

## Considered options

The options are listed in the builder's ranked order.

1. A transform the script draws each frame, aimed at the place's current position, then a hand-over to the hero's button (recommended)
2. A same-document View Transition around the swap
3. A fixed animation computed once at its start

## Decision outcome

Chosen option 1, which Brad approved at spec 032's Gate 1 (2026-11-11), with phones only and the hero's button as the same pill on Brad's cards. It amends D214.

- On a phone the hero's button is the corner's pill: its own width, 56 px tall, left-aligned, with the raised shadow.
- Once all of the hero's place is 100 px into the screen, below the sticky header and above the bottom, the corner's pill flies there over 320 ms and hands over to the hero's button. As the place leaves that band, it flies back. Each frame aims at where the place is, so scrolling during a flight can't make it miss, and a reversal turns around from where it is.
- The flight is a transform alone, so layout shift stays 0. With reduced motion the two swap at once.
- MA-20 plays only on the corner's first appearance; a return from the page's end reverses the exit.
- On Brad's Gate 1 card the one module may grow by at most 768 bytes for it; it measured 637.

Option 2 was ruled out because a View Transition freezes the page into a snapshot while it plays, which reads as a stall mid-scroll. Option 3 lands off target whenever the visitor keeps scrolling.

### Consequences

- Good, because the ask button reads as one thing that travels with the visitor.
- Good, because layout shift stays 0 and the CSP doesn't change.
- Bad, because the script now runs a frame loop for 320 ms per flight, and the module grows by about 640 bytes.
- Bad, because the hero's phone button is no longer full width.

### Confirmation

Spec 032's tests trace each frame of a flight in and out, slow, flung and reversed, check it ends on target with one button seen, check reduced motion swaps at once, run axe, snapshot the hero's pill, and measure the module.

## More information

- Decided by: Brad Thome, in the session after v2.5's release and at spec 032's Gate 1 (2026-11-11).
- Amends [D214](0214-ask-about-brad-floats-on-phones.md); builds on [D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md), [D126](0126-the-heros-text-is-readable-from-the-first-frame.md) and [D147](0147-link-previews-ship-one-small-script.md).
