# Spec 017: Contact

<!-- Adapted from GitHub Spec Kit's spec template (MIT): https://github.com/github/spec-kit -->

|                 |                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track           | Full                                                                                                                                                                                                                                                    |
| Status          | Approved                                                                                                                                                                                                                                                |
| Slice           | 3.9 Contact                                                                                                                                                                                                                                             |
| Branch          | `017-contact`                                                                                                                                                                                                                                           |
| Mocks and flows | [mocks/README.md](mocks/README.md): the contact itself, on `/v2`, the role pages and `/design-system#contact` on this pull request's preview, with each state listed                                                                                    |
| Plan            | [plan.md](plan.md), for approval with this spec at Gate 1                                                                                                                                                                                               |
| Decisions       | [D152](../../docs/decisions/0152-contact-shows-in-the-hero-and-closes-each-page.md)–[D154](../../docs/decisions/0154-the-copy-button-runs-in-the-sites-one-module.md), from this slice. It builds on D4, D16, D29, D50, D121–D127, D134, D141 and D147. |

## Summary

Brad's one public contact, brad@bradthome.com (D4), shows as one component everywhere the new pages offer contact: the address as text, a `mailto:` link, and, where there's room, a Copy button. On a phone the address is in the first screen, beside "Read the résumé" (D29, D152). A "Get in touch" section closes `/v2` and each role page, with the address large, its Copy button, and Brad's LinkedIn, GitHub and the page's résumé PDF. The header's "Contact" link and every ask-me receipt point there (D153).

Copy uses the Clipboard API and confirms in a polite live region, with a visible label that never moves the layout. Where the clipboard is refused it selects the address so the visitor's own copy works. With no script the button is hidden and the link and text still work. The button runs in the site's one module, so the Content-Security-Policy and spec 003's locked script check don't change (D154). Nothing about the visitor is sent anywhere, and there's no form, phone number or third-party service.

## Scope

**In:**

- `apps/site/src/components/ds/contact.ts`, `Email.astro` and `email.client.ts`, and their styles in `styles/ds/components.css`.
- `apps/site/src/components/home/Contact.astro` and `contact.ts`, and `styles/home/contact.css`.
- Where it shows: the hero's quiet links, the header's sections and phone menu, the closing section on `/v2` and the role pages, and the design system's gallery. The ask-me receipts and the gallery's "Ask about Brad" placeholder point to `#contact`.
- Tests in `tests/017/`, with snapshot baselines from the pinned container, and the expectations in specs 009–016's tests that named the old ask-me link, the hero's two links or the header's three sections.

**Out:**

- A contact form, a phone number, any address but brad@bradthome.com, and any third-party service.
- The board's availability and reply-time lines: no public fact backs either, and LinkedIn has no "looking for work" language, so the site adds none.
- Obfuscating the address (see "Spam" below).
- The analytics event for a copy, which slice 3.10 adds.
- v1's pages, which stay word for word as live, and the release build, which leaves phase 3 out.
- Sending a test message. Forwarding was set up on 10/30.

## Spam

The address is already public, on Brad's commits and the résumé PDFs (D16, D137), so hiding it on the site would protect nothing. The industry standard (D50) is a plain `mailto:` link with the address as text, and spam filtering at the inbox, which the forwarded mailbox already does. Script-built addresses, HTML entities, reversed text and images break the no-script link, copy and paste, and screen readers, so the site uses none of them.

## User stories and acceptance scenarios

The IDs in brackets, such as (C1), are the states in [mocks/README.md](mocks/README.md).

### Story 1: Reach Brad from the first screen (P1)

A recruiter skimming on a phone should see how to reach Brad without scrolling (D29).

**Why this priority:** it's the slice.

**Independent test:** open `/v2` and each role page at 390 × 844 and read the first screen.

- **S1.1** Given `/v2`, `/mobile`, `/fullstack` or `/ai` on a phone 390 pixels wide and 844 tall, then the hero's quiet links show "Read the résumé" and brad@bradthome.com, and the address link sits wholly inside the first screen, once the hero has landed (H1).
- **S1.2** Given the hero's address, then it's a link to `mailto:brad@bradthome.com` whose text is the address.
- **S1.3** Given the header, then its sections end with "Contact", linking to `#contact`, on a desktop and in the phone's menu.

### Story 2: Copy the address (P1)

A visitor whose mail app doesn't open, as in LinkedIn's in-app browser, should be able to copy the address in one tap.

**Independent test:** click Copy with the clipboard allowed, then refused, then with JavaScript off.

- **S2.1** Given the closing section, then it has the heading "Get in touch", the address large as a link to `mailto:brad@bradthome.com`, a button "Copy address", and links to LinkedIn, GitHub and the page's résumé PDF (C1).
- **S2.2** Given the clipboard is allowed, when the visitor activates Copy with a pointer or the keyboard, then the clipboard holds exactly brad@bradthome.com, the button's label reads "Copied" for 2 seconds and then "Copy address" again, and the polite live region says "Copied brad@bradthome.com to the clipboard." (C3).
- **S2.3** Given the clipboard is refused or missing, when the visitor activates Copy, then the address is selected on the page, the label reads "Address selected", the live region says so, and the link still works (C4).
- **S2.4** Given JavaScript is off, then no Copy button shows, the address is selectable text inside a working `mailto:` link, and nothing else changes (C5).
- **S2.5** Given any state change, then the button keeps its width and nothing on the page moves: the page's layout shifts add up to 0.

### Story 3: One way to reach Brad (P1)

**Why this priority:** contact must be the same everywhere, and nothing private ever shows (AGENTS.md's privacy rules).

- **S3.1** Given every page in the build, then every `mailto:` link is exactly `mailto:brad@bradthome.com`, every email address in the pages' text is brad@bradthome.com, and no page shows a phone number.
- **S3.2** Given an ask-me receipt in the Hopper, Experience or side projects sections, then its "Ask Brad about it" link goes to `#contact` on the same page (D153).
- **S3.3** Given the design system's gallery, then its "Ask about Brad" placeholders and its ask-me receipt go to `#contact`, and its Contact section shows the component at rest, focused, copied and refused (C2–C4).
- **S3.4** Given the source, then the address is written once, in `components/ds/contact.ts`, and every phase 3 component takes it from there.

### Story 4: Nothing leaves the browser (P1)

- **S4.1** Given `/v2`, when Copy is used, then every request the page makes is to its own origin.
- **S4.2** Given the build, then the copy button's code is in the one module the previews load, from `PreviewLink.astro`, never inline; each phase 3 page loads that one script; and `firebase.json`'s Content-Security-Policy is the one `pnpm csp` writes, with no new host or hash (D154).
- **S4.3** Given a release build, with `BRADTHOME_RELEASE=1`, then no page has the contact section or the copy button, and v1's pages ship no script.

### Story 5: Accessible in both themes (P2)

- **S5.1** Given `/v2` and the gallery's Contact section, in light and dark, then axe finds no violation at WCAG 2.2 AA, with the target-size rule on, and the Copy button and the section's links are at least 44 pixels tall.
- **S5.2** Given the keyboard, then Tab reaches the address link and then Copy; Enter and Space on Copy each copy; focus stays on the button and shows its ring (C2).
- **S5.3** Given every text color in the section and the hero's address against its background, in both themes, then the contrast is at least 4.5:1.
- **S5.4** Given the pinned container, then the contact matches its baselines: the hero's first screen on a phone, the closing section on a phone and a desktop in light and dark, Copy focused and copied, and the gallery's section.

## Requirements

- **FR-001** `Email.astro` MUST be the one contact component: with `quiet`, the address as a mail link; otherwise the address large as a mail link, a Copy button and a polite live region. It MUST take the address from `contact.ts`.
- **FR-002** The hero MUST show the address beside "Read the résumé", inside a phone's first screen (D152).
- **FR-003** `/v2` and each role page MUST close with the contact section at `#contact`, and the header's sections MUST end with "Contact" (D152).
- **FR-004** Copy MUST behave as S2.2–S2.4 say, and MUST never move the layout.
- **FR-005** The ask-me receipts and the gallery's "Ask about Brad" MUST go to `#contact` (D153).
- **FR-006** No page MUST show an address but brad@bradthome.com, a `mailto:` to any other, or a phone number.
- **FR-007** The copy code MUST run in the site's one module, make no request, and add no host or hash to the Content-Security-Policy; spec 003 stays as it is (D154).
- **FR-008** The contact MUST pass WCAG 2.2 AA in both themes, with 4.5:1 text contrast and 44-pixel targets, and MUST have no motion of its own.
- **FR-009** The docs MUST record D152–D154 and mark slice 3.9 in the plan.

## Success criteria

- **SC-001** A phone visitor reaches a working mail link from the first screen of `/v2` and each role page, with no scroll and no tap but the link.
- **SC-002** Copy puts exactly brad@bradthome.com on the clipboard, and announces it, in 1 activation.
- **SC-003** The built site holds exactly one address, brad@bradthome.com, and 0 phone numbers.
- **SC-004** Using Copy makes 0 requests and adds 0 layout shift; the one module grows by under 1 KB.
- **SC-005** axe reports 0 violations at WCAG 2.2 AA in each contact state, in both themes.

## Edge cases

- A narrower phone (320 pixels) wraps the hero's address onto its own line under "Read the résumé"; it stays a single unbroken word.
- A second Copy while "Copied" shows restarts the 2 seconds, and the live region speaks again.
- After "Address selected", a later Copy that works shows "Copied".
- A browser with no `(scripting)` media query support shows the button with no script; activating it does nothing, and the link and text still work.

## Approval

- Gate 1: approved by Brad on a choice card in the session on 2026-11-05, with the plan (including D154) and the mocks on this pull request's preview.
- Changed in spec 019 (slice 3.11), on 2026-11-06: v2.0 retires the release flag (D127) and moves the new home from `/v2` to `/` ([D162](../../docs/decisions/0162-the-new-home-moves-to-the-root-and-v2-redirects-there.md)). This spec's tests that expected a release build to leave phase 3 out, or named `/v2`, now expect the release build to be the same build as every other and read `/`.
