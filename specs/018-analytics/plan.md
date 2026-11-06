# Plan for spec 018: Analytics

|        |                                                    |
| ------ | -------------------------------------------------- |
| Spec   | [spec.md](spec.md), for approval with it at Gate 1 |
| Status | Approved                                           |

## Approach

- **One source (S3.3).** `components/analytics/umami.ts` holds Umami's collection endpoint, `https://gateway.umami.is/api/send`, the website ID, the one production host, `bradthome.com`, and the event names and their allowed properties. The website ID isn't a secret: Umami's own snippet prints it in every page. It lives here, in the repo, because the sender is built into the site's module and the ID must match the one website in Brad's Umami account; changing accounts means changing this one line.
- **The sender (FR-001–FR-004, D155).** `components/analytics/analytics.client.ts`:
  - On load, `shouldSend()` checks the host is exactly `bradthome.com`, the ID is set, and neither `navigator.doNotTrack === '1'` nor `navigator.globalPrivacyControl === true`. Otherwise every call is a no-op and nothing is wired.
  - `send(name?, data?)` builds the payload from "What each request sends": `location.pathname`, the referrer's origin when it's another site's, `document.title`, `navigator.language` and `screen.width`×`screen.height`. It posts with `fetch(…, { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'content-type': 'application/json' } })`, keeps the answer's `cache` in a module variable for the `x-umami-cache` header, and swallows every error.
  - The page view goes once per load. `pageshow` with `persisted` sends nothing, so the back-and-forward cache doesn't double it.
  - `work-reached`: one `IntersectionObserver` on `#hopper` with a root margin of `-25%` at the bottom, disconnected after its first hit. A share of the section wouldn't do: the section is several screens tall on a phone, so a quarter of it never shows at once.
  - `resume-download` and `contact-click`: one delegated `click` and `auxclick` (middle button) listener on the document. A link whose path is `/resume/<file>.pdf` sends the role from `resume.ts`'s `FILES`; a link whose `href` starts `mailto:` sends `method: 'mailto'`. Keyboard Enter on a link fires `click`, so it's covered.
  - `track()` is exported for `email.client.ts`, which calls `track('contact-click', { method: 'copy' })` on every activation of Copy, before the clipboard call.
- **The one module (S4.2, D147).** `PreviewLink.astro`'s one `<script>` imports `../analytics/analytics.client.ts` beside the previews and the copy button, so Astro bundles all three into one external file under `_astro/`. Every phase 3 page loads it through the header's previewed profile links; a test checks each one, `/privacy` included. Spec 003's check of one `<script>` in `PreviewLink.astro` doesn't change.
- **The policy (FR-005, D159).** `scripts/site/csp.ts` adds a fixed `connect-src 'self' https://gateway.umami.is` to its base directives, after `form-action`, so `pnpm csp` writes it. Astro's meta tag names only `script-src` and `style-src`, so it doesn't need the host. Spec 003's FR-019 and S4.1 are amended to say exactly that host, `tests/003/unit/csp.test.ts`, `static/firebase.test.ts` and `e2e/headers.test.ts` check it, and `pnpm lock` relocks spec 003 once Brad approves.
- **The privacy note (FR-006).** `pages/privacy.astro` renders on `DesignBase` with the design system's header (`/v2`'s sections, as `/v2#hopper` and so on), one column of short sections in the essay measure, and the footer. Its words and facts live in `components/privacy/privacy.ts`, which takes the event names, properties, region and retention from `umami.ts`. `styles/privacy.css` is listed under `@source not` in v1's `tokens.css`, with the new folders, so v1's stylesheet doesn't change.
- **The footer (S5.1).** `ds/Footer.astro` adds a "Privacy" link to `/privacy` after the page's note, in the footer's quiet link style, with a 24-pixel minimum target.
- **Release (FR-007, S2.2).** `release-pages.ts` adds `privacy.html` to `PHASE_3_PAGES`. The sender sits in the `PreviewLink` bundle the release build already drops (spec 016).
- **Docs (FR-009).** D155–D159, the plan's 3.10 and setup rows, and its log.

## Why our own sender, not Umami's tracker

Brad's card (D155). Umami's standard snippet loads `https://cloud.umami.is/script.js` and posts to `https://gateway.umami.is/api/send`. It would add a host to `script-src` with no hash, since the file changes under us, so a change at Umami runs on every page. Copying the tracker here would pin it, but it needs its own `<script>` tag (it reads its settings from `document.currentScript`), so spec 003's one-script check changes too. Either way it sends what it decides: the full URL with the query string, and the full referrer. The industry standard (D50) still holds where it matters: Umami Cloud, and its documented collection API, which "you do not need to send an authentication token" for. The sender is about 60 lines in the module the site already ships.

## Where it runs

- The sender sends only when `location.hostname === 'bradthome.com'` (D156). Previews (`*.web.app`), `next`, `firebase emulators` and Playwright's `127.0.0.1` send nothing. A test website would need a second Umami website, which the free plan doesn't allow.
- A release build drops phase 3's pages and the module (D125–D127), so v1.x on live sends nothing. At v2.0 the new pages go live, on bradthome.com, and counting starts.
- Do Not Track and Global Privacy Control both turn it off (D157). Umami's own tracker honors only Do Not Track, with `data-do-not-track`.

## Sources, read on 2026-11-05

| Fact                                                                                                  | Source                                                                                     |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Hobby is free: up to 100K events a month, 1 website, 6 month data retention                           | [umami.is/pricing](https://umami.is/pricing), [Cloud FAQ](https://docs.umami.is/docs/cloud/faq) |
| US and EU data regions, chosen at account setup and read-only after                                   | [Cloud FAQ](https://docs.umami.is/docs/cloud/faq)                                          |
| No cookies, and no personal data collected                                                            | [umami.is/pricing](https://umami.is/pricing) FAQ, [docs FAQ](https://docs.umami.is/docs/faq) |
| Visitors counted by a hash of the website ID, IP address, User-Agent and a salt that rotates monthly  | [Metric definitions](https://docs.umami.is/docs/metric-definitions)                        |
| Visitor IP addresses aren't stored as fields in analytics records                                     | [umami.is/privacy](https://umami.is/privacy)                                               |
| Cloud's collection endpoint, the payload's fields, no token needed, and a real `User-Agent` required  | [Sending stats](https://docs.umami.is/docs/api/sending-stats)                              |
| The tracker's `cloud.umami.is/script.js` posts to `gateway.umami.is`, reads `umami.disabled` from local storage but never writes, and keeps `cache` in memory | `cloud.umami.is/script.js`, and `src/tracker/index.ts` in umami-software/umami |
| Umami's tracking is first-party to each website, with no cross-site profile; and this site loads no ad or other third-party script (spec 003's policy, D159) | [Cloud FAQ](https://docs.umami.is/docs/cloud/faq), [Metric definitions](https://docs.umami.is/docs/metric-definitions), and `firebase.json` |
| Do Not Track switch, and no Global Privacy Control switch                                              | [Tracker configuration](https://docs.umami.is/docs/tracker-configuration)                  |

The note claims only these. It makes no legal claim, such as "GDPR compliant": Umami's own docs say that depends on how a site uses it.

## The setup

- **Brad's hands:** creating the Umami Cloud account on the free Hobby plan, in the US region (D158), since agents don't create accounts, and signing in in Chrome.
- **Then, with Brad's yes on a card:** adding the website `bradthome.com` with domain `bradthome.com`, in the account's settings, from Brad's signed-in Chrome, and copying its website ID into `umami.ts`.
- Done on 2026-11-05: Brad made the account, in the US region, and with Brad's yes on a card the agent added the website `bradthome.com` in Brad's signed-in Chrome and copied its ID into `umami.ts`. No other setting changed. Until then the ID was an all-zero placeholder, which a static test refuses.

## Tests

`tests/018/`, written from the scenarios, not locked:

- `helpers/umami.ts`: the fake. Playwright routes `https://bradthome.com/**` to the local Hosting emulator, so the page runs on the production host with `firebase.json`'s headers, and answers `https://gateway.umami.is/api/send` with a body in Umami's documented shape (`{ "cache": "…", "sessionId": "…", "visitId": "…" }`), recording each request. Modes: answer, refuse with 500, and hang.
- `e2e/events.test.ts`: the page view on each page, with a query string and hash (S1.1); `work-reached` by scrolling, once, and on a tall screen at load (S1.2, S1.3); each PDF link by click, Enter and middle-click (S1.4); `mailto:` (S1.5); Copy granted and refused (S1.6); refuse and hang (S1.7); each body's exact keys (S3.2).
- `e2e/off.test.ts`: `127.0.0.1` and a `*.web.app` host send nothing (S2.1); Do Not Track and Global Privacy Control, set by an init script, send nothing (S2.3); cookies, local and session storage empty after everything (S3.1).
- `e2e/privacy.test.ts`: the footer link on each page (S5.1), the note's facts (S5.2), noindex and header (S5.4), keyboard (S6.2), layout shift (S6.3), target size and contrast (S6.1).
- `e2e/a11y.test.ts`: axe on `/privacy` and the footer, both themes (S6.1).
- `e2e/visual.test.ts`: baselines with `pnpm test:visual tests/018 --update`, in the pinned container; the focus shot tabs until the footer's link has focus. Specs 009, 010, 014 and 017's whole-page baselines are made again, since the footer changes.
- `static/analytics.test.ts`: the host and ID written once, the ID a real UUID, not the placeholder; the module's import; the note's facts match `umami.ts` and the sources (S3.3, S5.3, S4.2, FR-009).
- `unit/payload.test.ts`: the payload builder strips query, hash and referrer path, and the gate's every case (FR-002, FR-003).
- The release check extends spec 016's release test with `privacy.html` and Umami's host (S2.2). Lighthouse's job runs against the same build, where the sender does nothing, since its host isn't bradthome.com; a Lighthouse run on production is the v2.0 release's check (S6.3).
- Spec 003's relocked tests: `connect-src` exactly `'self' https://gateway.umami.is` (S4.1).

## What exists today

- The one module, from `PreviewLink.astro` (D147), with the copy button (D154).
- The résumé PDF links in the hero and contact section (specs 015, 017), the `mailto:` links (spec 017), the Hopper section at `#hopper` (spec 011), and the design system's footer (spec 009).

## Alternatives considered

| Option                                     | Why not                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Umami's tracker from `cloud.umami.is`      | A second host in `script-src` with no hash; sends query strings and full referrers by default (D155).  |
| Umami's tracker copied into the site       | Its own `<script>` tag, a second spec 003 change, and a copy to keep up by hand.                      |
| A test website for previews and `next`     | The free plan allows one website (D156).                                                              |
| Count only Do Not Track                    | Brad's card chose both signals (D157).                                                                |
| `navigator.sendBeacon`                     | Can't send the `x-umami-cache` header or omit credentials as clearly; `fetch` with `keepalive` can.   |

## Risks

- Ad blockers block `gateway.umami.is`, so counts are low. That's accepted: it's a measure of trends, not a ledger.
- Umami may change its collection API; its docs list it as stable, and the fake's shape comes from those docs. A change shows as no data in Umami, never as a broken page (FR-004).
- In-app browsers, such as LinkedIn's, may not run `keepalive`; a PDF click there may be lost.

## Tasks

- T001 `umami.ts`, `analytics.client.ts`, its import, and Copy's call.
- T002 `csp.ts`, `firebase.json`, spec 003's amendment and relock.
- T003 `/privacy`, `privacy.ts`, its styles, and the footer link.
- T004 The release list.
- T005 The tests in `tests/018/`, the other specs' expectations, and the baselines.
- T006 The docs, and the real website ID once the account exists.
