# Plan for spec 006: The essay

| | |
| --- | --- |
| Spec | [spec.md](spec.md), approved with this plan at Gate 1 |
| Status | Approved |

## Approach

**The source.** `apps/site/src/pages/vindecoded-agents.mdx` is v0's file: the same front matter and the same Markdown, byte for byte, below its imports. Two lines join the imports: the table component, and `export const components = { table: Table }`, which wraps every Markdown table in it (FR-001, FR-002). `.prettierignore` skips the file, so formatting can't touch the words. `@astrojs/mdx` 8.1.2 joins the site's dependencies and `mdx()` its integrations.

**The layout.** `src/layouts/Essay.astro` ports v0's: it takes the front matter, builds the title with " · Brad Thome", turns the date into "October 28, 2026" in UTC, and swaps the title's hyphens for non-breaking ones in the heading, as today (FR-003). It renders `Base.astro` with two new named slots and one new prop, which the home and 404 pages don't use, so they render as before (FR-012):

- `head`: the author, canonical, Open Graph and Twitter card tags. The canonical address is `https://bradthome.com/vindecoded-agents`, built from Astro's `site`, so no new host appears in the source.
- `header`: the "Brad Thome" link to `/` (FR-004, D108).
- `frame`: `center`, the default, keeps main's current classes; `essay` gives the text column.

**The look.** `src/styles/essay.css` ports v0's essay rules onto the site's tokens and fonts, every rule scoped to the essay's frame (D92). `tokens.css` gains v0's surface, rule and edge colors, in both themes. Nothing moves, as spec 003's S1.5 requires.

**The diagram.** `src/components/SystemDiagram.astro` is v0's, with its colors and font switched to the tokens (FR-005). Its frame becomes a focusable region named by the caption, and a focus ring inside the frame's edge (FR-006).

**Tables.** `src/components/Table.astro` wraps each table in a frame that can widen to 52rem and scrolls sideways when it must, as a focusable region named "Table" (FR-006).

**Code.** Shiki keeps v0's GitHub light and dark themes. A small transformer in `astro.config.mjs` drops Shiki's inline styles and marks the one colored token, the list marker, with a class that `essay.css` colors per theme (FR-007, FR-011). Astro still warns that Shiki uses inline styles; the transformer is why that no longer holds, and S3.3's test proves it.

**Checks.**

- The end-to-end tests in `tests/006/e2e/` run in the pinned container with spec 003's helpers and settings. They read the essay, check its head, diagram, frames, code and requests, run axe in the four states, run html-validate on the served page, check its internal links and anchors, and snapshot the whole page in the four states (FR-008, FR-009, S4.5).
- The text check strips the article's markup, collapses spaces and compares it with `tests/006/fixtures/article.txt`, today's page's article text taken from `https://bradthome.com/vindecoded-agents` on 2026-11-03 (FR-002, SC-001).
- `lighthouserc.json` adds the essay's URL, so LHCI runs five times on each page and asserts the median per page (FR-010). `scripts/ci/site-report.ts` groups a miss by its page, so the message names `/vindecoded-agents` rather than always `/`.
- `pnpm csp` rewrites `firebase.json`'s policy from the build, since the essay's page adds Astro's hashes.
- The static tests in `tests/006/static/` read the source and config: the front matter, the layout's links, no script, the transformer, Lighthouse's URLs, Prettier's skip and the home page's frame.

## What exists today

- Spec 003's skeleton: `Base.astro`, the tokens, the fonts, the home and 404 pages, and every check and its job.
- v0's source for the essay, uncommitted on Brad's PC, and the live page built from it. The live HTML and v0's last build are the same, byte for byte, checked on 2026-11-03.

## Alternatives considered

- **A content collection for essays.** Slice 2.3 builds collections for jobs, projects and claims, and the essay has none of their fields. One essay doesn't need a collection; a later essay can move both into one.
- **v0's rehype plugin for tables.** Astro 7's default Markdown processor isn't remark, and the MDX component does the same job with no plugin.
- **Prism or no highlighting for the code.** Prism also writes classes, but its colors differ from today's. No highlighting loses the colored markers. The transformer keeps today's look.
- **Tables as stacked cards on a phone.** It reads better on a very narrow screen, but it changes today's look, and the port keeps it.

## Risks

- **Slice 2.3 lands first.** Both slices touch `package.json`, the lockfile, the Astro config, the decision index and maybe `docs/plan.md`. If it merges first, this branch merges main (never a rebase), takes the next free decision number, and renumbers D108 everywhere.
- **Full-page snapshots are tall.** The essay is about 16,000 pixels tall on a phone. Playwright handles it, and the baselines are made only in the container.
- **Lighthouse's runs double.** Ten runs instead of five add about a minute to the job.

## Changes to locked tests

None. Specs 001 to 003 keep their locks. Spec 003's tests still pass: the essay adds no URL to the source, no script, no motion, and keeps the tokens' order.

## Tasks

- **T001** Tests from the scenarios: `tests/006/static/`, `tests/006/e2e/` and the text fixture, traced to every ID. They fail until the build (S1.1–S4.5, FR-001–FR-012, SC-001–SC-003).
- **T002** The MDX page, `@astrojs/mdx`, and Prettier's skip (FR-001, FR-002).
- **T003** `Essay.astro`, Base's slots and frame, and the essay's CSS and tokens (FR-003, FR-004, FR-012).
- **T004** The diagram and the table frames (FR-005, FR-006).
- **T005** The Shiki transformer and the code colors (FR-007, FR-011).
- **T006** Lighthouse's URL, site-report's per-page message, and `pnpm csp` (FR-010).
- **T007** Baselines from `pnpm test:visual --update`, in the container (FR-009).
- **T008** Every check run locally: types, unit tests, lint, format, site types, build, html, links, the e2e suite in the container, and Lighthouse.
- **T009** Review with the pinned reviewer, fix or answer each finding, and the PR marked ready with its preview.

## Decisions

- [D108](../../docs/decisions/0108-the-essay-slice-ports-the-article-and-the-home-slice-ports-the-chrome.md): this slice ports the article, and slice 2.5 the header and footer.
- Tier 3 decisions are in the spec's "Decisions made while writing this spec".
