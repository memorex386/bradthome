# Spec 020: The corpus

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

| | |
| --- | --- |
| Track | Full |
| Status | Approved at Gate 1, 2026-11-07 |
| Slice | 4.1 Corpus |
| Branch | `claude/020-corpus-11a253`, pushed to main after Brad says push (D161) |
| Mocks | [mocks/README.md](mocks/README.md): sample excerpts of both files, and every source ID with its page link |
| Plan | [plan.md](plan.md), for approval with this spec at Gate 1 |
| Decisions | [D179](../../docs/decisions/0179-the-corpus-ships-on-live-now.md)–[D181](../../docs/decisions/0181-the-essay-goes-in-by-section.md), from this slice. It builds on D44, D108, D109, D135, D168 and D174. |

## Summary

"Ask about Brad" answers only from a public corpus, with a source for every claim (D174). This slice builds that corpus at build time from the content collections and the essay, as two files:

- `/corpus.json`, which the chat's API reads in slice 4.2.
- `/llms.txt`, the same sources in llmstxt.org's format, for any model that reads the site (D180).

Each source is one public fact. It has an ID that stays the same when its words change, and an absolute link to the page and anchor on bradthome.com where it shows. Only claims marked `public` get in, and the build fails on any other. A claim's closing note to the site is never exported. The essay goes in by section, so a citation lands on its heading (D181). Both files go live with the next release, v2.0.1, with no change to the sitemap or `robots.txt` (D179).

## Scope

**In:**

- `apps/site/src/corpus/`: `corpus.ts` builds the corpus and both files' text from plain data, `essay.ts` splits the essay into sections with fixed IDs, and `build.ts` reads the collections and the essay for the two endpoints.
- `apps/site/src/pages/corpus.json.ts` and `llms.txt.ts`, prerendered at build time as `dist/corpus.json` and `dist/llms.txt`.
- Tests in `tests/020/`: unit tests on the real content, a check that Astro's own content step refuses a planted non-public claim, static checks over the build when there is one, and end-to-end checks in the pinned container.

**Out:**

- The chat, its prompt and its API (slices 4.2 and 4.3).
- Indexing changes: the sitemap and `robots.txt` stay as D168 left them, and no page links either file.
- Sources beyond the content collections and the essay, such as the role pages, the résumé PDFs, the privacy note or the design system's gallery. Their facts are already claims, job files or project files.
- The essay's system diagram, a component rather than words. The prose around it goes in.
- Changing how the export script numbers claims (spec 005).

## The corpus's shape

`/corpus.json`, `version` 1. A change that would break a reader bumps it.

| Field | What |
| --- | --- |
| `version` | `1` |
| `name` | `Brad Thome` |
| `about` | The home page's description of Brad |
| `site` | `https://bradthome.com` |
| `contact` | `brad@bradthome.com` |
| `essay` | `{ title, url, author }`: the essay's title, its address, and `Brad Thome`, since its "I" is Brad |
| `sources` | Every source, as below: jobs newest first, then projects, then claims by subject and order, then the essay's sections in order |

Each source:

| Field | What |
| --- | --- |
| `id` | Stable. A claim's own ID, such as `hopper-disruption-assistance-1`; `job-` or `project-` and its file's name, such as `job-hopper`; or an essay section's fixed ID, such as `essay-dark-launch` |
| `kind` | `claim`, `job`, `project` or `essay` |
| `label` | How the chat names it, as the chat designs do: `Résumé · Hopper, Disruption Assistance`, `Essay · New features ship dark` |
| `text` | The fact, as written, less any note to the site |
| `url` | `https://bradthome.com` plus the page and anchor where it shows |
| `evidence` | The public pages behind a claim, or a project's own site. Empty otherwise |

Where each source links:

| Source | Anchor |
| --- | --- |
| A claim with a receipt on the home | `/#receipt-<id>` |
| Another Hopper claim | Its topic's heading, `/#hopper-<topic>`, or `/#hopper` |
| Another job claim | Its job's card or line, `/#experience-<job>` |
| The degree | `/#experience-education` |
| Another project claim | Its project's card, `/#side-<project>` |
| A job | `/#hopper` for Hopper, else `/#experience-<job>` |
| A project | `/#side-<project>` |
| An essay section | `/vindecoded-agents#<heading's anchor>` |

`/llms.txt` follows llmstxt.org: an H1 with Brad's name, a blockquote with the same description, a paragraph on how to cite, then `## Résumé`, `## Essay: <title>` and `## Optional`. Every source is one list item, `- [label](url): ID \`id\`. text`, with the text on one line.

## User stories and acceptance scenarios

### Story 1: Only public facts get in (P1)

A wrong or private claim about Brad is the chat's main risk (D174), so the corpus must hold public facts and nothing else.

**Independent test:** build the corpus from the real content, then from content with one planted fault.

- **S1.1** Given the committed content, when the site builds, then `dist/corpus.json` and `dist/llms.txt` exist, and every public claim is one source in each, under its own ID.
- **S1.2** Given a planted claim marked `interview`, `private` or nothing, when Astro loads the content, then the build fails and names the claim; and given the same claim, `corpusOf` throws, so the corpus never depends on one check alone.
- **S1.3** Given `bookshout-1`, `realpage-1` and `vindecoded-7`, then neither file holds their closing note to the site, and each keeps the words before it.
- **S1.4** Given one of those claims re-exported so that it no longer ends with its note, then the build fails until `SITE_NOTES` is read and updated.
- **S1.5** Given a new claim whose words read as a note to the site ("the site", "never say" and the like) and that has no entry in `SITE_NOTES`, then the build fails.
- **S1.6** Given the built files, then the private-term scan finds nothing, and neither holds a machine path, a phone number or an email address other than brad@bradthome.com.

### Story 2: Every source links to where it shows (P1)

The chat opens a source in place and links it (D174), so every link must land on the fact.

- **S2.1** Given every source, then its `url` is on `https://bradthome.com`, its path is a page the build has, and its anchor is an element ID on that page.
- **S2.2** Given a claim with a receipt on the home, then it links `/#receipt-<id>`; given any other source, then it links the place the table above names.
- **S2.3** Given each essay section, then it links its heading's anchor on `/vindecoded-agents`.

### Story 3: IDs stay the same (P1)

The chat cites IDs, and slice 4.4's frozen eval cases name them, so a reworded fact must keep its ID.

- **S3.1** Given any claim's or essay section's words changed, then every source keeps its ID.
- **S3.2** Given an essay heading renamed along with its `ESSAY_SECTIONS` entry, then its section keeps its ID and its link follows the new anchor. Given a heading with no entry, or an entry no heading has, then the build fails.
- **S3.3** Given the IDs this slice ships, then each one is still in the corpus. A source that disappears fails a test until the test's list is changed on purpose.
- **S3.4** Given every source, then its ID is unique and is lowercase words joined by hyphens.

### Story 4: Both files validate (P1)

- **S4.1** Given `/corpus.json`, then it parses against the strict schema in the test, with `version` 1 and no field the table doesn't name.
- **S4.2** Given `/llms.txt`, then its first line is the H1, the blockquote follows, its sections are the three H2s in order, and every line in the first two is a list item in llmstxt.org's link form.
- **S4.3** Given both files, then they hold the same sources, in the same order, with the same IDs, links and words, and `llms.txt`'s item for a source holds its text on one line.
- **S4.4** Given the built site served as Hosting serves it, then `/corpus.json` answers 200 as `application/json` and `/llms.txt` answers 200 as `text/plain`, both with the site's security headers.

### Story 5: Nothing else changes (P2)

- **S5.1** Given the build, then `sitemap.xml` and `robots.txt` are unchanged, and no page links either file (D179).
- **S5.2** Given the build, then the corpus's estimated size, its characters over 4, is under 15,000 tokens, and the plan reports today's figure.

## Requirements

- **FR-001** The build MUST write `/corpus.json` and `/llms.txt` from the jobs, projects and claims collections and the essay's source.
- **FR-002** The corpus MUST hold only claims marked `public`, and the build MUST fail on any other, both in Astro's content step and in `corpusOf`.
- **FR-003** The corpus MUST cut each claim's note to the site, and the build MUST fail when a listed claim no longer ends with its note, or an unlisted claim reads like one.
- **FR-004** Each source MUST have an ID that doesn't change when its words do: the claim's ID, `job-` or `project-` and its file's name, or the essay section's fixed ID.
- **FR-005** Each source MUST link an absolute `https://bradthome.com` address whose page the build has and whose anchor is on that page.
- **FR-006** `/corpus.json` MUST follow the shape above, with `version` 1.
- **FR-007** `/llms.txt` MUST follow llmstxt.org's format and hold the same sources as `/corpus.json`.
- **FR-008** Neither file MAY hold a private term, a machine path, a phone number or an email address other than brad@bradthome.com.
- **FR-009** The essay MUST go in by section, each with a fixed ID and its heading's anchor, and the corpus MUST say the essay is Brad's own, in the first person.
- **FR-010** The slice MUST NOT change the sitemap, `robots.txt` or any page.

## Success criteria

- **SC-001** Every source's link resolves to a page and an anchor in the build: 60 of 60 today.
- **SC-002** Each kind of planted fault fails the build: a claim marked otherwise, a moved note, an unlisted note, an essay heading with no ID.
- **SC-003** The corpus is under 15,000 estimated tokens. Today it's about 11,000 for the JSON and 9,200 for `llms.txt`.
- **SC-004** The term scan over both built files finds nothing.

## Edge cases

- The export numbers a subject's claims by their place in Brad's notes (spec 005), so a bullet added above others renumbers those below it. The IDs stay stable through any rewording. S3.3 catches an ID that disappears, and slice 4.4's frozen cases would catch one that moved. Changing the numbering is out of scope.
- A claim moved off the home's cards keeps its ID, and its link falls back to its job's, project's or topic's place.
- The essay has a system diagram, which is a component. Its section's prose goes in, and the diagram doesn't.
- The essay's tables and code blocks go into `corpus.json` as Markdown, and onto one line in `llms.txt`.
- Previews and `next` serve the same files, whose links name bradthome.com, the canonical site.
- The release check (spec 008) compares the paths live serves today, so two new files don't trip it, and it needs no change.

No `[NEEDS CLARIFICATION]` markers remain: Brad answered the slice's three choices on cards on 2026-11-07.
