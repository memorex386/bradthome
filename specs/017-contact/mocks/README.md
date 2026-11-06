# Spec 017 mocks: Contact

"Show it" for [spec 017](../spec.md). Brad approves these with the spec and plan at Gate 1. The spec's scenarios name the state IDs below.

- The mock is the contact itself, built from this branch. Open this pull request's preview on a phone and a desktop: `/v2`'s hero, its "Contact" link in the header, and the "Get in touch" section at the end. The role pages show the same.
- `/design-system#contact` holds every state at once, including focused, copied and refused, in both themes with the gallery's theme switch.
- The snapshot baselines in `tests/snapshots/017/` show each state below, from the pinned container with reduced motion on.
- The look is Home v2's contact section, on the design system's tokens. The words are labels; the board's availability and reply-time lines are left out, since no public fact backs them.

## Every state

| ID                | State                                                                                           | Scenarios  |
| ----------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| <a id="h1"></a>H1 | The hero on a phone, 390 × 844: "Read the résumé" and the address, in the first screen          | S1.1, S1.2 |
| <a id="c1"></a>C1 | The closing section at rest: heading, the address large, Copy address, LinkedIn, GitHub, résumé | S2.1       |
| <a id="c2"></a>C2 | Copy focused by keyboard, with its ring                                                         | S5.2       |
| <a id="c3"></a>C3 | Copied: the label reads "Copied", and the live region says what was copied                      | S2.2       |
| <a id="c4"></a>C4 | Refused: the address selected, the label reads "Address selected"                               | S2.3       |
| <a id="c5"></a>C5 | No JavaScript: no button, the address a working link                                            | S2.4       |

Each shows on a phone and a desktop, in light and dark.

## What's left out

- The board's availability line and reply time: no public fact backs either.
- The board's "Writing" and "Résumé" header links, which belong to other slices.
