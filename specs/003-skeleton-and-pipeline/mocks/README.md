# Spec 003 mocks: the empty page, its checks and its preview

"Show it" for [spec 003](../spec.md). Brad approves these with the spec at Gate 1. The spec's scenarios name the state IDs below.

- [show-it-desktop.png](show-it-desktop.png) and [show-it-phone.png](show-it-phone.png) are screenshots of the Show it page at 1120 and 390 pixels wide. They show every state.
- The page's words, colors and fonts are the real ones ([D92](../../../docs/decisions/0092-v0s-colors-with-self-hosted-charis-sil-and-inter.md), [D93](../../../docs/decisions/0093-the-empty-page-says-the-site-is-being-rebuilt-in-public.md)). The mock loads the fonts from Google Fonts. The site serves its own copies.
- File names, numbers, times, hashes and the preview URL's suffix are made-up examples.
- The check names and the log lines are the repo's. The boxes around them, such as the checks list and the comment, are GitHub's own, and their wording is paraphrased.

## From a push to Brad's merge

1. **The agent pushes and opens a pull request.** The git hooks ran first. State [C0](#c0).
2. **CI builds the site once and runs every job,** and the gate sums them up. The new jobs are lint, format, site types, build, end-to-end (accessibility, visual snapshots and headers, in the pinned Playwright container), Lighthouse, HTML and internal links. They run beside spec 002's jobs. States [C0](#c0)–[C6](#c6).
3. **The preview deploys beside CI.** GitHub signs in to Google without a stored key, deploys to the pull request's `pr-N` channel, and posts one comment with the link, which it edits on each push. States [V1](#v1)–[V3](#v3).
4. **Brad opens the link and reviews,** on a phone and a desktop, in both themes. This is Gate 3. States [P1](#p1)–[P6](#p6).
5. **Brad merges.** The channel expires 7 days after its last push, and the nightly checks keep running. State [N1](#n1).

## Every state

| ID | State | Result | Scenarios |
| --- | --- | --- | --- |
| <a id="p1"></a>P1 | The page on a phone, light, 390×844 | Shown | S1.1, S1.2 |
| <a id="p2"></a>P2 | The page on a phone, dark | Shown | S1.2 |
| <a id="p3"></a>P3 | The page on a desktop, light, 1280×800 | Shown | S1.1, S1.2 |
| <a id="p4"></a>P4 | The page on a desktop, dark | Shown | S1.2 |
| <a id="p5"></a>P5 | Keyboard focus on the link, the page's one stop | Shown | S1.4 |
| <a id="p6"></a>P6 | The text before the fonts arrive, in a matched fallback | Shown | S1.3 |
| <a id="c0"></a>C0 | Every check passes, with 19 checks listed | Passes | S2.1 |
| <a id="c1"></a>C1 | An accessibility violation | Blocked | S2.3 |
| <a id="c2"></a>C2 | A visual snapshot differs | Blocked | S2.4 |
| <a id="c3"></a>C3 | A Lighthouse budget is missed | Blocked | S2.5 |
| <a id="c4"></a>C4 | Lint, format or site types fail | Blocked | S2.2 |
| <a id="c5"></a>C5 | Invalid HTML or a broken internal link | Blocked | S2.6 |
| <a id="c6"></a>C6 | A security header is missing | Blocked | S4.1 |
| <a id="v1"></a>V1 | The preview link is posted | Shown | S3.1, S3.2 |
| <a id="v2"></a>V2 | A fork's pull request skips the preview | Skipped | S3.3 |
| <a id="v3"></a>V3 | The preview deploy fails, and the gate isn't affected | Fails | S3.4 |
| <a id="n1"></a>N1 | The nightly report | Never blocks | S5.1, S5.2 |

## The page

```text
Brad Thome
bradthome.com is being rebuilt in public, one reviewed slice at a time.
Read the source on GitHub
```

- **Title:** Brad Thome. **Description:** the same line as above.
- **Light:** background `#fbfaf7`, text `#1d1e20`, quiet text `#5c6066`, accent `#2357c6`.
- **Dark:** background `#131416`, text `#e9e7e3`, quiet text `#a3a7ae`, accent `#82a8ff`.
- **Fonts:** Inter for the heading and Charis SIL for the text, both served by the site.
- The theme follows the device's setting. Nothing moves, so reduced motion looks the same.

## The messages

Each failing job says what failed, where and how to fix it, in the shape of the hooks' messages.

<a id="msg-c0"></a>

### C0: Every check passes

```text
All checks have passed                                   19 successful checks
  ci / lint · ci / format · ci / site-types · ci / build · ci / e2e · ci / lighthouse
  ci / html · ci / links · ci / types · ci / tests (ubuntu-24.04) · ci / tests (windows-2025)
  ci / trace · ci / privacy · ci / secrets · ci / commits · ci / hygiene · ci / gate
  locked-tests / lock · preview / deploy
```

<a id="msg-c1"></a>

### C1: An accessibility violation

```text
✖ e2e  1 accessibility violation
  P2 home, phone, dark
    color-contrast (WCAG 2.2 AA, 1.4.3)
    a[href="https://github.com/…"]  3.9:1, needs 4.5:1
  Fix: pnpm test:e2e, then adjust the dark accent token in apps/site/src/styles/tokens.css.
```

<a id="msg-c2"></a>

### C2: A visual snapshot differs

```text
✖ e2e  1 snapshot differs
  P3 home, desktop, light
    1,284 pixels differ (no tolerance)
    diff: the run's artifacts, P3-diff.png
  Fix: if the change is intended, run pnpm test:visual --update in the container,
  and commit the new baseline with the spec.
```

<a id="msg-c3"></a>

### C3: A Lighthouse budget is missed

```text
✖ lighthouse  1 budget missed (median of 5 runs)
  / on a phone profile
    largest-contentful-paint  2.3 s, budget 2.0 s
    performance               91, budget 95
  Fix: the report is in the run's artifacts.
```

<a id="msg-c4"></a>

### C4: Lint, format or site types fail

```text
✖ lint  2 problems
  apps/site/src/pages/index.astro:12:5
    astro/no-unused-css-selector  .hero
  Fix: pnpm lint --fix, or remove the rule's cause.
```

<a id="msg-c5"></a>

### C5: Invalid HTML or a broken internal link

```text
✖ links  1 broken internal link
  dist/index.html
    /essay#intro  no such page
  Fix: point the link at a page the build has.
```

<a id="msg-c6"></a>

### C6: A security header is missing

```text
✖ e2e  1 security header missing
  /  Content-Security-Policy
  Fix: firebase.json's headers, and Astro's CSP hashes for any new inline script.
```

<a id="msg-v1"></a>

### V1: The preview link is posted

```text
Preview ready
  Link     https://bradthome--pr-12-a1b2c3d4.web.app
  Commit   a1b2c3d
  Expires  Nov 9, 2026, 7 days after the last push
Search engines are asked not to index previews. The live site is untouched.
```

<a id="msg-v2"></a>

### V2: A fork's pull request skips the preview

```text
– preview  skipped: this pull request comes from a fork, so GitHub gives it no Google sign-in.
  Checks still run.
```

<a id="msg-v3"></a>

### V3: The preview deploy fails

```text
✖ preview  Firebase Hosting refused the deploy
  HTTP 503 from firebasehosting.googleapis.com
  The gate isn't affected. Fix: re-run the job; if it keeps failing, check Google Cloud's status.
```

<a id="msg-n1"></a>

### N1: The nightly report

```text
nightly  external links: 0 broken of 3
         mutation score (safety scripts): 87%
  Reported in the run's summary. Not a gate until there's a baseline (D94).
```
