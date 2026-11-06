# Spec 007: Home, as today

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Approved |
| Slice | 2.5 Home, as today |
| Branch | `007-home` |
| Mocks and flows | [mocks/README.md](mocks/README.md): the home, essay and 404 pages with the shared header and footer, in both themes at both sizes, and keyboard focus |
| Plan | [plan.md](plan.md), approved with this spec at Gate 1 |
| Decisions | [D111](../../docs/decisions/0111-the-home-page-drops-its-second-work-item.md) and [D112](../../docs/decisions/0112-spec-003s-page-checks-follow-the-ported-home-page.md), from this slice. It builds on [D58](../../docs/decisions/0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md), [D92](../../docs/decisions/0092-v0s-colors-with-self-hosted-charis-sil-and-inter.md), [D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md) and [D110](../../docs/decisions/0110-the-essay-slice-ports-the-article-and-the-home-slice-ports-the-chrome.md), and on specs 003, 005 and 006. |

## Summary

Today's home page introduces Brad, links the essay, and lists Brad's work. This slice ports it to the new stack with today's words, except the second item in its Work list, a project that isn't live, which Brad removed (D111). That project's name is on Brad's private-term list, so this spec and its tests don't name it. It also ports the header and footer that every page of today's site shares (D110): Brad's name linking home, links to GitHub and LinkedIn, and a footer with Brad's name and the Dallas–Fort Worth area. The essay and the 404 page get them too. The live site isn't touched; the cutover is slice 2.6.

## Scope

**In:**

- The home page at `/`, with today's title, description, link-preview tags and words, minus the second Work item, a project that isn't live.
- The shared header and footer, in the site's layout, on the home, essay and 404 pages.
- The home page reads VINDecoded's name and address from its project file (spec 005), since the words stay the same.
- Spec 003's page checks amended to follow the ported page, and relocked (D112).
- Spec 006's two requirements about the header and the home page amended to follow the shared chrome.
- The 404 page in the visual snapshots.

**Out:**

- Any other change to the words, including the positioning. Leading with Hopper and making VINDecoded a side project wait for the phase 3 redesign.
- A list of projects or jobs from the content model. The page shows only what today's page shows.
- A theme switch, navigation beyond today's, or motion.
- The live channel. Slice 2.6 does the cutover.

## User stories and acceptance scenarios

The IDs in brackets, such as (H1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: The home page says what today's page says (P1)

Brad wants v1.0 to launch with today's content on the new stack (D58), without the project Brad doesn't show (D111).

**Why this priority:** it's the slice.

**Independent test:** build the site, serve it as Hosting does, open `/`, and compare its text with today's page.

- **S1.1** Given the built site served with `firebase.json`, when a visitor opens `/`, then it answers 200 with the home page, titled "Brad Thome", with today's description, `lang="en"`, and today's author, canonical, Open Graph and Twitter card tags (H1, H3).
- **S1.2** Given the home page, when its text is read with the markup removed and spaces collapsed, then it equals today's page's text from 2026-11-03 with the second Work item removed: its link, its title and its description (H1–H4).
- **S1.3** Given the home page, then it shows the heading "Brad Thome", the line, a Writing card linking `/vindecoded-agents`, and a Work list with one item, VINDecoded, linking `https://vindecoded.com` (H1, H3).
- **S1.4** Given the built site, then every link to another host goes to one of four addresses: Brad's GitHub and LinkedIn profiles, vindecoded.com and the repo, so nothing links the removed project. Where the private-term list is available, nothing in the site's source, content or build names it.

### Story 2: Every page shares the header and footer (P1)

**Why this priority:** the essay's page is incomplete without them (D110), and slice 2.6 needs both pages finished.

**Independent test:** open the home, essay and 404 pages and read their header and footer.

- **S2.1** Given the home, essay or 404 page, then its header shows "Brad Thome" linking `/`, and a navigation region named "Elsewhere" with "GitHub" linking `https://github.com/memorex386` and "LinkedIn" linking `https://www.linkedin.com/in/brad-thome/` (H1, E1, N1).
- **S2.2** Given the home, essay or 404 page, then its footer reads "Brad Thome · Dallas–Fort Worth", with "Brad Thome" linking `/` (H1, E5, N1).
- **S2.3** Given the essay, then its article text and head are unchanged: spec 006's text check and head checks still pass (E1–E4).
- **S2.4** Given a missing path, then the site answers 404 with the 404 page's words, the header and the footer, and no link-preview tags (N1, N2).
- **S2.5** Given a phone at 390 or 320 pixels wide, then on every page the header's name and links fit on one row, and the page never scrolls sideways (H1, E1, N1).

### Story 3: The chrome works with a keyboard and in both themes (P1)

**Why this priority:** spec 003's bars apply to every page.

**Independent test:** tab through the home page in each theme, and read the colors.

- **S3.1** Given a keyboard on the home page, when the visitor presses Tab, then focus moves through the name, GitHub, LinkedIn, the essay card, VINDecoded and the footer's name in that order, each with a visible focus ring (F1–F5).
- **S3.2** Given a device set to light or dark, then the header's name uses the ink color, its links the quiet color, the page's links the accent color, the footer the quiet color, and the footer's top border the rule color, for that theme (H1–H4).
- **S3.3** Given any page, then nothing moves: no animation and no transition, so a hover changes the card's border at once, and reduced motion changes nothing.

### Story 4: Every page passes the site's checks (P1)

**Why this priority:** the slice plan's "done when" says all checks pass.

**Independent test:** run CI's end-to-end, Lighthouse, HTML and links jobs on the pull request.

- **S4.1** Given the home, essay or 404 page in either theme at either size, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S4.2** Given the home page and the essay, when Lighthouse takes the median of five phone runs, then each meets spec 003's budgets.
- **S4.3** Given the home, essay and 404 pages at phone and desktop sizes in light and dark, then each whole page matches its committed snapshot with no pixel tolerance, in the pinned container (H1–H4, N1, N2).
- **S4.4** Given any page loads, then it requests nothing from another host, runs no script, carries no inline style, and logs no error.
- **S4.5** Given the built site, then html-validate passes on every page, and lychee finds no broken internal link or anchor.

## Edge cases

- The live page changes before this merges. The text fixture is today's page from 2026-11-03; a later change to the live page needs its own pull request. Covered by S1.2.
- VINDecoded's project file changes its name or address. The words check fails, since the page reads them from the file. Covered by S1.2 and S1.3.
- A screen narrower than 320 pixels. The header's links may wrap under the name, and the page still doesn't scroll sideways. Covered by S2.5 at 320.
- Fonts that don't load. The header and footer show in spec 003's fallbacks. Covered by spec 003's S1.3.
- A visitor zooms to 200%. The column narrows like a phone's. Covered by S2.5.

## Functional requirements

- **FR-001** The site's layout MUST render the header, the page's content and the footer on every page, from one place.
- **FR-002** The home page's text MUST equal today's page's text from 2026-11-03 with the second Work item removed (D111), and its title and description MUST be today's.
- **FR-003** The home page MUST read VINDecoded's name and address from `apps/site/content/projects/vindecoded.yaml`.
- **FR-004** The layout MUST set the author, canonical, Open Graph and Twitter card tags on the pages people share, as today's site does: the home page as a website and the essay as an article. The 404 page MUST NOT set them.
- **FR-005** The built site MUST link no other host but Brad's GitHub and LinkedIn profiles, `https://vindecoded.com` and the repo, and nothing in `apps/site/src`, `apps/site/content` or the build MUST hold a private term. The test reads the private-term list where it's available, on Brad's PC; in CI, the privacy job already keeps every term out of every commit.
- **FR-006** The header, footer and home page MUST NOT animate or transition, so spec 003's S1.5 holds.
- **FR-007** The essay's article, head and words MUST stay as spec 006 sets them.
- **FR-008** Spec 003's S1.1, S1.2, S1.4, FR-005 and FR-006 MUST be amended to follow the ported page and relocked in this pull request (D112).
- **FR-009** The end-to-end tests MUST cover the home, essay and 404 pages for accessibility, in both themes at both sizes, and MUST snapshot the 404 page as well as the home page and the essay.
- **FR-010** Every page MUST ship no script, request no other host, and carry no inline style, so spec 003's Content-Security-Policy needs no exception.

## Success criteria

- **SC-001** The home page's text differs from today's text minus the removed item in 0 words.
- **SC-002** The home, essay and 404 pages have 0 automated accessibility violations in each of their four states.
- **SC-003** The home page's and the essay's Lighthouse medians meet every budget in spec 003's FR-012.
- **SC-004** The built site has 0 links to the removed project, and 0 private terms where the list is available.

## Mocks and flows

[mocks/README.md](mocks/README.md) shows each state with screenshots of the prototype on this branch: the home page (H1–H4), the essay's first screen and its end (E1–E6), the 404 page (N1, N2) and keyboard focus (F1–F5).

## Key entities

- **The layout:** `Base.astro`, with the head, the header, the page's content and the footer.
- **The words fixture:** today's home page's text from 2026-11-03, committed under `tests/007/fixtures/`, and the removed item's text, which the words check takes out.

## Assumptions

- Today's live home page was built from v0's source as it stands. Checked on 2026-11-03: the live HTML and v0's last build are byte for byte the same.
- Today's live 404 is Firebase's default page, not v0's. The port keeps spec 003's 404 page and its words, with the new header and footer.

## Open questions

None.

## Decisions made while writing this spec

Tier 3, within D92, D110 and D111:

- The header, the column and the footer are in a new `site.css`, which every page loads. The essay's own rules stay in `essay.css`, which loses only the frame and header rules it held for slice 2.4.
- Body text takes v0's size and line height on every page, so the header and footer match today's on the essay too.
- The layout's `frame` prop goes, since every page now uses the same column. Spec 003's centred placeholder frame goes with the placeholder.
- The 404 page uses the home page's heading and line styles, and keeps its words.
- v0's 120 ms border transition on the card's hover is dropped, so nothing moves (spec 003's S1.5, D35). The hover still changes the border's color, at once.
- Every page gets v0's `color-scheme` meta tag. Link-preview tags are opt-in per page.
- lychee's config gains `fallback_extensions = ["html"]`, as Hosting's `cleanUrls` serves `page.html` at `/page`. The home page's card links `/vindecoded-agents` as today's does, and lychee's offline check found no file without the extension.
- The fonts' size-adjusted fallbacks move from Astro's own into `tokens.css`, with the same metrics, and also name Liberation and the Croscore fonts, which share Times New Roman's and Arial's metrics. Astro's named only Times New Roman and Arial, so on Linux, ChromeOS and in the test container the home page's longer text re-wrapped when the fonts arrived, and spec 003's S1.3 check measured a 0.026 layout shift. With these fallbacks it measures none.
- Links in the page's text, the header and the footer are underlined as on today's site. On the essay this brings back the underline that Tailwind's base styles had removed in slice 2.4.

## Changes to other specs

- **Spec 003 (locked, D112):** S1.1 and FR-005 name today's heading and line instead of D93's; S1.2 reads a link in the page's text; S1.4 checks Tab reaches the page's links in order with a ring on each; FR-006 also allows Brad's GitHub and LinkedIn profiles and vindecoded.com as links. Its tests and `tests.lock` change in this pull request.
- **Spec 006:** FR-004 now says the essay has the site's shared header, and FR-012 now says the home and 404 pages follow spec 007. Its static tests for both change. Its essay snapshots change where the header, footer and link underlines appear.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/007/`. Spec 001's traceability check confirms it, and CI runs it. This spec's tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: approved by Brad in the session on 2026-11-04, with the plan and mocks ([recorded on #28](https://github.com/memorex386/bradthome/pull/28#issuecomment-6622796421))
- Changed on 2026-11-04, in slice 3.2: S4.2's static test reads the home page and the essay as the first two of Lighthouse's pages, since spec 010 adds `/v2` after them. Brad approves it with spec 010 at its Gate 1.
- Changed in spec 019 (slice 3.11), on 2026-11-06: v2.0 retires v1's home ([D162](../../docs/decisions/0162-the-new-home-moves-to-the-root-and-v2-redirects-there.md)). Story 1, S3.1 and the card in S3.3 retire with it, and their tests and fixture are removed. The header and footer checks read the essay and the 404 page, and the home's link-preview tags come from the design layout.
