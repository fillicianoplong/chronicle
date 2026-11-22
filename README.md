# Chronicle

Chronicle is a website that shows a searchable, date-sorted timeline of events for any Wikidata subject. Every event links to its Wikidata item as the source. It runs in the browser with no backend.

**Status:** Milestones 0 to 2 are finished (setup, the site shell, and subject search), and Milestone 3 (timeline loading) is next. The site is live at [fillicianoplong.github.io/chronicle](https://fillicianoplong.github.io/chronicle/).

## Key features

- **Subject search:** type a name or a Q-ID and pick a Wikidata subject, with close matches when nothing is exact.
- **Timeline:** every dated event linked to the subject, loaded in batches and shown 50 at a time.
- **List and timeline views:** a year-grouped list or a horizontal timeline.
- **Filters:** narrow by text, relationship, and date, with the view kept in the URL.
- **Export and import:** timelines and selections round-trip through JSON files.
- **Browser only:** no accounts and no server. Data comes from Wikidata under CC0.

## Tech stack

| Area | Choice |
|---|---|
| UI | React, TypeScript |
| Build | Vite |
| Data | Wikidata SPARQL and API |
| Storage | IndexedDB and JSON export |
| Hosting | GitHub Pages |
| Tests | Vitest, Playwright, axe-core |

## Build and run

Install [Node.js 22](https://nodejs.org/) or newer, then:

```
npm ci
npm run dev
```

The dev server runs at `http://127.0.0.1:5173/chronicle/`. `npm run build` writes the production site to `dist/`, and a push to `main` publishes it.

## Tests and CI

```
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

GitHub Actions runs these on every push to `main`, along with the format check, coverage, the build, `npm audit`, and a license check. [Testing](docs/testing.md) has the details.

## Documentation

- [Software Requirements Specification](docs/SRS.md) (version 1.5; also as [Word](docs/Plong_Chronicle_SRS.docx) and [PDF](docs/out/Plong_Chronicle_SRS.pdf))
- [Architecture](docs/ARCHITECTURE.md) (version 1.2; also as [Word](docs/Plong_Chronicle_Architecture.docx) and [PDF](docs/out/Plong_Chronicle_Architecture.pdf))
- [UI design](docs/UI_DESIGN.md) (version 1.3; also as [Word](docs/Plong_Chronicle_UI_Design.docx) and [PDF](docs/out/Plong_Chronicle_UI_Design.pdf))
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) (version 1.1; also as [Word](docs/Plong_Chronicle_Implementation_Plan.docx) and [PDF](docs/out/Plong_Chronicle_Implementation_Plan.pdf))
- [Test plan](docs/TEST_PLAN.md) (version 1.1; also as [Word](docs/Plong_Chronicle_Test_Plan.docx) and [PDF](docs/out/Plong_Chronicle_Test_Plan.pdf))
- [Diagrams](docs/diagrams/)
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
