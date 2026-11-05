# Plan for spec 015: Résumé PDFs

|        |                                         |
| ------ | --------------------------------------- |
| Spec   | [spec.md](spec.md), approved with it at Gate 1 on 2026-11-05 |
| Status | Approved |

## Approach

The page already knows what each role shows. The PDF reuses that knowledge, prints it with an industry-standard HTML-to-PDF engine that writes the two standards natively, and checks them with the standards' own validator.

- **The résumé (FR-001–FR-003, S1.2–S1.4, S2.1–S2.4).** `components/resume/resume.ts`'s `resumeOf(role, content)` builds the résumé from the same collections and the same functions the sections use: `storyOf()` with `topicOrderOf(role)` for Hopper, Experience's `cardsOf()` and `lineDatesOf()`, and "On the side"'s `cardsOf()`, which already drops the site's rules. So a claim the page shows prints, a claim it treats as a note doesn't, and a claim it needs and can't find fails the build. `CONTACT`, `FILES`, `pdfHrefOf()`, `resumeHrefOf()` and `titleOf()` live there too.
- **The print page (FR-008, S1.5).** `pages/resume/[role].astro` renders the résumé as a plain HTML document, with `ResumeEntry.astro` for each job and project and `styles/resume/print.css` for the board's look: US Letter, 16-pixel Charis SIL body, Inter labels, and page numbers in the page margins. Its fonts are the site's own files, imported with `?url`.
- **Printing (FR-004, FR-009, S4.1–S4.4).** `scripts/site/resume-pdfs.ts`, an Astro integration beside `release-pages.ts`, runs when the build is done. On a release build it removes `dist/resume`. Otherwise it runs `scripts/site/resume/print.py`, which prints each page with WeasyPrint as PDF/A-2a and adds PDF/UA-1's identification to the same metadata, then removes the print pages. WeasyPrint loads only files inside `dist` and writes no dates or random IDs, so the same source prints the same bytes. Without WeasyPrint, a CI build fails and any other build warns and leaves the PDFs out.
- **The printer (FR-005).** `scripts/site/resume/requirements.txt` pins WeasyPrint 70.0 and its 12 packages by hash, for the container's Python 3.12. `pnpm printer:install` fetches pip's zipapp, pinned by version and hash, since the container has no pip, and installs the requirements with `--require-hashes` into `node_modules/.printer`.
- **CI (FR-005, FR-006, S4.5).** The build jobs in `ci.yml`, `preview.yml` and `next.yml` run in the pinned Playwright container, by digest, and run `pnpm printer:install` before `pnpm site:build`. The release workflow is unchanged: its build prints nothing. The `html` job runs `pnpm site:pdf`, a new `site-report` check that runs veraPDF's official image, `verapdf/cli` 1.30.3, by digest, against PDF/UA-1 and PDF/A-2a. `pnpm test:visual` installs the printer before it builds.
- **The links (FR-007, S1.1).** `Hero.astro`'s "Read the résumé" takes `resumeHrefOf(role)`, with `type="application/pdf"`. `hero.ts`'s `ACTIONS.resume` keeps only the label.
- **Docs (FR-010).** D137–D141, the plan's 3.7 row, AGENTS.md's CI and repo map lines, and the decision log.

### Why WeasyPrint (D50)

The brief asks for the industry-standard tool for printing HTML to PDF in the pinned container. Two were tried on this branch, against veraPDF 1.30.3:

| Tool                                    | PDF/UA-1                                                                  | PDF/A-2                                     | Notes                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Chromium's `page.pdf({ tagged: true })` | Fails: no PDF/UA identification, and link annotations without their tags | Fails: no output intent, no PDF/A metadata  | Already in the container, but neither standard without rewriting the PDF's structure     |
| WeasyPrint 70.0 (chosen)                | Passes, with the identification added to its metadata                    | Passes, as its own `pdf/a-2a` variant       | BSD-licensed, the standard open-source HTML-to-PDF engine, with PDF/A and PDF/UA built in |

WeasyPrint runs on the container's own Python 3.12 and Pango, which Chromium already needs, so **the pinned container needs no new image, only WeasyPrint's pip packages**, pinned by hash. Prince and other commercial engines also write both standards, but cost money and can't be checked in public.

## Tests

`tests/015/`, written from the scenarios, not locked:

- `static/resume.test.ts`: `resumeOf()` on the real content for each role: the claims and their order against the page's builders, Hopper's topic order and dates, the contact line, no phone number in any text or source, no site rule or note claim, a missing claim throwing, `titleOf()`, the file names and `resumeHrefOf()`; `Hero.astro` using it; `resume-pdfs.ts`'s print and clean steps on a planted dist, release and not; `astro.config.mjs` registering it; git holding no PDF.
- `static/printer.test.ts`: every requirement pinned by version and hash, pip pinned by hash, `print.py` writing PDF/A-2a with PDF/UA-1's identification and refusing anything outside the build, the three build jobs in the pinned container running `printer:install` before `site:build`, the release build untouched, the `html` job running `site:pdf`, veraPDF pinned by digest, and `site-report`'s veraPDF parsing and message.
- `e2e/resume.test.ts`, in the pinned container, against the served build: each PDF served as `application/pdf`; at most two pages; its text extractable and matching its résumé's claims in order; the contact line, Hopper's dates and no phone number; its title and its link annotations; each page's résumé button reaching its PDF; and two prints of the same source giving the same bytes.
- `pnpm site:pdf`, in CI's `html` job, for veraPDF (S3.1, SC-002).
- Specs 010 and 014's résumé-link tests, brought in line.

## What exists today

- The sections' builders: `storyOf()`, Experience's and "On the side"'s `cardsOf()`, `visibleText()` and `blocksOf()` (specs 011–013), and `topicOrderOf()` (spec 014).
- `release-pages.ts` and `BRADTHOME_RELEASE` (spec 010).
- The pinned Playwright container, which CI's e2e and Lighthouse jobs and `pnpm test:visual` use.

## Alternatives considered

| Option                                                         | Why not                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Chromium's print, then rewrite the PDF to pass both standards  | Rewriting a PDF's structure tree by hand is fragile and not standard practice                                     |
| Commit the PDFs and check them in CI                           | They could drift from the content between exports; the brief asks for the build to make them                      |
| A new `ci / pdf` job for veraPDF                               | It changes spec 003's locked list of checks; the `html` job already validates the build's documents               |
| A fourth "any role" PDF for `/v2`                              | Asked on a card (D141)                                                                                             |
| Print the board's summary and skills                           | No public claim stands behind them; they come in a later export                                                    |

## Risks

- **A new container digest drops Python or Pango.** The build fails in CI with WeasyPrint's error, not silently.
- **WeasyPrint's metadata code changes.** `print.py` adds the PDF/UA-1 identification to WeasyPrint's RDF; it's pinned to 70.0, and veraPDF fails the `html` job if the identification goes missing.
- **More claims overflow two pages.** The e2e test fails, and Brad chooses what to cut.
- **PyPI or PyPA is down.** The build job fails; a re-run fixes it.

## Tasks

- T001 `resume.ts`, `ResumeEntry.astro`, `[role].astro` and `print.css`.
- T002 `print.py`, `requirements.txt`, `printer.ts` and `resume-pdfs.ts`, registered in `astro.config.mjs`.
- T003 The hero's link.
- T004 The three build jobs, the `html` job's veraPDF step and `site-report`'s `pdf` check, and `visual.ts`.
- T005 `tests/015/`, and specs 010 and 014's link tests.
- T006 D137–D141, the plan's row, AGENTS.md and the decision log.
- T007 Review, then the pull request.
