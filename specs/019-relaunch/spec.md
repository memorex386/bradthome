# Spec 019: The v2.0 relaunch

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                  |
| Status          | Approved                                                                                                                              |
| Slice           | 3.11 Relaunch (v2.0), the last of phase 3                                                                                             |
| Branch          | `019-relaunch`, pushed straight to main after Brad says push ([D161](../../docs/decisions/0161-changes-go-straight-to-main.md))       |
| Show it         | The release candidate on a preview channel, then on `next` once it's on main; "What changes for a visitor" below                      |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                             |
| Decisions       | D162–D168, from this slice. It builds on D58, D113–D114, D118–D127, D135, D155–D159 and D160–D161.                                    |

## Summary

v2.0 makes the phase 3 redesign live on bradthome.com. The new home moves from `/v2` to `/`, and `/v2` redirects to it with a 301 (D162). The role pages, the résumé PDFs, the link previews, contact, `/privacy`, analytics and the unlinked design-system gallery (D165) all go live. The v1 home template and the release-build flag that kept phase 3 off live retire. The essay stays at `/vindecoded-agents` with the same words under a new title, "Running a 1.4M-download product with AI agents" (D163). There's no photo (D164), and Hopper's Oct 2026 end date becomes public (D166).

The release runs the existing tag-and-approve workflow (D113), with a pre-release check updated for v2, after a rehearsed rollback to v1.0.0 on a preview channel.

## What changes for a visitor

Compared with v1.0.0 on bradthome.com today:

- `/` shows the new home: the hero with its role eyebrow, the Hopper story, Experience with the timeline, the side projects, and "Get in touch" with brad@bradthome.com and a Copy button. v1's one-card home is gone.
- New pages: `/mobile`, `/fullstack` and `/ai` (the home reordered for a role, noindex), `/privacy` (noindex), the résumé PDFs under `/resume/`, and `/design-system` (unlinked, noindex).
- `/v2` redirects to `/` with a 301.
- The essay at `/vindecoded-agents` keeps its address, layout and every word of its body, under the new title. The 404 page is unchanged.
- The new pages count visits with Umami Cloud, only on bradthome.com, never under Do Not Track or Global Privacy Control, with no cookie or storage (spec 018).
- `/robots.txt` and `/sitemap.xml` appear. The sitemap lists the home and the essay.
- The home keeps v1's link-preview tags (title, description, canonical URL), so a shared link still shows a card.

## Scope

**In:**

- `apps/site/src/pages/index.astro` renders the new home; `v2.astro` and the v1 home template go; `HOME_HREF` and every `/v2` link point at `/`.
- `firebase.json` gains the `/v2` redirect.
- `scripts/site/release-pages.ts` and the `BRADTHOME_RELEASE` flag go, from the build, `resume-pdfs.ts` and `release.yml`.
- `release.yml` builds in the pinned Playwright container with WeasyPrint and checks the CSP against the build, as `ci / build` does, so the release serves the résumé PDFs and its hashes match.
- The pre-release check (spec 008): the words input becomes a choice of pages, the essay's renamed title is allowed, and the CSP may add Umami's one `connect-src` host (D159).
- `DesignBase.astro` adds the link-preview tags to any page with a canonical URL.
- `public/robots.txt` and `public/sitemap.xml`.
- The essay's title, in its front matter.
- Tests in `tests/019/`; every phase 3 test that pointed at `/v2` or the release flag; spec 003's page checks, with Brad's card (D167), and a relock.
- The rehearsal, the release and their records in `docs/releases/`; the docs and the plan's phase 3 row.

**Out:**

- Any change to the essay's body, layout or diagram, or to the 404 page.
- A photo (D164).
- LinkedIn, or any setting in GitHub, Google Cloud or Umami.
- Phase 4.

## User stories and acceptance scenarios

### Story 1: The redesign is the site (P1)

- **S1.1** Given the built site, when a visitor opens `/`, then it shows the new home, for every role, with no noindex and a canonical link to `https://bradthome.com/`.
- **S1.2** Given `/v2`, then Hosting answers 301 with `Location: /`.
- **S1.3** Given the built site, then it holds `/mobile`, `/fullstack`, `/ai`, `/privacy`, `/design-system` and the three résumé PDFs, and no `v2.html`.
- **S1.4** Given any page, then no link points at `/v2`.
- **S1.5** Given the home, then it carries the link-preview tags: author, canonical, `og:type` website, `og:title`, `og:description`, `og:url` and `twitter:card`.

### Story 2: Only the home and the essay are indexable (P1)

- **S2.1** Given the role pages, `/privacy` and `/design-system`, then each carries `noindex`; the home and the essay don't.
- **S2.2** Given `/robots.txt`, then it allows every path and names `https://bradthome.com/sitemap.xml`.
- **S2.3** Given `/sitemap.xml`, then it lists exactly the home and the essay, at their canonical URLs.

### Story 3: The essay keeps its words (P1)

- **S3.1** Given `/vindecoded-agents`, then its title and heading read "Running a 1.4M-download product with AI agents" (D163), and its front matter's description and date and its body are unchanged.

### Story 4: Nothing keeps phase 3 off live any more (P1)

- **S4.1** Given the repo, then no source, script or workflow reads `BRADTHOME_RELEASE`, and `release-pages.ts` is gone.
- **S4.2** Given `release.yml`, then its build runs in the pinned Playwright container, installs WeasyPrint, builds and runs `pnpm csp --check`, after a separate job checks the tag on main.

### Story 5: The pre-release check fits v2 (P1)

- **S5.1** Given `words-may-change` set to `home`, when the home's words differ, then the check notes it and passes; when the essay's body differs, it fails.
- **S5.2** Given the essay's old title on live and the new one on the candidate, with nothing else changed, then the essay's words pass.
- **S5.3** Given a candidate CSP that adds `https://gateway.umami.is` to `connect-src`, then the headers pass; any other added host still fails.
- **S5.4** Given `words-may-change` set to `none`, `home` or `home-and-essay`, or the old `true`, then the check allows no page, the home, or both.
- **S5.5** Given every URL v1.0.0 serves, then the candidate still answers it (spec 008's S3.1), and `/v2` answers 301 to `/`.
- **S5.6** Given a candidate on one of Hosting's own domains, where Hosting sends its own Strict-Transport-Security in place of `firebase.json`'s (D99), then the check compares `firebase.json`'s value with live's, notes that it did, and still fails a weaker one.

### Story 6: Analytics only on bradthome.com (P1)

- **S6.1** Given the release build, then the sender's host check is still exactly `bradthome.com` (spec 018's S2.1), and nothing else in the build names Umami's host.

### Story 7: A rehearsed rollback, then the release (P1)

- **S7.1** Given a preview channel, when v2's build is released to it and then rolled back to v1.0.0's version, then the channel serves v1.0.0's files by hash, and the record is in `docs/releases/v2.0.0-rehearsal.md`.
- **S7.2** Given Brad's go-ahead on a card, after main's `ci` is green, when `release.yml` runs on the `v2.0.0` tag with `words-may-change: home` and Brad approves in `production`, then bradthome.com serves the staged version.
- **S7.3** Given the release, then the post-release check passes: the pages, the `/v2` redirect, the headers, the PDFs, robots and the sitemap, and one page view in Umami from the live site. If anything fails, the rollback runs first and the report comes second.
- **S7.4** Given the release, then `docs/releases/v2.0.0.md` and a GitHub release record it.

## Requirements

- **FR-001** `/` MUST render the new home, and `/v2` MUST redirect to `/` with a 301 (D162).
- **FR-002** The release build MUST be the same build every other build is: no flag, no dropped pages or files.
- **FR-003** `release.yml` MUST build in the pinned container with WeasyPrint and MUST check the CSP against the build.
- **FR-004** Only the home and the essay MUST be indexable; robots.txt and the sitemap MUST say so.
- **FR-005** The essay's body, description, date and address MUST NOT change; its title MUST be D163's.
- **FR-006** The pre-release check MUST compare each word page strictly unless the run names it, MUST allow only the renamed titles in `TITLE_CHANGES`, and MUST allow only `https://gateway.umami.is` as an added CSP host.
- **FR-007** Spec 003's page checks MUST follow D167, and spec 003 MUST be relocked.
- **FR-008** Every page MUST keep passing WCAG 2.2 AA, spec 003's Lighthouse budgets, html-validate, veraPDF and the link check.
- **FR-009** The release MUST follow `docs/release.md`, after the rehearsal, with Brad's separate go-ahead and Brad's approval in `production`.
- **FR-010** The docs MUST record D162–D168, the release, and mark slice 3.11 and phase 3 done.

## Success criteria

- **SC-001** bradthome.com serves v2.0, and `pnpm release:status` names its version.
- **SC-002** The rehearsal's rollback serves v1.0.0's files on a preview channel, by hash.
- **SC-003** The pre-release check passes with `words-may-change: home`: every v1 URL answers, the headers are at least as strict, the essay's words match.
- **SC-004** 0 references to `/v2` or `BRADTHOME_RELEASE` in the site's source and workflows, beyond the redirect.
- **SC-005** One page view from the live site shows in Umami; no other test traffic is sent.

## Edge cases

- A visitor with `/v2#hopper` bookmarked: the 301 keeps the fragment in the browser, so it lands on `/#hopper`.
- A search engine that indexed v1's home: the address is the same, so it re-crawls the new page.
- A v2.x fix ships the usual way, with `words-may-change: none` unless its words change.
- If the release's served check fails, the workflow puts v1.0.0 back on its own (spec 008).

## Approval

- Card answers, 2026-11-06: the essay's title (D163), no photo (D164), `/v2` redirects to `/` (D162), the gallery goes live unlinked and noindex (D165), and Hopper's Oct 2026 end date goes public (D166).
- Gate 1: approved by Brad on a choice card in the session on 2026-11-06, with the plan, D167 (spec 003's page checks move to the essay) and D168 (the home and the essay are indexable).
- Changed in the build, on 2026-11-06: S5.6. Running the check against the `v2-rc` channel found that Hosting replaces HSTS on `*.web.app`, so every release's stage check would fail against live's two-year value. A tier-3 detail inside FR-006, found before any push.
- Changed after review, on 2026-11-06: the check asks the candidate for `/v2` itself (`EXPECTED_REDIRECTS`), since v1.0.0 never served it, and S1.3 reads the served build in the e2e job.
