# Chronicle

Chronicle is a static website that shows an interactive, searchable, date-sorted timeline of events for any Wikidata subject. Events are queried live in the browser from the Wikidata SPARQL endpoint and the wbsearchentities and wbgetentities APIs. There is no backend.

## Key features

- Fuzzy subject search for any Wikidata item
- Date-sorted timeline of every dated linked item
- List and visual timeline views
- Filters
- A source link for every event
- JSON export and import
- Runs fully in the browser

## Tech stack

| Layer            | Technology                    |
| ---------------- | ----------------------------- |
| UI               | React, TypeScript             |
| Build            | Vite                          |
| Unit tests       | Vitest, React Testing Library |
| End-to-end tests | Playwright, axe-core          |
| Lint and format  | ESLint, Prettier              |
| CI               | GitHub Actions                |

## Getting started

Node.js 22 is required.

```bash
npm install
npm run dev
npm test
npm run test:e2e
npm run build
```

Lint, formatting, typecheck, and coverage:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
```

Coverage targets are 80% of lines and 70% of branches in `src/`, and 80% of lines in `src/core`. CI prints the coverage summary. There is no coverage badge.

## Status

Early development. The runnable shell is in place: Plakat tokens and self-hosted fonts, a header and footer, an About page, and a content security policy. Smoke checks cover Chromium, Firefox, and WebKit in light and dark. Publishing to GitHub Pages is a separate step and is not set up yet. Next is data access and subject search.

## Roadmap

Milestones follow the [implementation plan](docs/IMPLEMENTATION_PLAN.md).

| Milestone                         | Goal                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| M0 Setup and spikes               | A building, linted, tested app, with recorded fixtures and answers to the open spikes.             |
| M1 Runnable shell                 | The site loads at /chronicle/ with tokens, a header, a footer, and a content security policy.      |
| M2 Data access and subject search | Typing a name shows Wikidata suggestions.                                                          |
| M3 Timeline loading               | Picking a subject loads every batch, fills in labels, and shows pages of 50.                       |
| M4 Too-broad subjects             | Huge subjects load one relationship at a time. The search form can narrow a search before loading. |
| M5 Filters, URL state, and errors | Filters, shareable URLs, and the error messages work.                                              |
| M6 Export, import, and selection  | Timelines and curated selections round-trip through JSON files.                                    |
| M7 Must complete                  | Every Must requirement is checked in the supported browsers.                                       |
| M8 Should and Could features      | The remaining Should items, in the keep order from the plan, then the Could items.                 |
| M9 Release                        | Public v1.0.0 on GitHub Pages, with docs that match what shipped.                                  |

## Documentation

- [Software Requirements Specification](docs/SRS.md) (version 1.5; also as [Word](docs/Plong_Chronicle_SRS.docx) and [PDF](docs/out/Plong_Chronicle_SRS.pdf))
- [Architecture](docs/ARCHITECTURE.md) (version 1.2; also as [Word](docs/Plong_Chronicle_Architecture.docx) and [PDF](docs/out/Plong_Chronicle_Architecture.pdf))
- [UI design](docs/UI_DESIGN.md) (version 1.3; also as [Word](docs/Plong_Chronicle_UI_Design.docx) and [PDF](docs/out/Plong_Chronicle_UI_Design.pdf)), with design tokens and mockup sources in [docs/ui](docs/ui/)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) (version 1.1; also as [Word](docs/Plong_Chronicle_Implementation_Plan.docx) and [PDF](docs/out/Plong_Chronicle_Implementation_Plan.pdf))
- [Test plan](docs/TEST_PLAN.md) (version 1.1; also as [Word](docs/Plong_Chronicle_Test_Plan.docx) and [PDF](docs/out/Plong_Chronicle_Test_Plan.pdf))
- [Diagrams](docs/diagrams/) (PlantUML sources, rendered in [docs/images](docs/images/))
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
