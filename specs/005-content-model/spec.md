# Spec 005: Content model

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Approved |
| Slice | 2.3 Content model |
| Branch | `005-content-model` |
| Mocks and flows | None: nothing a person sees changes, so "Show it" is skipped ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)). The flow is under "How it fits together". |
| Plan | [plan.md](plan.md), approved with this spec at Gate 1 |
| Decisions | [D108](../../docs/decisions/0108-the-content-export-script-lives-in-the-site-repo.md) and [D109](../../docs/decisions/0109-jobs-and-projects-are-written-by-hand-claims-are-exported.md), from this slice's interview. It builds on [D2](../../docs/decisions/0002-lead-as-a-senior-mobile-and-full-stack-engineer.md), [D8](../../docs/decisions/0008-give-earlier-roles-space-by-relevance.md), [D38](../../docs/decisions/0038-content-in-astro-content-collections.md), [D44](../../docs/decisions/0044-an-export-script-brings-public-facts-in.md), [D67](../../docs/decisions/0067-public-records-for-the-career-decisions.md) and [D68](../../docs/decisions/0068-paraphrase-brads-notes-in-public-records.md). |

## Summary

The site's words come from Brad's private career notes, where every fact is one bullet tagged `public`, `interview` or `private`. This slice gives those facts a typed home in the site and a safe way in. Three Astro content collections hold jobs, projects and claims, as D38 set out, and each claim carries its evidence links. Jobs and projects are short files written by hand, with the positioning in them (D109). Claims come from `pnpm content:export`, a repo script that reads the notes folder Brad names and copies only the bullets tagged `public` (D108). The schemas are strict, so the build fails on an unknown field, on a claim that isn't marked public, on a claim whose job or project doesn't exist, and on a machine path. Slices 2.5, 3.x and 4.1 read this model, and none of them renders it yet: the page stays as it is.

## Scope

**In:**

- The collections `jobs`, `projects` and `claims` in `apps/site/src/content.config.ts`, with their schemas in one module the export shares.
- The seeded jobs and projects, from résumé v2 and the positioning.
- `pnpm content:export`, which writes `apps/site/src/content/claims.yaml` from the notes, scans it for private terms first, and prints a report with counts.
- The first export's claims, from the notes as they are on the day of the build.
- Docs: AGENTS.md's repo map, the plan's slice row, records D108 and D109, and D44's note.

**Out:**

- Rendering any of it. Slice 2.5 shows today's home content, and phase 3 the redesign.
- Education. It isn't a job or a project, so its bullet is reported as unmatched. It joins the model when a slice needs it, such as 3.7's PDFs.
- `/corpus.json` and `llms.txt` (slice 4.1).
- Changing a fact's tag in the notes. Facts the site may need that aren't tagged public are listed for Brad in the pull request.

## How it fits together

1. Brad, or the agent with Brad's go-ahead, runs `pnpm content:export --notes <folder>` on Brad's PC. The folder can come from `BRADTHOME_NOTES` instead.
2. The script reads each topic file in the folder, never `raw/`, and splits it into bullets with their tags.
3. It keeps the bullets tagged exactly `public`, and attaches each to the job or project its nearest heading names.
4. It builds the claims, checks them with the site's schemas and the private-term list, and only then writes `claims.yaml`.
5. The change goes through the loop as a pull request. Every build checks the content again with the same schemas.

## User stories and acceptance scenarios

### Story 1: Only public facts come in (P1)

Brad wants the site to read facts from the notes without a private or interview fact ever reaching the public repo.

**Why this priority:** the repo is public and its history is permanent, so a leak can't be undone.

**Independent test:** run the export over made-up notes that use every kind of tag, and compare what it writes.

- **S1.1** Given notes with bullets tagged `public`, `interview` and `private`, bullets with no tag, and bullets whose tag isn't one of the three words, when the export runs, then the claims file holds exactly the public bullets, and nothing from the others.
- **S1.2** Given a public bullet whose source holds a link and other text, such as a file path, when the export runs, then the claim's evidence holds the link, and no other text from the source is written.
- **S1.3** Given a public bullet under headings that name no job or project, when the export runs, then it isn't written, and the report counts it under its heading.
- **S1.4** Given notes whose public text holds a private term, when the export runs, then it writes nothing, exits with an error, and reports the line without the term.
- **S1.5** Given no notes folder, from the argument or the environment variable, or a folder that doesn't exist, when the export runs, then it writes nothing and says how to name one.
- **S1.6** Given the same notes, when the export runs twice, then both runs write the same file, byte for byte.
- **S1.7** Given a `raw/` folder in the notes, when the export runs, then it reads nothing from it.

### Story 2: The build refuses content that doesn't fit (P1)

Brad wants any mistake in the content, by hand or by script, to stop the build rather than reach the site.

**Why this priority:** the build is the last check before a deploy, and it runs on every pull request.

**Independent test:** sync a copy of the site's content with one planted fault at a time.

- **S2.1** Given a job, project or claim with a field the schema doesn't name, when the site builds, then the build fails and names the entry.
- **S2.2** Given a claim marked `interview` or `private`, or with no mark, when the site builds, then the build fails.
- **S2.3** Given a claim whose job or project doesn't exist, when the site builds, then the build fails.
- **S2.4** Given a claim, job or project whose text holds a machine path, such as a Windows drive path or a home folder, when the site builds, then the build fails.
- **S2.5** Given the content this slice commits, when the site builds, then the build passes and the page is unchanged.

### Story 3: The seeded content follows the positioning (P2)

Brad wants the model's jobs and projects to say how much space each gets, so later slices don't decide it again.

**Why this priority:** slices 2.5 and 3.x read it, but nothing renders it yet.

**Independent test:** read the seeded files.

- **S3.1** Given the seeded jobs, when they're read, then Hopper is the only `story`, dated April 2022 to October 2026, and first for every role.
- **S3.2** Given the seeded projects, when they're read, then VINDecoded is a side-project `card` and Sudoku World a `small` card, and neither is a job or a story.
- **S3.3** Given the seeded jobs, when they're read, then Bleacher Report is `featured`, Bottle Rocket and BookShout are `card`s, RealPage is one dated `line`, and Harley-Davidson and Infosys share one `line`, enterprise IT from 2008 to 2015.
- **S3.4** Given every seeded job and project, when it's read, then it gives an order for each role it appears under, `mobile`, `fullstack` or `ai`, and no two entries of the same kind share an order in a role.

## Edge cases

- A bullet that runs over several lines, with a nested list, and its tag at the end: one claim, with the list kept. Covered by S1.1 and FR-010.
- A tag with extra words, such as "public on the site; not on LinkedIn": not exactly `public`, so it's dropped and counted. Covered by S1.1 and FR-009.
- A public bullet under "Open questions" or another topic heading inside a job's file: it belongs to that job, with the topic noted. Covered by FR-011.
- Two runs after a bullet is added in the middle of a topic: the later claims in that topic get new IDs. Slices that link to a claim by ID re-check after an export. Covered by FR-012.
- A link with `http:` instead of `https:`: not evidence, and the report counts it. Covered by FR-010.
- The notes hold a job that has no file in the repo yet: its public bullets are reported as unmatched until the job's file is written (D109). Covered by S1.3.
- The private-term list isn't found: the export stops, as the hooks do. Covered by FR-013.

## Functional requirements

- **FR-001** `apps/site/src/content.config.ts` MUST define three collections: `jobs` from `src/content/jobs/*.yaml`, `projects` from `src/content/projects/*.yaml`, and `claims` from `src/content/claims.yaml`, keyed by ID.
- **FR-002** Every schema MUST be strict: an entry with a field the schema doesn't name MUST fail validation, and so the build.
- **FR-003** A job MUST have `company`, `title`, `start` and `end` (a `YYYY-MM` month, and `end` may be `present`), `display` (`story`, `featured`, `card` or `line`) and `roles`, an order for each of `mobile`, `fullstack` and `ai` it appears under. `summary`, one line of the job's own wording, is optional.
- **FR-004** A project MUST have `name`, `role`, `display` (`card` or `small`), `roles` as in FR-003, and `url`, an `https` link. `start` and `end` are optional months, as in FR-003.
- **FR-005** A claim MUST have `subject` (a job's or project's ID), `order` (its place within the subject), `text`, `evidence` (a list of `https` links, which may be empty) and `visibility`, which MUST be `public`. `topic`, the heading it came from inside the subject, is optional.
- **FR-006** The build MUST fail when a claim's `subject` names no job or project file.
- **FR-007** No text in any entry MUST hold a machine path: a Windows drive path such as `C:\`, or a home folder such as `/Users/` or `/home/`.
- **FR-008** `pnpm content:export` MUST take the notes folder from `--notes <folder>` or, when that's absent, `BRADTHOME_NOTES`, and MUST have no default. It MUST read only the `.md` files at the folder's top level, apart from `README.md`, and MUST NOT read `raw/`.
- **FR-009** The export MUST write a bullet only when its tag's last part is exactly `public`. A bullet with any other tag, or none, MUST be dropped.
- **FR-010** A claim's `text` MUST be the bullet as written, without its tag, with any nested list kept. Its `evidence` MUST be the `https` links in the tag's source. No other text from the source MUST be written.
- **FR-011** A bullet's subject MUST be the nearest heading above it, of level 1 or 2, whose name before any ` · ` matches a job's or project's ID once lowercased and hyphenated. A heading between them gives the claim's `topic`. A public bullet with no matching heading MUST NOT be written, and MUST be counted in the report.
- **FR-012** Claim IDs MUST be `<subject>-<n>`, or `<subject>-<topic>-<n>` with a topic, numbered from 1 in the notes' order, and the file MUST list them in the notes' order with stable formatting, so the same notes give the same bytes.
- **FR-013** Before writing, the export MUST check its output with the site's own schemas and scan it with the private-term list. If either fails, or the list isn't found, it MUST write nothing and exit with an error. A term found MUST be reported by line, never by its text.
- **FR-014** The export MUST print a report with the number of claims written per subject, the number of bullets dropped by tag (`interview`, `private`, none, other) and by reason (no matching heading, `http` link), and nothing of a dropped bullet's text.
- **FR-015** No path to the notes, and no notes file or text other than the public claims, MUST enter the repo. The tests MUST use made-up notes only.
- **FR-016** The seeded jobs and projects MUST follow the positioning in S3.1 to S3.4, and Hopper's end MUST be a single value in one file, so it's a one-line change.

## Success criteria

- **SC-001** Over made-up notes with every kind of tag, the claims written equal the public bullets exactly: none missing, none extra.
- **SC-002** Every planted fault in S2.1 to S2.4, one at a time, fails `astro sync`, and the committed content passes it.
- **SC-003** Over Brad's real notes on the day of the build, every claim written comes from a bullet tagged `public`, `pnpm terms` and gitleaks pass on the written file, and the pull request lists the counts, without the dropped facts.
- **SC-004** The site's build output is the same before and after this slice, apart from Astro's own content cache, so the page, its checks and its budgets are unchanged.

## Key entities

- **Job:** a role Brad held, with dates, how much space it gets, and its order per role.
- **Project:** a side project, with its link, how much space it gets, and its order per role.
- **Claim:** one public fact about a job or project, with its evidence links. It's the unit later slices render and the chat cites.
- **Notes:** Brad's private topic files outside the repo. One bullet per fact, each ending in a tag `*(source · who may see it)*`.
- **Report:** the export's printed summary of what it wrote and what it dropped, by count.

## Assumptions

- The notes keep the format their README gives: one bullet per fact, the tag at the bullet's end, and `·` between the source and who may see it.
- Hopper's end is October 2026, which D67 made public. The brief's open question (Present or October 2026) is a one-line change to `jobs/hopper.yaml` (FR-016).
- Job dates come from résumé v2, as the notes' headings give them. D109 accepts that they live in two places.

## Open questions

None.

## Decisions made while writing this spec

- Tier 1: [D108](../../docs/decisions/0108-the-content-export-script-lives-in-the-site-repo.md) the export lives in the repo, [D109](../../docs/decisions/0109-jobs-and-projects-are-written-by-hand-claims-are-exported.md) jobs and projects are hand-written.
- Tier 3: claims keep only links from their source, not the source's wording, so no file name or path in a source can leak. Evidence must be `https`. Claims sit in one generated YAML file so a re-export is one reviewable diff. Every seeded entry appears under all three roles in reverse date order for now, with Hopper first; slice 3.6 tunes the orders. Locations are left out, since nothing needs them yet.

## Traceability

Every S, FR and SC ID above appears in at least one test's name in `tests/005/`. The traceability check fails the build if one doesn't. These tests aren't locked ([D101](../../docs/decisions/0101-a-lighter-loop-one-session-and-two-gates.md)).

## Approval

- Gate 1: approved by Brad, with the plan, in the slice 2.3 session on 2026-11-03 ([recorded on the pull request](https://github.com/memorex386/bradthome/pull/26#issuecomment-6621633273)).
