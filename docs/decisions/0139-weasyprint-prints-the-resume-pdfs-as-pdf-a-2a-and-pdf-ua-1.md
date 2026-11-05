---
status: accepted
date: 2026-11-05
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D139
---

# WeasyPrint prints the résumé PDFs as PDF/A-2a and PDF/UA-1

## Context and problem statement

Slice 3.7's PDFs must be built from source on every build, never by hand, and pass veraPDF against PDF/UA-1 and a PDF/A profile. D50 asks for the industry-standard tool. What prints them, to which PDF/A level, and where does CI check them?

## Decision drivers

- Both standards, from the tool itself, rather than by rewriting its output.
- The pinned Playwright container, which CI and `pnpm test:visual` already use.
- Spec 003's locked list of CI checks stays as it is.

## Considered options

The options are listed in the builder's ranked order. Both tools were tried on the slice's branch against veraPDF 1.30.3.

1. WeasyPrint 70.0 in the pinned container, as PDF/A-2a with PDF/UA-1's identification, and veraPDF in the `html` job (recommended)
2. Chromium's own print, which the container already has, then rewriting the PDF to pass both standards
3. A commercial engine, such as Prince

## Decision outcome

Chosen option 1, approved with spec 015 at Gate 1.

- WeasyPrint prints each PDF in the pinned Playwright container, on its own Python 3.12 and Pango, so the container needs no new image, only WeasyPrint's packages, which install from hashes with `pnpm printer:install`.
- Each PDF is PDF/A-2a, the level that pairs with PDF/UA-1, and declares PDF/UA-1. WeasyPrint writes the first; the print script adds the second's identification to the same metadata.
- CI's build jobs run in the pinned container. The `html` job runs veraPDF's official image, pinned by digest, against both standards, beside html-validate. A new CI job would change spec 003's locked checks.

### Consequences

- Good, because both standards come from the engine, and veraPDF, the standards' reference validator, checks every pull request.
- Good, because the same source prints the same bytes, so every build serves the same PDFs.
- Bad, because the build needs PyPI and PyPA's bootstrap site, and a Windows build leaves the PDFs out.
- Bad, because the PDF/UA-1 identification relies on WeasyPrint's metadata code, pinned at 70.0.

### Confirmation

Spec 015's tests check the pins, the print script's standards and the CI jobs. `pnpm site:pdf` runs veraPDF in CI.

## More information

- Decided by: Brad Thome, approving spec 015's plan at Gate 1 in the slice 3.7 session, 2026-11-05.
- Chromium's tagged PDF failed PDF/UA-1 on its identification and its link annotations, and PDF/A-2 on its metadata and output intent.
