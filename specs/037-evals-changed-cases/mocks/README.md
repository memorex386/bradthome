# Spec 037: states

The mocks are this slice's own build of `/evals`, captured on 2026-11-12 in Chromium at 1× density, with reduced motion, from a local preview of the production build. Each shows the page with a stand-in record, which was restored after the captures:

- **M1, M3, M4 and M5:** main's run, with its checks fingerprint changed, one case marked passed on its second try and one marked failed twice.
- **M2:** M1's record with its cases fingerprint changed too, and a passing changed run that matches the code's cases.

The words are this spec's. The numbers are spec 035's run.

## States

| ID | State | Desktop, 1280 × 800 | Phone, 390 × 844 |
| -- | ----- | ------------------- | ---------------- |
| M1 | The note under the verdict: the checks changed since this run | [light](M1-note-desktop-light.png), [dark](M1-note-desktop-dark.png) | [light](M1-note-phone-light.png) |
| M2 | The note with a changed run that covers the new and edited questions | [light](M2-note-changed-run-desktop-light.png), [dark](M2-note-changed-run-desktop-dark.png) | [light](M2-note-changed-run-phone-light.png) |
| M3 | A case that passed on its second try, opened | [light](M3-second-try-desktop-light.png), [dark](M3-second-try-desktop-dark.png) | |
| M4 | A case that failed twice, opened | [light](M4-failed-twice-desktop-light.png), [dark](M4-failed-twice-desktop-dark.png) | |
| M5 | "How it works", with its two new lines | [light](M5-how-desktop-light.png) | |
