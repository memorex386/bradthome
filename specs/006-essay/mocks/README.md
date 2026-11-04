# Spec 006 mocks: the essay

"Show it" for [spec 006](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- These are screenshots of a prototype of the port, served from this branch's build, so the words, fonts and colors are the real ones. They were taken in Edge on Windows; the snapshot baselines come from the pinned container at the build, so their text renders a little differently.
- The prototype is the plan's approach as written. The essay's words are today's, unchanged.
- Today's page has a header with GitHub and LinkedIn links, and a footer. Slice 2.5 ports them for every page ([D110](../../../docs/decisions/0110-the-essay-slice-ports-the-article-and-the-home-slice-ports-the-chrome.md)), so these show only the "Brad Thome" link home above the article.

## Every state

| ID | State | Screenshots | Scenarios |
| --- | --- | --- | --- |
| <a id="e1"></a>E1 | Phone, light, 390×844: the first screen | [first screen](E1-phone-light.png), [diagram](E1-phone-light-diagram.png), [table](E1-phone-light-table.png), [code](E1-phone-light-code.png) | S1.1–S1.4, S2.1 |
| <a id="e2"></a>E2 | Phone, dark | [first screen](E2-phone-dark.png), [diagram](E2-phone-dark-diagram.png), [table](E2-phone-dark-table.png), [code](E2-phone-dark-code.png) | S1.2, S2.4 |
| <a id="e3"></a>E3 | Desktop, light, 1280×800 | [first screen](E3-desktop-light.png), [diagram](E3-desktop-light-diagram.png), [table](E3-desktop-light-table.png), [code](E3-desktop-light-code.png) | S1.1, S1.4, S2.1 |
| <a id="e4"></a>E4 | Desktop, dark | [first screen](E4-desktop-dark.png), [diagram](E4-desktop-dark-diagram.png), [table](E4-desktop-dark-table.png), [code](E4-desktop-dark-code.png) | S1.2, S2.4 |
| <a id="e5"></a>E5 | A four-column table (the risk tiers) at 320 pixels wide, scrolling inside its frame | [table](E5-narrow-320-table.png) | S3.1 |
| <a id="e6"></a>E6 | The diagram on a phone, focused from the keyboard and scrolled sideways inside its frame | [light](E1-phone-light-diagram-focus-scrolled.png), [dark](E2-phone-dark-diagram-focus-scrolled.png) | S2.2, S2.3 |
| <a id="e7"></a>E7 | The scheduled agents' table at 390 pixels: its cells wrap and it fits the screen | [light](E1-phone-light-table.png), [dark](E2-phone-dark-table.png) | S3.1 |
| <a id="e8"></a>E8 | The code block: wrapped lines, markers colored for the theme | [light](E1-phone-light-code.png), [dark](E2-phone-dark-code.png) | S3.3 |

Reduced motion looks the same, since nothing on the page moves.

## The page

- **Title:** How one person runs a 1.4M-download product with AI agents · Brad Thome. The description, date and words are today's.
- **Above the article:** "Brad Thome", a link to `/`.
- **Text:** Charis SIL. **Headings, byline, tables, caption and diagram:** Inter. **Code:** the device's monospace font.
- **Colors:** v0's tokens (D92), with three more from v0 for the essay: surface `#f2f0eb` / `#1c1e21`, rule `#e2dfd8` / `#2e3135` and edge `#8b9099` / `#80868f`, light / dark.
- **Column:** about 40rem of text, with tables and the diagram allowed to widen to 52rem, as on today's page.
