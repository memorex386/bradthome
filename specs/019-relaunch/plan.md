# Plan for spec 019: The v2.0 relaunch

|        |                                                    |
| ------ | -------------------------------------------------- |
| Spec   | [spec.md](spec.md), for approval with it at Gate 1 |
| Status | Approved                                           |

## Approach

- **The home (FR-001, D162).** `pages/index.astro` renders `HomePage role="all"`. `pages/v2.astro` goes. `roles.ts`'s `HOME_HREF` becomes `/`, so the role switch, the header and the footer link the home there, and `/privacy`'s header sections become `/#hopper` and so on. `firebase.json` gains `redirects: [{ source: "/v2", destination: "/", type: 301 }]`. Spec 003's firebase test asks only that `rewrites` stay empty, so a redirect fits.
- **No flag (FR-002, S4).** `scripts/site/release-pages.ts` and its integration in `astro.config.mjs` go. `resume-pdfs.ts` drops its release branch, so every build prints the PDFs. `release.yml` drops `BRADTHOME_RELEASE`.
- **The release build (FR-003).** `release.yml` gets a `tag` job on the runner, which checks the tag with the whole history as today, and a `build` job in the pinned Playwright container by digest, which installs WeasyPrint with `pnpm printer:install`, builds and runs `pnpm csp --check`, step for step as `ci / build`. The container is where CI's hashes are made, so the committed CSP matches the release's scripts. Stage and release don't change.
- **Link-preview tags (S1.5).** `DesignBase.astro` adds v1's share tags when a page passes `canonical`: the home and the role pages. The gallery and `/privacy` pass none.
- **Indexing (FR-004).** `DesignBase` keeps noindex on by default; the home turns it off. The essay stays on v1's `Base.astro` with no noindex, as today. `public/robots.txt` allows everything and names the sitemap; `public/sitemap.xml` is a static file listing `/` and `/vindecoded-agents`. It's static so the site's source names no new outside address (spec 003's FR-006): the sitemap's XML namespace is a URL.
- **The essay (FR-005, D163).** Only `title:` in its front matter changes. `Essay.astro` already makes the heading's hyphens non-breaking.
- **The pre-release check (FR-006).**
  - `wordsMayChange` becomes the list of word pages that may change. `wordsMayChangeOf()` reads the workflow's choice: `none`, `home`, `home-and-essay`, and the old `true` as both. The CLI takes `--words-may-change` for both and `--home-words-may-change` for the home.
  - `TITLE_CHANGES` names the essay's old and new title. Before comparing, the live page's words read the old title as the new one, with plain or non-breaking hyphens. Nothing else may differ.
  - `ADDED_SOURCES` lets `connect-src` add `https://gateway.umami.is`, and nothing else, beyond live's sources (D159). v1.0.0's policy has no `connect-src`, so without it the check reads the host as loosening `default-src 'self'`.
- **Lighthouse.** `lighthouserc.json` measures `/` and the essay. `/v2` goes. A role page isn't added, since its noindex fails the SEO category by design. Spec 010's zero layout shift budget moves from `/v2` to `/`.
- **Spec 003 (FR-007, D167, Brad's card).** Spec 003's Story 1 checks v1's home at `/`: its words, v0's colors, no script, the Tab order, and P1–P4 snapshots. That page is gone. The recommendation is that they move to the essay, which keeps v1's layout, tokens and fonts (D121), so the foundation spec 003 built stays checked; specs 009–018 already check the new home. `tests/003/helpers/site.ts`, `e2e/page.test.ts`, `e2e/visual.test.ts`, `static/site.test.ts` and any other spec 003 test that reads `/` change with it, the 003 baselines are remade, and `pnpm lock` relocks spec 003.
- **Other phase 3 tests.** Every test that visits `/v2`, imports `release-pages.ts` or expects a release build to drop something changes to the new truth: `/` for `/v2`, and "a release build is the same build" for the drops. Spec 007's tests of v1's home retire with the page, and spec 006's title expectation follows D163. Baselines that move from `/v2` to `/` keep their pixels; new ones come from `pnpm test:visual --update` in the container.
- **Show it (before the push).** A container build goes on a preview channel, `v2-rc`, with the live `firebase.json` and Brad's Firebase login, for 7 days. Brad opens it on the phone. After the push, main deploys to `next` as always.
- **Rehearsal (S7.1).** With Brad's login and the repo's scripts, never the live channel: stage the container build on channel `rehearsal-v2-stage`, release it to channel `rehearsal-v2` with `release.ts --channel`, then `rollback.ts --channel rehearsal-v2 --version <v1.0.0's version>`, and prove by ETag that the channel serves v1.0.0's files. No grant on `release-deployer` is needed, so nothing in Google Cloud changes. The output goes in `docs/releases/v2.0.0-rehearsal.md`.
- **Release (S7.2–S7.4).** After the push, main's `ci` green, and Brad's go-ahead on a card: `git tag -a v2.0.0 origin/main` (unsigned, as Brad chose for this account), push the tag, run `release.yml` with `words-may-change=home`, and Brad approves in `production`. Then the post-release check from a machine: each page and PDF answers 200, `/v2` answers 301 to `/`, the headers match `firebase.json`, robots and the sitemap answer, and one visit from a browser shows one page view in Umami. Then `docs/releases/v2.0.0.md` and `gh release create v2.0.0`.

## Tests (traced to every ID)

- `tests/019/static/relaunch.test.ts`: S1.1–S1.5, S2.1–S2.3, S3.1, S4.1, S4.2, S6.1, FR-001–FR-005, SC-004, over the source, `firebase.json`, `release.yml` and a real build.
- `tests/019/unit/check.test.ts`: S5.1–S5.5, FR-006, against spec 008's fake sites.
- `tests/019/e2e/relaunch.test.ts`: S1.1, S1.2 (the emulator's 301), S1.5, S2.1–S2.3, S3.1 in a browser.
- `tests/019/static/records.test.ts`: S7.1, S7.4, FR-009, FR-010, once the records exist. S7.2, S7.3, SC-001–SC-003 and SC-005 are checked on the live site and recorded in `docs/releases/v2.0.0.md`.

## Decisions

| ID   | Decision                                                                       | Tier |
| ---- | ------------------------------------------------------------------------------ | ---- |
| D162 | `/` serves the new home and `/v2` redirects there with a 301                   | 1    |
| D163 | The essay's title is "Running a 1.4M-download product with AI agents"          | 1    |
| D164 | No photo at v2.0; one can come later as a content change                       | 1    |
| D165 | The design-system gallery goes live, unlinked and noindex                      | 1    |
| D166 | Hopper's Oct 2026 end date goes public with v2.0, as the site and PDFs show it | 1    |
| D167 | Spec 003's page checks move to the essay                                       | 1    |
| D168 | The home and the essay are indexable                                           | 1    |

Tier 3, inside this spec: the release build's container job, the check's choice input, `TITLE_CHANGES` and `ADDED_SOURCES`, the static sitemap, and the share tags on `DesignBase`.

## Risks

- **The release build differs from CI's.** Fixed by FR-003: the same container, steps and CSP check.
- **The 301 and Hosting's clean URLs.** The e2e test reads the emulator's answer, and the post-release check reads live's.
- **Analytics' first real request is on live (D156).** The post-release check sends one visit and reads Umami; if no view shows, it's a report, not a rollback, since nothing visible breaks.
