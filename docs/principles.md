# Working principles

Brad set these on 2026-10-30 for all work on the site and the process behind it. The working agreement (phase 0, step 0.1) has to meet them.

1. **Justified by current practice.** Every decision can be checked against the most current, widely used industry processes, workflows and architecture, with sources.
2. **Clear acceptance criteria.** Every piece of work says what "done" means before it starts.
3. **Explicit scope at every level.** What's in and what's out, above all at the highest level.
4. **Clear purpose.** Guidance says what we're trying to do and why.
5. **Every decision is explicit.** That means a lot of questions back and forth.
6. **Context with every decision,** so Brad can answer well.
7. **Ranked recommendations.** Claude recommends and ranks every option and suggestion.
8. **Tight control except for the coding itself.** Acceptance criteria, specs, tests, mocks, flows and decisions stay tightly controlled and as deterministic as possible. Turning the plan into code is the one part that isn't deterministic.
9. **Push back.** Claude says so when Brad isn't following the right workflow.
10. **An industry-recommended working agreement, locked first.** Before anything else, adopt a high-level workflow for Brad and Claude that a major industry player (GitHub, Anthropic, OpenAI or similar) recommends. It needs specific structure: rules, hooks, playbooks and skills. It also needs interactive pages where Brad types decisions next to mocks, visuals and flows.

11. **Industry standard by default.** Use industry-standard frameworks, tools and practices. A different choice needs a strong reason that Brad can explain, written into its decision record. Added on 10/30 ([D50](decisions/0050-industry-standard-by-default.md)), from Brad's note on the styling question.

## Refinements Claude proposed on 10/30

Brad accepted all four on 10/30 through the step 0.1 decisions:
- the backbone and its recorded deviations ([D17](decisions/0017-use-anthropics-claude-code-loop-as-the-backbone.md))
- the decision tiers ([D19](decisions/0019-three-decision-tiers-all-written-down.md))
- "controlled doesn't mean frozen" ([D21](decisions/0021-lock-tests-written-from-approved-scenarios.md))
- decisions kept in the repo ([D24](decisions/0024-decision-pages-and-cards-kept-as-madr-records.md))

The refinements in full:

- **On 5: explicit doesn't have to mean asked.** Every decision gets written down, in one of three tiers:
  - **Tier 1, Brad's decisions.** Asked one at a time, with context and ranked options. Covers scope, principles, architecture, anything public, money and privacy.
  - **Tier 2, conventions that come with the standard we adopt.** Approved in one batch. Any of them can be pulled up into tier 1.
  - **Tier 3, implementation details inside an approved spec.** The agent decides, and the PR shows what it chose.
- **On 8: controlled doesn't mean frozen.**
  - Specs, acceptance criteria, tests and decisions change only through an explicit edit that Brad approves, never silently during coding.
  - The checks that judge code are deterministic: the same code always gets the same verdict.
  - Two checks can't be deterministic: the chat's evals and the reviewer agent. They get statistical controls, such as frozen cases, a pinned model and pass thresholds over several runs, and they're never the only gate.
- **On 10: "already justified," honestly.**
  - These methods are only a year or two old. Each vendor recommends its own tool, and independent evidence on which process works best is still thin.
  - So we adopt the core they share, plus one named method as the backbone. We cite the sources and record where we deviate.
- **On interactive pages:** a page can be where Brad answers, but every decision ends up in the repo as a decision record. That keeps decisions versioned, and visible once the repo is public.
