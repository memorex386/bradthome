# Spec 020: Show it

Real output from this branch's build, not drawn by hand. The full files are `apps/site/dist/corpus.json` and `apps/site/dist/llms.txt` after `pnpm site:build`, and on the `next` channel once the branch is on main.

## `/corpus.json`, with four of its 60 sources

```json
{
  "version": 1,
  "name": "Brad Thome",
  "about": "Brad Thome, a senior mobile and full-stack engineer in Dallas–Fort Worth, builds Android, iOS and web products end to end.",
  "site": "https://bradthome.com",
  "contact": "brad@bradthome.com",
  "essay": {
    "title": "Running a 1.4M-download product with AI agents",
    "url": "https://bradthome.com/vindecoded-agents",
    "author": "Brad Thome"
  },
  "sources": [
    {
      "id": "job-hopper",
      "kind": "job",
      "label": "Résumé · Hopper",
      "text": "Senior Software Engineer at Hopper, Apr 2022 – Oct 2026.",
      "url": "https://bradthome.com/#hopper",
      "evidence": []
    },
    {
      "id": "hopper-disruption-assistance-1",
      "kind": "claim",
      "label": "Résumé · Hopper, Disruption Assistance",
      "text": "Launched Capital One Travel's first post-booking Disruption Assistance purchase flow as sole engineering owner, driving substantial incremental revenue for Hopper and Capital One and creating a reusable capability adopted by 5 more partners.",
      "url": "https://bradthome.com/#receipt-hopper-disruption-assistance-1",
      "evidence": []
    },
    {
      "id": "vindecoded-7",
      "kind": "claim",
      "label": "Résumé · VINDecoded",
      "text": "The case study's counts, measured on 10/28:\n- 1,235 merged PRs from June 13 to Oct 28, 2026, 83% of them from agent branches\n- 1,530 test files\n- 113 runbooks\n- 46 ADRs",
      "url": "https://bradthome.com/#receipt-vindecoded-7",
      "evidence": [
        "https://bradthome.com/vindecoded-agents"
      ]
    },
    {
      "id": "essay-dark-launch",
      "kind": "essay",
      "label": "Essay · New features ship dark",
      "text": "Most new features reach production turned off, so merging and deploying code doesn't change what customers see. Turning it on is a separate, deliberate step that takes effect in seconds and can be undone the same way. The shared settings schema holds 126 gates.\n\nA feature moves through four steps:\n\n1. **Merged dark.** The code ships behind a gate that is off for everyone.\n2. **On for my account.** I switch it on for myself in production through a per-user override. Only my account can read that override and no client can write it. It applies live, with no deploy, restart or reload.\n3. **On for everyone.** One command through the production-task CLI turns the gate on, for example `prod-task shop-ai:on`.\n4. **Kept with a kill switch.** Every live feature keeps a named off switch, such as `prod-task shop-ai:off`, and AGENTS.md lists it beside the feature.\n\nThe AI search box in Shop is a typical case. It turns a shopper's words into real search filters. Its runbook says to create its usage table, try it on one account, then run `shop-ai:on` to turn it on for everyone. Three later features depend on it, so `shop-ai:off` turns them off too.\n\nExperiments use the same idea. One registry in code holds each experiment's variants and traffic split, and a script syncs it to PostHog. Every client and server event carries every assignment, so a result such as \"variant A converted better\" is a saved funnel, not a spreadsheet. Each experiment can be forced to one variant or switched off without a deploy.",
      "url": "https://bradthome.com/vindecoded-agents#new-features-ship-dark",
      "evidence": []
    }
  ]
}
```

## `/llms.txt`, the head and three of its items

Long items are shown in full in the file. Here the essay's items are left out, and each is one line like the résumé's.

```text
# Brad Thome

> Brad Thome, a senior mobile and full-stack engineer in Dallas–Fort Worth, builds Android, iOS and web products end to end.

Every item below is a public fact about Brad from https://bradthome.com, with a stable ID and a link to where it shows. Cite the ID and the link. The essay is Brad's own, in the first person, so its "I" is Brad. Anything not here is not a public fact about Brad: ask Brad at brad@bradthome.com.

## Résumé

- [Résumé · Hopper](https://bradthome.com/#hopper): ID `job-hopper`. Senior Software Engineer at Hopper, Apr 2022 – Oct 2026.
- [Résumé · Hopper, Disruption Assistance](https://bradthome.com/#receipt-hopper-disruption-assistance-1): ID `hopper-disruption-assistance-1`. Launched Capital One Travel's first post-booking Disruption Assistance purchase flow as sole engineering owner, driving substantial incremental revenue for Hopper and Capital One and creating a reusable capability adopted by 5 more partners.
- [Résumé · VINDecoded](https://bradthome.com/#receipt-vindecoded-7): ID `vindecoded-7`. The case study's counts, measured on 10/28: - 1,235 merged PRs from June 13 to Oct 28, 2026, 83% of them from agent branches - 1,530 test files - 113 runbooks - 46 ADRs
## Essay: Running a 1.4M-download product with AI agents
## Optional
- [The corpus as JSON](https://bradthome.com/corpus.json): the same sources, with each claim's evidence links.
```

## Every source ID and its page link

Links point at bradthome.com. Until v2.0.1 is released, the same anchors are on the `next` channel.

| ID | Kind | Label | Link |
| --- | --- | --- | --- |
| `job-hopper` | job | Résumé · Hopper | [/#hopper](https://bradthome.com/#hopper) |
| `job-bleacher-report` | job | Résumé · Bleacher Report | [/#experience-bleacher-report](https://bradthome.com/#experience-bleacher-report) |
| `job-realpage` | job | Résumé · RealPage | [/#experience-realpage](https://bradthome.com/#experience-realpage) |
| `job-bookshout` | job | Résumé · BookShout | [/#experience-bookshout](https://bradthome.com/#experience-bookshout) |
| `job-bottle-rocket` | job | Résumé · Bottle Rocket | [/#experience-bottle-rocket](https://bradthome.com/#experience-bottle-rocket) |
| `job-enterprise-it` | job | Résumé · Harley-Davidson and Infosys | [/#experience-enterprise-it](https://bradthome.com/#experience-enterprise-it) |
| `project-sudoku-world` | project | Résumé · Sudoku World | [/#side-sudoku-world](https://bradthome.com/#side-sudoku-world) |
| `project-vindecoded` | project | Résumé · VINDecoded | [/#side-vindecoded](https://bradthome.com/#side-vindecoded) |
| `bleacher-report-1` | claim | Résumé · Bleacher Report | [/#receipt-bleacher-report-1](https://bradthome.com/#receipt-bleacher-report-1) |
| `bleacher-report-2` | claim | Résumé · Bleacher Report | [/#receipt-bleacher-report-2](https://bradthome.com/#receipt-bleacher-report-2) |
| `bleacher-report-3` | claim | Résumé · Bleacher Report | [/#receipt-bleacher-report-3](https://bradthome.com/#receipt-bleacher-report-3) |
| `bookshout-1` | claim | Résumé · BookShout | [/#experience-bookshout](https://bradthome.com/#experience-bookshout) |
| `bookshout-2` | claim | Résumé · BookShout | [/#receipt-bookshout-2](https://bradthome.com/#receipt-bookshout-2) |
| `bookshout-3` | claim | Résumé · BookShout | [/#receipt-bookshout-3](https://bradthome.com/#receipt-bookshout-3) |
| `bottle-rocket-1` | claim | Résumé · Bottle Rocket | [/#experience-bottle-rocket](https://bradthome.com/#experience-bottle-rocket) |
| `bottle-rocket-2` | claim | Résumé · Bottle Rocket | [/#receipt-bottle-rocket-2](https://bradthome.com/#receipt-bottle-rocket-2) |
| `bottle-rocket-3` | claim | Résumé · Bottle Rocket | [/#experience-bottle-rocket](https://bradthome.com/#experience-bottle-rocket) |
| `bottle-rocket-4` | claim | Résumé · Bottle Rocket | [/#experience-bottle-rocket](https://bradthome.com/#experience-bottle-rocket) |
| `education-1` | claim | Résumé · Education | [/#experience-education](https://bradthome.com/#experience-education) |
| `enterprise-it-1` | claim | Résumé · Harley-Davidson and Infosys | [/#experience-enterprise-it](https://bradthome.com/#experience-enterprise-it) |
| `enterprise-it-2` | claim | Résumé · Harley-Davidson and Infosys | [/#experience-enterprise-it](https://bradthome.com/#experience-enterprise-it) |
| `enterprise-it-3` | claim | Résumé · Harley-Davidson and Infosys | [/#experience-enterprise-it](https://bradthome.com/#experience-enterprise-it) |
| `hopper-role-and-dates-1` | claim | Résumé · Hopper, Role and dates | [/#receipt-hopper-role-and-dates-1](https://bradthome.com/#receipt-hopper-role-and-dates-1) |
| `hopper-role-and-dates-2` | claim | Résumé · Hopper, Role and dates | [/#receipt-hopper-role-and-dates-2](https://bradthome.com/#receipt-hopper-role-and-dates-2) |
| `hopper-disruption-assistance-1` | claim | Résumé · Hopper, Disruption Assistance | [/#receipt-hopper-disruption-assistance-1](https://bradthome.com/#receipt-hopper-disruption-assistance-1) |
| `hopper-disruption-assistance-2` | claim | Résumé · Hopper, Disruption Assistance | [/#receipt-hopper-disruption-assistance-2](https://bradthome.com/#receipt-hopper-disruption-assistance-2) |
| `hopper-disruption-assistance-3` | claim | Résumé · Hopper, Disruption Assistance | [/#receipt-hopper-disruption-assistance-3](https://bradthome.com/#receipt-hopper-disruption-assistance-3) |
| `hopper-partner-platform-1` | claim | Résumé · Hopper, Partner platform | [/#receipt-hopper-partner-platform-1](https://bradthome.com/#receipt-hopper-partner-platform-1) |
| `hopper-partner-platform-2` | claim | Résumé · Hopper, Partner platform | [/#receipt-hopper-partner-platform-2](https://bradthome.com/#receipt-hopper-partner-platform-2) |
| `hopper-partner-platform-3` | claim | Résumé · Hopper, Partner platform | [/#receipt-hopper-partner-platform-3](https://bradthome.com/#receipt-hopper-partner-platform-3) |
| `hopper-fintech-ai-1` | claim | Résumé · Hopper, Fintech AI | [/#receipt-hopper-fintech-ai-1](https://bradthome.com/#receipt-hopper-fintech-ai-1) |
| `hopper-agent-and-experimentation-workflow-1` | claim | Résumé · Hopper, Agent and experimentation workflow | [/#receipt-hopper-agent-and-experimentation-workflow-1](https://bradthome.com/#receipt-hopper-agent-and-experimentation-workflow-1) |
| `hopper-mobile-remoteui-and-webviews-1` | claim | Résumé · Hopper, Mobile: RemoteUI and WebViews | [/#receipt-hopper-mobile-remoteui-and-webviews-1](https://bradthome.com/#receipt-hopper-mobile-remoteui-and-webviews-1) |
| `hopper-mobile-remoteui-and-webviews-2` | claim | Résumé · Hopper, Mobile: RemoteUI and WebViews | [/#receipt-hopper-mobile-remoteui-and-webviews-2](https://bradthome.com/#receipt-hopper-mobile-remoteui-and-webviews-2) |
| `hopper-stack-1` | claim | Résumé · Hopper, Stack | [/#hopper](https://bradthome.com/#hopper) |
| `realpage-1` | claim | Résumé · RealPage | [/#experience-realpage](https://bradthome.com/#experience-realpage) |
| `realpage-2` | claim | Résumé · RealPage | [/#experience-realpage](https://bradthome.com/#experience-realpage) |
| `sudoku-world-1` | claim | Résumé · Sudoku World | [/#receipt-sudoku-world-1](https://bradthome.com/#receipt-sudoku-world-1) |
| `sudoku-world-2` | claim | Résumé · Sudoku World | [/#receipt-sudoku-world-2](https://bradthome.com/#receipt-sudoku-world-2) |
| `sudoku-world-3` | claim | Résumé · Sudoku World | [/#side-sudoku-world](https://bradthome.com/#side-sudoku-world) |
| `vindecoded-1` | claim | Résumé · VINDecoded | [/#side-vindecoded](https://bradthome.com/#side-vindecoded) |
| `vindecoded-2` | claim | Résumé · VINDecoded | [/#receipt-vindecoded-2](https://bradthome.com/#receipt-vindecoded-2) |
| `vindecoded-3` | claim | Résumé · VINDecoded | [/#receipt-vindecoded-3](https://bradthome.com/#receipt-vindecoded-3) |
| `vindecoded-4` | claim | Résumé · VINDecoded | [/#side-vindecoded](https://bradthome.com/#side-vindecoded) |
| `vindecoded-5` | claim | Résumé · VINDecoded | [/#side-vindecoded](https://bradthome.com/#side-vindecoded) |
| `vindecoded-6` | claim | Résumé · VINDecoded | [/#side-vindecoded](https://bradthome.com/#side-vindecoded) |
| `vindecoded-7` | claim | Résumé · VINDecoded | [/#receipt-vindecoded-7](https://bradthome.com/#receipt-vindecoded-7) |
| `essay-summary` | essay | Essay · Summary | [/vindecoded-agents#summary](https://bradthome.com/vindecoded-agents#summary) |
| `essay-product` | essay | Essay · The product and the constraint | [/vindecoded-agents#the-product-and-the-constraint](https://bradthome.com/vindecoded-agents#the-product-and-the-constraint) |
| `essay-system` | essay | Essay · The system at a glance | [/vindecoded-agents#the-system-at-a-glance](https://bradthome.com/vindecoded-agents#the-system-at-a-glance) |
| `essay-docs` | essay | Essay · Docs are the operating system | [/vindecoded-agents#docs-are-the-operating-system](https://bradthome.com/vindecoded-agents#docs-are-the-operating-system) |
| `essay-worktrees` | essay | Essay · One agent, one worktree, one port slot | [/vindecoded-agents#one-agent-one-worktree-one-port-slot](https://bradthome.com/vindecoded-agents#one-agent-one-worktree-one-port-slot) |
| `essay-tests` | essay | Essay · Tests first, then a second reader | [/vindecoded-agents#tests-first-then-a-second-reader](https://bradthome.com/vindecoded-agents#tests-first-then-a-second-reader) |
| `essay-devices` | essay | Essay · Phones, simulators and a car on the desk | [/vindecoded-agents#phones-simulators-and-a-car-on-the-desk](https://bradthome.com/vindecoded-agents#phones-simulators-and-a-car-on-the-desk) |
| `essay-dark-launch` | essay | Essay · New features ship dark | [/vindecoded-agents#new-features-ship-dark](https://bradthome.com/vindecoded-agents#new-features-ship-dark) |
| `essay-production` | essay | Essay · One door to production | [/vindecoded-agents#one-door-to-production](https://bradthome.com/vindecoded-agents#one-door-to-production) |
| `essay-scheduled-agents` | essay | Essay · Agents on a schedule | [/vindecoded-agents#agents-on-a-schedule](https://bradthome.com/vindecoded-agents#agents-on-a-schedule) |
| `essay-loop` | essay | Essay · Closing the loop | [/vindecoded-agents#closing-the-loop](https://bradthome.com/vindecoded-agents#closing-the-loop) |
| `essay-what-broke` | essay | Essay · What broke and what I changed | [/vindecoded-agents#what-broke-and-what-i-changed](https://bradthome.com/vindecoded-agents#what-broke-and-what-i-changed) |
| `essay-advice` | essay | Essay · What I'd tell a team adopting this | [/vindecoded-agents#what-id-tell-a-team-adopting-this](https://bradthome.com/vindecoded-agents#what-id-tell-a-team-adopting-this) |
