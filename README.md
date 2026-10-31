# bradthome.com

The source for [bradthome.com](https://bradthome.com), the personal site of Brad Thome, a senior mobile and full-stack engineer.

## Status

The site at bradthome.com today is v0, a one-day prototype. This repository rebuilds it from scratch, slice by slice, and the rebuild replaces v0 when it's ready. Until then, this repository holds the groundwork rather than the site.

## How it's built

Brad builds this site with AI coding agents. They open pull requests from their own GitHub account, [bradthome-agent](https://github.com/bradthome-agent), and Brad reviews and merges every one.

How that works is written down:

- [Working agreement](docs/working-agreement.md): the loop each change goes through, from spec to merge.
- [Charter](docs/charter.md): the site's purpose, audience, scope and constraints.
- [Plan](docs/plan.md): the releases and slices, in order.
- [Principles](docs/principles.md): why the process is shaped this way.
- [Decisions](docs/decisions/README.md): a record of every logged decision, with the options considered where they were recorded.

Agents start with [AGENTS.md](AGENTS.md).

## License

Everything in this repository is under the [MIT License](LICENSE), including the code, docs, specs and decision records. The exception is the site's words and images, meaning what becomes a page, image or PDF on bradthome.com. Those are © Brad Thome, all rights reserved, and [LICENSE-CONTENT](LICENSE-CONTENT) says what that covers.

## Security

Report vulnerabilities privately through GitHub's private vulnerability reporting, not in a public issue. [SECURITY.md](SECURITY.md) has the details.
