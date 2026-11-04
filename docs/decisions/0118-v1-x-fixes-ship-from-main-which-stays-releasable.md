---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D118
---

# v1.x fixes ship from main, which stays releasable

## Context and problem statement

v1.0.0 is live, and spec 008 releases only tags on main ([D113](0113-releases-run-from-a-tag-behind-brads-approval.md)). From slice 3.1, main holds phase 3 work that isn't released until v2.0 ([D58](0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md)). If v1 needs a fix before then, how does it reach bradthome.com?

## Decision drivers

- A fix should take the path every release takes, with the same checks.
- Visitors shouldn't see a half-built redesign.
- No second long-lived branch to keep in step.

## Considered options

The options are listed in the builder's ranked order.

1. Keep main releasable: phase 3 work stays off v1's pages until slice 3.11, so a fix releases from a tag on main (recommended)
2. A `release/v1` branch cut from the v1.0.0 tag, with fixes on both branches, and a spec 008 change to release tags that aren't on main
3. No v1.x releases until v2.0, and an urgent problem is rolled back

## Decision outcome

Chosen option: "Keep main releasable". It needs no change to the release process, and the pre-release check already proves that the home page's and the essay's words haven't changed.

- Until the v2.0 release, phase 3's pages are new addresses that nothing links, each with `noindex`. v1's home, essay and 404 pages keep today's look ([D119](0119-v1s-pages-keep-todays-look-until-the-redesign-replaces-them.md)).
- A v1.x fix merges to main as usual, then releases from a `v1.x.y` tag on main through `release.yml`.
- A v1.x release from main also serves those unlinked phase 3 pages on bradthome.com, such as the design system's gallery.

### Consequences

- Good, because one branch and one release process cover both versions.
- Bad, because anyone who knows the address can reach an unlinked phase 3 page on the live site, though search engines are told not to index it.
- Bad, because each phase 3 slice must leave v1's pages alone, or ask Brad first.

### Confirmation

Spec 009's tests check that the home, essay and 404 pages load none of the new styles or components, and specs 003, 006 and 007 keep passing against them.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.1 session.
