# Spec 004's evidence

Facts from the real Google Cloud settings and the live check on 2026-11-03 and 2026-11-04 (UTC), copied from command output by the builder. `tests/004/static/evidence.test.ts` reads the `- key: value` lines. Billing account and budget IDs, email addresses and the names of other projects are left out.

- [iam.md](iam.md): the guard's identity and its grants (S2.3, FR-007).
- [permissions.md](permissions.md): what Policy Troubleshooter says the identity may do (SC-005).
- [live-check.md](live-check.md): a simulated over-budget notice, in dry-run, to the alert email (SC-004, FR-009).
- [cost.md](cost.md): the guard's monthly cost at list prices (SC-003).

The real project's billing was never unlinked.
