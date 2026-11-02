---
status: accepted
date: 2026-11-02
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D92
---

# v0's colors, with self-hosted Charis SIL and Inter

## Context and problem statement

Slice 2.1 sets the site's first design tokens. Slices 2.4 and 2.5 rebuild today's essay and home page on them, and phase 3's design system replaces them at slice 3.1. Today's site, v0, uses each device's own fonts, a Charter serif on Apple devices and Cambria or Sitka on Windows, so it looks different on each one. What should the skeleton's colors and type be?

## Decision drivers

- v1.0 replaces v0 with the same content ([D58](0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md)), so it should look like v0.
- Fonts are self-hosted through Astro's Fonts API ([D51](0051-tailwind-css-4-and-motion-for-styling.md)).
- Visual snapshots need fonts that never change ([D46](0046-visual-snapshots-in-a-pinned-linux-container.md)).
- The first screen paints fast on a phone ([D29](0029-the-first-screen-serves-the-phone-skim.md), [D30](0030-success-criteria-for-quality-and-process.md)).

## Considered options

The options are listed in the builder's ranked order.

1. v0's colors in both themes, with matching open fonts, self-hosted (recommended)
2. v0's colors and v0's system fonts
3. Plain placeholder tokens until slice 3.1

## Decision outcome

Chosen option: "v0's colors in both themes, with matching open fonts, self-hosted", the recommended option. Brad added no note.

- v0's light and dark colors become the tokens, as CSS variables in Tailwind's theme.
- Text uses Charis SIL, an open font based on Charter. Headings use Inter, close to v0's system sans. Both are self-hosted through Astro's Fonts API.
- The theme follows the device's setting, as v0 does. A theme switch waits for slice 3.1.

### Consequences

- Good, because v1.0 looks like v0 and looks the same on every device.
- Good, because the snapshots test the fonts visitors see.
- Bad, because every visitor downloads two font families that v0 didn't need, so the fonts are subset and preloaded to keep the first paint fast.

### Confirmation

Spec 003's tests check the tokens in both themes, that every font file comes from the site itself, and the visual snapshots of both themes.

## Pros and cons of the options

### v0's colors in both themes, with matching open fonts, self-hosted

- Good, because it matches v0 and meets D46 and D51.
- Bad, because it adds font downloads.

### v0's colors and v0's system fonts

- Good, because it's closest to v0, with nothing to download.
- Bad, because it skips D51's self-hosted fonts, and the snapshots would test fonts visitors don't see.

### Plain placeholder tokens until slice 3.1

- Good, because there's no design work now.
- Bad, because v1.0 would launch looking unlike v0, then change again at the relaunch.

## More information

- Decided by: Brad Thome, on the slice 2.1 interview page (Q2).
- Evidence, checked on 2026-11-02: v0's stylesheet on bradthome.com, [Astro's Fonts API](https://docs.astro.build/en/guides/fonts/), [Charis SIL on Fontsource](https://www.npmjs.com/package/@fontsource/charis-sil).
