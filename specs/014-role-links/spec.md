# Spec 014: Role links

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                                                                                                                          |
| Status          | Approved                                                                                                                                                                                                                                                                                                                                                      |
| Slice           | 3.6 Role links                                                                                                                                                                                                                                                                                                                                                |
| Branch          | `014-role-links`                                                                                                                                                                                                                                                                                                                                              |
| Mocks and flows | [mocks/README.md](mocks/README.md): the pages themselves, `/mobile`, `/fullstack`, `/ai` and `/v2`, on this pull request's preview, with each state listed                                                                                                                                                                                                    |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                                                                                                                                     |
| Decisions       | [D134](../../docs/decisions/0134-role-pages-light-the-hero-and-reorder-the-hopper-story.md), [D135](../../docs/decisions/0135-only-the-home-page-is-indexable.md) and [D136](../../docs/decisions/0136-role-pages-keep-the-linkedin-resume-link-until-slice-3-7.md), from this slice. It builds on D6, D118–D133, spec 005's content model and specs 009–013. |

## Summary

The role links, `/mobile`, `/fullstack` and `/ai`, are the new home page reordered for one kind of role (D6). Each shows the same words and facts as `/v2`. A role page names its role in the hero's eyebrow, turns its word in the hero blue while the other two dim, keeps its "End to end" rows lit, and puts its Hopper topics first, in the order Brad chose (D134). Hopper stays the first section on every page, and VINDecoded stays a side project. The "Hiring for" switch from spec 009 sits under the header on every page, as links, so it works with no script. Only the home page is indexable: each role page carries noindex and a canonical link to itself (D135). The résumé link stays LinkedIn until slice 3.7's PDFs (D136). The role pages are phase 3's pages, so a release build leaves them out, like `/v2` (D127).

## Scope

**In:**

- `apps/site/src/components/home/HomePage.astro`, the whole new home for a given role, which `pages/v2.astro` and `pages/[role].astro` render, and `components/home/roles.ts`, with the role pages' addresses, titles and Hopper topic orders.
- The hero's highlight for a role, in `Hero.astro` and `styles/home/hero.css`, and the Hopper story's order for a role, in `Hopper.astro` and `hopper.ts`.
- The "Hiring for" switch under the header, from spec 009's `RoleSwitch.astro`, placed by `styles/home/roles.css`.
- A canonical link in `DesignBase.astro`, and the release build's page list.
- Tests in `tests/014/`, with snapshot baselines from the pinned container, and specs 010–013's tests and baselines brought in line with the shared page.

**Out:**

- The résumé PDFs and their links (slice 3.7, D136).
- Any claim, word or fact that differs per role (D6). The `roles` orders in the job and project files stay as they are, since every page shows the jobs and projects in the same order (D134).
- Reordering the sections, the jobs or the projects.
- Any change to v1's pages, or any link to the role pages from them.
- Motion beyond the hero's existing sequence.

## User stories and acceptance scenarios

The IDs in brackets, such as (M1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: A role page puts the role's work first (P1)

A hiring manager Brad sends `/ai` should see, from the first screen, that this is the applied AI view of the same career, and read the AI work at Hopper first.

**Why this priority:** it's what D6 promises.

**Independent test:** open each role page at both sizes, with reduced motion on.

- **S1.1** Given `/mobile`, `/fullstack` or `/ai`, when it loads, then it shows, in order, the header, the "Hiring for" switch, the hero, `#hopper`, `#experience` and `#side`, as `/v2` does (M1–M6).
- **S1.2** Given each role page, then the hero's eyebrow reads "Senior mobile engineer · Dallas–Fort Worth", "Senior full-stack engineer · Dallas–Fort Worth" or "Senior engineer · Applied AI · Dallas–Fort Worth", and `/v2`'s still reads "Senior mobile & full-stack engineer · Dallas–Fort Worth".
- **S1.3** Given each role page, then the Hopper story shows its role lines first, then its topics in Brad's order (D134): `/mobile` RemoteUI and WebViews, Disruption Assistance, Partner platform, Fintech AI, Agent workflow; `/fullstack` Disruption Assistance, Partner platform, RemoteUI and WebViews, Agent workflow, Fintech AI; `/ai` Fintech AI, Agent workflow, Partner platform, Disruption Assistance, RemoteUI and WebViews. The first topic carries the highlight card, and `/v2` keeps the claims' order.
- **S1.4** Given a role page at rest, then the hero's word for its role is the accent color and the other two words, with their dots, are the dim color; the "End to end" rows for its role are lit, with the accent border, the soft accent fill and an accent layer name; and the card's note reads "Lit for mobile", "Lit for full-stack" or "Lit for applied AI". `/v2` keeps every word in ink, no row lit, and the note "Where I work".
- **S1.5** Given every page, then Experience shows its jobs and "On the side" its projects in the same order as on `/v2`.
- **S1.6** Given a phone 390 pixels wide, or 320, then each role page shows the same parts in the same order, the switch wraps, and the page never scrolls sideways (M2, M4).

### Story 2: The same words and facts on every page (P1)

**Why this priority:** a role page must never make a claim the home doesn't (D6), and the repo is public.

**Independent test:** compare each built role page's text with `/v2`'s.

- **S2.1** Given each role page, then the set of claims it shows, and each claim's text, equals `/v2`'s. Its receipts are numbered 1 to the same last number in reading order, each number once.
- **S2.2** Given each role page, then `#hopper` is the first section after the hero, and no level-1 or level-2 heading or eyebrow names VINDecoded.
- **S2.3** Given each role page, then the hero's words, lines, buttons, chips and rows read as on `/v2`; only the eyebrow and the card's note differ. The résumé link goes to LinkedIn on every page (D136).
- **S2.4** Given a role order that names a topic no public claim has, then building the story throws, so the page fails to build. Given a topic the order doesn't name, then it shows after the named ones, in claim order.

### Story 3: The "Hiring for" switch moves between the pages (P1)

- **S3.1** Given any of the four pages, then under the header a navigation region named "Hiring for" lists four links: "Any role" to `/v2`, "Mobile" to `/mobile`, "Full-stack" to `/fullstack` and "Applied AI" to `/ai`. The page's own link carries `aria-current="page"` and the filled look, and the address beside it reads `bradthome.com` on `/v2`, or `bradthome.com/mobile` and so on (M1, S1).
- **S3.2** Given `/v2`, when the visitor follows "Applied AI", then `/ai` loads with its eyebrow and order; when the visitor goes back, `/v2` shows again (S1). The pages run no script.
- **S3.3** Given a keyboard, when the visitor tabs from the header's last link, then focus moves through the switch's four links in order, each with a 2-pixel accent ring at 3:1 or more against what's around it, then on to the hero's buttons (F1). Each link is at least 44 pixels tall.

### Story 4: One indexable page (P1)

- **S4.1** Given each role page, then its title is "Brad Thome · Mobile engineer", "Brad Thome · Full-stack engineer" or "Brad Thome · Applied AI", it carries `<meta name="robots" content="noindex">`, and its canonical link is its own address on `https://bradthome.com` (D135).
- **S4.2** Given `/v2`, then its title stays "Brad Thome", it carries no robots meta tag, and its canonical link is `https://bradthome.com/`, where it lives from v2.0. Every page keeps `/v2`'s description.

### Story 5: It works for everyone (P1)

- **S5.1** Given each role page in either theme at either size, when axe runs at WCAG 2.2 AA with the target-size rule on, then it finds no violation.
- **S5.2** Given the highlight's colors in both themes, then the dim words and dots meet 3:1 on the page as large text, the accent word meets 3:1, and every text pair in a lit row meets 4.5:1 on the soft accent fill.
- **S5.3** Given each role page, then its layout shifts add up to 0 as it loads, measured in the browser at both sizes, and Lighthouse's median Cumulative Layout Shift for `/v2`, which renders the same page, stays 0.
- **S5.4** Given reduced motion, then the top of each role page at phone 390×844 and desktop 1280×800, in light and dark, matches its committed snapshot with no pixel tolerance, in the pinned container. So does the switch with a link focused (M1–M6, F1).

### Story 6: Live stays v1 (P1)

- **S6.1** Given a build with `BRADTHOME_RELEASE=1`, then it holds no `v2.html`, `mobile.html`, `fullstack.html` or `ai.html`, and v1's pages, words and stylesheet don't change. No v1 page links a role page.

## Edge cases

- A new Hopper topic from a later export: it shows after each role's named topics (S2.4), so it needs no layout work but may need a place in D134's orders.
- A topic renamed by an export: the build fails until `roles.ts` names it (S2.4).
- An address with a trailing slash, such as `/ai/`: Hosting's `trailingSlash: false` sends it to `/ai`.
- An unknown role, such as `/web`: it isn't built, so Hosting serves the 404 page.
- 200% zoom, or 320 pixels wide: the switch's links wrap onto two lines (S1.6).

## Functional requirements

- **FR-001** The site MUST build `/mobile`, `/fullstack` and `/ai` from the same page as `/v2`, `HomePage.astro`, with the role as its only input.
- **FR-002** Each role page MUST name its role in the hero's eyebrow, and light its word and its "End to end" rows, with the note "Lit for" its role (D134).
- **FR-003** Each role page MUST show the Hopper story's topics in D134's order, from `roles.ts`, after the role lines; a name with no claims MUST fail the build, and a topic it doesn't name MUST show after.
- **FR-004** Every page MUST show the same claims with the same text, Hopper first, and VINDecoded in no heading or eyebrow.
- **FR-005** Every page MUST show spec 009's "Hiring for" switch under the header, as links to the four pages, with the current one marked, and MUST run no script.
- **FR-006** The role pages MUST carry noindex, their own titles and a canonical link to themselves; `/v2` MUST carry no noindex and a canonical link to `https://bradthome.com/` (D135).
- **FR-007** A release build MUST leave out the role pages, as it does `/v2` (D127).
- **FR-008** The pages MUST meet WCAG 2.2 AA in both themes at both sizes, with a visible focus ring on every link and 44-pixel switch targets.
- **FR-009** The change MUST add no animation, transition, script, inline style or request to another host, and each role page's layout shift MUST stay 0.
- **FR-010** The end-to-end tests MUST cover each page's order, highlight, claims, switch, keyboard path, axe, contrast, layout shift, metadata and snapshots, in the pinned container.
- **FR-011** `docs/plan.md` MUST show slice 3.6's state, and the decision log MUST hold D134–D136.

## Success criteria

- **SC-001** 3 role pages build, and a release build holds 0 of them.
- **SC-002** 0 claims differ between `/v2` and each role page, by ID or by text.
- **SC-003** axe finds 0 violations on each role page in each of its four checked states.
- **SC-004** Each role page's layout shifts add up to 0, and Lighthouse's median Cumulative Layout Shift on `/v2` stays 0.

## Mocks and flows

[mocks/README.md](mocks/README.md) lists the states and the switching flow, and links the pages on this pull request's preview.

## Key entities

- **The page:** `components/home/HomePage.astro`, rendered by `pages/v2.astro` for every role and by `pages/[role].astro` for each one.
- **The roles:** `components/home/roles.ts`: each page's address, label, title and note, the switch's links, the canonical URLs, and D134's topic orders.

## Assumptions

- The Hopper topics' names in `claims.yaml` stay as the export writes them today. A rename fails the build (S2.4), so it's seen.
- `/v2` moves to `/` at v2.0, when the switch's "Any role" link moves with it.

## Open questions

None.

## Decisions made while writing this spec

Tier 3, within D6, D118 and D134–D136:

- The switch is links, as spec 009 built it, not an in-page toggle: each choice is its own page, can be shared, keeps the back button and needs no script.
- It sits in its own row under the header on every page, as the Home v2 board draws it, with the address beside it.
- "Any role" links `/v2` until v2.0. The rule that no page links `/v2` (spec 010's S6.2) holds for v1's pages, which still link none of the four.
- The highlight is the board's: the role's word blue, the others dim. The dim color is 3:1 or more, which large text needs, and the eyebrow names the role in words, so color isn't the only cue.
- The note "Lit for mobile" is the board's label; it names the role, not a fact.
- The titles name the role after Brad's name, so a tab or a shared link says which page it is.
- `/v2` gets its canonical link now, to `https://bradthome.com/`, so the switch's pages agree on which one is the home.
- The pages come from one dynamic route, `[role].astro`, with its three roles from `roles.ts`, so a fourth role is one line.
- Lighthouse doesn't run on the role pages: its SEO budget of 1 fails any page with noindex, which D135 gives them. The end-to-end tests measure their layout shift instead, and Lighthouse keeps measuring `/v2`, the same page.

## Changes to other specs

Specs 001–003 stay locked as they are.

- **Spec 010:** the page's structure moves from `v2.astro` to `HomePage.astro`, so its static tests read the shared page, where the hero and the Hopper story now take the role. Its release test lists the role pages. S4.1's keyboard path passes through the switch's four links, and its whole-page and focus baselines are made again, since the switch sits under the header. Its change log says so.
- **Specs 011, 012 and 013:** their static tests read `HomePage.astro` for the section's place on the page, and check that only the shared page, which `/v2` and the role pages render, imports the section, and that a release build leaves out all four pages. Any section baseline the switch moves is made again. Each change log says so.

## Changes since approval

- Changed on 2026-11-05, in slice 3.7: S2.3's résumé link opens each page's résumé PDF, as D141 replaces D136, and its tests check the PDF links (spec 015). Brad approved it with spec 015 at its Gate 1.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/014/`. Spec 001's traceability check confirms it, and CI runs it. This spec's tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: approved by Brad in the session on 2026-11-05, with the plan and mocks, on the recommended option.
