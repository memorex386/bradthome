# Spec 043: Lighthouse measures the home as Firebase serves it

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full, with no mocks: nothing a visitor sees changes                                                                                                                                                                                                           |
| Status          | Approved                                                                                                                                                                                                                                                      |
| Slice           | 5.16 The 2.0 s phone LCP budget, won back (the later slice spec 041 promised, on Brad's card of 2026-11-17)                                                                                                                                                   |
| Branch          | `043-lighthouse-as-served`                                                                                                                                                                                                                                    |
| Gate 1          | Brad's cards of 2026-11-18: measure as Firebase serves, a 14,000-byte brotli budget for the home, the full track with no mocks. Spec and plan approved the same day                                                                                           |
| Mocks and flows | None: the page doesn't change                                                                                                                                                                                                                                 |
| Plan            | [plan.md](plan.md), approved with this spec at Gate 1                                                                                                                                                                                                         |
| Decisions       | D245, Lighthouse CI serves the build as Firebase Hosting serves it; D246, a 14,000-byte brotli budget for the home's HTML. It amends [D30](../../docs/decisions/0030-success-criteria-for-quality-and-process.md)'s note and spec 003's FR-012, back to 2.0 s |

## Summary

On 2026-11-17 main's Lighthouse job went red at a phone LCP of 2.04 s against spec 003's 2.0 s budget, after spec 041's VINDecoded card took the home's gzipped HTML past the roughly 14.6 KB that the first network round trip carries. Brad raised the budget to 2.1 s and asked for a later slice to win the 2.0 s back. This is that slice.

Measured on main `b7b5cc4` (v2.12, with spec 042's section) on 2026-11-18: Lighthouse CI's static server compresses only with gzip, so the home leaves it as about 16.6 KB, and LCP is 2.03 s. But bradthome.com serves Chrome the same page with brotli, as 13,099 bytes, inside the first round trip. Served with brotli to the same phone profile, the unchanged build measures 1.94–1.95 s. The page is fast for visitors; the measurement wasn't the page they get.

On Brad's cards of 2026-11-18, Lighthouse CI fetches the build from a small server in the repo that compresses as Firebase Hosting does, the LCP budget goes back to 2.0 s, and a test holds the home's HTML to 14,000 bytes with brotli, so the next slice that grows the page fails a fast test before Lighthouse goes red.

## Scope

**In:**

- A static server for the built site, `scripts/site/serve.ts`, that compresses each response as Firebase Hosting does.
- `lighthouserc.json`: Lighthouse CI starts that server and loads the home and the essay from it, and the LCP budget is 2.0 s.
- A test that builds the site and holds the home's HTML to 14,000 bytes with brotli.
- Spec 003's FR-012, its change note and its relocked `tests/003/static/lighthouse.test.ts`; D30's note; records D245 and D246; slice 5.16 in `docs/plan.md`; the ci / lighthouse line in `AGENTS.md`; the Lighthouse URL pins in specs 006's, 007's and 010's tests.

**Out:**

- Any change to the page, its markup, its sparkles' questions (D230) or its motion. The hero's third word still rises in after 0.6 s, which is most of the LCP.
- Slimming the HTML: the sparkle sprite, building questions at click, icon sprites and moving Hopper's diagrams out. Brad chose not to, for now; the byte budget says when it's needed.
- Firebase's response headers in the server. Lighthouse never read them under the old static server either, and spec 003's e2e checks them on the Firebase emulator.
- The e2e tests' server, which stays the Firebase emulator. It serves brotli at a much lower quality than production (15,766 bytes for the home), so it can't stand in for Lighthouse's.
- A release. The slice lands on main and `next`; bradthome.com doesn't change.

## User stories and acceptance scenarios

### Story 1: Lighthouse loads the page as a visitor's phone gets it (P1)

Brad wants the Lighthouse budget to measure the page bradthome.com serves, so a red job means a slower page for visitors, not a difference between servers.

**Why this priority:** it's what Brad chose, and it's what wins the 2.0 s back.

**Independent test:** start the server over a built site and request each kind of file with and without `br` and `gzip` in `Accept-Encoding`.

- **S1.1** Given the built site, when a request for the home accepts `br`, then the server answers with `Content-Encoding: br`, compressed at brotli's highest quality, and `Vary: Accept-Encoding`; and the body decompresses to the built `index.html`, byte for byte.
- **S1.2** Given a request that accepts `gzip` and not `br`, then the server answers gzip; and given one that accepts neither, then it answers the file as built, with no `Content-Encoding`.
- **S1.3** Given a stylesheet, a script, an SVG, JSON or text, then it's compressed as the home is; and given a font or an image, then it's served as built, with no `Content-Encoding`, as Firebase serves them.
- **S1.4** Given a path to no file, or one that leaves the built site, then the server answers 404 and reads nothing outside `apps/site/dist`.
- **S1.5** Given `pnpm site:lighthouse`, then Lighthouse CI starts the server, waits for its ready line, loads the home and the essay from it at `127.0.0.1` and a fixed port, the one address it listens on, and stops it when the runs end.

### Story 2: The 2.0 s budget is back (P1)

**Why this priority:** spec 041 lent the 100 ms on the promise of this slice.

**Independent test:** read `lighthouserc.json` and spec 003's locked test, and run `pnpm site:lighthouse` on the build.

- **S2.1** Given `lighthouserc.json`, then its LCP assertion is an error at a median above 2,000 ms, and every other budget is as spec 003 sets it.
- **S2.2** Given spec 003's locked Lighthouse test, then it reads 2,000 ms, and the lock matches it.
- **S2.3** Given the build, when `pnpm site:lighthouse` runs, then every budget passes, with the home's median LCP at 2.0 s or less.
- **S2.4** Given the home padded so its HTML no longer fits the first round trip with brotli, when `pnpm site:lighthouse` runs, then the LCP budget fails and names the home (a planted failure, run once and recorded in the plan).

### Story 3: A fast test says when the home's HTML is too big (P2)

**Why this priority:** brotli leaves about 0.9 KB under the budget, and the last two content slices each added about 1 KB gzipped.

**Independent test:** build the site and compress the home's HTML.

- **S3.1** Given a build, when the tests run, then a test compresses `index.html` with brotli at its highest quality and fails when it's over 14,000 bytes, saying the size, the budget, and what to do.
- **S3.2** Given the home padded past 14,000 bytes, then that test fails (a planted failure, run once and recorded in the plan).

## Edge cases

- Chrome sends `br` only to secure origins: `127.0.0.1` counts as one, and Lighthouse's Chrome sends `gzip, deflate, br, zstd` to the server. The URLs name `127.0.0.1`, not `localhost`, which Chrome may try on IPv6 first, where another process could answer in the server's place. Covered by S1.5 and SC-002.
- `zstd` isn't served: Firebase serves Chrome brotli. Covered by S1.1.
- A request with a query string: the server ignores it. Covered by S1.4.
- The port is taken: the server exits with a line saying so, and Lighthouse CI's start fails with it. Covered by FR-001.
- The role pages (`/mobile`, `/fullstack`, `/ai`) are the home with a track lit and its own words, at 13,697, 13,606 and 13,423 bytes with brotli on 2026-11-18, also inside the first round trip. Lighthouse doesn't load them, and the budget reads the home alone, as Brad chose. Covered by FR-005.

## Functional requirements

- **FR-001** `scripts/site/serve.ts` MUST serve `apps/site/dist` on `127.0.0.1` at a fixed port, print one ready line once it listens, and exit with a message when it can't listen.
- **FR-002** The server MUST compress HTML, CSS, JavaScript, SVG, JSON and text with brotli at its highest quality when the request accepts `br`, with gzip when it accepts `gzip` and not `br`, and not at all otherwise, with the file's content type and `Vary: Accept-Encoding`.
- **FR-003** The server MUST send fonts and images as built, with no `Content-Encoding`, and MUST answer 404 to any path that isn't a file inside `apps/site/dist`.
- **FR-004** `lighthouserc.json` MUST start the server through Lighthouse CI's own start command, load the home and the essay from it, keep five runs on the phone profile, and assert LCP at a median of 2,000 ms, with spec 003's other budgets unchanged.
- **FR-005** A test MUST build the site and fail when the home's `index.html`, compressed with brotli at its highest quality, is over 14,000 bytes, with a message naming the size, the budget, and the fix.
- **FR-006** Spec 003's FR-012 and its change note, its relocked test, D30's note, records D245 and D246, `docs/plan.md`'s slice 5.16 and `AGENTS.md`'s ci / lighthouse line MUST say what this slice changes.

## Success criteria

- **SC-001** On a phone profile, the home's median LCP over five lab runs is 2.0 s or less, in the local run and in main's CI after the push.
- **SC-002** The home's HTML as the server sends it to Lighthouse is within 1% of the bytes bradthome.com sends Chrome for the same content (13,099 on 2026-11-18).
- **SC-003** The home's HTML compressed with brotli is 14,000 bytes or less.

## Assumptions

- Production compresses as measured on 2026-11-18: the home as 13,099 bytes and the essay as 12,692 with brotli, where the server's brotli at quality 11 gives 13,116 and 12,690; fonts and images not compressed.
- Lighthouse CI's start command runs with the repo as its working folder, as `pnpm site:lighthouse` runs it.

## Open questions

None.

## Decisions made while writing this spec

- Tier 1: D245, measure as Firebase serves; D246, the home's byte budget (Brad's cards of 2026-11-18).
- Tier 3: the port is 4180, which nothing else in the repo uses. The server is Node's own `http` and `zlib`, with no new dependency. It keeps each compressed file in memory, since each run asks for the same few files. The byte budget's test builds into `node_modules/.cache`, as spec 022's build test does. The slice proves the changed Lighthouse job with planted failures run locally and main's own CI run after the push, rather than the sandbox, since the job's workflow doesn't change.

## Traceability

Every S, FR and SC ID above appears in at least one test's name. The traceability check lists this spec until it has a lock, and doesn't fail.

## Approval

- Gate 1: approved by Brad on 2026-11-18, on the session's card, with the spec.
