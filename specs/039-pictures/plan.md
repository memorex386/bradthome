# Plan 039: Pictures

<!-- Adapted from GitHub Spec Kit's plan template (MIT): https://github.com/github/spec-kit -->

Approved with [spec.md](spec.md) at Gate 1 on 2026-11-16. The "Show it" captures in [mocks/README.md](mocks/README.md) are this plan's first build, so the approach below is what they show.

## Approach

| Part                 | Where                                                                                                    | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The cards' words     | `components/share/share.ts`, `data.ts`                                                                   | Pure functions build each card from the page's own data: `hero.ts`'s eyebrow, words, tiles and first line, with the years from `builtYears()` for the build's day; the essay's title and date from its front matter, its six phases from `SystemDiagram.astro`'s `phase()` calls, and its counts from its summary; `/evals`' totals, model and date from `results.json`. Each throws when its source stops saying what it reads, so the build fails. `altOf()` gives each card's words. |
| The cards' pages     | `pages/share/[card].astro`, `ShareCard.astro`, `styles/share.css`                                        | One print page per card, 1200 × 630, on the site's own fonts and copies of the design system's tokens, as the study drew them: light for the home, roles and `/evals`, the band's colors for the essay. It imports no stylesheet the site's pages share and links its own as a file, so the site's CSS is bundled and ordered as on main. |
| Drawing them         | `scripts/site/share-cards.ts`                                                                            | An `astro:build:done` integration after the résumé's: Chromium from `@playwright/test` opens each print page from a made-up origin whose requests are served from `dist`, every other request refused; waits for the fonts; checks the card's size, its three fonts and that nothing runs past its edges; draws a PNG twice and compares the bytes; then removes the print pages and any asset only they named. Without Chromium, CI fails and elsewhere it warns, as the PDFs do.     |
| The tags             | `layouts/Base.astro`, `layouts/DesignBase.astro`, `pages/evals.astro`                                    | `shareImageOf(path)` picks the page's own card or the home's, and both layouts add `og:image` with its size and alt, `twitter:card` `summary_large_image`, `twitter:image` and its alt. `/evals` passes its canonical URL, which turns its share tags on. The 404 page still passes no `share`.                                                                                                                                                                                         |
| The apps' icons      | `side.ts`, `Side.astro`, `side.css`                                                                      | A look names its snapshot (`appstore-…`) or `'site'`; `iconOf()` gives `/previews/<image>` or `/favicon.svg`, or nothing, and the card falls back to its badge. The icon takes the badge's box, rounded at 22.5%, with an inside 1 px outline in `--color-rule` for the apps.                                                                                                                                                                                                         |
| The diagrams         | `figures.ts`, `HopperFigure.astro`, `Hopper.astro`, `hopper.css`                                         | Each figure's labels name their claims; `checkFigure()` tokenizes a label and its claim into lowercase words and fails the build on a word the claim lacks or a claim off its card. `HopperFigure` draws the study's three SVGs with classes on the band's tokens, no inline style. From 68rem a card with a figure becomes a grid: its parts in the left column and the figure in a 21.25rem right column across their rows.                                                          |
| The marks            | `marks.ts`, `public/marks/`, `Hopper.astro`, `Experience.astro`, `Footer.astro`, `HomePage.astro`        | Hopper's press kit's white logo, resized to 60 px tall, and Bleacher Report's own header mark from bleacherreport.com, as SVG in its own light-scheme colors, each an `<img>` with empty alt. The footer takes an `owners` line on the home and role pages.                                                                                                                                                                                                                             |
| The site icon        | `public/favicon.svg`, `public/apple-touch-icon.png`, `scripts/site/touch-icon.ts`                        | JetBrains Mono Bold's "b" and "t" from Fontsource's woff2, at weight 700, turned into paths with fontTools and centred in a 32-unit square. `pnpm touch-icon` squares the favicon's corners, drops its edge and draws it at 180 px with sharp.                                                                                                                                                                                                                                       |
| The photo            | `Contact.astro`, `contact.ts`, `contact.css`, `public/photo/`, `scripts/site/photo.ts`                    | Brad's LinkedIn profile photo, on Brad's Gate 1 override of D164: the 800 px copy Brad's public profile serves, saved once in Brad's Chrome. `pnpm photo` refuses a source under 400 px square, crops the 680 px square Brad approved, and writes 64, 76, 128 and 152 px WebP with no metadata; the section shows it round beside the heading with `srcset` and `sizes`. |
| The gallery          | `design-system.astro`, `gallery.css`, `components.css`                                                    | A "Pictures" section and a band section, as S7.1 lists, after Interview prep. The diagrams' styles are the design system's, and the other demos take gallery classes, so the gallery imports none of the home's stylesheets. |

## Measured on this build

On a local preview of the production build on 2026-11-16, against the study's count of live v2.9.0, with reduced motion:

| Page         | At 1440 × 900 | Band at 1440 | At 375 × 812 | Band at 375 |
| ------------ | ------------- | ------------ | ------------ | ----------- |
| `/` live     | 7,610         | 2,456        | 11,557       | 3,955       |
| `/` here     | 8,074         | 2,859        | 12,773       | 4,988       |
| `/mobile`    | 8,761         | 2,859        | 13,789       | 4,988       |
| `/fullstack` | 8,738         | 2,859        | 13,775       | 4,988       |
| `/ai`        | 8,661         | 2,859        | 13,655       | 4,988       |

The band grows by 403 px on a desktop, more than the study's estimate of 212, because the right column narrows the Capital One and RemoteUI cards' claims, and the agent workflow card, with one claim, grows to its diagram's height. On a phone it grows by 1,033 px, about the study's 1,000. The rest of the home's growth, 61 px on a desktop and 183 on a phone, is the photo, the owners line and Bleacher Report's mark. The six cards weigh 48 to 70 KB as the pinned container draws them, as CI does. `/corpus.json` and `/llms.txt` are byte for byte live's, the one module is 13,010 bytes as on main, `firebase.json`'s policy doesn't change, and every page's stylesheets come in live's order, with the chat's chunk byte for byte live's.

## Alternatives considered

- **Satori and resvg for the cards:** no browser in the build, but two new packages, a CSS subset to draw in, and fonts in another format. Chromium already draws the snapshots in the same pinned container, so the cards look like the page.
- **Sharp with the words as paths:** no browser, but every word would need turning into shapes by a font library the repo doesn't have.
- **The marks inline:** no request, but the white logo from Hopper's press kit is a PNG, and inlining it would mean redrawing it.
- **An inline copy of the site icon on bradthome.com's card:** no request, but two copies to keep the same; the card loads the favicon itself, which a tab has already fetched.
- **A photo Brad sends, as D164 asked:** sharper than LinkedIn's 800 px copy, but Brad chose the LinkedIn photo at Gate 1, overriding D164 for this photo (D237).

## Risks

- **Chromium in the build.** The build now needs the pinned container's Chromium as well as its WeasyPrint; CI's, `next`'s, the previews' and the release's builds all run there. A test's build on a runner with no browser leaves the cards out and says so.
- **The cards change with the years.** Each May and September a build draws new years, so their snapshots change then, as the hero's do.
- **Trademarks.** A former employer's mark beside its name, small and with the owners line, is the safe form the study found; it isn't legal advice. Only two marks show, and a test fails if one shows anywhere else.
- **A longer band.** 403 px more on a desktop. The claims keep about 520 px or more of width at 1088 px and up.
- **The site's CSS bundling.** A stylesheet the print page or the gallery shares with the site's pages changes how the build splits the site's CSS, and the order of each page's styles; the first full run caught the privacy page losing its own. Neither imports one now, and the privacy page's snapshot holds it.
- **Many baselines.** The home's and role pages' snapshots change in the band, Experience, On the side and the footer; each is redrawn in the pinned container, and the reviewer checks no test was weakened. Specs 001–003 name none of these, so their locks hold.

## Tasks

| ID   | Task                                                                                                                                                                         | Covers                |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| T001 | Gate 1: Brad's cards and approval; commit the approved mark files and photo; edit the answers into the spec                                                                            | all                   |
| T002 | `tests/039/`: unit tests of `share.ts`, `figures.ts`, `marks.ts`, `side.ts`'s `iconOf()` and `touch-icon.ts`; static tests of the tags, files and CSS; e2e tests and snapshots of every state | every ID              |
| T003 | Amend the tests and baselines of specs 006, 007, 009, 011–014, 016, 017, 019, 025–031, 033, 036 and 038 that pin today's tags, badges, band, footer or favicon               | FR-013                |
| T004 | Finish the build to the approved cards, with the photo; measure the heights, the module and the cards                                                            | FR-001–FR-012         |
| T005 | D232–D237, `docs/plan.md`'s slice 5.12, `docs/decisions/README.md`                                                                                                            | FR-013                |
| T006 | The full suite locally, then the review skill's reviewer; fix or answer each finding                                                                                         | all                   |
| T007 | Brad's "push", then main's `ci`, `next` and push runs green, and the open code-scanning alerts listed                                                                        | Gate 2                |
