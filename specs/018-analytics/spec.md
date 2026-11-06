# Spec 018: Analytics

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                   |
| Status          | Approved                                                                                                                                                                               |
| Slice           | 3.10 Analytics                                                                                                                                                                         |
| Branch          | `018-analytics`                                                                                                                                                                        |
| Mocks and flows | [mocks/README.md](mocks/README.md): the privacy note and its footer link on this pull request's preview, and every event with exactly what it sends                                   |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                              |
| Decisions       | [D155](../../docs/decisions/0155-analytics-send-from-the-sites-one-module.md)–[D159](../../docs/decisions/0159-spec-003-allows-umamis-api-host.md), from this slice. It builds on D30, D40, D50, D125–D127, D147 and D154. |

## Summary

The new pages count visits with Umami Cloud's free plan (D40): page views, and the charter's three visitor measures, no more. A visit reaches the work section, a visitor opens a résumé PDF, or a visitor uses Brad's email link or Copy button. The site sends them itself, from the one first-party module every phase 3 page already loads (D147), to Umami's documented collection API. No third-party script runs, and the Content-Security-Policy gains one host, `https://gateway.umami.is`, for `connect-src` only (D155, D159).

Nothing is sent anywhere but on bradthome.com itself (D156): previews, the `next` channel, local builds and tests send nothing to Umami. A release build leaves phase 3 out (D125–D127), so live sends nothing until v2.0 makes the new pages live. A browser that sets Do Not Track or Global Privacy Control sends nothing (D157). No cookie, local storage, session storage, visitor ID or fingerprint is written or sent. A short privacy note at `/privacy`, linked from the new pages' footer, says all of this in plain words.

## Scope

**In:**

- `apps/site/src/components/analytics/`: the sender and its event wiring, and `umami.ts`, which holds the website ID and Umami's host.
- The one `<script>` in `PreviewLink.astro` imports the sender, beside the previews and the copy button.
- `email.client.ts` reports a Copy activation to the sender.
- `apps/site/src/pages/privacy.astro`, its words in `components/privacy/privacy.ts` and its styles, and a "Privacy" link in `ds/Footer.astro`.
- `firebase.json`'s policy gains `connect-src 'self' https://gateway.umami.is` from `pnpm csp`, and spec 003's FR-019 says so; spec 003 is relocked (D159).
- The release build's list of phase 3 pages gains `privacy.html`.
- Tests in `tests/018/` against a fake Umami, snapshot baselines from the pinned container, and the relocked tests in `tests/003/`.

**Out:**

- Any event beyond page views and the three below, any property beyond the one each names, and Umami's `identify`, distinct IDs, performance or error tracking.
- Umami's own tracker script, from its host or copied here (D155).
- A cookie banner: there's nothing to consent to, since nothing is stored on the device.
- A test website in Umami for previews or `next` (D156).
- v1's pages, which stay word for word as live and send nothing.
- Dashboards, goals or targets in Umami. The charter's targets come once there's data.

## What each request sends

Every request is one `POST https://gateway.umami.is/api/send` with a JSON body, Umami's documented shape. The browser adds its own `User-Agent`, which Umami needs, and its `Origin`. No credentials or cookies are sent (`credentials: 'omit'`). The body's `payload` always holds these, Umami's defaults less the query string, the hash and the referrer's path:

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| `website`  | The site's website ID in Umami, from `umami.ts`                                                            |
| `hostname` | `bradthome.com`                                                                                            |
| `url`      | The page's path only, such as `/mobile`: no query string and no hash                                       |
| `referrer` | The origin of a page on another site that linked here, such as `https://www.linkedin.com`, or empty        |
| `title`    | The page's title                                                                                           |
| `language` | The browser's language, such as `en-US`                                                                    |
| `screen`   | The screen's size, such as `390x844`                                                                       |

| What                    | `type`  | `name`            | `data`                                         | When                                                                                     |
| ----------------------- | ------- | ----------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A page view             | `event` | none              | none                                           | Once per page load                                                                       |
| The work section        | `event` | `work-reached`    | none                                           | Once per page view, the first time a quarter of the Hopper section is in the viewport    |
| A résumé PDF            | `event` | `resume-download` | `{ "role": "mobile" \| "fullstack" \| "ai" }`  | Each activation of a link to a résumé PDF (click, Enter or middle-click)                 |
| A contact click         | `event` | `contact-click`   | `{ "method": "mailto" \| "copy" }`             | Each activation of a `mailto:` link, or of the Copy button                                |

The example bodies are in [mocks/README.md](mocks/README.md#every-request). Umami answers with a `cache` value; the sender keeps it in memory for the page's later requests, as Umami's own tracker does, and sends it back as the `x-umami-cache` header. It's never stored.

Umami records the request's time and derives the browser, operating system, device type and country from it. It counts unique visitors with a one-way hash of the website ID, the visitor's network address, the browser's `User-Agent` and a salt it changes every month, and stores no network address in its analytics records (see the plan's sources).

## User stories and acceptance scenarios

The IDs in brackets, such as (P1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: Brad sees the charter's measures (P1)

Brad wants to know whether visitors reach the work, open a résumé and get in touch (the charter's visitor measures, D30).

**Why this priority:** it's the slice.

**Independent test:** open `/v2` and a role page on `https://bradthome.com`, served from the build, with a fake Umami recording every request.

- **S1.1** Given `/v2`, `/mobile`, `/fullstack`, `/ai` or `/privacy` on bradthome.com, when the page loads, then exactly one page view is sent, with exactly the fields in "What each request sends", `hostname` `bradthome.com`, and `url` the path, even when the address has a query string or hash (E1).
- **S1.2** Given `/v2` or a role page, when a quarter of the Hopper section first enters the viewport, then one `work-reached` event is sent, with no `data`; scrolling away and back, or resizing, sends no second one (E2).
- **S1.3** Given a page whose Hopper section is in the viewport when it loads, as on a tall screen, then one `work-reached` event is sent right after the page view.
- **S1.4** Given a link to a résumé PDF, in the hero or the contact section, when the visitor activates it by click, Enter or middle-click, then one `resume-download` event is sent before the PDF opens, whose `data` is exactly `{ "role": … }`, the PDF's role (E3).
- **S1.5** Given a `mailto:` link, in the hero or the contact section, when the visitor activates it, then one `contact-click` event is sent with `data` exactly `{ "method": "mailto" }` (E4).
- **S1.6** Given the Copy button, when the visitor activates it, by pointer or keyboard, whether the clipboard copies or the address is selected, then one `contact-click` event is sent with `data` exactly `{ "method": "copy" }`, and the copy itself works as spec 017 says (E5).
- **S1.7** Given the fake Umami refuses or never answers, then the page works as it would with no analytics: links open, Copy copies, nothing shows an error, and nothing is retried.

### Story 2: Nothing is sent outside production (P1)

**Why this priority:** previews and `next` must never count as real visits, and live stays v1 until v2.0 (D127, D156).

- **S2.1** Given a page served from any host but `bradthome.com`, such as a preview channel, the `next` channel or `127.0.0.1`, when the visitor loads it, scrolls through it, opens a PDF and uses both contact links, then no request goes to any host but the page's own.
- **S2.2** Given a release build, with `BRADTHOME_RELEASE=1`, then it holds no `/privacy` page and no file that names Umami's host, and v1's pages ship no script.
- **S2.3** Given bradthome.com, when the browser sets Do Not Track (`navigator.doNotTrack` is `"1"`) or Global Privacy Control (`navigator.globalPrivacyControl` is `true`), then no request goes to Umami, page views included (D157).

### Story 3: Nothing identifies a visitor (P1)

- **S3.1** Given bradthome.com, when a visitor does everything in Story 1, then the page writes no cookie, nothing to local storage and nothing to session storage.
- **S3.2** Given every request to Umami, then its body has only the fields in "What each request sends", `data` has only the one property its event names, and no request carries a cookie, a query string or a visitor ID.
- **S3.3** Given the source, then the website ID and Umami's host are written once, in `components/analytics/umami.ts`, and only the sender sends anything.

### Story 4: The policy names one host (P1)

- **S4.1** Given `firebase.json`, then its Content-Security-Policy is the one `pnpm csp` writes, `connect-src` is exactly `'self' https://gateway.umami.is`, `script-src` and `style-src` allow only the site's own files and Astro's hashes, and no other directive changes (D159).
- **S4.2** Given the built site, then the sender is in the one module `PreviewLink.astro` loads, never inline, and every phase 3 page, the privacy note included, loads it.

### Story 5: The privacy note (P1)

A visitor who wonders what the site measures should find out in plain words, in one step from any new page.

- **S5.1** Given the footer on `/v2`, a role page, `/privacy` or the design system's gallery, then it has a link "Privacy" to `/privacy` (P1).
- **S5.2** Given `/privacy`, then it says, in plain words: that the site counts visits with Umami Cloud; the page views and the three moments it counts, each with its one detail; that there are no cookies and nothing is stored in the browser; that nothing identifies a visitor, and Umami keeps no network address in its records; that Do Not Track and Global Privacy Control turn it off; that the data is kept in Umami's US region for 6 months, the free plan's limit; that only Brad sees the counts; and how to reach Brad (P2).
- **S5.3** Given the note's facts, then they come from `privacy.ts`, and a test checks each against the sender's events, `umami.ts` and the plan's sources, so the note can't drift from what's sent.
- **S5.4** Given `/privacy`, then it carries noindex until v2.0, like every phase 3 page (D120), and its header links back to `/v2`'s sections.

### Story 6: Accessible, fast and still (P2)

- **S6.1** Given `/privacy` and the footer, in light and dark, then axe finds no violation at WCAG 2.2 AA, with the target-size rule on; the footer's links are at least 24 by 24 pixels, and every text color has at least 4.5:1 contrast.
- **S6.2** Given the keyboard, then Tab reaches the footer's "Privacy" link with a visible ring, and Enter opens `/privacy`.
- **S6.3** Given `/v2` and `/privacy`, then the page's layout shifts add up to 0, and spec 010's Lighthouse budgets still pass, with the sender running against a fake Umami.
- **S6.4** Given the pinned container, then `/privacy` and the footer match their baselines on a phone and a desktop, in light and dark, and the footer's link focused.

## Requirements

- **FR-001** The pages MUST send page views and exactly the three events in "What each request sends", each with only its named property, to Umami Cloud's collection API, from the site's one module (D155).
- **FR-002** The sender MUST send nothing unless the page's host is exactly `bradthome.com` (D156), and nothing when Do Not Track or Global Privacy Control is set (D157).
- **FR-003** The site MUST write no cookie, local storage or session storage, and MUST send no visitor ID, query string, hash or referrer path.
- **FR-004** A failed or slow request MUST NOT change what the page does, and MUST NOT be retried or queued.
- **FR-005** `firebase.json`'s policy MUST add exactly `connect-src 'self' https://gateway.umami.is`; spec 003's FR-019 MUST say so, and spec 003 MUST be relocked (D159).
- **FR-006** `/privacy` MUST say what S5.2 lists, from one source, and every phase 3 footer MUST link to it.
- **FR-007** A release build MUST leave out `/privacy` and the sender, with the rest of phase 3.
- **FR-008** The note and footer MUST pass WCAG 2.2 AA in both themes, and the slice MUST add no layout shift and keep spec 010's Lighthouse budgets.
- **FR-009** The docs MUST record D155–D159, the website ID's place, and mark slice 3.10 and its setup row in the plan.

## Success criteria

- **SC-001** On bradthome.com, each page view sends 1 request, and each of the three moments 1 more, with 0 fields beyond the spec's.
- **SC-002** Previews, `next`, local builds and release builds make 0 requests to Umami.
- **SC-003** 0 cookies, 0 local storage keys and 0 session storage keys, on every page.
- **SC-004** The policy names 1 outside host, in 1 directive.
- **SC-005** The one module grows by under 2.5 KB, minified, before compression, and layout shift stays 0.
- **SC-006** axe reports 0 violations at WCAG 2.2 AA on `/privacy` and the footer, in both themes.

## Edge cases

- A visitor who opens a PDF in a new tab, by middle-click or a long press, is counted once; the browser's own "save link" menu item isn't seen, so it isn't counted.
- The page leaves right after a PDF or mail link: the event is sent with `keepalive`, so it isn't cut off.
- Back-and-forward cache: a page restored from the cache doesn't send a second page view, and its `work-reached` stays sent.
- A screen reader user or a user with reduced motion is counted the same way; the sender has no motion and no visible state.
- The design system's gallery has no Hopper section, so on bradthome.com it sends a page view, and contact clicks from its Copy demos.

## Approval

- Gate 1: approved by Brad on a choice card in the session on 2026-11-05, with the plan (including D159's spec 003 amendment) and the mocks on this pull request's preview.
