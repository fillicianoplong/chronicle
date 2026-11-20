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

## License

MIT. See [LICENSE](LICENSE).
