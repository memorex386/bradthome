# Spec 024: the manual pass (SC-007)

## Keyboard, 2026-11-09

On a local build of this branch (`astro preview`), at 1280 × 800, with the keyboard only:

| Step | Result |
| --- | --- |
| Tab to "Ask about Brad" and press Enter | The window opened, with the question box focused |
| From the close button, Tab twice | Focus reached Ask, then Interview prep, each with a visible ring |
| Enter on Interview prep | Prep opened; Interview prep pressed; the posting box focused (S1.1) |
| Type a 10-word posting | The count read "10 of 3,000 words" (S2.1) |
| Tab | Focus reached "Map Brad to this role", with a visible ring |
| Enter | The request went to the API, which refuses a localhost page, so prep said "This chat isn't available here yet." and the status said the same (S8.3) |
| Escape | The window closed, and focus returned to "Ask about Brad" |

That pass found that the unavailable view had no way back. It now has "Change the posting", which returns to the entry with the posting kept, and a browser test covers it.

The browser tests in `tests/024/e2e/prep.test.ts` cover the rest with the keyboard, in the pinned container: the switch, the posting box, Map, Stop, every result control (Copy as notes, Email Brad, Inspect, Map another role), and Ctrl+Enter (S8.2).

## Reduced motion

The pinned container runs every browser test with reduced motion. S8.4's test finds no animation and no transition anywhere in the window while prep works. The spinner, the evidence bar's growth and the mode switch's fade sit in the no-preference query (D122).

## For Brad

- **A screen-reader pass,** on `next` once the slice is on main: open the chat, switch to Interview prep, paste a posting, and listen for the posting box's count, the status at each step ("Working through the posting", then "The fit is ready, with N matches"), and the result's headings.
- **A few real postings on `next`:** prep only shows on previews and `next` until v2.2.
