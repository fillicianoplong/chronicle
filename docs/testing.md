# Testing

`npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` are the local checks. GitHub Actions runs them on every push to `main`. The short form is in the [README](../README.md).

## Commands

From this repository:

```
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
npm run test:e2e
npm run build
npm run licenses
npm audit --audit-level=high
```

- `npm run typecheck` runs `tsc -b` in strict mode.
- `npm run lint` runs `eslint .`. Layer rules keep `fetch` inside `RequestGate`, keep React out of `src/core`, keep data-layer internals inside `src/data`, and ban `innerHTML` and `dangerouslySetInnerHTML`. Planted violations live in `tests/lint/fixtures/` and are ignored by that command. `tests/lint/boundaries.test.ts` lints them and expects each one to fail with the boundary rule named.
- `npm run format:check` runs Prettier in check mode.
- `npm test` runs Vitest once and exits non-zero when a test fails. `npm run test:coverage` adds the v8 coverage report over `src/`.
- `npm run test:e2e` builds the site and serves it at `https://127.0.0.1:4173/chronicle/` with a local certificate. HTTPS keeps WebKit working with `upgrade-insecure-requests`. Projects are Chromium, Firefox, and WebKit at 1280 px, plus Pixel 7 and iPhone 14 emulation. The suite blocks `wikidata.org`, so a test that calls the live service fails. The unit suite lives under `src/**/*.test.ts`, `src/**/*.test.tsx`, and `tests/**/*.test.ts`. The end-to-end suite lives under `e2e/`.
- `npm run licenses` checks every package in the lockfile against the license reference: MIT, Apache-2.0, MPL-2.0, BSD-2-Clause, BSD-3-Clause, ISC, and CC0-1.0. An `OR` expression passes when one side is allowed. An `AND` expression passes only when every side is. Five toolchain packages use 0BSD, BlueOak-1.0.0, or CC-BY-4.0, which the reference does not name yet. Those package paths are listed in `scripts/check-licenses.mjs`. Any other license fails the command.
- `npm audit --audit-level=high` fails when a high or critical advisory is present.

## What the suite checks

- **App shell.** The home page renders the Chronicle heading, the subject search, an empty state, and a footer that credits Wikidata under CC0. The About page at `/chronicle/about/` explains how events are gathered, why a date range does not make a broad subject loadable, the missing scholarly articles, and that notes stay unencrypted in the browser. End-to-end checks open both pages at 320, 1280, and 1920 px and fail if the page scrolls sideways.
- **Design tokens.** `tests/tokens.test.ts` reads `src/styles/tokens.css` and checks every text pair at 4.5:1 or better and every control pair at 3:1 or better, in light and dark. Other stylesheets under `src/` use token names rather than raw colors. Fonts are the self-hosted files in `src/styles/fonts/`.
- **Content security policy.** The built home and About pages send a policy that allows scripts, styles, and fonts from this site, connections only to `query.wikidata.org` and `www.wikidata.org`, and upgrades insecure requests. An end-to-end test fetches another host and expects the browser to block it. The dev server drops that meta tag so its own scripts and socket keep working.
- **Accessibility.** Playwright runs axe on the home page and the About page in every browser project, in light and dark. The scan expects no violations. Each page exposes header, main, and footer landmarks.
- **Unit coverage.** Vitest covers modules under `src/`, excluding test files and `src/main.tsx`. Coverage is reported as text and HTML. The formal line and branch floors are in the [test plan](TEST_PLAN.md).

## Fixtures

`npm run record:fixtures` records live Wikidata responses into `tests/fixtures/`. Run it by hand. It is not part of CI. Requests go out one at a time. API calls wait at least 5 seconds after the previous response, and queries wait at least 12 seconds. Each request sends a User-Agent and an Api-User-Agent naming Chronicle and the repository. Each file stores the request, the time, the gap since the previous request, and the query text.

The committed responses are subject search for Donald Trump, California, and Julius Caesar; property search for "jurisdiction"; the Donald Trump batch (Q22686); a 50-id `wbgetentities` label lookup taken from that batch; the Julius Caesar batch (Q1048); and three California batches (Q99). `tests/fixtures/schema.test.ts` checks the shape and the spacing.

## CI

The `CI` workflow in `.github/workflows/ci.yml` runs on every push to `main` (and on pull requests to `main`). It installs from the lockfile, then runs lint, the format check, the type check, unit tests with coverage, the production build, and Playwright. Playwright installs Chromium, Firefox, and WebKit on the runner before the end-to-end step. Mobile projects use those engines. The job then runs `npm audit --audit-level=high` and the license check. A failing test, a high or critical advisory, or a license outside the allowed set fails the job.

The test plan also describes a weekly live contract job, an opt-in live smoke suite, and a coverage gate. Those are not in this workflow yet.
