# Chronicle

Chronicle is a website for one person, in a browser. It shows an interactive, searchable, date-sorted timeline of events for any Wikidata subject. Events are queried live from the Wikidata SPARQL endpoint and the wbsearchentities and wbgetentities APIs. There is no backend.

**Status:** Milestones 0 and 1 are finished (setup and spikes, runnable shell), and Milestone 2 (data access and subject search) is next.

## Working today

This is what Milestones 0 to 1 shipped. The [Changelog](CHANGELOG.md) has the detail for each version.

- Recorded Wikidata responses can be read through a fixture stand-in. That stand-in never calls the network.
- Outgoing Wikidata requests pass through one gate: one query and one API request at a time, two seconds between requests on the same lane, a 60-second abort, and limited retries. Nothing calls that gate from the page yet.
- The home page is a Plakat shell: a top rule, the Chronicle wordmark, a subject search box, and an empty state. The box keeps what is typed. Submitting it does not load a subject or a timeline yet.
- Light and dark colors follow the system setting. Text on the red button is white in light mode and dark in dark mode. Space Grotesk and Space Mono are self-hosted, under the SIL Open Font License.
- Every page has a header, a main region, and a footer. The footer says the data comes from Wikidata under CC0 and links to About.
- The About page at `/chronicle/about/` explains how events are gathered, why a date range does not make a broad subject loadable, that scholarly articles are missing from the main Wikidata graph, and that notes stay unencrypted in this browser.
- The built pages send a content security policy. Scripts, styles, and fonts come from this site. Connections are limited to query.wikidata.org and www.wikidata.org, and insecure requests are upgraded. The dev server omits that tag so its own scripts still run.
- Recorded Wikidata responses cover Donald Trump, California, Julius Caesar, a label lookup, and subject and property search. `npm run record:fixtures` can record more by hand. The test suite blocks live calls to Wikidata.
- Spike notes record filtering 20,000 events, storing 20 MB in IndexedDB, and the vis-timeline chunk size. Spike S-01's date-precision timings are in the SRS, Appendix A.3.
- Unit tests run in Vitest, including a contrast check on the design tokens. End-to-end tests run in Chromium, Firefox, WebKit, Pixel 7, and iPhone 14. Axe scans the home and About pages in light and dark.
- On every push to main, GitHub Actions runs lint, the format check, typecheck, unit tests with coverage, the production build, Playwright, `npm audit`, and a license check. A high or critical advisory fails the job, and so does a license outside the allowed set.

## Key features

These describe the finished app. What runs now is the list above.

- **Subject search:** type a name, or a Q-ID, and pick a Wikidata subject. A fuzzy fallback offers close matches when the exact search finds nothing.
- **Timeline:** a date-sorted list of every dated item linked to the subject, loaded in batches, with labels filled in.
- **List and timeline views:** the same events as a year-grouped list or a horizontal timeline. The timeline opens with nothing selected.
- **Filters:** narrow by text, relationship, and dates. The view is kept in the URL so a link can be shared.
- **Sources:** every event links to its Wikidata item. The footer credits Wikidata under CC0.
- **Export and import:** timelines and curated selections round-trip through JSON files.
- **Planned (Should):** notes and tags, copy link, back and forward, a 24-hour cache with Refresh, and a weekly check against live Wikidata.
- **Browser only:** no accounts and no server.

## Tech stack

| Area | Choice |
|---|---|
| Platform | Modern desktop and mobile browsers |
| UI | React, TypeScript |
| Build | Vite |
| Data | Wikidata SPARQL, and the wbsearchentities and wbgetentities APIs |
| Storage | IndexedDB and JSON export; no database and no server |
| Hosting | GitHub Pages |
| Tests | Vitest, React Testing Library, Playwright, and axe-core |
| CI | GitHub Actions |

The site is published at [fillicianoplong.github.io/chronicle/](https://fillicianoplong.github.io/chronicle/).

## Build and run

Install [Node.js 22](https://nodejs.org/) or newer, then from this folder:

```
npm ci
npm run dev
```

`npm ci` installs the lockfile's exact versions. `npm run dev` starts the dev server at `http://127.0.0.1:5173/chronicle/`. `npm run build` typechecks and writes the production site to `dist/`, including `about/index.html`, for the `/chronicle/` base path. `npm run preview` serves that build over HTTPS at `https://127.0.0.1:4173/chronicle/` with a local certificate. A push to main publishes the same build to [fillicianoplong.github.io/chronicle/](https://fillicianoplong.github.io/chronicle/).

## Tests and CI

```
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

`npm test` runs the unit tests. Coverage targets are 80% of lines and 70% of branches in `src/`, and 80% of lines in `src/core`. `npm run test:coverage` prints that summary. There is no coverage badge.

GitHub Actions runs these checks, plus the format check, unit tests with coverage, the production build, Playwright in Chromium, Firefox, WebKit, and mobile emulation, `npm audit`, and a license check, on every push to main. The [test plan](docs/TEST_PLAN.md) lists every case.

## Roadmap

Milestones follow the [implementation plan](docs/IMPLEMENTATION_PLAN.md).

| Milestone | Goal |
|---|---|
| M0 Setup and spikes | A building, linted, tested app, with recorded fixtures and answers to the open spikes. |
| M1 Runnable shell | The site loads at /chronicle/ with tokens, a header, a footer, and a content security policy. |
| M2 Data access and subject search | Typing a name shows Wikidata suggestions. |
| M3 Timeline loading | Picking a subject loads every batch, fills in labels, and shows pages of 50. |
| M4 Too-broad subjects | Huge subjects load one relationship at a time. The search form can narrow a search before loading. |
| M5 Filters, URL state, and errors | Filters, shareable URLs, and the error messages work. |
| M6 Export, import, and selection | Timelines and curated selections round-trip through JSON files. |
| M7 Must complete | Every Must requirement is checked in the supported browsers. |
| M8 Should and Could features | The remaining Should items, in the keep order from the plan, then the Could items. |
| M9 Release | Public v1.0.0 on GitHub Pages, with docs that match what shipped. |

## Documentation

- [Software Requirements Specification](docs/SRS.md) (version 1.5; also as [Word](docs/Plong_Chronicle_SRS.docx) and [PDF](docs/out/Plong_Chronicle_SRS.pdf))
- [Architecture](docs/ARCHITECTURE.md) (version 1.2; also as [Word](docs/Plong_Chronicle_Architecture.docx) and [PDF](docs/out/Plong_Chronicle_Architecture.pdf))
- [UI design](docs/UI_DESIGN.md) (version 1.3; also as [Word](docs/Plong_Chronicle_UI_Design.docx) and [PDF](docs/out/Plong_Chronicle_UI_Design.pdf)), with design tokens and mockup sources in [docs/ui](docs/ui/)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) (version 1.1; also as [Word](docs/Plong_Chronicle_Implementation_Plan.docx) and [PDF](docs/out/Plong_Chronicle_Implementation_Plan.pdf))
- [Test plan](docs/TEST_PLAN.md) (version 1.1; also as [Word](docs/Plong_Chronicle_Test_Plan.docx) and [PDF](docs/out/Plong_Chronicle_Test_Plan.pdf))
- [Diagrams](docs/diagrams/) (PlantUML sources, rendered in [docs/images](docs/images/))
- [Spike S-02: filtering 20,000 events](docs/SPIKE_S02.md)
- [Spike S-03: IndexedDB size and persistent storage](docs/SPIKE_S03.md)
- [Spike S-04: vis-timeline chunk size and 5,000 events](docs/SPIKE_S04.md)
- [Changelog](CHANGELOG.md)

Spike S-01 measured the cost of fetching date precision. Those results are in the SRS, Appendix A.3.

## License

MIT. See [LICENSE](LICENSE).
