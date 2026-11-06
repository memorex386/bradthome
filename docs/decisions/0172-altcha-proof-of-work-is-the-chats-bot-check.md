---
status: accepted
date: 2026-11-06
decision-makers: Brad Thome
consulted: Claude, the builder agent
informed: []
tier: 1
log-id: D172
---

# ALTCHA proof-of-work is the chat's bot check

## Context and problem statement

[D57](0057-six-layers-of-cost-stops.md) puts a bot check in front of the chat. The site sets no cookies, keeps a strict hash-based CSP, and sends nothing that identifies a visitor ([D32](0032-non-goals.md)). Which bot check fits?

## Decision drivers

- No cookies and no visitor data sent to another company.
- No new host in the CSP.
- WCAG 2.2 AA, and no puzzle to solve.

## Considered options

The options are listed in the builder's ranked order.

1. ALTCHA, a self-hosted proof-of-work (recommended)
2. None at launch, with rate limits and caps only
3. Cloudflare Turnstile

## Decision outcome

Chosen option 1, as recommended. The chat window solves an ALTCHA challenge before it sends a question, and the API checks the solution with `altcha-lib`. ALTCHA's modular build is served from the site itself, so the CSP stays `'self'`. ALTCHA slows bots without stopping them, so the rate limits and spend caps ([D169](0169-the-chats-budget-is-25-a-month-plus-5-for-evals.md)) remain the real stop. If abuse gets past both, Turnstile is the fallback, as a new decision.

### Consequences

- Good, because it sets no cookies and sends nothing to a third party.
- Good, because it's open source (MIT) and free.
- Bad, because it's less common than Turnstile or reCAPTCHA.

### Confirmation

Slice 4.2's tests show the API refuses a question without a valid solution, and the site's security-header test shows no new host in the CSP.

## Pros and cons of the options

### ALTCHA

- Good, because it's private by design and adds no host to the CSP.
- Bad, because proof-of-work only raises a bot's cost.

### None at launch

- Good, because it's the simplest.
- Bad, because a script can spend the day's budget faster.

### Cloudflare Turnstile

- Good, because it's stronger, free and widely used.
- Bad, because it adds `challenges.cloudflare.com` to the CSP and sends each visitor's address and browser fingerprint to Cloudflare.

## More information

- Decided by: Brad Thome, on a choice card in the phase 4 planning session, 2026-11-06.
- Evidence, checked 2026-11-06: [ALTCHA](https://github.com/altcha-org/altcha), [Turnstile's CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/), [Turnstile's privacy addendum](https://www.cloudflare.com/turnstile-privacy-policy/), [reCAPTCHA FAQ](https://developers.google.com/recaptcha/docs/faq).
