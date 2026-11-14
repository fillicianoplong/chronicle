# Chronicle

Chronicle is a searchable, date-sorted timeline of anything on Wikidata. Type a subject, such as a person, a war, a city, or a book, pick the match, and Chronicle gathers every dated item linked to it into one timeline you can filter, sort, share, and save.

**Status:** In design. Requirements version 1.4 and architecture version 1.1 (November 13, 2026); implementation next.

## Key features

- **Subject search:** type any name and pick from Wikidata's matches, each shown with its description so similar names are easy to tell apart. Partial names work.
- **Everything dated:** every item linked to the subject that has a date, from laws and court rulings to books, films, and artworks, sorted oldest or newest first. Dates show as precisely as Wikidata records them (year, month, or day), with BCE years.
- **Progressive loading:** events appear as each batch arrives, and loading continues until it's done, with Stop and Resume. Subjects too broad to load at once, such as countries, load one relationship at a time.
- **Filters:** words anywhere in an event's text, relationship, and date range, applied to everything loaded, 50 events per page.
- **Sources:** every event links to its Wikidata page.
- **Shareable views:** the subject, filters, sort, and page are kept in the URL.
- **Curated research files:** select the events that matter and export just those, or export everything. Importing a file reopens it instantly and can keep loading without duplicates.
- **Planned (Should):** notes and tags on events with a tag filter, a zoomable visual timeline, typo-tolerant subject search, and the subject's own dated facts such as birth and death.
- **No account, no server:** the browser queries Wikidata directly, one request at a time with pauses, and backs off when asked. Selections and notes stay in the browser.

## Tech stack

| Area | Choice |
|---|---|
| Platform | Web, as a static site; current desktop and mobile browsers |
| App | React with TypeScript, built with Vite |
| Data | Wikidata (CC0): the Query Service (SPARQL) for timelines, and the Wikidata API for search and labels |
| Storage | Browser storage for a 24-hour cache, selections, notes, and tags; JSON export and import; no database and no server |
| Testing | Vitest unit and contract tests against recorded Wikidata responses, Playwright end-to-end and failure-injection tests, and axe accessibility checks |
| CI | GitHub Actions |

Chronicle will be published on GitHub Pages under `/chronicle/`.

## Documentation

- [Software Requirements Specification](docs/SRS.md) (version 1.4; also as [Word](docs/Plong_Chronicle_SRS.docx) and [PDF](docs/out/Plong_Chronicle_SRS.pdf))
- [Architecture (design document)](docs/ARCHITECTURE.md) (version 1.1; also as [Word](docs/Plong_Chronicle_Architecture.docx) and [PDF](docs/out/Plong_Chronicle_Architecture.pdf))
- [UI design](docs/UI_DESIGN.md) (version 1.1; also as [Word](docs/Plong_Chronicle_UI_Design.docx) and [PDF](docs/out/Plong_Chronicle_UI_Design.pdf)), with design tokens and mockup sources in [docs/ui](docs/ui/)
- [Diagrams](docs/diagrams/) (PlantUML sources, rendered in [docs/images](docs/images/))

## License

MIT.
