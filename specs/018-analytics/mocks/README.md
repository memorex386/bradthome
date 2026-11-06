# Spec 018 mocks: Analytics

"Show it" for [spec 018](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- The mock is the privacy note itself, built from this branch. Open this pull request's preview at `/privacy` on a phone and a desktop, and follow the footer's "Privacy" link from `/v2`, a role page or `/design-system`. Light and dark follow the device's setting.
- The snapshot baselines in `tests/snapshots/018/` show each state below, from the pinned container.
- The look is the design system's: its header and footer, the title and lede styles, and one column in a reading measure. The design boards have no privacy note, so nothing new is drawn.
- The analytics have no look. The table below is what each one sends, exactly.

## Every state

| ID                | State                                                                                      | Scenarios  |
| ----------------- | ------------------------------------------------------------------------------------------ | ---------- |
| <a id="p1"></a>P1 | The footer on `/v2`, a role page, `/privacy` and the gallery: the page's note, then "Privacy" | S5.1, S6.2 |
| <a id="p2"></a>P2 | `/privacy`: the title, the date, the lede, four short sections and how to reach Brad        | S5.2, S5.4 |
| <a id="e1"></a>E1 | A page view                                                                                | S1.1       |
| <a id="e2"></a>E2 | `work-reached`                                                                             | S1.2, S1.3 |
| <a id="e3"></a>E3 | `resume-download`                                                                          | S1.4       |
| <a id="e4"></a>E4 | `contact-click`, from a mail link                                                          | S1.5       |
| <a id="e5"></a>E5 | `contact-click`, from Copy                                                                 | S1.6       |

P1 and P2 show on a phone and a desktop, in light and dark, and P1 with the footer's link focused.

## Every request

Each is `POST https://gateway.umami.is/api/send`, with `content-type: application/json`, no cookies, and the browser's own `User-Agent`. These examples are a visit from LinkedIn to `https://bradthome.com/mobile?utm_source=x#hopper` on a 390 × 844 phone. The website ID is bradthome.com's in Umami.

**E1, the page view:**

```json
{
  "type": "event",
  "payload": {
    "website": "77d197cd-2039-4430-b6c7-ad596f95537c",
    "hostname": "bradthome.com",
    "url": "/mobile",
    "referrer": "https://www.linkedin.com",
    "title": "Brad Thome · Mobile engineer",
    "language": "en-US",
    "screen": "390x844"
  }
}
```

**E2, the work section,** the first time a quarter of the Hopper section shows:

```json
{ "type": "event", "payload": { "…": "the same seven fields", "name": "work-reached" } }
```

**E3, a résumé PDF:**

```json
{ "type": "event", "payload": { "…": "the same seven fields", "name": "resume-download", "data": { "role": "mobile" } } }
```

**E4 and E5, a contact click:**

```json
{ "type": "event", "payload": { "…": "the same seven fields", "name": "contact-click", "data": { "method": "mailto" } } }
{ "type": "event", "payload": { "…": "the same seven fields", "name": "contact-click", "data": { "method": "copy" } } }
```

On the preview, `next`, or any host but bradthome.com, and under Do Not Track or Global Privacy Control, none of these is sent.

## What's left out

- A cookie banner: nothing is stored on the device.
- Any dashboard or chart: Umami's own pages show the counts to Brad.
