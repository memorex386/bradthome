# Spec 006: The essay

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Draft |
| Slice | 2.4 The essay |
| Branch | `006-essay` |
| Mocks and flows | [mocks/README.md](mocks/README.md): the essay's states, with screenshots of the prototype |
| Plan | [plan.md](plan.md), approved with this spec at Gate 1 |
| Decisions | [D108](../../docs/decisions/0108-the-essay-slice-ports-the-article-and-the-home-slice-ports-the-chrome.md), from this slice's interview. It builds on [D58](../../docs/decisions/0058-v1-0-at-the-end-of-phase-2-the-relaunch-as-v2-0.md), [D92](../../docs/decisions/0092-v0s-colors-with-self-hosted-charis-sil-and-inter.md) and [D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md), and on spec 003's skeleton and checks. |

## Summary

Today's site has one essay, at `/vindecoded-agents`, about how Brad runs VINDecoded with AI agents. This slice ports it to the new stack at the same URL, with its diagram, and with exactly the same words. It takes on the site's fonts and colors (D92), and it passes the same accessibility, snapshot, Lighthouse, HTML and link checks as the home page. The live site isn't touched; the essay goes live with the cutover in slice 2.6.

## Scope

**In:**

- The page `/vindecoded-agents`, from an MDX file in `apps/site`, with an essay layout, the "system at a glance" diagram and the essay's seven tables.
- Its title, description, byline and date, and the link-preview tags today's page has.
- A "Brad Thome" link to the home page above the article (D108).
- The essay in the end-to-end tests (accessibility, snapshots, the text check) and in Lighthouse's runs.

**Out:**

- The site header's GitHub and LinkedIn links and the footer. Slice 2.5 ports them for every page (D108).
- Any change to the essay's words, including its title, which is an open decision for phase 3.
- A list of essays, an RSS feed or reading time. Nothing asks for them yet.
- The live channel. Slice 2.6 does the cutover.

## User stories and acceptance scenarios

The IDs in brackets, such as (E1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: The essay is at the same URL with the same words (P1)

People already link to the essay. Brad wants the rebuilt page at the same address, saying exactly what today's page says.

**Why this priority:** a port that changes the words or the URL isn't a port.

**Independent test:** build the site, serve it as Hosting does, open `/vindecoded-agents`, and compare its article's text with today's page.

- **S1.1** Given the built site served with `firebase.json`, when a visitor opens `/vindecoded-agents`, then it answers 200 with the essay, and `/vindecoded-agents.html` and `/vindecoded-agents/` redirect to it (E1, E3).
- **S1.2** Given the essay, when its article's text is read with the markup removed and spaces collapsed, then it equals today's page's article text from 2026-11-03 word for word, the diagram's words included (E1–E4).
- **S1.3** Given the essay's head, then its title is the essay's title followed by " · Brad Thome", its description, author, canonical address and link-preview tags match today's page, and `lang="en"` is set (E1).
- **S1.4** Given the essay, then the heading shows the essay's title, the byline reads "Brad Thome · October 28, 2026" with a machine-readable date, and a "Brad Thome" link above the article goes to `/` (E1, E3).

### Story 2: The diagram reads on any screen (P1)

The diagram shows the whole system: six phases and the five points where Brad steps in.

**Why this priority:** it's the one picture in the essay, and it's the part most likely to break on a phone.

**Independent test:** open the essay on a phone and a desktop, in both themes, and use the keyboard to reach the diagram.

- **S2.1** Given the essay, then the diagram is one image with an accessible name, six phase bands and five highlighted steps, and its caption below it (E1–E4).
- **S2.2** Given a phone at 390 pixels wide, then the diagram keeps its 600-pixel minimum width and scrolls sideways inside its frame, and the page itself never scrolls sideways (E6).
- **S2.3** Given a keyboard, when the visitor tabs to the diagram's frame, then it takes focus with a visible ring, and the arrow keys scroll it (E6).
- **S2.4** Given a device set to light or dark, then the diagram's text, lines and highlighted steps use that theme's colors (E2, E4).

### Story 3: Tables and code read on a narrow screen (P2)

**Why this priority:** the essay has seven tables, and some have four or five columns.

**Independent test:** open the essay at 390 and 320 pixels wide, and tab through it.

- **S3.1** Given a phone at 390 or 320 pixels wide, then the page never scrolls sideways, and a table wider than the screen scrolls inside its own frame (E5, E7).
- **S3.2** Given a keyboard, then each table's frame can take focus with a visible ring, so a table that scrolls can be scrolled without a mouse.
- **S3.3** Given the essay's one code block, then it wraps rather than scrolls, its list markers are colored for the theme, and nothing on the page carries an inline style (E8).

### Story 4: The essay passes the site's checks (P1)

**Why this priority:** the slice plan's "done when" names the accessibility and Lighthouse checks.

**Independent test:** run CI's end-to-end, Lighthouse, HTML and links jobs on the pull request.

- **S4.1** Given the essay in either theme at either size, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S4.2** Given the essay, when Lighthouse takes the median of five phone runs, then it meets spec 003's budgets: performance 95, accessibility 100, best practices 100, SEO 100, LCP 2.0 s, CLS 0.05 and total blocking time 150 ms.
- **S4.3** Given the essay at phone and desktop sizes in light and dark, then the whole page matches its committed snapshot with no pixel tolerance, in the pinned container (E1–E4).
- **S4.4** Given the essay loads, then it requests nothing from another host, runs no script, and logs no error, a Content-Security-Policy one included.
- **S4.5** Given the built site, then html-validate passes on the essay, and lychee finds no broken internal link or anchor in it.

## Edge cases

- The live page changes before this merges. The text fixture is today's page; a later change to the live page is a change to the essay and needs its own pull request. Covered by S1.2.
- A screen narrower than 320 pixels. The tables and the diagram scroll in their frames, and the page doesn't scroll sideways. Covered by S2.2 and S3.1 at 320.
- Fonts that don't load. The text shows in the fallbacks spec 003 set, and the diagram's labels too, since it uses the heading font. Covered by spec 003's S1.3.
- A browser with no dark setting. The page is light, as the home page is. Covered by S2.4 and spec 003's S1.2.
- A visitor zooms to 200%. The column narrows like a small screen, and the frames scroll. Covered by S3.1.

## Functional requirements

- **FR-001** The site MUST serve the essay at `/vindecoded-agents`, built from an MDX file in `apps/site`, with `/vindecoded-agents.html` and `/vindecoded-agents/` redirecting to it.
- **FR-002** The essay's article text MUST equal today's page's article text from 2026-11-03 word for word, and its title, description and date MUST be today's.
- **FR-003** The essay's layout MUST set the title, description, author, canonical address, Open Graph and Twitter card tags today's page sets, and MUST show the heading and the byline with the date.
- **FR-004** The page MUST show a "Brad Thome" link to `/` above the article, and no other site link (D108).
- **FR-005** The diagram MUST be inline SVG with an accessible name, drawn in the site's tokens for each theme, with its caption, and MUST run no script.
- **FR-006** Each table and the diagram MUST sit in a frame that scrolls sideways when it's wider than the screen, and that can take keyboard focus with a visible ring and an accessible name.
- **FR-007** The code block MUST be colored by class, not inline style, and MUST wrap its lines.
- **FR-008** The end-to-end accessibility test MUST cover the essay in both themes at phone and desktop sizes, at WCAG 2.2 AA with the target-size rule on.
- **FR-009** Visual snapshots MUST cover the whole essay at phone 390×844 and desktop 1280×800, in light and dark, in the pinned container, with spec 003's settings.
- **FR-010** Lighthouse CI MUST run on the essay as well as the home page, with spec 003's budgets.
- **FR-011** The essay MUST ship no script, request nothing from another host, and carry no inline style, so spec 003's Content-Security-Policy needs no exception.
- **FR-012** The home and 404 pages MUST stay as they are: spec 003's tests and baselines pass unchanged.

## Success criteria

- **SC-001** The essay's article text differs from today's page's in 0 words.
- **SC-002** The essay's Lighthouse median meets every budget in S4.2.
- **SC-003** The essay has 0 automated accessibility violations in each of its four states.

## Mocks and flows

[mocks/README.md](mocks/README.md) shows each state, E1 to E8, with screenshots of a prototype of the port: the first screen in light and dark at phone and desktop sizes, the diagram, a table at 390 and 320 pixels, and the code block.

## Key entities

- **The essay:** an MDX file with a title, description and date, and the article's Markdown, unchanged from v0.
- **The text fixture:** today's page's article text, committed under `tests/006/fixtures/`, which the text check compares against.

## Assumptions

- Today's live page was built from v0's source as it stands. Checked on 2026-11-03: the live HTML and v0's last build are byte for byte the same, and the build is newer than every source file.
- `@astrojs/mdx` 8.1.2 works with Astro 7.4.5 and its default Markdown processor, checked with the prototype.

## Open questions

None.

## Decisions made while writing this spec

Tier 3, within D92 and D108:

- The essay's source stays in v0's Markdown, byte for byte below its imports, and Prettier skips it, so a reformat can't change a word.
- Tables get their frame from an MDX component rather than a rehype plugin, since Astro 7's default processor isn't remark.
- Each frame that can scroll is a focusable region: the diagram's is named by its caption, and each table's is named "Table".
- Code colors use two classes from Shiki's GitHub themes in place of its inline styles.
- The essay's text uses Charis SIL and its headings, tables, byline and diagram use Inter, as D92 maps v0's serif and sans.
- The essay's CSS lives in its own file, scoped to the essay, so the home page doesn't change.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/006/`. Spec 001's traceability check confirms it, and CI runs it. This spec's tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: waiting for Brad.
