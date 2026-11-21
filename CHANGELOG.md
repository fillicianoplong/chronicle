# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Runnable shell:** Vite, React, and TypeScript scaffold, with ESLint and Prettier.
- ESLint layer boundary rules. Only RequestGate may call fetch, core code may not import React, data-layer internals stay inside `src/data`, and `innerHTML` is banned.
- Playwright projects for Chromium, Firefox, WebKit, Pixel 7, and iPhone 14. End-to-end tests block live Wikidata calls.
- CI runs `npm audit` and a license check. High or critical advisories fail the job, and so does a license outside the allowed set.
- README roadmap for milestones M0 through M9, with links to the project documents.
- A fixture recorder, plus recorded Wikidata responses for Donald Trump, California, Julius Caesar, label lookup, and subject and property search.
- Spike notes for filtering 20,000 events. On a 4x CPU throttle the precomputed filter stayed under 5 ms, so a Web Worker is not the default.
- Spike notes for IndexedDB. A 20 MB value round-tripped in Chromium, Firefox, and WebKit. Persistent storage was not granted.
- Spike notes for vis-timeline 8.5.6. The lazy JavaScript chunks are 152,872 bytes gzipped together. Keep the library, and do not open the view on all 5,000 events at once.
- Vitest unit tests and Playwright end-to-end tests with axe.
- GitHub Actions CI workflow (lint, formatting, typecheck, unit tests with coverage, build, and Playwright).
- MIT license.
- Project documentation: requirements 1.5, architecture 1.2, UI design 1.2, implementation plan 1.1, and test plan 1.1.

### Changed

- Planning is tracked in Jira. Code and docs land in one commit on `main`.
- Locked in the Plakat visual design, with a list view and a timeline view. The UI design document is now version 1.3.

[Unreleased]: https://github.com/fillicianoplong/chronicle/commits/main
