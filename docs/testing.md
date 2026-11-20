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
```

- `npm run typecheck` runs `tsc -b` in strict mode.
- `npm run lint` runs `eslint .`.
- `npm run format:check` runs Prettier in check mode.
- `npm test` runs Vitest once. `npm run test:coverage` adds the v8 coverage report over `src/`.
- `npm run test:e2e` builds the site, serves it at `/chronicle/`, and runs Playwright. The unit suite lives under `src/**/*.test.ts` and `src/**/*.test.tsx`. The end-to-end suite lives under `e2e/`.

## What the suite checks

- **App shell.** The home page renders the Chronicle heading and basic page structure.
- **Accessibility.** Playwright runs an axe scan on the home page in Chromium.
- **Unit coverage.** Vitest covers modules under `src/`, excluding test files and `src/main.tsx`. Coverage is reported as text and HTML. The formal line and branch floors are in the [test plan](TEST_PLAN.md).

## CI

The `CI` workflow in `.github/workflows/ci.yml` runs on every push to `main` (and on pull requests to `main`). It installs from the lockfile, then runs lint, the format check, the type check, unit tests with coverage, the production build, and Playwright in Chromium. Playwright installs the Chromium browser on the runner before the end-to-end step.

The test plan also describes Firefox, WebKit, and mobile projects, live-smoke and contract jobs, and a coverage gate. Those are not in the current workflow.
