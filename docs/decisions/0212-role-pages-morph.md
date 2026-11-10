---
status: accepted
date: 2026-11-10
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D212
---

# Role pages morph with a cross-document View Transition

## Context and problem statement

The role switch under the hero links the role pages, `/mobile`, `/fullstack` and `/ai`, which show the same page with a different emphasis ([D134](0134-role-pages-light-the-hero-and-reorder-the-hopper-story.md)). A tap loads the new page from its top, and its hero plays its 1.6 s opening again. The landing study's direction A, which Brad chose on 2026-11-09, makes a switch one motion (MA-15): the current role's mark slides, the eyebrow and note crossfade, the lit word and rows relight, and Hopper's topics move to their new order. How should a switch between separate pages morph, while each stays a plain link?

## Decision drivers

- The switch stays three plain links: no script needed, the back button kept, each page shareable.
- Motion only when the visitor hasn't asked for less ([D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md)), CSS before script, and no scroll handler.
- No CSP change, and the one module stays small ([D147](0147-link-previews-ship-one-small-script.md)).
- A browser without the feature, such as Firefox today, loads the role page as it does now.

## Considered options

The options are listed in the builder's ranked order.

1. A cross-document View Transition in CSS, with a short script that skips it on other navigations, takes a scrolled page to its top as the switch begins, and lands the new hero at rest (recommended)
2. The same, keeping the reader's scroll place on the new page
3. The same, playing only when the switch is tapped from the top of the page
4. One page that switches roles in place with script

## Decision outcome

Chosen option 1. At spec 029's Gate 1 (2026-11-10) Brad first chose option 2. The build found that Chrome holds back every scroll on the new page until a transition ends (checked with `scrollTo`, `scrollTop` and a fragment), so the morph would aim at the top of the page and jump at its end. On a second card the same day, Brad chose option 1.

- The home and the role pages opt into cross-document View Transitions in CSS, only inside `prefers-reduced-motion: no-preference` and `scripting: enabled`.
- The current role's mark slides over 360 ms on the spring, or fades in from the home. The eyebrow and the "End to end" note fade out over 110 ms, then in over 200 ms. The words, rows and roles' names relight in place over 200 ms. Hopper's topics move to their new order over 420 ms on the spring. The rest of the page swaps at once, under the still header and floating button.
- `morph.client.ts` joins the one module, with `pageswap` and `pagereveal` listeners. It skips the morph for anything but a push to a role page, so the header's link home, back, forward and a reload load as today. It takes a scrolled page to its top as the switch begins, so the morph plays where the role page opens. It finishes the new page's hero, so its opening doesn't replay under the morph. On Brad's Gate 1 card the module may grow by at most 768 bytes; it measured 481.
- Under reduced motion, with no script, or in a browser without the feature, a switch is a plain page load at the top, as before.

### Consequences

- Good, because a switch reads as one page changing its emphasis, and the role pages stay plain, shareable links.
- Good, because the CSP doesn't change, and the morph is CSS.
- Bad, because a visitor who scrolled down to the switch, as on every phone, is taken to the top before the morph, as a role page opens today.
- Bad, because Firefox and older browsers don't see the morph.

### Confirmation

Spec 029's tests read the transition's animations on each switch, check that every part starts and ends where the role page shows it, that the hero is at rest, and that other navigations, reduced motion, no script and Firefox load normally, and measure the module and layout shift.

## More information

- Decided by: Brad Thome, on the landing study's cards (2026-11-09) and on spec 029's Gate 1 cards (2026-11-10).
- Builds on [D122](0122-motion-only-when-the-visitor-hasnt-asked-for-less.md), [D134](0134-role-pages-light-the-hero-and-reorder-the-hopper-story.md), [D147](0147-link-previews-ship-one-small-script.md), [D206](0206-the-role-switch-moves-into-the-hero-without-the-address.md) and [D211](0211-sections-reveal-their-evidence-once.md).
