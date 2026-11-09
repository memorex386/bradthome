# Spec 015: Résumé PDFs

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                             |
| Status          | Approved                                                                                                                                                                                                         |
| Slice           | 3.7 Résumé PDFs                                                                                                                                                                                                  |
| Branch          | `015-resume-pdfs`                                                                                                                                                                                                |
| Mocks and flows | [mocks/README.md](mocks/README.md): each PDF's two pages, printed from this branch, and the résumé button on each page                                                                                           |
| Plan            | [plan.md](plan.md), approved with this spec at Gate 1                                                                                                                                                            |
| Decisions       | D137–D141, from this slice. It builds on D6, D50, D67, D118–D136, spec 005's content model and specs 009–014. |

## Summary

Each role gets one résumé PDF: mobile, full-stack and applied AI (D6). A PDF prints exactly the claims its role's page shows: Experience lists every job newest first by start date (D142), with Hopper's topics in the role's order (D134), then the side projects and the degree. A claim that restates a job's title doesn't print the title a second time. Every sentence is a public claim, as written, less any rule for the site, or comes from a job or project file, or from the contact line Brad chose (D137): brad@bradthome.com, bradthome.com, linkedin.com/in/brad-thome, github.com/memorex386 and "Dallas–Fort Worth", with no phone number. Hopper reads Apr 2022 – Oct 2026, as on the site (D138).

The build prints the PDFs from source every time, with WeasyPrint in the pinned Playwright container, so they can't drift from the site and nobody makes them by hand. Each is PDF/A-2a and PDF/UA-1, tagged, with real text, its title, language and links set, and CI checks both standards with veraPDF (D139). Each fits on two pages at the board's type sizes. The hero's "Read the résumé" opens the page's PDF on a role page, and the full-stack PDF on `/v2` (D141), replacing D136's LinkedIn link. The PDFs are phase 3's files, so a release build leaves them out, as it leaves out `/v2` (D127).

## Scope

**In:**

- `apps/site/src/components/resume/`: `resume.ts`, the résumé for a role, built from the same content and the same section builders as the page, and `ResumeEntry.astro`.
- `apps/site/src/pages/resume/[role].astro`, the page each PDF prints from, and `styles/resume/print.css`, the Resume PDF board's look.
- `scripts/site/resume-pdfs.ts`, the build step that prints and cleans up; `scripts/site/resume/print.py` and `requirements.txt`; and `scripts/site/printer.ts`, `pnpm printer:install`.
- The hero's résumé link, in `Hero.astro` and `hero.ts`.
- CI: the build jobs in `ci.yml`, `preview.yml` and `next.yml` run in the pinned container and install the printer, and the `html` job checks the PDFs with veraPDF through `pnpm site:pdf`. `pnpm test:visual` installs the printer too.
- Tests in `tests/015/`, and specs 010 and 014's tests brought in line with the new link.

**Out:**

- Any claim, word or fact the role's page doesn't show (D6). New words for the PDFs, such as a summary or a skills list, come as public claims in a later export.
- The header's résumé button, which the new home doesn't show yet (spec 009 built it for the gallery).
- LinkedIn's own profile, which stays as it is (D138).
- A download counter: analytics is slice 3.10.
- Any change to v1's pages, which stay word for word as live.

## User stories and acceptance scenarios

The IDs in brackets, such as (P1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: A recruiter gets the role's résumé as a PDF (P1)

A recruiter on `/ai` who wants something to forward should get a résumé that leads with the AI work, in a file they can attach.

**Why this priority:** it's what D6 promises, and the charter lists the matching PDF.

**Independent test:** follow "Read the résumé" on each page of the preview, and open the PDF.

- **S1.1** Given `/mobile`, `/fullstack` or `/ai`, then the hero's "Read the résumé" links that role's PDF: `/resume/brad-thome-mobile.pdf`, `/resume/brad-thome-full-stack.pdf` or `/resume/brad-thome-applied-ai.pdf` (D140). Given `/v2`, then it links the full-stack PDF (D141). Following it loads the PDF with the type `application/pdf` (B1).
- **S1.2** Given each PDF, then it opens with Brad's name, the role's line as the hero's eyebrow names it, and the contact line: "Dallas–Fort Worth", brad@bradthome.com, bradthome.com, linkedin.com/in/brad-thome and github.com/memorex386, the last four as links (P1).
- **S1.3** Given each PDF, then it shows Experience, with Hopper first, then "On the side", then Education. Experience lists every job newest first by start date, so RealPage comes before BookShout and Bottle Rocket, and the jobs the page shows as one dated line print as a heading with no bullets (D142). Hopper's topics follow the role's order from D134, after Hopper's lead. The projects and the degree come in the page's order. The pages keep D134's order (P1, P2).
- **S1.4** Given each PDF, then Hopper's dates read "Apr 2022 – Oct 2026" (D138).
- **S1.5** Given each PDF, then it is at most two US Letter pages, and its body text is at the board's 16 pixels, 12 points, with no text under the board's 11.5 pixels.

### Story 2: The PDF says only what the site says (P1)

**Why this priority:** the repo and the PDFs are public, and a PDF that drifts from the site would make a claim Brad hasn't made there.

**Independent test:** compare each PDF's text with the content model.

- **S2.1** Given each PDF, then its claims are exactly the claims its role's page shows, in the PDF's order (S1.3), each with its text as the page shows it, but for S2.5.
- **S2.2** Given each PDF, then every sentence in it comes from a public claim, a job or project file, the contact line, or a heading or label; no rule for the site prints, such as the closing rule on `vindecoded-7`, and no claim the page treats as a note prints, such as `hopper-stack-1`, `realpage-1` or `bookshout-1`.
- **S2.3** Given each PDF and its source, then neither holds a phone number.
- **S2.5** Given a claim that opens with its job's title, such as "Senior Software Engineer, remote." or "Senior Android Developer, promoted from Android Developer in Dec 2020.", then the title prints once, in the job's heading. A claim that adds one word lends it to the heading ("Senior Software Engineer · Remote"); one that adds more prints what it adds as a bullet ("Promoted from Android Developer in Dec 2020.").
- **S2.4** Given a claim the page needs that the content doesn't have, then building the résumé throws, so the build fails, as the page's does.

### Story 3: Anyone can read it, and it lasts (P1)

**Why this priority:** a résumé reaches screen readers, applicant tracking systems and archives, and the site holds itself to WCAG 2.2 AA.

- **S3.1** Given each PDF, when veraPDF checks it against PDF/UA-1 and PDF/A-2a, then it passes both (D139).
- **S3.2** Given each PDF, then its text extracts as text, not images, in reading order; its title is "Brad Thome · Mobile engineer · Résumé", "Brad Thome · Full-stack engineer · Résumé" or "Brad Thome · Applied AI · Résumé", its language is English, and its links are link annotations with their addresses.

### Story 4: The PDFs come from source, and only on phase 3's builds (P1)

- **S4.1** Given any build but a release build, then it prints the three PDFs from the content and the print page, and serves them with no print page beside them. Git holds no PDF.
- **S4.2** Given the same source, then printing again gives the same bytes, so CI's build, the preview's and `next`'s serve the same files.
- **S4.3** Given a build with `BRADTHOME_RELEASE=1`, then it holds no `resume` folder, and v1's pages don't change.
- **S4.4** Given a build in CI without WeasyPrint, then it fails and says to run `pnpm printer:install` in the pinned container. Given one elsewhere, then it warns and leaves the PDFs out.
- **S4.5** Given CI, then the build jobs install WeasyPrint from hash-pinned packages in the pinned container, and the `html` job runs veraPDF's image, pinned by digest, over the build's PDFs.

## Edge cases

- A claim the export renames or removes: the build fails, as the page's does (S2.4).
- A later export with more claims: they print if the page shows them. If a PDF then runs past two pages, the e2e test fails, and Brad chooses what to cut.
- A claim with a list, such as `vindecoded-7`: the list prints as a nested list.
- Fonts: the PDFs embed the site's own Charis SIL and Inter files, so nothing loads from another host.
- A browser that downloads PDFs rather than showing them: the file keeps Brad's name and the role in its name (D140).

## Functional requirements

- **FR-001** The site MUST build one résumé per role from `resume.ts`, reusing the page's section builders, with the role's Hopper topic order.
- **FR-002** Each PDF MUST print only public claims' text, as the page shows it, plus job and project fields, the contact line, and headings and labels.
- **FR-003** Each PDF MUST carry D137's contact line and no phone number.
- **FR-004** The build MUST print the PDFs with WeasyPrint as PDF/A-2a with PDF/UA-1's identification, remove the print pages, and leave out the PDFs on a release build.
- **FR-005** The printer MUST install from hash-pinned packages, in the pinned Playwright container, in CI's build jobs and `pnpm test:visual`.
- **FR-006** CI MUST check every PDF with veraPDF's pinned image against PDF/UA-1 and PDF/A-2a.
- **FR-007** The hero's "Read the résumé" MUST link the page's PDF, and `/v2`'s MUST link the full-stack PDF.
- **FR-008** Each PDF MUST fit on two US Letter pages at the board's sizes: 16-pixel body text, and no text under 11.5 pixels.
- **FR-009** The same source MUST print the same bytes.
- **FR-010** `docs/plan.md`, AGENTS.md and the decision log MUST show the slice and D137–D141.

## Success criteria

- **SC-001** 3 PDFs build, each at most 2 pages, and a release build holds 0.
- **SC-002** 0 veraPDF failures across the 3 PDFs and the 2 standards.
- **SC-003** 0 claims differ between each PDF and its role's page, by ID, order or text.
- **SC-004** 0 bytes differ between two prints of the same source.

## Mocks and flows

[mocks/README.md](mocks/README.md) shows each PDF's pages and the résumé button's states.

## Key entities

- **The résumé:** `resumeOf(role, content)` in `components/resume/resume.ts`: the name, the role's line, the contact line, Experience's entries and dated lines, the side projects and the degree.
- **The print page:** `pages/resume/[role].astro`, which the build prints and then removes.
- **The printer:** WeasyPrint 70.0 and its packages, pinned by hash in `scripts/site/resume/requirements.txt`, run by `print.py`.

## Assumptions

- The pinned Playwright container keeps Python 3.12 and Pango, which WeasyPrint needs. A new container digest is checked by the same tests.
- US Letter fits the audience, which is mostly in the US. A4 readers print it scaled.

## Open questions

None. The file names and `/v2`'s PDF were asked on cards at Gate 1 (D140, D141).

## Decisions made while writing this spec

Tier 3, within D6, D134 and D137–D141:

- **The PDF prints what the page shows, and nothing more.** That's the plainest way to keep the site and the PDF from disagreeing. It's why RealPage and the enterprise IT years print as a heading with no bullets, as the page shows them as one dated line each, and why Bottle Rocket prints one claim.
- **Hopper's role lines print as an italic lead under its heading,** as the page puts them above the topics. The first one restates the title, so only its "remote" prints, in the heading (S2.5, issue #45).
- **Each Hopper topic prints under its title from the page,** such as "Capital One Travel: Disruption Assistance", as a small label.
- **The board's words are left out where no public claim stands behind them:** its summary paragraph, its "Remote", "Richardson, TX" and "DFW" labels, its "1,235 PRs in 4½ months" line, its skills section and its "Continued:" footer. The pull request lists them for Brad.
- **The look is the board's:** a serif body in the site's Charis SIL in place of the board's Newsreader, which the site doesn't ship, with Inter for labels, a ruled header, small-caps section headings and dates on the right. Each page's foot has "Brad Thome · bradthome.com" and "Page N of M".
- **PDF/A-2a** is the level that pairs with PDF/UA-1: PDF 1.7, tagged, with Unicode text. PDF/A-3 adds only attachments, and PDF/A-4 pairs with PDF/UA-2.
- **veraPDF runs in the `html` job,** beside html-validate, as the build's document validators. A new CI job would change spec 003's locked list of checks.
- **The links open in the browser,** with `type="application/pdf"`, rather than forcing a download.

## Changes to other specs

Specs 001–003 stay locked as they are.

- **Spec 010:** `ACTIONS.resume` now holds only the label, and its S2.3-era tests check that the link opens the page's PDF rather than LinkedIn. Its change log says so.
- **Spec 014:** S2.3's résumé link reads each page's PDF, as D141 replaces D136. Its change log says so.

## Changes since approval

- Changed on 2026-11-05, in issue #45, a light change Brad approved through the career session: Experience lists jobs newest first by start date in the PDFs only ([D142](../../docs/decisions/0142-the-resume-pdfs-list-jobs-newest-first.md)), and a claim that restates its job's title doesn't print the title again (S2.5). S1.3 and S2.1 say so.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/015/`. Spec 001's traceability check confirms it, and CI runs it. This spec's tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: approved by Brad in the session on 2026-11-05, with the plan and mocks, on the recommended option of every card.
- Changed in spec 019 (slice 3.11), on 2026-11-06: v2.0 retires the release flag (D127) and moves the new home from `/v2` to `/` ([D162](../../docs/decisions/0162-the-new-home-moves-to-the-root-and-v2-redirects-there.md)). This spec's tests that expected a release build to leave phase 3 out, or named `/v2`, now expect the release build to be the same build as every other and read `/`.
- Changed in spec 022 (slice 4.3), on 2026-11-08: the release flag returns for the chat alone, so `release.yml`'s build step sets `BRADTHOME_RELEASE=1` again, and a release build leaves the chat out until v2.1 ([D190](../../docs/decisions/0190-a-release-flag-keeps-the-chat-off-live-until-v2-1.md)). This spec's test that expected no flag now expects only that one.

- Changed in spec 024 (slice 4.5), on 2026-11-09: the release flag comes back for interview prep alone until v2.2 (D190), set on `release.yml`'s build step only, so this spec's flag test allows that step and `scripts/site/release.ts`. Brad approved spec 024 at its Gate 1.
- Changed again for v2.2 (spec 024), on 2026-11-09: the release flag is gone again, so this spec's flag test is back to expecting no flag anywhere.
