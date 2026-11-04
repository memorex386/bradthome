# v1's stylesheet on this branch (SC-003)

On 2026-11-04, after the design system was added, this branch's build gave the home, essay and 404 pages the same one stylesheet the v1.0.0 release serves on bradthome.com, byte for byte.

| Where | Stylesheet | SHA-256, first 20 characters |
| --- | --- | --- |
| bradthome.com, the v1.0.0 release | `/_astro/Base.BKbT8vcy.css` | `86ceed6edbd626596c58` |
| This branch's build: `/`, `/vindecoded-agents` and the 404 page | `/_astro/Base.BKbT8vcy.css` | `86ceed6edbd626596c58` |

Before `tokens.css` excluded the design system's files from v1's Tailwind sources, the same build added unused utilities, such as `.fixed`, `.ring` and `.shadow`, to v1's stylesheet, because Tailwind read words in the new files as class names. The exclusion keeps v1's stylesheet as released (D121).

`tests/009/e2e/v1.test.ts` checks the lasting part on every run: one stylesheet for the v1 pages, with no design-system class, token or font. A later dependency update may change the file's name without changing v1's look, so the test doesn't pin the name.
