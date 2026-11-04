---
status: accepted
date: 2026-11-04
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D127
---

# The new home shows at /v2, and stays off live

## Context and problem statement

[D121](0121-v1s-pages-keep-todays-look-until-the-redesign-replaces-them.md) keeps v1's home page as it is until slices 3.2–3.5 are done, and [D120](0120-v1-x-fixes-ship-from-main-which-stays-releasable.md) keeps main releasable. Slice 3.2 builds the new home's hero, which Brad reviews on each pull request's preview and on the `next` channel ([D119](0119-main-deploys-to-the-next-channel-on-every-push.md)). Where does the new home show until v2.0?

## Decision drivers

- Live stays v1.0.0 until the relaunch ([D58](0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md)), even through a v1.x release.
- Specs 003 and 007's locked tests and snapshots of `/` don't change.
- As little machinery as keeps live clean.

## Considered options

The options are listed in the builder's ranked order.

1. The new home at `/v2` on previews and `next`. A release build leaves it out, along with the `/design-system` gallery, through a flag that only the release workflow sets (recommended)
2. `/v2` in every build, unlinked and noindex like the gallery today, so a v1.x release would also serve it
3. The new home at `/` on previews and `next`, with a separate v1 build for specs 003 and 007

## Decision outcome

Chosen option: "The new home at `/v2`, kept off live".

- The new home is built at `/v2`, on the design system's layout, and nothing links to it.
- The release workflow builds with `BRADTHOME_RELEASE=1`. With that flag, the site's build removes the phase 3 pages, `/v2` and `/design-system`, so live never serves them until v2.0 moves them.
- Previews and `next` serve every page with an `X-Robots-Tag: noindex` header. `/v2` relies on that header and on staying off live, not on a meta tag, so Lighthouse can measure it against spec 003's budgets, SEO included.

### Consequences

- Good, because live can't show the redesign early, even through a v1.x release, and v1's pages and tests don't change.
- Bad, because a release build and a pull request's build differ by two pages, so the release's own checks cover a slightly smaller site.

### Confirmation

Spec 010's tests check that the release workflow sets the flag, and that a build with it holds no phase 3 page.

## More information

- Decided by: Brad Thome, on a choice card in the slice 3.2 session.
