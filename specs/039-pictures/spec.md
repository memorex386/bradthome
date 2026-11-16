# Spec 039: Pictures: share cards, the apps' icons, Hopper diagrams, two marks, a new site icon and a photo

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Status          | Approved                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Slice           | 5.12 Pictures (Brad's picks of 2026-11-16, from the private pictures study)                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Branch          | `039-pictures`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Gate 1          | Approved by Brad on 2026-11-16, on the session's cards: the approval before the release, Hopper's white logo and B/R's dark tile, "Company names and marks belong to their owners.", and Brad's LinkedIn photo at the crop shown, on Brad's override of D164                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Mocks and flows | [mocks/README.md](mocks/README.md): every state, captured from this slice's own build                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Decisions       | D232–D237, from this slice: the share cards (D232), the apps' real icons (D233), the Hopper diagrams (D234), the two company marks and their footer line (D235), the site icon (D236) and the photo (D237, amending [D164](../../docs/decisions/0164-no-photo-at-v2-0.md) and [D226](../../docs/decisions/0226-brads-github-avatar-on-the-heros-chip.md)). It builds on D122, D129, D134, D143, D145, D152, D154, D159, D211, D217, D224, D225, D227 and D229. |

## Summary

On 2026-11-16 Brad asked whether bradthome.com should have more pictures, and picked from the pictures study over two rounds of cards. Counted on live v2.9.0 that day, the home and role pages show one picture at rest, Brad's 36 px GitHub avatar on the hero's chip. No page sets `og:image`, so a pasted link shows words only, and `/evals` sets no share tags at all. VINDecoded's and Sudoku World's App Store icons are on the site but show only in their hover cards, the 2,456 px Hopper band has no picture, and the favicon's three white bars on blue read as "IT".

This slice adds the pictures Brad picked, every one the site's own file:

- A 1200 × 630 share card for the home, the three role pages, the essay and `/evals`, drawn at build time from each page's own words and data, as the résumé PDFs are.
- The apps' real App Store icons on their side cards, from the weekly snapshots, and the new site icon as bradthome.com's badge.
- Three diagrams in the Hopper band, each made only of its card's claims' words: Capital One end to end, RemoteUI, and the human-approved loop.
- Hopper's own mark beside the band's eyebrow and Bleacher Report's beside its featured card's title, with a footer line that the names and marks belong to their owners.
- "bt_" in JetBrains Mono as the favicon, with a 180 px home-screen icon.
- A round photo of Brad beside "Get in touch": Brad's LinkedIn profile photo, which Brad chose at Gate 1, overriding D164's rule that the agent never takes a picture from LinkedIn.

## Scope

**In:**

- The share cards: `components/share/`, `pages/share/[card].astro` (print pages the build removes), `styles/share.css`, `scripts/site/share-cards.ts`, and the share tags in `layouts/Base.astro` and `layouts/DesignBase.astro`; `/evals`' canonical link.
- The side cards: `components/home/side.ts`, `Side.astro`, `styles/home/side.css`.
- The band: `components/home/figures.ts`, `HopperFigure.astro`, `Hopper.astro`, `styles/home/hopper.css`.
- The marks: `components/home/marks.ts`, `public/marks/`, `Experience.astro`, `styles/home/experience.css`, `components/ds/Footer.astro`, `HomePage.astro`.
- The site icon: `public/favicon.svg`, `public/apple-touch-icon.png`, `scripts/site/touch-icon.ts` (`pnpm touch-icon`), and both layouts' icon links.
- The photo: `Contact.astro`, `contact.ts`, `styles/home/contact.css`, `public/photo/`, and `scripts/site/photo.ts` (`pnpm photo`).
- The gallery's "Pictures" section, records D232–D237, `docs/plan.md`'s slice 5.12, new tests in `tests/039/`, and the tests and baselines that pin today's tags, badges, band, footer or favicon.

**Out:**

- App screenshots, any other company's mark, tech logos, and a photo in the hero (Brad's cards).
- The words of the claims, `/corpus.json`, `/llms.txt`, the chat's prompt, model and API, the résumé PDFs, the analytics events, the CSP and the one module.
- A release. The slice lands on main and `next`; bradthome.com changes only through a release on Brad's go-ahead, and LinkedIn then keeps an old preview for about a week unless its Post Inspector fetches it again.

## User stories and acceptance scenarios

The state IDs in brackets are the captures in [mocks/README.md](mocks/README.md).

### Story 1: A pasted link shows a picture (P1)

A recruiter who pastes a link to the site into LinkedIn, Slack, an email or a text should see a picture of what's behind it, not words alone.

**Independent test:** build the site, read each page's share tags, and open each card they name.

- **S1.1** Given the home, then its share tags name `https://bradthome.com/share/home.png`, a 1200 × 630 PNG showing "Brad Thome · Senior mobile & full-stack engineer", the hero's three words with their dots, the three role tiles with their years counted for the build's day (D224), and the hero's first line (M7).
- **S1.2** Given `/mobile`, `/fullstack` or `/ai`, then its card shows its `og:title` with its word and tile lit and the others quiet (M7).
- **S1.3** Given the essay, then its card shows its title, the six phase names of its diagram, and its summary's 1,235 merged pull requests and 83% from agent branches with their dates, all read from the essay's own files (M7).
- **S1.4** Given `/evals`, then it has share tags, and its card shows its title and the latest full run's safe and accurate counts, model and date, read from the run's results (M7).
- **S1.5** Given any of these pages, then it sets `og:image` as an absolute bradthome.com URL with `og:image:width` 1200, `og:image:height` 630 and `og:image:alt` holding the card's words, and `twitter:card` is `summary_large_image` with `twitter:image` and `twitter:image:alt`.
- **S1.6** Given a page with share tags and no card of its own, then it names the home's card; given the 404 page, then it sets no share tags at all (spec 007).
- **S1.7** Given the build, then each card is under 300 KB, it is the same bytes when drawn twice from the same tree, and drawing it asked for nothing outside the build.
- **S1.8** Given a visitor viewing any page, then no card is requested, so the pages' weight and the CSP don't change.

### Story 2: The apps show their real icons (P1)

- **S2.1** Given VINDecoded's and Sudoku World's side cards, then each shows its App Store icon from `content/previews/snapshots.json` in place of today's badge, 52 px on VINDecoded's card and 44 px on Sudoku World's, with a hairline edge in the rule's color in both themes and empty alt text (M4).
- **S2.2** Given a project with no snapshot, then its card shows today's badge, as the hero's chip shows GitHub's logo without its snapshot (D226).
- **S2.3** Given bradthome.com's card, then its badge is the new site icon, the favicon's own drawing (M4).
- **S2.4** Given the hover cards (spec 016), then they don't change.

### Story 3: The Hopper band shows the shape of the work (P1)

A recruiter skimming the band should see the shape of three pieces of work in a couple of seconds, in the claims' own words.

**Independent test:** open `/` and each role page on a desktop and a phone, and read each diagram's labels against its card's claims.

- **S3.1** Given the Capital One card, then its diagram shows every layer of its end-to-end claim under "Sole engineering owner", then "reusable capability", Capital One and five more partners, and "10+ partner products, including Frontier and Spirit" (M1).
- **S3.2** Given the RemoteUI card, then its diagram shows one server-driven UI (components, actions, state management, API mappings) reaching Android (Jetpack Compose and MVVM) and iOS (SwiftUI) by "server deploys", with "app releases" struck (M1, M2).
- **S3.3** Given the agent workflow card, then its diagram shows the experimentation loop: telemetry (Amplitude, BigQuery), what it generates (UI, code, pull requests and visual/browser tests), the human approval, the release behind LaunchDarkly flags, the monitored outcomes, and promotion or rollback, back to telemetry (M1). The approval sits after what the loop generates and before it releases, the study's reading of "human-approved", which Brad confirmed on the Gate 1 card.
- **S3.4** Given any diagram, then every word of every label is in the claim it names, and that claim is on its card; the build fails otherwise.
- **S3.5** Given a desktop, 1088 px wide or more, then each diagram sits in its card's right column, 340 px wide, beside the card's other parts; given a narrower screen, then it follows the claims, before the sources and tags (M1, M2).
- **S3.6** Given a screen reader, then each diagram is hidden (`aria-hidden`), since its claims sit beside it.
- **S3.7** Given motion allowed, then a diagram settles with its card's reveal (D211) and has no motion of its own; given reduced motion or no script, then it shows at rest (M9).
- **S3.8** Given a role page, then each diagram moves with its topic in the role's order (D134).

### Story 4: Two companies' marks, beside their names (P2)

- **S4.1** Given the Hopper band, then Hopper's own mark sits beside the eyebrow, 30 px tall, with empty alt text: the white logo from Hopper's press kit, its one one-color file, the running bunny and "hopper" (Brad's Gate 1 card) (M1).
- **S4.2** Given Bleacher Report's featured card, then its own mark sits beside the kicker and title, 40 px tall, with empty alt text; on a phone it sits above the kicker (M3). It's the header mark from bleacherreport.com, white "B/R" on its #1a1a1a tile, the colors B/R's light scheme draws it in, in both themes, since B/R publishes no one-color file (Brad's Gate 1 card).
- **S4.3** Given the timeline, any other card or any other page, then no company's mark shows: never Capital One's, the partners', Bottle Rocket's clients', Harley-Davidson's or Infosys's.
- **S4.4** Given the home or a role page, then its footer has a line of its own: "Company names and marks belong to their owners." (Brad's Gate 1 card) (M6).
- **S4.5** Given each mark, then it is the company's own artwork from its own site, unredrawn and in its own colors, and its record names where and when it was taken.

### Story 5: The site's icon reads as Brad's (P1)

- **S5.1** Given a browser tab, light or dark, then the favicon at `/favicon.svg` is "bt_": lowercase "bt" in JetBrains Mono Bold, drawn as paths, light on the band's near-black #0e1116 with a faint light edge, and a #8ea8ff cursor bar after it (M8).
- **S5.2** Given a phone saving the site to its home screen, then `/apple-touch-icon.png` is the same mark as a 180 px square with no corners of its own, and both layouts link it (M8).
- **S5.3** Given the release check (spec 008), then `/favicon.svg` is still served at its path.

### Story 6: A face where people write to Brad (P3)

- **S6.1** Given "Get in touch" on the home or a role page, then a round photo of Brad sits beside the heading, 76 px on a desktop and 64 px on a phone, above the heading on a phone, served at 1x and 2x, with alt text naming Brad (M5). It's Brad's LinkedIn profile photo, the 800 px copy Brad's public profile serves, cropped to the 680 px square Brad approved, on Brad's Gate 1 override of D164.
- **S6.2** Given the committed photo files, then they carry no metadata: no location, device or dates.
- **S6.3** Given the résumé PDFs, then they have no photo.

### Story 7: The gallery shows the new parts (P2)

- **S7.1** Given `/design-system`, then a "Pictures" section shows the site icon in a light and a dark tab, larger and on a home screen, the side cards' pictures and a badge with no snapshot, Bleacher Report's mark beside a title, the photo, the six share cards, and, in the band, Hopper's mark on an eyebrow and the loop's diagram on its card, in both themes (M10).

### Story 8: Everything else holds (P1)

- **S8.1** Given any page, then every picture is the site's own file, no request leaves the site, and the CSP is unchanged, with no `data:` images.
- **S8.2** Given any picture on a page, then its width and height are set, and those below the first screen load lazily.
- **S8.3** Given the build, then `/corpus.json` and `/llms.txt` are byte for byte live's, the one module is the same size, and there's no new script.
- **S8.4** Given `/`, the role pages and the gallery, in both themes, then there's no automated accessibility violation, layout shift is 0, and each role page keeps its topic order.

## Requirements

- **FR-001** The build MUST draw a 1200 × 630 PNG for the home, `/mobile`, `/fullstack`, `/ai`, `/vindecoded-agents` and `/evals` into `dist/share/<page>.png`, from print pages built from the page's own words and data (`hero.ts`, the essay's MDX and its diagram's component, and `apps/evals/results.json`), with Playwright's Chromium, serving only the build's own files, then MUST remove the print pages and any asset only they named.
- **FR-002** Each card MUST be drawn twice and match byte for byte, MUST be under 300 KB, and MUST fit its words inside its edges with its three fonts loaded; any failure MUST fail the build. A build in CI without Chromium MUST fail; one elsewhere MUST say so and leave the cards out.
- **FR-003** Every page with share tags MUST set `og:image` to `https://bradthome.com/share/<card>.png`, `og:image:width` 1200, `og:image:height` 630, `og:image:alt`, `twitter:card` `summary_large_image`, `twitter:image` and `twitter:image:alt`. `/evals` MUST set share tags. A page with share tags and no card of its own MUST name the home's, and the 404 page MUST set none.
- **FR-004** The cards MUST show no avatar or photo (D226).
- **FR-005** VINDecoded's and Sudoku World's cards MUST show their App Store snapshot's image, read from `snapshots.json`, at 52 and 44 px with width and height set, lazy, with empty alt text and a 1 px edge in `--color-rule`; with no snapshot, today's badge MUST show. bradthome.com's badge MUST be `/favicon.svg`. The hover cards MUST NOT change.
- **FR-006** The Capital One, RemoteUI and agent workflow cards MUST each show one inline SVG diagram in the band's tokens, `aria-hidden`, after the claims and before the sources and tags, in the right column at 1088 px and wider; it MUST have no motion of its own.
- **FR-007** Every diagram label MUST name its claim, every word of it MUST be in that claim, and the claim MUST be on its card; a diagram for a topic no claim has MUST fail the build too.
- **FR-008** Hopper's and Bleacher Report's marks MUST be the companies' own files in `public/marks/`, unredrawn and in their own colors, stripped of metadata, shown at 30 and 40 px tall beside their names with empty alt text, and nowhere else. The home and role pages' footer MUST add the owners line.
- **FR-009** `public/favicon.svg` MUST be the "bt_" mark with its letters as paths, and `public/apple-touch-icon.png` MUST be its 180 px square, drawn from it by `pnpm touch-icon`, linked from both layouts with `rel="apple-touch-icon"`.
- **FR-010** The photo MUST be Brad's LinkedIn profile photo (Brad's Gate 1 override of D164), from a source at least 400 px square, cropped to the square Brad approved by `pnpm photo`, saved at 64, 76, 128 and 152 px as WebP with no metadata, and shown round beside "Get in touch" with its width and height set, lazy, with alt text naming Brad; the résumé PDFs MUST NOT show it.
- **FR-011** The gallery MUST show the new parts (S7.1).
- **FR-012** The CSP, the one module, `/corpus.json`, `/llms.txt`, the résumé PDFs, the analytics events, the chat API and the role pages' topic order MUST NOT change, and no page may load a picture from another host.
- **FR-013** The slice MUST record D232–D237, add slice 5.12 to `docs/plan.md`, and update every test and baseline that pinned today's tags, badges, band, footer or favicon. Specs 001–003 keep their locks.

## Success criteria

- **SC-001** Six cards in `dist/share`, each a 1200 × 630 PNG under 300 KB that a second drawing matches byte for byte (this build: 58 to 77 KB).
- **SC-002** On `/` and each role page: three diagrams, two marks, three side-card pictures, one photo and one owners line; on any page, zero requests to another host and zero requests for a share card.
- **SC-003** Cumulative layout shift 0 on `/` while it loads and scrolls, and lighthouse's budgets still pass.
- **SC-004** No automated accessibility violation on `/`, the role pages and the gallery, in both themes.
- **SC-005** `/corpus.json` and `/llms.txt` byte for byte live's, and the one module the same size as main's.
- **SC-006** The band's growth, reported: built, the home is 8,049 px at 1440 × 900 (live 7,610) and 12,697 px at 375 × 812 (live 11,557); the band is 2,859 px (live 2,456) and 4,988 px (live 3,955).

## Edge cases

- A refresh drops an app's snapshot: its card shows its badge, and the hover card its missing state.
- A claim's words change so a diagram label no longer matches: the build fails until the label or the claim is read again.
- A topic is renamed: its diagram's topic no longer matches, and the build fails rather than dropping the diagram.
- The essay's summary stops giving its counts as the card reads them, or its diagram stops having six numbered phases: the build fails.
- A card's words would run past its edges: the build fails.
- The years tick over (May and September each year): the next build draws the cards again with the new years, as the hero does.
- A build with no Chromium, such as a test's build on a runner with no browser: no cards, and the share tags still name bradthome.com's.
- A preview or `next` page's share tags name bradthome.com's cards, as its canonical link names bradthome.com, so they unfurl only once a release ships them.

## Tier-3 choices, inside this spec

- The Capital One diagram reads "Capital One → 5 more partners" where the study wrote "Capital One, then 5 more partners", since "then" isn't in the claim; the arrow carries it.
- The cards live at `/share/<page>.png`, and their print pages are Astro pages, as the résumé's are, so the cards use the design system's tokens and the site's own fonts.
- A role page's quiet words take the study's colors (#c9ccd2, with #b9c7f5 dots), lighter than the hero's dim, so the lit word leads at a thumbnail's size.
- `twitter:image:alt` joins `og:image:alt`, so X reads the same words.
- bradthome.com's badge loads `/favicon.svg` itself, so it can never drift from the favicon, and it carries the favicon's own faint edge in place of the apps' hairline.
- The touch icon is committed, drawn by `pnpm touch-icon` from the favicon with sharp, and a test fails while the two disagree.
- Bleacher Report's mark sits above its kicker on a phone, so the title keeps the card's width.
- The diagrams take the right column from 1088 px (68rem), where the claims column keeps about 520 px.

## Not decided here

- When this reaches bradthome.com: a release, on Brad's go-ahead.
