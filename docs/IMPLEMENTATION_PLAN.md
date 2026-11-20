# Chronicle v1: Implementation Plan

Milestones, work items, and how work is tracked in Jira  
Prepared by Filliciano Plong  
November 20, 2026  
Version 1.1  

## Contents

- [Revision history](#revision-history)
- [1. Inputs and how to read this plan](#1-inputs-and-how-to-read-this-plan)
- [2. Milestones](#2-milestones)
- [3. Work items](#3-work-items)
- [4. UI issues mapped to work items](#4-ui-issues-mapped-to-work-items)
- [5. Traceability](#5-traceability)
- [6. Definition of done](#6-definition-of-done)
- [7. Risks](#7-risks)
- [8. Tracking in Jira](#8-tracking-in-jira)
- [9. Decisions](#9-decisions)
- [10. Files](#10-files)

## Revision history

| Version | Date | Changes |
|---|---|---|
| 1.0 | November 14, 2026 | First release, based on SRS 1.4, Architecture 1.1, and UI Design 1.1. |
| 1.1 | November 20, 2026 | Planning lives in Jira. Work lands in one commit on main. Core epics are dated November 20 to 29, 2026; later epics run in December. |

## 1. Inputs and how to read this plan

**Readers:** Filliciano Plong, developer and tester of Chronicle. Status: accepted. Planning lives in Jira. Code and docs live in the repository, and each change lands in one commit on main.

| Input | Version or state |
|---|---|
| `docs/SRS.md` | 1.5: 124 FRs and 54 NFRs; AC-01 to AC-31; UC-01 to UC-10 |
| `docs/ARCHITECTURE.md` | 1.2: ADR-001 to ADR-011, risks R-01 to R-11, threats T-01 to T-09, spikes S-01 (done) to S-04 |
| `docs/UI_DESIGN.md` | 1.2: direction A, OD-26 to OD-33 decided, candidate issues UI-01 to UI-14 |
| Repository | fillicianoplong/chronicle, main at 8abed1d: Vite, React, and TypeScript app shell, unit and Playwright tests, CI, and the MIT license |

Items are numbered W-01 to W-64 in build order, and each is one commit on main where possible. Priority follows the SRS: Must is high, Should is medium, Could is low. A spike or chore takes the priority of the work it unblocks.

M0 sets up the repository, CI, deploy, fixtures, and the open spikes. M1 is a runnable shell on GitHub Pages. Every Must is done by the end of M7. M8 holds the Should items in keep order, then the Could items. M9 is the release.

Each item lists its acceptance as short Given / When / Then lines and the tests that prove it. Those lines become the checklist on the Jira story when that work starts.

## 2. Milestones

| Milestone | Goal | Exit criteria | Items | High / Med / Low |
|---|---|---|---|---|
| **M0 Setup and spikes** | A building, linted, tested, deployable empty app; spikes S-02 to S-04 answered. | CI runs every layer on a push to main and fails the run on a failing test; Pages deploy works; fixtures recorded; each spike has a findings note and proposed doc edits. | W-01 to W-11 (11) | 10 / 1 / 0 |
| **M1 Runnable shell** | The site loads at /chronicle/ with tokens, header, footer, and CSP. | Smoke E2E and axe pass in Chromium, Firefox, and WebKit against the built site. | W-12 to W-15 (4) | 3 / 1 / 0 |
| **M2 Data access and subject search** | A user can type a name and see Wikidata suggestions. | AC-02 and AC-03 pass; RequestGate unit tests cover pacing, timeout, 429, 400, and 5xx with a fake clock. | W-16 to W-20 (5) | 4 / 1 / 0 |
| **M3 Timeline loading** | Picking a subject loads every batch, fills labels, and shows pages of 50. | AC-01, AC-08, AC-09, AC-10, AC-16, AC-29, and AC-30 pass. | W-21 to W-29 (9) | 9 / 0 / 0 |
| **M4 Too-broad subjects** | Huge subjects load one relationship at a time; the search form can narrow before loading. | AC-11 and AC-12 pass with recorded Q30 responses. | W-30 to W-33 (4) | 4 / 0 / 0 |
| **M5 Filters, URL state, and errors** | Filters, shareable URLs, and every error message work. | AC-04 to AC-07, AC-17, AC-18, AC-25 to AC-28 pass; the fault-injection suite is green. | W-34 to W-38 (5) | 5 / 0 / 0 |
| **M6 Export, import, and selection** | Timelines and curated selections round-trip through JSON files. | AC-13 to AC-15 and AC-19 to AC-22 pass; round-trip property tests are green. | W-39 to W-46 (8) | 8 / 0 / 0 |
| **M7 Must complete** | Every Must requirement is done and checked in all supported browsers. | AC-31 passes; all ten use cases pass in every browser project; coverage and bundle gates hold; no open Must bugs. | W-47 to W-51 (5) | 5 / 0 / 0 |
| **M8 Should and Could features** | Remaining Should items in keep order, then Could items. | Each kept item's acceptance passes; any cut item is listed in the release notes. | W-52 to W-62 (11) | 0 / 8 / 3 |
| **M9 Release** | Public v1.0.0 on GitHub Pages with docs that match what shipped. | Release checklist done; README and doc versions current; tag v1.0.0. | W-63 to W-64 (2) | 2 / 0 / 0 |

**Totals:** 64 items: 50 `priority:high`, 11 `priority:medium`, 3 `priority:low`. M0 is in progress. Later milestones are not started.

## 3. Work items

Each table lists one milestone. Covers names the requirement, decision, or UI IDs the item carries.

### M0 Setup and spikes

A building, linted, tested, deployable empty app; spikes S-02 to S-04 answered.

| ID | Title | Priority / type | Covers | Acceptance | Depends on |
|---|---|---|---|---|---|
| W-01 | Scaffold Vite, React, and strict TypeScript | high / chore | NFR-45, NFR-52, ADR-001 | Given a fresh clone, when I run npm ci and npm run build, then dist/ holds index.html and about/index.html built for the /chronicle/ base path.<br>Given the TypeScript config, when I run npm run typecheck, then strict mode is on and the empty app passes.<br>Tests: build and typecheck in CI. | None |
| W-02 | ESLint with the layer boundary rules | high / chore | NFR-43, NFR-45, ADR-002, T-01 | Given a file in src/ui that calls fetch, when lint runs, then lint fails and names the boundary rule.<br>Given a file in src/core that imports React or uses dangerouslySetInnerHTML, when lint runs, then lint fails.<br>Tests: lint rule fixtures that must fail. | W-01 |
| W-03 | Vitest and Playwright test setup | high / test | NFR-46, NFR-48, NFR-51 | Given a planted failing unit test, when npm test runs, then the run fails with a clear message.<br>Given the Playwright config, when I list projects, then Chromium, Firefox, WebKit, and mobile emulation projects exist.<br>Tests: unit and E2E sample tests. | W-01 |
| W-04 | CI workflow that runs every test layer | high / test | NFR-35, NFR-45, NFR-47, NFR-48, NFR-54 | Given a push to main, when CI runs, then install from lockfile, typecheck, lint, unit with coverage, build, Playwright, npm audit, and a license check all run.<br>Given a high or critical audit finding or a license outside the License reference, when CI runs, then the job fails.<br>Tests: CI run on a push with a planted failure. | W-02, W-03 |
| W-05 | Deploy to GitHub Pages | high / packaging | NFR-52, ADR-001 | Given a push to main, when the deploy workflow runs, then the build is published and fillicianoplong.github.io/chronicle/ serves it.<br>Tests: workflow run on main. | W-01 |
| W-06 | README roadmap | high / docs | NFR-48 | Given the README, when I read the status and docs list, then it lists milestones M0 to M9 from this plan and links the project documents.<br>Tests: review only. | None |
| W-07 | Fixture recorder and first recorded responses | high / test | NFR-47, ADR-002 | Given the recorder run by hand, when it records Donald Trump, California, Julius Caesar, labels, and property search, then each fixture stores the request, the time, and the query text.<br>Given a recording run, when requests are sent, then they are spaced at least 2 s apart, like the app.<br>Tests: fixture schema test. | W-01 |
| W-08 | Spike S-02: filter 20,000 events on a phone | high / spike | QS-02, R-05, NFR-01, S-02 | Given a synthetic 20,000-event fixture, when a filter word is typed on a mid-range phone or with 4x CPU throttling, then the findings note records times against 200 ms and a Worker decision.<br>Tests: spike only. | W-01 |
| W-09 | Spike S-03: IndexedDB size and persistent storage | high / spike | ADR-009, OD-24, R-06, S-03 | Given Chrome, Firefox, and Safari, when the spike writes 20 MB and calls navigator.storage.persist(), then the note records success, the persist() result, and any eviction rule found, with sources.<br>Tests: spike only. | W-01 |
| W-10 | Spike S-04: vis-timeline chunk size on 5,000 events | medium / spike | OD-23, R-08, NFR-08, S-04 | Given vis-timeline 8.5.6 with 5,000 items, when the spike builds and opens it, then the note records the gzipped chunk size, pan and zoom smoothness, and keep or replace.<br>Tests: spike only. | W-01 |
| W-11 | Record spike results and draft doc edits | high / docs | S-02, S-03, S-04 | Given each finished spike, when I review its note, then every settled UNVERIFIED claim has a proposed SRS or architecture edit with the spike as source.<br>Tests: review only. | W-08, W-09, W-10 |

### M1 Runnable shell

The site loads at /chronicle/ with tokens, header, footer, and CSP.

| ID | Title | Priority / type | Covers | Acceptance | Depends on |
|---|---|---|---|---|---|
| W-12 | Design tokens and base styles | high / feature | NFR-36, NFR-39, UI-01 | Given any screen, when it renders in light and dark, then every color comes from tokens.css and follows the system setting.<br>Given the token pairs in the UI design, when the contrast test runs, then each pair meets 4.5:1 for text and 3:1 for controls.<br>Tests: unit contrast test over tokens.css. | W-01 |
| W-13 | App shell with header, footer attribution, and About link | high / feature | FR-122, FR-123, NFR-40 | Given any page, when it loads, then the footer says the data comes from Wikidata under CC0.<br>Given widths 320 px and 1920 px, when the page renders, then there is no horizontal scroll.<br>Tests: E2E at 320 and 1280 px. | W-12 |
| W-14 | Content Security Policy meta tag | medium / security | NFR-34, T-06, T-08 | Given the built site, when a page loads, then the CSP allows connect-src only to Wikidata hosts and upgrades insecure requests.<br>Given an E2E test that tries another host, when it runs, then the request is blocked.<br>Tests: E2E. | W-01 |
| W-15 | Smoke E2E and axe on the shell | high / test | NFR-37, NFR-51 | Given the built site, when Playwright opens /chronicle/ in each browser project, then it loads with header, main, and footer landmarks and zero serious or critical axe violations.<br>Tests: E2E, axe. | W-04, W-13 |

### M2 Data access and subject search

A user can type a name and see Wikidata suggestions.

| ID | Title | Priority / type | Covers | Acceptance | Depends on |
|---|---|---|---|---|---|
| W-16 | TimelineSource interface and FakeSource | high / feature | NFR-43, NFR-44, ADR-002 | Given a core test using FakeSource, when it runs, then fetch is never called.<br>Given the interface, when I read it, then it speaks in subject, series, batch, and labels, never SPARQL.<br>Tests: unit. | W-02, W-07 |
| W-17 | RequestGate: pacing, timeout, retries, Retry-After | high / feature | FR-84, FR-85, NFR-09, NFR-10, NFR-11, NFR-12, NFR-13, NFR-53, ADR-008, T-04 | Given a fake clock and two queries, when both are requested, then the second waits for the first and at least 2 s more.<br>Given a 429 with Retry-After: 30, when the gate handles it, then no retry is sent before 30 s.<br>Given a 400 or a 5xx, when the gate handles it, then 400 is never retried; 5xx is retried at most twice with growing delays; any request is aborted at 60 s.<br>Tests: unit with a fake Clock. | W-16 |
| W-18 | Subject search through wbsearchentities | high / feature | FR-02, FR-03, FR-04, FR-87, NFR-22 | Given the recorded response for "Donald Tru", when search runs, then Donald Trump (Q22686) is returned with label and description.<br>Given fast typing, when keys arrive, then one request is sent after the typing pause.<br>Tests: unit, contract. | W-17 |
| W-19 | Search box and suggestions | high / feature | FR-01, FR-04, FR-05, FR-06, FR-10, NFR-02, NFR-42, UI-02, AC-02 | Given the home page, when I type "Marie Cu" and press Enter, then the top suggestion opens.<br>Given the home page, when I type "zzqqxx", then a no matching subject message appears and no timeline query is sent.<br>Tests: unit, E2E, axe. | W-18, W-13 |
| W-20 | Fuzzy fallback and typed Q-ID | medium / feature | FR-09, FR-11, UI-03, AC-03 | Given no entity match for "Donld Trump", when the fuzzy fallback runs, then Donald Trump appears under No exact match.<br>Given the search box, when I type Q7186, then Marie Curie is offered.<br>Tests: unit, contract, E2E. | W-19 |

### M3 Timeline loading

Picking a subject loads every batch, fills labels, and shows pages of 50.

| ID | Title | Priority / type | Covers | Acceptance | Depends on |
|---|---|---|---|---|---|
| W-21 | Timeline batch query and result parsing | high / feature | FR-12, FR-13, FR-14, FR-15, FR-18, FR-23, FR-26, NFR-22, NFR-23, ADR-003, ADR-004, OD-22 | Given the recorded Donald Trump batch, when it is parsed, then every row has item, property, date, and precision.<br>Given the query text, when the contract test runs, then it orders by date, item, and property and uses LIMIT 5000 with OFFSET.<br>Tests: unit, contract. | W-17, W-07 |
| W-22 | Dates: parse, sort, and format at recorded precision | high / feature | FR-44, FR-45, FR-46, FR-47, NFR-23, OD-28, AC-29 | Given a 44 BCE date and a year-only 1969 date, when the timeline renders, then they show as "44 BCE" and "1969" and sort in true order.<br>Given a five-digit or negative year, when it is parsed, then it sorts correctly and never throws.<br>Tests: unit, fast-check. | W-01 |
| W-23 | Row keys, KeyStore, and TimelineStore merge | high / feature | FR-19, FR-20, FR-21, NFR-16, NFR-17, NFR-18, ADR-007 | Given the same rows in two batches, when they are merged, then no row key appears twice.<br>Given random batch splits of a fixture, when the property test runs, then the merged result equals the unpaged fixture.<br>Tests: unit, fast-check. | W-21, W-22 |
| W-24 | BatchLoader: auto batches, Stop, Resume, Retry | high / feature | FR-25, FR-27, FR-28, FR-29, FR-30, FR-31, FR-32, FR-33, FR-34, FR-86, NFR-13, NFR-14, AC-08, AC-09, AC-18 | Given a recorded 12,000-row subject, when I pick it, then events show after batch 1 and loading ends after 3 batches.<br>Given batch 1 loaded, when I select Stop, then Resume, then 5,000 rows stay and Resume fetches from row 5,001 with no duplicates.<br>Given batch 2 fails on every retry, when the loader gives up, then loading pauses, events stay, and Retry fetches batch 2.<br>Tests: unit with a fake clock, state machine tests. | W-23, W-17 |
| W-25 | LabelFiller: labels 50 at a time, visible page first | high / feature | FR-16, FR-17, FR-22, NFR-04, AC-10 | Given a batch without labels, when label lookups finish, then Q-IDs on the visible page change to English labels first.<br>Given 120 IDs to label, when the filler runs, then it sends three requests of at most 50 IDs.<br>Tests: unit. | W-17, W-23 |
| W-26 | Timeline screen: subject header, list, and event rows | high / feature | FR-17, FR-24, FR-49, FR-51, FR-52, FR-53, FR-54, NFR-16, NFR-27, UI-05, AC-01 | Given the home page, when I type "Donald Tru" and pick Donald Trump, then a date-sorted list appears with a total count.<br>Given any event row, when it renders, then it shows the date at its precision, the precision and date property, label or Q-ID, description, relationships, and a Wikidata link.<br>Tests: unit, E2E, axe. | W-24, W-25, W-19 |
| W-27 | Loading bar with progress, Stop, and Resume | high / feature | FR-29, FR-30, FR-31, FR-32, FR-82, NFR-41, UI-04 | Given a subject loading, when a batch arrives, then the bar reads "Loaded N events in B batches. More are on the way.".<br>Given loading running, when I select Stop, then the events stay and Resume appears in the bar.<br>Tests: E2E, axe. | W-24, W-26 |
| W-28 | Pages of 50 | high / feature | FR-55, FR-56, FR-57, NFR-07, UI-06, AC-16 | Given 1,897 events loaded, when I go to the last page, then it shows 47 events and reads page 38 of 38.<br>Tests: unit, E2E. | W-26 |
| W-29 | Data validation tests over all fixtures | high / test | NFR-16, FR-52, AC-30 | Given any recorded response, when the data-validation test runs, then every event has a date, a label or Q-ID, and a Wikidata link.<br>Tests: data validation. | W-23 |

### M4 Too-broad subjects

Huge subjects load one relationship at a time; the search form can narrow before loading.

| ID | Title | Priority / type | Covers | Acceptance | Depends on |
|---|---|---|---|---|---|
| W-30 | Detect too-broad subjects and relationships | high / feature | FR-35, FR-36, FR-42, ADR-006, R-01 | Given a first batch with no answer for 60 s, when the timeout fires, then the subject is marked too broad.<br>Given 502 or 504 after retries, when the loader gives up, then the subject is marked too broad.<br>Given one relationship's first batch times out, when the timeout fires, then that relationship is marked too large.<br>Tests: unit with a fake clock. | W-24 |
| W-31 | Relationship search through property search | high / feature | FR-39, ADR-006 | Given the recorded response for "jurisdiction", when property search runs, then applies to jurisdiction (P1001) is returned.<br>Tests: unit, contract. | W-17 |
| W-32 | Too-broad screen and series loading | high / feature | FR-37, FR-38, FR-40, FR-41, UI-08, AC-11, AC-12 | Given the recorded Q30 first batch times out, when I pick United States, then after 60 s a message offers relationship loading and Try again.<br>Given the too-broad message, when I pick applies to jurisdiction, then it loads as its own sorted series, and country and citizenship show "Too large" in text.<br>Tests: unit, E2E with routes and clock, axe. | W-30, W-31, W-26 |
| W-33 | Narrow before loading on the search form | high / feature | FR-07, FR-08 | Given the search form, when I set relationship author and from 1890, then pick a subject, then the query only asks for that relationship and those dates.<br>Tests: unit, contract, E2E. | W-31, W-21 |

### M5 Filters, URL state, and errors

Filters, shareable URLs, and every error message work.

| ID | Title | Priority / type | Covers | Acceptance | Depends on |
|---|---|---|---|---|---|
| W-34 | ViewEngine: text, relationship, and date filters with sort | high / feature | FR-50, FR-58, FR-59, FR-60, FR-61, FR-62, FR-63, FR-64, FR-65, FR-66, FR-68, NFR-01, AC-04, AC-05, AC-17 | Given the Donald Trump timeline, when I type "paris agreement", then events with both words anywhere remain.<br>Given the same timeline, when I pick signatory and set 2017 to 2020, then only signatory events from 2017 through 2020 remain.<br>Given 20,000 events loaded, when a filter changes, then the list updates within 200 ms.<br>Tests: unit, perf check. | W-23, W-08 |
| W-35 | Filters panel and mobile sheet | high / feature | FR-59, FR-62, FR-63, FR-64, FR-67, FR-69, FR-70, NFR-40, UI-07, AC-06 | Given a loaded timeline, when I check a relationship, then its count shows and the list updates.<br>Given filters that match nothing, when the list updates, then an empty state with Clear all filters appears.<br>Given a width under 900 px, when I open Filters, then they open in a sheet from a "Filters · n" button.<br>Tests: E2E at 360 and 1280 px, axe. | W-34, W-26 |
| W-36 | UrlState: view state in the URL | high / feature | FR-71, FR-72, FR-73, FR-74, NFR-29, ADR-011, T-03, AC-07, AC-25, AC-26 | Given a filtered, newest-first view on page 3, when its URL opens in a new browser, then the same subject, filters, sort, page, and count appear.<br>Given a URL with sort=sideways, when it opens, then the timeline loads oldest-first and a notice names sort as ignored.<br>Given a q value that is not a Q-ID, when it opens, then no query is sent and the home page shows a notice.<br>Tests: unit, E2E. | W-34, W-28 |
| W-37 | Error messages and Retry banners | high / feature | FR-34, FR-83, FR-84, FR-85, NFR-15, UI-12, AC-27, AC-28 | Given a recorded 429 with Retry-After: 30, when I pick a subject, then a wait message counts down and no retry is sent before 30 s.<br>Given a request with no answer, when 60 s pass, then it is aborted and a timeout message with Retry appears.<br>Given the network drops, when I change a filter, then loaded events still filter.<br>Tests: unit, E2E. | W-17, W-27 |
| W-38 | Fault-injection E2E suite | high / test | NFR-09, NFR-10, NFR-14, AC-11, AC-18, AC-27, AC-28 | Given Playwright routes and a controlled clock, when the suite injects timeouts, 429, 502, 504, offline, slow labels, and bad JSON, then each case shows the right message and keeps loaded events.<br>Tests: E2E. | W-37, W-32 |

### M6 Export, import, and selection

Timelines and curated selections round-trip through JSON files.

| ID | Title | Priority / type | Covers | Acceptance | Depends on |
|---|---|---|---|---|---|
| W-39 | Export schema and Export all | high / feature | FR-90, FR-91, ADR-010 | Given a timeline still loading, when I select Export all, then a JSON file downloads that validates against schema version 1 and includes the progress.<br>Tests: unit, E2E. | W-24, W-36 |
| W-40 | Import with validation and the rejection dialog | high / security | FR-92, FR-93, FR-96, NFR-30, NFR-31, OD-25, T-02, UI-11, AC-13, AC-15 | Given an exported file, when I import it in a new browser, then the same events, order, filters, and sort appear with no Wikidata request.<br>Given a file with an unknown schema version or a <script> label, when I import it, then the version is rejected with a reason and the label shows as plain text.<br>Given a file over 50 MB or with __proto__ keys, when I import it, then it is refused and nothing changes.<br>Tests: unit, fast-check malformed files, E2E. | W-39 |
| W-41 | Resume an imported timeline | high / feature | FR-94, FR-95, NFR-18, OD-21, AC-14 | Given an imported file with 2 of 3 batches complete, when I select Resume, then loading restarts one batch early, only new rows are kept, and no key appears twice.<br>Tests: unit, E2E. | W-40, W-24 |
| W-42 | Selection by event key | high / feature | FR-99, FR-100, FR-101, FR-102, FR-103, FR-104, FR-105, NFR-05, NFR-21, AC-19 | Given 3 events selected on page 1, when I change page, filter, sort, then clear filters, then the same 3 are selected and the count reads 3.<br>Given 20,000 events loaded, when I select all filtered, then it applies within 200 ms.<br>Tests: unit, E2E. | W-26, W-34 |
| W-43 | Selection bar and File menu | high / feature | FR-101, FR-102, FR-103, FR-106, UI-09, UI-11 | Given one or more selected events, when the list renders, then the bar shows the count, Select all filtered, Clear, and Export selected.<br>Given the File menu, when I use only the keyboard, then arrow keys move, Enter picks, and Esc returns focus to File.<br>Tests: E2E, axe. | W-42, W-39 |
| W-44 | Export selected as a curated file | high / feature | FR-106, FR-107, FR-108, FR-109, AC-20 | Given 5 events selected and 2 hidden by a filter, when I select Export selected, then the file is marked curated and holds all 5 with labels, dates, relationships, and source links.<br>Tests: unit, E2E. | W-43 |
| W-45 | Import a curated file and load the rest | high / feature | FR-110, FR-111, FR-112, NFR-20, AC-21, AC-22 | Given a curated file of 40 events, when I import it, then exactly those 40 show, all selected, with no Wikidata request.<br>Given that import, when I select Load the rest, then the full timeline loads, the 40 stay selected, and no key appears twice.<br>Tests: unit, E2E. | W-44, W-41 |
| W-46 | Round-trip property tests | high / test | NFR-17, NFR-18, NFR-19, NFR-20, NFR-21 | Given generated timelines, splits, and resume points, when fast-check runs export then import, resume, and load the rest, then events, order, filters, sort, progress, and selection are identical and no key repeats.<br>Tests: fast-check. | W-45 |

### M7 Must complete

Every Must requirement is done and checked in all supported browsers.

| ID | Title | Priority / type | Covers | Acceptance | Depends on |
|---|---|---|---|---|---|
| W-47 | Accessibility pass and axe in every state | high / test | NFR-36, NFR-37, NFR-38, NFR-39, NFR-40, NFR-41, NFR-42, UI-14, AC-31 | Given each state in the UI design axe list, when the suite runs at 320 and 1280 px, light and dark, then axe reports zero serious or critical violations.<br>Given only a keyboard, when I find a subject, filter it, and export a selection, then every step works with visible focus.<br>Tests: E2E, axe. | W-46, W-38, W-35 |
| W-48 | End-to-end use cases in every supported browser | high / test | NFR-51, UC-01, UC-02, UC-03, UC-04, UC-05, UC-06, UC-07, UC-08, UC-10 | Given the recorded fixtures, when each use case runs in Chromium, Firefox, WebKit, and mobile emulation, then every Must use case passes.<br>Tests: E2E. | W-47 |
| W-49 | Privacy and safe-rendering checks | high / security | NFR-25, NFR-26, NFR-27, NFR-28, NFR-30, T-01, T-06 | Given a full session recorded by Playwright, when I search, load, select, and export, then no cookie is set and every request goes to a Wikidata host.<br>Given a fixture label containing <img onerror>, when the row renders, then the text shows literally and no script runs.<br>Tests: E2E. | W-45 |
| W-50 | Performance targets and bundle budget | high / test | NFR-01, NFR-03, NFR-05, NFR-06, NFR-07, NFR-08, QS-01, QS-02 | Given 20,000 loaded events, when the perf test changes a filter, then the update takes 200 ms or less.<br>Given the production build, when CI measures the first-load JavaScript, then the job fails above 300 KB compressed.<br>Tests: perf tests, CI size check. | W-34, W-42 |
| W-51 | Coverage thresholds and coverage summary | high / test | NFR-46, NFR-50 | Given a change that drops line coverage under 80% or branch coverage under 70%, when CI runs, then the job fails.<br>Given a CI run, when it finishes, then the coverage summary is visible in the run.<br>Tests: CI. | W-04, W-46 |

### M8 Should and Could features

Remaining Should items in keep order, then Could items.

| ID | Title | Priority / type | Covers | Acceptance | Depends on |
|---|---|---|---|---|---|
| W-52 | Notes and tags drawer | medium / feature | FR-114, FR-115, FR-117, NFR-32, NFR-33, OD-24, UI-10 | Given an event, when I open its note, then focus moves to the note field and the counter shows n / 2,000.<br>Given browser storage is full, when I save, then a warning shows and the unsaved note stays on screen.<br>Given my first note or selection, when it is saved, then the browser is asked once for persistent storage.<br>Tests: unit, E2E, axe. | W-42, W-09 |
| W-53 | Tag filter, Selected only, and delete saved data | medium / feature | FR-113, FR-116, FR-120, AC-23 | Given a note and the tag trade on one event, when the page reloads and the tag filter is trade, then only that event shows, with its note.<br>Given saved data for a subject, when I confirm Delete saved data, then selection, notes, and tags for that subject are gone.<br>Tests: unit, E2E. | W-52 |
| W-54 | Notes and tags in files, and the privacy test | medium / feature | FR-118, FR-119, AC-23, AC-24 | Given an event with a note and a tag, when I export full and curated files, then both carry the note and tag, and import restores them.<br>Given an event with a note, when Playwright records all requests, then no request contains the note or tag text.<br>Tests: unit, E2E. | W-52, W-45 |
| W-55 | About page | medium / docs | FR-43, FR-124, R-07, T-07 | Given the About page, when I read it, then it explains gathering, why a date range does not make a broad subject loadable, the missing scholarly articles, and that notes are unencrypted in this browser.<br>Tests: E2E, axe. | W-13 |
| W-56 | Copy link, event links, and Back and Forward | medium / feature | FR-75, FR-76, FR-77 | Given any view, when I select Copy link, then the current URL is on the clipboard.<br>Given an event link, when I open it, then the page holding that event opens scrolled to it.<br>Given three views visited, when I press Back twice, then the first view returns.<br>Tests: E2E. | W-36 |
| W-57 | Visual timeline view | medium / feature | FR-78, FR-79, FR-80, FR-81, NFR-08, OD-23, UI-13, UC-09 | Given the Visual timeline tab, when I press + and the arrow keys, then the view zooms from centuries to days and pans.<br>Given an item on the timeline, when I select it, then its details show below.<br>Given the home page, when it loads, then the vis-timeline chunk is not downloaded.<br>Tests: E2E, axe, bundle check. | W-10, W-34 |
| W-58 | 24-hour cache and Refresh | medium / feature | FR-88, FR-89, FR-97, ADR-009 | Given a subject fetched within 24 hours, when I open it again, then it shows with its progress and no Wikidata request.<br>Given a cached or imported timeline, when it shows, then the fetch time and Refresh appear, and Refresh reloads it in full.<br>Tests: unit, E2E. | W-09, W-24 |
| W-59 | Weekly live contract check | medium / test | NFR-49, R-02 | Given the weekly schedule, when the job replays small recorded requests live, then it passes, or fails naming the changed field.<br>Tests: contract (live). | W-18, W-21 |
| W-60 | Future-date marker | low / feature | FR-48 | Given an event dated after today, when it renders, then it shows a Future badge in text.<br>Tests: unit, E2E. | W-26 |
| W-61 | CSV download of filtered events | low / feature | FR-98, NFR-24 | Given filtered events with commas, quotes, and line breaks in labels, when I download CSV, then the file follows RFC 4180 and reopens with the same values.<br>Tests: unit. | W-34 |
| W-62 | Text filter matches notes and tags | low / feature | FR-121 | Given a note containing "translation", when I type translation in the text filter, then that event remains.<br>Tests: unit. | W-53 |

### M9 Release

Public v1.0.0 on GitHub Pages with docs that match what shipped.

| ID | Title | Priority / type | Covers | Acceptance | Depends on |
|---|---|---|---|---|---|
| W-63 | Release notes and docs sync | high / docs | NFR-48 | Given the kept and cut Should items, when I write the release notes, then they list what shipped and what was cut, and doc versions match.<br>Tests: review only. | W-48 |
| W-64 | Public release checklist | high / chore | NFR-52 | Given main is green, when I run the checklist, then Pages serves the build, branch protection is on, no Must bug is open, and v1.0.0 is tagged.<br>Tests: manual checklist. | W-63, W-05 |

## 4. UI issues mapped to work items

The UI design listed 14 candidate issues. Each one is folded into the work items below rather than filed separately.

| UI issue | Title | Work items |
|---|---|---|
| UI-01 | Design tokens and base styles | W-12 |
| UI-02 | Search box and suggestions | W-19 |
| UI-03 | Fallback and no-result messages | W-19, W-20 |
| UI-04 | Loading bar with Stop and Resume | W-27 |
| UI-05 | Event row | W-26 |
| UI-06 | Pager and page in the URL | W-28, W-36 |
| UI-07 | Filters panel and mobile sheet | W-35 |
| UI-08 | Too-broad screen | W-32 |
| UI-09 | Selection and selection bar | W-42, W-43 |
| UI-10 | Notes and tags drawer | W-52 |
| UI-11 | File menu, import, and errors | W-40, W-43 |
| UI-12 | Error banners | W-37 |
| UI-13 | Visual timeline view | W-57 |
| UI-14 | Accessibility checks in CI | W-47 |

## 5. Traceability

The build checks every Must requirement in the SRS against the Covers column. 124 Must requirements (90 FRs and 34 NFRs) map to at least one item.

| Area | Requirements | Milestones |
|---|---|---|
| Subject search | FR-01 to FR-11, NFR-02, NFR-42 | M2, M4 |
| Timeline query and loading | FR-12 to FR-34, NFR-09 to NFR-14 | M2, M3 |
| Too-broad subjects | FR-35 to FR-43 | M4, M8 |
| Dates | FR-44 to FR-48, NFR-23 | M3, M8 |
| List, paging, filters | FR-49 to FR-70, NFR-01, NFR-07 | M3, M5 |
| Links and URL state | FR-71 to FR-77, NFR-29 | M5, M8 |
| Visual timeline | FR-78 to FR-81, NFR-08 | M0, M8 |
| Errors and cache | FR-82 to FR-89, NFR-15 | M3, M5, M8 |
| Export and import | FR-90 to FR-98, NFR-19, NFR-30, NFR-31 | M6, M8 |
| Curation | FR-99 to FR-121, NFR-05, NFR-21, NFR-28, NFR-32, NFR-33 | M6, M8 |
| About and attribution | FR-122 to FR-124 | M1, M8 |
| Security, accessibility, testing, portability | NFR-25 to NFR-54 | M0, M1, M7, M8 |

**Gaps:** none. Every FR and NFR, every acceptance criterion AC-01 to AC-31, and every UI candidate issue maps to at least one item.

## 6. Definition of done

Accepted as decision D-01. Testing is a main goal of Chronicle, so every item lands with its tests.

### 6.1 Per item

- The Jira story's acceptance checklist is ticked.
- New behavior has tests at the right layer: Vitest for unit, contract, data, and round trip; Playwright for E2E and fault injection; axe for accessibility.
- CI on GitHub Actions passes: typecheck, lint, unit with coverage, build, Playwright in Chromium, Firefox, WebKit, and mobile emulation, audit, license check.
- The architecture boundary rules hold: only RequestGate calls fetch, src/core imports no React, nothing outside src/data imports its internals, and no innerHTML or dangerouslySetInnerHTML is used.
- Any UNVERIFIED item the work settles has a proposed doc edit.
- The work lands in one commit on main, and the Jira story is moved to Done.

Every Jira story ends with this exact line:

**Done when: checklist ticked; tests, typecheck, and lint pass in CI; the boundary rules hold (only RequestGate calls fetch, src/core imports no React, nothing outside src/data imports its internals, no innerHTML or dangerouslySetInnerHTML); any UNVERIFIED item settled has a proposed doc edit; the work lands in one commit on main, and the Jira story is moved to Done.**

### 6.2 Plan level

- Every item that lands on main meets the per-item definition.
- CI is green on main.
- The site deploys to GitHub Pages from GitHub Actions.
- All Must acceptance criteria (AC-01 to AC-31, except Should-only ones that were cut) pass against recorded responses.
- Spike findings are filed, and every UNVERIFIED claim is either checked or deferred with the owner's OK.
- The SRS, architecture, UI design, this plan, and the README carry the versions that match what shipped.

## 7. Risks

Risks come from the architecture document. Each one has a planned response in a work item.

| ID | Risk | Plan response |
|---|---|---|
| R-01 | WDQS timing varies, so an ordinary subject can look too broad | Try again on the too-broad screen (W-32); fault-injection cases (W-38) |
| R-02 | Wikidata changes response shapes or rules | Contract tests (W-18, W-21); weekly live check (W-59); one data layer (W-16) |
| R-03 | Edits between Stop and Resume shift offsets | Resume one batch early for files and cache (W-41); KeyStore drops overlap (W-23) |
| R-04 | Precision makes the first batch slower than 10 s | Show each batch as it lands (W-24); record the time in W-50; target, not a gate |
| R-05 | Filtering 20,000 events misses 200 ms on a phone | Spike S-02 first (W-08); Worker only if needed; perf test (W-50) |
| R-06 | Browsers evict site storage | Spike S-03 (W-09); persistent storage request (W-52); export reminder on the About page (W-55) |
| R-07 | Scholarly articles missing from the main graph | Stated on the About page (W-55) |
| R-08 | vis-timeline breaks the 300 KB budget | Spike S-04 (W-10); lazy chunk; bundle check in CI (W-50) |
| R-09 | The too-large relationship list is incomplete | Mark any relationship that times out (W-30) |
| R-10 | Shared IPs hit 429 limits | Retry-After and a clear message (W-17, W-37); cache (W-58) |
| R-11 | Two tabs edit the same notes | Write per event (W-52); documented on the About page |
| Setup | The Pages source is a repository setting | Filliciano sets it by hand during M0 (W-05) |

## 8. Tracking in Jira

Planning lives in the Chronicle Jira project (key CHR) at fillicianoplong.atlassian.net. There is one epic per milestone, with a start date and a due date so the work shows on the Jira timeline. Stories and bugs are added as each piece of work starts. Bugs are filed as Jira Bugs under the relevant epic.

The core, portfolio-ready slice is scheduled for November 20 to 29, 2026: setup and CI, Wikidata search and fetch, a date-sorted and filterable event list with source links, the new look, testing, and a GitHub Pages release. Must complete and Release are retargeted to that core path and the portfolio cut, not the close-out of every Must in the full plan. Too-broad subjects, JSON export and import, the visual timeline, browser storage, and later polish follow in December, at an easier pace.

| Epic | Start | Due | Window |
|---|---|---|---|
| Setup and spikes | November 20, 2026 | November 20, 2026 | Core (10-day) |
| Runnable shell | November 21, 2026 | November 21, 2026 | Core (10-day) |
| Data access and subject search | November 22, 2026 | November 23, 2026 | Core (10-day) |
| Timeline loading | November 24, 2026 | November 26, 2026 | Core (10-day) |
| Filters, URL state, and errors | November 27, 2026 | November 28, 2026 | Core (10-day) |
| Must complete | November 29, 2026 | November 29, 2026 | Core (10-day) |
| Release | November 29, 2026 | November 29, 2026 | Core (10-day) |
| Too-broad subjects | December 1, 2026 | December 4, 2026 | After |
| Export, import, and selection | December 7, 2026 | December 16, 2026 | After |
| Should and Could features | December 17, 2026 | December 31, 2026 | After |

The new look's tokens start in Runnable shell and carry through the list and filter work. Must complete and Release share November 29: the quality check first, then the Pages cut.

## 9. Decisions

The decisions below are accepted.

| ID | Decision | Why needed | Decision made |
|---|---|---|---|
| D-01 | Definition of done | Needed so every item finishes the same way | Accept the definition in *6. Definition of done*. Each Jira story uses the same Done when line. The work lands in one commit on main, and the story is moved to Done. |
| D-02 | NFR-50 asks for a coverage badge, but the README format has no badges | Conflict between the SRS and the README style | No badge. CI shows the coverage summary, and the README states the 80% and 70% targets in text. The SRS wording for NFR-50 is still to be updated. |
| D-03 | Keep order for Should items | The SRS has no drop order | Build M8 in the order listed (notes and tags first, weekly contract check last); cut from the end if time runs short. Could items come after. |
| D-04 | Small Shoulds bundled into Must items | Splitting them saves nothing | Keep FR-22, FR-23, FR-58, FR-68, FR-69, FR-70, NFR-15, and NFR-53 inside their Must items; they ship with them. |
| D-05 | Node version | Needed for CI and .nvmrc | The current Node LTS line at setup (**UNVERIFIED:** check nodejs.org). |
| D-06 | Epic start and due dates | Needed for the Jira timeline | Set on each epic as listed in *8. Tracking in Jira*: core work November 20 to 29, 2026; later epics in December. |
| D-07 | Where planning is tracked | Needed a home for epics, stories, and bugs | Planning lives in the Chronicle Jira project (CHR) at fillicianoplong.atlassian.net. One epic per milestone, with stories and bugs added as each piece starts. |

One repository setting needs Filliciano by hand: the Pages source set to GitHub Actions (W-05).

## 10. Files

| Path | What |
|---|---|
| `docs/IMPLEMENTATION_PLAN.md` | This plan |
| `docs/Plong_Chronicle_Implementation_Plan.docx` | Word copy |
| `docs/out/Plong_Chronicle_Implementation_Plan.pdf` | PDF copy |
