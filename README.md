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

## Status

Early development.

## Documentation

- [Software Requirements Specification](docs/SRS.md) (version 1.5; also as [Word](docs/Plong_Chronicle_SRS.docx) and [PDF](docs/out/Plong_Chronicle_SRS.pdf))
- [Architecture](docs/ARCHITECTURE.md) (version 1.2; also as [Word](docs/Plong_Chronicle_Architecture.docx) and [PDF](docs/out/Plong_Chronicle_Architecture.pdf))
- [UI design](docs/UI_DESIGN.md) (version 1.2; also as [Word](docs/Plong_Chronicle_UI_Design.docx) and [PDF](docs/out/Plong_Chronicle_UI_Design.pdf)), with design tokens and mockup sources in [docs/ui](docs/ui/)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) (version 1.1; also as [Word](docs/Plong_Chronicle_Implementation_Plan.docx) and [PDF](docs/out/Plong_Chronicle_Implementation_Plan.pdf))
- [Test plan](docs/TEST_PLAN.md) (version 1.1; also as [Word](docs/Plong_Chronicle_Test_Plan.docx) and [PDF](docs/out/Plong_Chronicle_Test_Plan.pdf))
- [Diagrams](docs/diagrams/) (PlantUML sources, rendered in [docs/images](docs/images/))
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
