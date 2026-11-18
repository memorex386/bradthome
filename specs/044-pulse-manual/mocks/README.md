# Spec 044's "Show it" captures

Captured by [capture.mjs](capture.mjs) from this slice's own build, in Chromium at 1x with reduced motion, at 375 × 812 and 1440 × 900. The API is a fake, as in the tests: it answers the App Store alone (v12.7.9, released Nov 17, 4.7 stars, fetched at 15:00 UTC), with the clock at 15:12 UTC on 2026-11-18. The built numbers are main's `pulse.json`: v12.7.8 of Nov 10, checked Nov 17, and 296 merged PRs counted Nov 17. The tests' snapshots, in the pinned container, are the record.

| ID  | State                                                                              | Captures                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Before `/pulse` answers, or with the API down: the build's numbers, dated, no dots | [desktop light](M1-built-desktop-light.png), [desktop dark](M1-built-desktop-dark.png), [phone light](M1-built-phone-light.png), [phone dark](M1-built-phone-dark.png) |
| M2  | After `/pulse` answers: the release live with its dot, the PR count as built       | [desktop light](M2-live-desktop-light.png), [desktop dark](M2-live-desktop-dark.png), [phone light](M2-live-phone-light.png), [phone dark](M2-live-phone-dark.png)     |
| M3  | No script: the build's numbers, dated, and no "How this works"                     | [phone light](M3-noscript-phone-light.png)                                                                                                                             |
| M4  | "How this works" open: the note, the three steps and the code's link               | [desktop light](M4-how-open-desktop-light.png), [phone dark](M4-how-open-phone-dark.png)                                                                               |
| M5  | The job's output from a real run on Brad's PC                                      | Below                                                                                                                                                                  |

## M5: the job on Brad's PC

`pnpm previews:refresh`, run in this slice's worktree on 2026-11-18, before the setting was added. It prints counts, versions and days only:

```text
✓ github changed
✓ pulse-appstore v12.7.9, shipped 2026-11-17, checked 2026-11-18 (was v12.7.8)
✖ pulse-github failed, so 296 as of 2026-11-17 stays: the setting bradthome.pulseRepo isn't on this PC (docs/release.md says how to add it)
Next: read the diff, then push it once Brad says push. A release builds it into bradthome.com (docs/release.md).
```

The run exited 1, since one source failed, after writing the GitHub preview and the release.

After Gate 1, with the setting written from VINDecoded's checkout on this PC, the same command on the same day:

```text
✓ github changed
✓ pulse-appstore v12.7.9, shipped 2026-11-17, checked 2026-11-18 (was v12.7.8)
✓ pulse-github 296 merged in the 30 days to 2026-11-18 (unchanged)
Next: read the diff, then push it once Brad says push. A release builds it into bradthome.com (docs/release.md).
```

It exited 0. A walk through the repo's closed pull requests, run by hand once to check it, counted 298 in the same window: GitHub's search lags a merge by minutes, which the tile's day covers. This slice commits that run's `pulse.json` and `snapshots.json`.
