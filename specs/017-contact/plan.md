# Plan for spec 017: Contact

|        |                                                    |
| ------ | -------------------------------------------------- |
| Spec   | [spec.md](spec.md), for approval with it at Gate 1 |
| Status | Approved                                           |

## Approach

- **One source (S3.4).** `components/ds/contact.ts` holds the address, its `mailto:` link, the button's three labels, the live region's two notes and the 2-second hold. `hopper.ts`'s receipt link and `resume.ts`'s contact line take from it.
- **One component (FR-001).** `components/ds/Email.astro` renders the quiet link, or the large block: the address link, the button and a visually hidden `role="status"` span. The three labels sit in one grid cell, each hidden but the current one, so the button keeps the widest one's width (FR-004, S2.5). `@media (scripting: none)` hides the button with no script (S2.4). A `demo` prop holds a state still for the gallery, and the script leaves a held block alone.
- **Places (FR-002, FR-003, FR-005).** `Hero.astro` adds `<Email quiet>` to its quiet links, inside the same rise as the buttons. `HomePage.astro` adds "Contact" to the header's sections and `components/home/Contact.astro` after "On the side". The receipts' `askHref` and the gallery's placeholders become `#contact`. The section's LinkedIn and GitHub links use `PreviewLink`, like the header's.
- **Behavior (FR-004, FR-007, D154).** `components/ds/email.client.ts` wires each `[data-email]` block: a click calls `navigator.clipboard.writeText()`; on success the block's state is `copied` for 2 seconds and the live region gets the copied note; when the clipboard is missing or the promise rejects, the script selects the address with `Selection.selectAllChildren()` and says so. The live region is cleared a frame before each note, so a repeat is spoken. `PreviewLink.astro`'s one `<script>` imports it beside `previews.client.ts`, so Astro bundles both into the one external file every phase 3 page already loads through the header. Spec 003's check, which allows exactly one `<script>` in `PreviewLink.astro`, and the CSP don't change.
- **Release (S4.3).** The release build already leaves out `/v2`, the role pages, the gallery and the one module (specs 010 and 016); the new files sit in folders v1's stylesheet already skips.
- **Docs (FR-009).** D152–D154, the plan's 3.9 row and log.

## Why one module, not a second

A second `<script>` in `Email.astro` would be cleaner to read, but it would fail spec 003's locked check and need its amendment and relock, and a second file for about 40 lines. D147's module already loads on every page that shows contact, because every phase 3 page has the header's previewed profile links. If a later page shows contact with no header, it must load the module itself; a test checks every page with a Copy button loads it.

## Why the Clipboard API, and selection as the fallback

`navigator.clipboard.writeText()` is the standard way to copy, works on a click in every current browser over HTTPS, and needs no permission prompt. `document.execCommand('copy')` is deprecated. Selecting the address on refusal leaves the visitor one standard step (their own copy), and announces it, rather than failing silently.

## Tests

`tests/017/`, written from the scenarios, not locked:

- `static/contact.test.ts`: `contact.ts`'s address and words; no other address or `mailto:` in phase 3's source; the component's structure; the script's import from `PreviewLink.astro`; the docs (S3.4, FR-006, FR-009).
- `e2e/contact.test.ts`: the hero's address in the first screen on each page at 390 × 844 (S1.1, S1.2); the header's Contact (S1.3); the section (S2.1); copy with the clipboard granted, by click, Enter and Space (S2.2, S5.2); refused, by a page whose clipboard rejects (S2.3); the button's width and layout shifts (S2.5); ask-me receipts (S3.2); the gallery (S3.3); every request same-origin and one script (S4.1, S4.2); every built page's addresses and no phone number (S3.1); target sizes and contrast (S5.1, S5.3).
- `e2e/nojs.test.ts`: with JavaScript off, no button, a working link and selectable text (S2.4).
- `e2e/a11y.test.ts`: axe in each state, both themes (S5.1).
- `e2e/visual.test.ts`: the baselines, with `pnpm test:visual tests/017 --update` in the pinned container. Focus shots Tab until the button has focus, never a fixed count. Specs 009, 010, 014 and 016's whole-page and gallery baselines are made again, since the header, hero and gallery change.
- The release build's check (S4.3) extends spec 016's release test's list of phase 3 markers.

## What exists today

- The hero's quiet links, the header and the receipts, from specs 009–014; `PreviewLink.astro`'s one module, from spec 016 (D147).
- The ask-me link to `mailto:` in `hopper.ts`, and the gallery's placeholders, from specs 009 and 011.

## Alternatives considered

| Option                                       | Why not                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A second module from `Email.astro`           | Spec 003's amendment and relock for a few lines; the one module already loads everywhere.      |
| Show the button only once the script runs    | Un-hiding it moves the row on a phone; the scripting media query hides it with no layout cost. |
| `execCommand('copy')`                        | Deprecated, and synchronous with a hidden text area.                                           |
| A contact form or a third-party mail service | Out of scope: it would send visitor data somewhere and needs a backend.                        |
| Obfuscate the address                        | See the spec's "Spam".                                                                         |

## Risks

- A browser with script but no clipboard permission on a click (some in-app browsers) gets the selection fallback, which needs one more step.
- The hero's row may wrap on very narrow phones, pushing the chips down one line. The first-screen test runs at 390 × 844, the phone D29 names.

## Tasks

- T001 `contact.ts`, `Email.astro`, `email.client.ts` and the styles.
- T002 The hero, header, closing section, receipts and gallery.
- T003 The tests in `tests/017/`, the other specs' expectations, and the baselines.
- T004 The docs.
