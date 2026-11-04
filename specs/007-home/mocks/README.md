# Spec 007 mocks: home, as today

"Show it" for [spec 007](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- These are screenshots of a prototype of the port, served from this branch's build, so the words, fonts and colors are the real ones. They were taken in Edge on Windows; the snapshot baselines come from the pinned container at the build, so their text renders a little differently.
- The home page's words are today's, without its second Work item, a project that isn't live ([D111](../../../docs/decisions/0111-the-home-page-drops-its-second-work-item.md)).
- The header and footer are today's, on every page ([D110](../../../docs/decisions/0110-the-essay-slice-ports-the-article-and-the-home-slice-ports-the-chrome.md)).

## Every state

| ID | State | Screenshot | Scenarios |
| --- | --- | --- | --- |
| <a id="h1"></a>H1 | Home, phone, light, 390×844, whole page | [H1](H1-home-phone-light.png) | S1.1–S1.3, S2.1, S2.2, S2.5, S3.2 |
| <a id="h2"></a>H2 | Home, phone, dark | [H2](H2-home-phone-dark.png) | S1.2, S3.2 |
| <a id="h3"></a>H3 | Home, desktop, light, 1280×800 | [H3](H3-home-desktop-light.png) | S1.1–S1.3, S3.2 |
| <a id="h4"></a>H4 | Home, desktop, dark | [H4](H4-home-desktop-dark.png) | S1.2, S3.2 |
| <a id="e1"></a>E1 | Essay, phone, light: the first screen, with the header | [E1](E1-essay-phone-light.png) | S2.1, S2.3, S2.5 |
| <a id="e2"></a>E2 | Essay, phone, dark | [E2](E2-essay-phone-dark.png) | S2.3 |
| <a id="e3"></a>E3 | Essay, desktop, light | [E3](E3-essay-desktop-light.png) | S2.3 |
| <a id="e4"></a>E4 | Essay, desktop, dark | [E4](E4-essay-desktop-dark.png) | S2.3 |
| <a id="e5"></a>E5 | Essay, phone, light: the end, with the footer | [E5](E5-essay-end-phone-light.png) | S2.2 |
| <a id="e6"></a>E6 | Essay, desktop, dark: the end, with the footer | [E6](E6-essay-end-desktop-dark.png) | S2.2 |
| <a id="n1"></a>N1 | 404, phone, light | [N1](N1-404-phone-light.png) | S2.1, S2.2, S2.4 |
| <a id="n2"></a>N2 | 404, desktop, dark | [N2](N2-404-desktop-dark.png) | S2.4 |
| <a id="f1"></a>F1 | Keyboard: the first Tab focuses the header's name | [F1](F1-focus-name-phone-light.png) | S3.1 |
| <a id="f2"></a>F2 | Keyboard: GitHub | [F2](F2-focus-github-phone-light.png) | S3.1 |
| <a id="f3"></a>F3 | Keyboard: the essay card | [F3](F3-focus-card-phone-light.png) | S3.1 |
| <a id="f4"></a>F4 | Keyboard: VINDecoded, desktop, dark | [F4](F4-focus-vindecoded-desktop-dark.png) | S3.1 |
| <a id="f5"></a>F5 | Keyboard: the footer's name, desktop, light | [F5](F5-focus-footer-desktop-light.png) | S3.1 |

Reduced motion looks the same, since nothing moves. Hovering the card turns its border and title the accent color at once, as today's does, without today's 120 ms fade.

## The pages

- **Header:** "Brad Thome" in ink, linking home; "GitHub" and "LinkedIn" in the quiet color, turning accent on hover. Inter, about 0.95 of the text size.
- **Home:** the heading "Brad Thome"; the line in the quiet color; a "Writing" label and a card for the essay; a "Work" label and VINDecoded with its line. Today's words, without the second Work item.
- **Footer:** a rule above, then "Brad Thome · Dallas–Fort Worth" in the quiet color, the name a link home.
- **404:** "Page not found", "There's no page at this address." and "Go to the home page", in the home page's styles.
- **Column:** about 40rem of text, centred, as on today's site.
