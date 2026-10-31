# bradthome.com constitution

Spec Kit reads this file as the project's constitution. The constitution already exists, approved by Brad, so this file points at it instead of repeating it ([D75](../../docs/decisions/0075-adopt-spec-kits-skills-with-our-templates.md)):

- [docs/charter.md](../../docs/charter.md): the purpose, audience, scope, non-goals, constraints and product principles. Brad approved it in [D36](../../docs/decisions/0036-approve-the-charter.md), and it's the project's constitution.
- [docs/principles.md](../../docs/principles.md): the working principles behind the process.
- [docs/working-agreement.md](../../docs/working-agreement.md): how every piece of work goes from idea to merge, with its gates, tracks and conventions.

Specs and plans use this repo's templates, which `pnpm sync` copies into `.specify/templates/overrides/`. Their source is `docs/templates/spec.md` and `docs/templates/plan.md`.

Each of these documents changes only through a decision Brad approves, recorded in [docs/decisions/](../../docs/decisions/README.md). Never edit this file to change a principle; change the document it points at, through that process.
