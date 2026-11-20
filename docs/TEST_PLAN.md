# Chronicle v1: Test Plan

Test levels, test cases, and requirement coverage  
Prepared by Filliciano Plong  
November 20, 2026  
Version 1.1  

## Contents

- [Revision history](#revision-history)
- [1. Scope and approach](#1-scope-and-approach)
- [2. Test levels](#2-test-levels)
- [3. Environments and browsers](#3-environments-and-browsers)
- [4. Test data and fixtures](#4-test-data-and-fixtures)
- [5. Entry and exit criteria](#5-entry-and-exit-criteria)
- [6. Coverage targets](#6-coverage-targets)
- [7. Test cases](#7-test-cases)
- [8. Requirement-to-test matrix](#8-requirement-to-test-matrix)
- [9. Defect handling](#9-defect-handling)
- [10. Risks](#10-risks)
- [11. Decisions for the owner](#11-decisions-for-the-owner)
- [12. Files](#12-files)

## Revision history

| Version | Date | Changes |
|---|---|---|
| 1.0 | November 19, 2026 | First release, based on SRS 1.4, Architecture 1.1, UI Design 1.1, and Implementation Plan 1.0. |
| 1.1 | November 20, 2026 | Results are recorded in CI on main and in Jira. Bugs are filed as Jira Bugs. TD-01 to TD-04 are approved. |

## 1. Scope and approach

**Readers:** Filliciano Plong, developer and tester of Chronicle, and reviewers of the repository. **Status:** in progress. The app shell already has unit tests and Playwright checks, including an accessibility scan, and those tests pass in CI.

This plan covers Chronicle v1 as specified in SRS 1.5: subject search, timeline loading in batches, too-broad subjects, filters and URL state, error handling, export and import, selection, notes and tags, accessibility, privacy, and the build. The Wikidata services themselves are out of scope; their responses are recorded and replayed.

| Input | Used for |
|---|---|
| `docs/SRS.md` 1.5 | 124 FRs and 54 NFRs, acceptance criteria, quality scenarios |
| `docs/ARCHITECTURE.md` 1.2 | Components, risk register R-01 to R-11, threats, verification column of the quality scenarios |
| `docs/UI_DESIGN.md` 1.2 | Screen states for axe, message wording, widths, and keyboard paths |
| `docs/IMPLEMENTATION_PLAN.md` 1.1 | Work items W-01 to W-64; each test case names the item that builds it |

The approach is test-first where the logic is pure, and fixture-first everywhere else:

- Most checks run as fast unit and integration tests against FakeSource, with no network.
- End-to-end tests run the built site in five browser projects, with every Wikidata host routed to recorded responses.
- Higher-risk areas get boundary and negative cases first: RequestGate timing, batch edges, URL input, file import, and rendering of untrusted text.
- Live Wikidata is touched only by the weekly contract check and a small opt-in smoke suite.
- Expected results are written before the code. Actual results live in CI runs on main and in Jira, never in this plan.

## 2. Test levels

Eight levels, from cheapest to most expensive. Each test case in *7. Test cases* names one.

| Level | Tool | What it checks | When it runs |
|---|---|---|---|
| Unit | Vitest | Pure logic in `src/core` and parsing in `src/data`: dates, keys, filters, URL parsing, file checks, RequestGate rules on a fake clock. | Every push |
| Integration | Vitest | Core stores and loaders wired to FakeSource or a fake RequestGate with recorded responses. No network. | Every push |
| Contract | Vitest | Recorded SPARQL and API responses parsed by WikidataSource; a weekly job checks the same shapes against the live services. | Every push; weekly live |
| E2E | Playwright | The built site in real browser engines, with every Wikidata host routed to recorded fixtures or fault routes. | Every push |
| Accessibility | Playwright with axe | Automated rules in each listed UI state, plus keyboard and live-region checks. | Every push |
| Performance | Vitest bench, Playwright | Timing against the SRS targets on synthetic 20,000-event data; bundle size in CI. Live timings are recorded, not gated. | Every push; live before release |
| Static | TypeScript, ESLint, npm audit | Strict types, layer boundary rules, dependency audit, licenses, coverage thresholds. | Every push |
| Manual | Real devices, screen readers | Exploratory charters, screen reader passes, live timings, and the opt-in live smoke suite. | Before release |

**Test cases by level**

| Level | Automated | Manual |
|---|---|---|
| Integration | 15 | 0 |
| Unit | 34 | 0 |
| E2E | 51 | 1 |
| Contract | 2 | 0 |
| Performance | 4 | 2 |
| Static | 5 | 0 |
| Accessibility | 1 | 0 |
| Manual | 0 | 4 |
| **Total** | **112** | **7** |

## 3. Environments and browsers

| Environment | Setup | Use |
|---|---|---|
| Local | Node LTS (plan D-05), Vitest, Playwright browsers | Day-to-day runs; `npm test`, `npm run e2e` |
| CI | GitHub Actions, ubuntu-latest | Every push to main; Wikidata hosts blocked, so a live call fails its test |
| CI weekly | GitHub Actions schedule | Live contract check only (NFR-49) |
| Live smoke | Local machine, opt-in `npm run test:live` | Three small subjects, spaced requests; never on pushes to main, only on a schedule or by hand |
| Deployed | GitHub Pages, fillicianoplong.github.io/chronicle/ | Post-deploy smoke |

Browser coverage follows NFR-51. The five Playwright projects run every end-to-end case on every push.

| Browser | Stands for | How |
|---|---|---|
| Chromium | Desktop Chrome, 1280 px | Playwright project |
| Firefox | Desktop Firefox, 1280 px | Playwright project |
| WebKit | Desktop Safari, 1280 px | Playwright project |
| Pixel 7 emulation | Chrome on Android, 412 px | Playwright project |
| iPhone 14 emulation | Safari on iOS, 390 px | Playwright project |
| Previous major versions | Second-latest Chrome, Firefox, Safari, Edge | Manual spot check before release (decision TD-04) |
| Real phones | One Android, one iPhone | Exploratory charters |

## 4. Test data and fixtures

Fixtures live in `tests/fixtures/` and are recorded by the fixture recorder (W-07). Each recorded file keeps the request that produced it, so the weekly contract check can replay it.

| Fixture | Content | Kind |
|---|---|---|
| `search-*.json` | wbsearchentities and fuzzy search responses for Donald Trump, Marie Curie, and an empty result | Recorded |
| `trump-batch-1.json` | Donald Trump (Q22686), first batch, plus its label responses | Recorded |
| `curie-batch-1.json` | Marie Curie (Q7186), 1,214 events; day, month, and year precision | Recorded |
| `caesar-batch-1.json` | Julius Caesar; BCE dates | Recorded |
| `california-batch-1..3.json` | 12,000 rows as 5,000 + 5,000 + 2,000 for multi-batch, Stop, Resume, and file tests | Recorded |
| `labels-*.json` | wbgetentities responses, 50 IDs each; one item without an English label | Recorded |
| `properties-juris.json` | Property search for the relationship picker | Recorded |
| Q30 stall route | United States: first batch never answers (too-broad subject) | Fault route |
| Fault routes | 429 with Retry-After: 30, 400, 500, 502, 504, stall to 60 s, offline, bad JSON, slow labels | Fault route |
| `labels-hard.json`, `labels-script.json` | Commas, quotes, line breaks, other scripts, and HTML or script text | Synthetic |
| Synthetic 20,000 and 1,897 events | Generated at test time for performance and paging | Generated |
| Export files | Full and curated, schema version 1; bad versions, bad IDs, `javascript:` links, `__proto__` keys, deep nesting, 50 MB edges | Generated |

### 4.1 Date precision table

Dates are the highest-risk parsing in the app. Every row below is a unit case and appears in at least one fixture.

| Wikidata value | Precision | Shown as | Note |
|---|---|---|---|
| `+1903-12-10T00:00:00Z` | 11 (day) | `10 Dec 1903` | 1903 Nobel Prize in Physics (Curie fixture) |
| `+1911-12-00T00:00:00Z` | 10 (month) | `Dec 1911` | Month-only event |
| `+1898-00-00T00:00:00Z` | 9 (year) | `1898` | Publication year only |
| `+1910-00-00T00:00:00Z` | 8 (decade) | `1910s` | Building inception |
| `+1850-00-00T00:00:00Z` | 7 (century) | `19th century` | **UNVERIFIED:** which year value Wikidata stores for a century; pin with a real fixture |
| `-0043-00-00T00:00:00Z` | 9 (year) | `44 BCE` | Julius Caesar fixture; year 0 is 1 BCE (UNVERIFIED in the architecture) |
| `+1969-00-00T00:00:00Z` and `+1969-07-20T00:00:00Z` | 9 and 11 | `1969`, `20 Jul 1969` | Sort order: year-only first |
| `+10000-00-00T00:00:00Z` | 9 (year) | `10000` | Five-digit year |

## 5. Entry and exit criteria

| Stage | Entry | Exit |
|---|---|---|
| Each commit / story | Its work item's acceptance lines and test cases are known | All automated cases for the item pass in CI on main; typecheck, lint, and coverage pass; any new bug is filed in Jira |
| M7 Must complete | W-01 to W-51 landed on main | Every automated case covering a Must passes in all five browser projects; axe shows zero serious or critical violations |
| M9 Release | M8 landed on main, or cut items listed | All cases pass or are marked deferred; manual cases and exploratory charters done; no open blocker or major bug |

Testing on a commit stops early if the build or fixtures are broken; fix those first.

## 6. Coverage targets

Coverage is measured by Vitest over the unit, integration, and contract layers. End-to-end runs are not counted.

- `src/core`: at least 80% of lines.
- All of `src/`: at least 80% of lines and 70% of branches (NFR-46).
- CI fails below either target and prints the coverage summary. The README states the targets in text, with no badge (plan decision D-02).
- Coverage is a floor, not the goal: the matrix in *8. Requirement-to-test matrix* is the measure that matters.

## 7. Test cases

119 cases: 112 automated and 7 manual. Each row gives the steps and data, the expected result, the requirements, and the level, mode, tool, and work item. Titles marked boundary or negative are the higher-risk cases.

### 7.1 Subject search

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-01 | **Entity search returns partial matches.** Call subject search for "Donald Tru" through FakeSource. | `search-donald-tru.json` | Donald Trump (Q22686) is first, with label, description, and Q-ID. | FR-02, FR-03, FR-04 | Integration · Automated · Vitest · W-18 |
| TC-02 | **Search waits for a typing pause.** Send six keystrokes 50 ms apart on a fake clock, then wait. | Fake clock | Exactly one search request, sent after the pause; none during typing. | FR-87 | Unit · Automated · Vitest · W-18 |
| TC-03 | **Type, pick, view in three steps.** Open home; type "Marie Cu"; press Enter. | `search-marie-cu.json`, Curie batch | The Q7186 timeline opens; no timeline query is sent before the pick; three user actions in total. | FR-01, FR-05, FR-10, NFR-42 | E2E · Automated · Playwright · W-19 |
| TC-04 | **No matching subject (negative).** Type "zzqqxx" and wait for the pause. | Empty entity and fuzzy search responses | "No matching subject. Check the spelling or try another name." shows; zero requests to query.wikidata.org. | FR-05, FR-06 | E2E · Automated · Playwright · W-19 |
| TC-05 | **Fuzzy fallback finds a typo.** Type "Donld Trump". | Empty entity response; recorded fuzzy response | Donald Trump appears under "No exact match. Close matches:". | FR-09 | E2E · Automated · Playwright · W-20 |
| TC-06 | **Typed Q-ID, with boundary values.** Enter Q7186, Q1, Q0, Q01, and "Q7186 x". | None | Q7186 and Q1 are offered as subjects; Q0, Q01, and "Q7186 x" are treated as plain search text. | FR-11, NFR-29 | Unit · Automated · Vitest · W-20 |
| TC-07 | **Narrow before loading.** Set relationship P50 and from 1890 on the search form; pick Q7186; capture the query text. | Curie batch | The query asks only for P50 and dates from 1890; the URL holds `srel=P50&sfrom=1890`. | FR-07, FR-08 | Integration · Automated · Vitest · W-33 |

### 7.2 Timeline query and dates

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-08 | **Batch query shape.** Build the query for Q22686 at offset 5000; parse the recorded response. | `trump-batch-1.json` | Any direct property; P585, P577, P580, P571; value and precision from the best-rank statement; no label service; ORDER BY date, item, property; LIMIT 5000 OFFSET 5000; SPARQL JSON accepted. | FR-12, FR-13, FR-15, FR-18, FR-26 | Contract · Automated · Vitest · W-21 |
| TC-09 | **No date limits by default.** Build the query with empty search-form fields. | None | The query has no lower or upper date filter. | FR-14 | Unit · Automated · Vitest · W-21 |
| TC-10 | **Subject's own dated statements.** Parse the Curie fixture. | `curie-batch-1.json` | Date of birth and date of death appear as events of the subject. | FR-23 | Integration · Automated · Vitest · W-21 |
| TC-11 | **Labels with hard characters.** Parse and render labels with commas, quotes, line breaks, Arabic, Chinese, and emoji. | `labels-hard.json` (synthetic) | Every string comes back byte for byte; nothing is split or escaped twice. | NFR-22 | Unit · Automated · Vitest · W-21 |
| TC-12 | **Every Wikidata date form parses.** Parse each row of the date precision table, plus +10000, -10000, and -13798000000. | Date precision table | Every value parses without throwing and keeps its precision. | NFR-23, FR-44 | Unit · Automated · Vitest · W-22 |
| TC-13 | **Format at recorded precision.** Format each row of the date precision table. | Date precision table | Each output equals the table: `10 Dec 1903`, `Dec 1911`, `1898`, `1910s`, `19th century`, `44 BCE`; no day or month is invented. | FR-45, FR-46 | Unit · Automated · Vitest · W-22 |
| TC-14 | **BCE boundary around year 1.** Format -0000, -0001, and +0001 at year precision. | None | `1 BCE`, `2 BCE`, and `1`; there is no year 0 shown. | FR-45 | Unit · Automated · Vitest · W-22 |
| TC-15 | **True date order.** Sort a shuffled list holding 10001 BCE, 44 BCE, 1969 (year), 20 Jul 1969 (day), and 1910s. | Generated with fast-check | Chronological order every time; year-only 1969 comes before 20 Jul 1969. | FR-44, FR-47 | Unit · Automated · Vitest, fast-check · W-22 |
| TC-16 | **BCE and year-only dates on screen.** Open the Julius Caesar fixture subject and read the first rows. | `caesar-batch-1.json` | "44 BCE" and other BCE years show in true order, each with its precision line. | FR-44, FR-45, FR-46 | E2E · Automated · Playwright · W-26 |
| TC-17 | **Future-date marker.** Render an event dated 2031 with the clock set to 19 Nov 2026. | Synthetic event | The row shows a "Future" badge in text. | FR-48 | Unit · Automated · Vitest · W-60 |

### 7.3 Batch loading, labels, and RequestGate

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-18 | **Row key and duplicate drop.** Add the same 5,000 rows twice to KeyStore. | `california-batch-1.json` | Keys read item\|property\|date; the second add keeps zero rows. | FR-19, FR-20, NFR-18 | Unit · Automated · Vitest · W-23 |
| TC-19 | **Same item and date merge into one event.** Add two rows for one item and date with different properties, from different batches. | Synthetic rows | One event with both relationships. | FR-21 | Unit · Automated · Vitest · W-23 |
| TC-20 | **Batches equal one unpaged result.** Split the California fixture into random batch sizes, repeats, and orders; merge. | California fixture, fast-check | The merged events equal the unpaged fixture: same set, same order, no duplicates. | NFR-17 | Unit · Automated · Vitest, fast-check · W-23 |
| TC-21 | **Every event has a date, label or Q-ID, and source.** Run the data-validation check over every fixture. | All fixtures | Each event has a date, a label or Q-ID, a date property, and a Wikidata link. | NFR-16, FR-52, FR-24 | Unit · Automated · Vitest · W-29 |
| TC-22 | **Batches load until a short batch.** Pick the 12,000-row subject on FakeSource. | California: 5,000 + 5,000 + 2,000 rows | Events show after batch 1; progress reaches 12,000 rows in 3 batches; no fourth request. | FR-25, FR-27, FR-28, FR-29, FR-30, FR-33 | Integration · Automated · Vitest · W-24 |
| TC-23 | **Exactly 5,000 rows (boundary).** Serve 5,000 rows, then 5,000, then 0. | Synthetic batches | A third request is sent, returns 0 rows, and loading ends; no fourth. | FR-28, FR-33 | Integration · Automated · Vitest · W-24 |
| TC-24 | **Stop and Resume.** Stop after batch 1; Resume. | California fixture | 5,000 rows stay after Stop; Resume asks for offset 5000; no key twice. | FR-31, FR-32, FR-20, NFR-14 | Integration · Automated · Vitest · W-24 |
| TC-25 | **Later batch fails, loading pauses.** Batch 2 returns 500 on every attempt; then Retry succeeds. | California fixture, fault route | Three attempts, then paused; 5,000 events stay; Retry loads batch 2. | FR-34, NFR-10, NFR-14 | Integration · Automated · Vitest · W-24 |
| TC-26 | **Picking another subject cancels.** Start loading subject A; pick subject B while batch 1 is in flight. | Two fixtures, delayed route | A's request is aborted; no A rows are added afterwards. | FR-86 | Integration · Automated · Vitest · W-24 |
| TC-27 | **At least 2 s between batches.** Load three batches on a fake clock that answers at once. | Fake clock | Each batch request starts 2 s or more after the previous answer. | NFR-13 | Unit · Automated · Vitest · W-17 |
| TC-28 | **One query and one API request at a time.** Ask for three queries and two label requests together. | Fake clock | Never more than one query and one API request in flight. | NFR-12 | Unit · Automated · Vitest · W-17 |
| TC-29 | **60 s abort (boundary).** Stall a response; advance the clock to 59.9 s, then to 60 s. | Fake clock | Still waiting at 59.9 s; aborted at 60 s; Retry is offered. | NFR-09, FR-84 | Unit · Automated · Vitest · W-17 |
| TC-30 | **Retry network and 5xx errors twice.** Answer 502 three times; separately, fail the network three times. | Fake clock | Three attempts in each case, with growing delays; no fourth attempt. | NFR-10 | Unit · Automated · Vitest · W-17 |
| TC-31 | **Never retry HTTP 400 (negative).** Answer 400. | Fake clock | One attempt; the message reads "The query could not run. This is a Chronicle bug; please report it." | NFR-11 | Unit · Automated · Vitest · W-17 |
| TC-32 | **HTTP 429 honors Retry-After.** Answer 429 with Retry-After: 30, then 200. | Fake clock | No request before 30 s; one retry after; the wait message shows meanwhile. | FR-85 | Unit · Automated · Vitest · W-17 |
| TC-33 | **Api-User-Agent header.** Inspect an outgoing request. | None | The header names Chronicle, its version, and a contact address. | NFR-53 | Unit · Automated · Vitest · W-17 |
| TC-34 | **Labels 50 IDs at a time.** Ask for labels for 120 IDs. | `labels-*.json` | Three wbgetentities requests of 50, 50, and 20 IDs, English labels and descriptions only. | FR-16 | Unit · Automated · Vitest · W-25 |
| TC-35 | **Q-ID until a label arrives.** Delay the label route by 3 s; one item has no English label. | Curie fixture, delayed route | Rows show Q-IDs, then labels; the item without an English label keeps its Q-ID. | FR-17 | E2E · Automated · Playwright · W-25 |
| TC-36 | **Visible page labeled first.** Open page 3 with 1,000 unlabeled events; delay labels by 0.5 s per request. | Synthetic events | The first label request holds page 3's IDs; page 3 is labeled within 2 s. | FR-22, NFR-04 | Integration · Automated · Vitest · W-25 |

### 7.4 Timeline list and paging

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-37 | **Find a timeline.** Type "Donald Tru" and pick Donald Trump. | Trump fixtures | Subject label, description, and Wikidata link above an oldest-first list with a total count. | FR-03, FR-05, FR-49, FR-53, FR-54 | E2E · Automated · Playwright · W-26 |
| TC-38 | **Event row content.** Open the Curie timeline and read three rows. | Curie fixtures | Each row: date at precision, precision and date property line, label, description, relationships, and a link to wikidata.org/wiki/Q…. | FR-24, FR-46, FR-51, FR-52 | E2E · Automated · Playwright · W-26 |
| TC-39 | **Wikidata text shown unchanged.** Compare every label and description on page 1 with the fixture. | Trump fixtures | Strings match exactly; order is by date only, with no ranking or commentary. | FR-123 | E2E · Automated · Playwright · W-26 |
| TC-40 | **Loaded and filtered counts.** Load 1,214 events and set a text filter. | Curie fixtures | Both numbers show, such as "508 of 1,214 events". | FR-54 | E2E · Automated · Playwright · W-34 |
| TC-41 | **Pages of 50, first and last page (boundary).** Load 1,897 events; use first, previous, next, and last. | Synthetic 1,897-event fixture | Last page shows 47 events and reads page 38 of 38; previous and first are disabled on page 1. | FR-55, FR-56, FR-57 | E2E · Automated · Playwright · W-28 |
| TC-42 | **Oldest and newest first.** Toggle the sort twice. | Curie events | Order reverses each time; ties keep a stable order by item. | FR-49, FR-50 | Unit · Automated · Vitest · W-34 |
| TC-43 | **Loading bar text, Stop, and Resume.** Load California with each batch delayed 1 s; select Stop, then Resume. | California fixtures | Bar reads "Loaded N events in B batches. More are on the way. Stop keeps what has loaded."; Stop keeps events; Resume continues. | FR-29, FR-30, FR-31, FR-32, FR-82 | E2E · Automated · Playwright · W-27 |

### 7.5 Too-broad subjects

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-44 | **First batch times out: too broad (boundary).** Pick United States with a stalled query route and a controlled clock; check at 59 s and 60 s. | Stalled Q30 route | Still loading at 59 s; at 60 s the too-broad message offers relationship loading and Try again. | FR-35, FR-37 | E2E · Automated · Playwright · W-32 |
| TC-45 | **502 or 504 after retries: too broad.** Answer 504 on every attempt for a first batch. | Fault route | The subject is marked too broad, not shown as a generic error. | FR-36 | Integration · Automated · Vitest · W-30 |
| TC-46 | **Try again succeeds.** From the too-broad message, select Try again; the second attempt answers. | Stalled, then recorded route | The timeline loads normally. | FR-38 | E2E · Automated · Playwright · W-32 |
| TC-47 | **Find and load one relationship.** Type "juris" in relationship search; Load applies to jurisdiction. | `properties-juris.json`, P1001 series | P1001 loads as its own sorted series with its own progress, Stop, and Resume. | FR-39, FR-40 | E2E · Automated · Playwright · W-32 |
| TC-48 | **Country and citizenship are too large.** Search relationships for "country". | Property search fixture | P17 and P27 show a "Too large" text badge and no Load button. | FR-41, NFR-39 | E2E · Automated · Playwright · W-32 |
| TC-49 | **A relationship that times out is marked too large.** Stall the first batch of one series for 60 s while another series completes. | Fake clock | That relationship is marked too large; the other series keeps its events. | FR-42 | Integration · Automated · Vitest · W-30 |
| TC-50 | **About page explains limits.** Open /chronicle/about/. | None | It explains how events are gathered, that a date range does not make a broad subject loadable, and the missing scholarly articles. | FR-43, FR-124 | E2E · Automated · Playwright · W-55 |

### 7.6 Filters and performance

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-51 | **Text filter: every word, any order, anywhere.** Filter by "paris agreement", by "agreement paris", and by "paris zzz". | Trump events | The first two give the same events with both words in label, description, or relationships; the third gives none. | FR-59, FR-60, FR-61 | Unit · Automated · Vitest · W-34 |
| TC-52 | **Case and accents ignored.** Filter by "ECOLE" against a label "École". | Synthetic events | The event matches. | FR-68 | Unit · Automated · Vitest · W-34 |
| TC-53 | **Relationship and date filters combine (boundary).** Pick signatory; set 2017 to 2020; then from 2017-01-20. | Trump events plus edge dates | Only signatory events 2017 to 2020 remain; a year-only 2020 event stays; a 19 Jan 2017 event drops with the full-date bound. | FR-62, FR-63, FR-64, FR-65 | Unit · Automated · Vitest · W-34 |
| TC-54 | **Filters run over every loaded event.** With two batches loaded and page 3 open, type a word found only in batch 2. | California fixtures | Matches from batch 2 show and the view returns to page 1. | FR-58, FR-66 | Integration · Automated · Vitest · W-34 |
| TC-55 | **Empty result and Clear all filters.** Type "zzz"; select Clear all filters. | Curie fixtures | "No events match these filters" shows; Clear restores all 1,214 events. | FR-67, FR-70 | E2E · Automated · Playwright · W-35 |
| TC-56 | **Counts beside relationships.** Open the filters panel. | Curie fixtures | Each relationship shows its event count, matching the fixture. | FR-69 | E2E · Automated · Playwright · W-35 |
| TC-57 | **Filter update within 200 ms at 20,000 events.** Type into the text filter 20 times; measure each update (Vitest benchmark and Playwright with 4x CPU throttling). | Synthetic 20,000 events | Median 200 ms or less in both. | NFR-01 | Performance · Automated · Vitest bench, Playwright · W-50 |
| TC-58 | **Page change within 100 ms.** Move through 10 pages and time each. | Synthetic 20,000 events | Median 100 ms or less (target, recorded). | NFR-07 | Performance · Automated · Playwright · W-50 |
| TC-59 | **Select all filtered within 200 ms.** Filter to 8,000 of 20,000; Select all filtered. | Synthetic 20,000 events | 8,000 selected in 200 ms or less (target, recorded). | NFR-05 | Performance · Automated · Vitest bench · W-50 |
| TC-60 | **Imported 20,000-event file within 2 s.** Import a 20,000-event full file and time until page 1 shows. | Generated export file | 2 s or less (target, recorded). | NFR-06 | Performance · Automated · Playwright · W-50 |
| TC-61 | **First page within 10 s, live.** Pick Donald Trump five times on the reference laptop, no cache. | Live service | Median recorded against the 10 s target; not a release gate (R-04). | NFR-03 | Performance · Manual · Playwright (live), stopwatch · W-50 |
| TC-62 | **Suggestions within 1 s, live.** Type five names and time each suggestion list. | Live service | Median recorded against the 1 s target. | NFR-02 | Performance · Manual · Playwright (live) · W-50 |
| TC-63 | **Initial bundle under budget.** Build the site; measure the gzipped JavaScript loaded on the home page. | Production build | Under 300 KB; the vis-timeline chunk is not part of it. | NFR-08 | Static · Automated · Vite build, size check · W-50 |
| TC-64 | **Loaded events keep filtering offline.** Load Curie; set the browser offline; change filters. | Curie fixtures | Filters still work; the offline banner shows. | NFR-15 | E2E · Automated · Playwright · W-37 |

### 7.7 Links, URL state, and the visual timeline

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-65 | **Shared link reopens the view.** Open a URL with q, text, rel, from, to, sort=desc, and page=3 in a new browser context. | Trump fixtures | Same subject, filters, sort, page, and count. | FR-71, FR-72 | E2E · Automated · Playwright · W-36 |
| TC-66 | **Shared page before enough batches load.** Open page=150 while batch 2 is delayed. | California fixtures, delayed route | Page 150 shows once enough rows have loaded; until then the list says it is still loading. | FR-73 | E2E · Automated · Playwright · W-36 |
| TC-67 | **Invalid parameters ignored (negative).** Parse sort=sideways, page=-1, page=abc, rel=X1, from=1890-13-40. | None | Each is ignored and named in the notice; defaults apply. | FR-74 | Unit · Automated · Vitest · W-36 |
| TC-68 | **Unsafe subject never reaches a query (negative).** Open q="Q1 } DELETE", q=Q0, q=Q01, and q=%3Cscript%3E. | None | No query is sent; the home page shows a notice each time. | NFR-29, FR-74 | E2E · Automated · Playwright · W-36 |
| TC-69 | **Copy link.** Select Copy link with clipboard permission granted. | Curie fixtures | The clipboard equals the current URL. | FR-75 | E2E · Automated · Playwright · W-56 |
| TC-70 | **Event link opens the right page.** Open a link with event=Q… for an event on page 7. | Curie fixtures | Page 7 opens scrolled to that event. | FR-76 | E2E · Automated · Playwright · W-56 |
| TC-71 | **Back and Forward restore views.** Visit three filtered views; press Back twice, then Forward. | Curie fixtures | Each view returns exactly. | FR-77 | E2E · Automated · Playwright · W-56 |
| TC-72 | **Visual timeline zoom, pan, and select.** Open the Visual timeline tab; press + and arrow keys; drag; select an item. | Curie fixtures | Zoom runs from centuries to days; pan works by mouse and keyboard; details of the item show below. | FR-78, FR-79, FR-80, FR-81 | E2E · Automated · Playwright · W-57 |

### 7.8 Errors and cache

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-73 | **Every error case has its exact message.** Map each case in the Error message reference. | None | Each case gives the exact SRS wording. | FR-83 | Unit · Automated · Vitest · W-37 |
| TC-74 | **429 countdown and timeout Retry on screen.** Serve 429 with Retry-After: 30; separately stall a batch for 60 s (controlled clock). | Fault routes | A countdown shows and no request goes out before 30 s; the stall ends in a timeout message with Retry. | FR-84, FR-85 | E2E · Automated · Playwright · W-38 |
| TC-75 | **Fault suite keeps loaded events.** Inject offline, 502, 504, slow labels, and bad JSON during batch 2. | Fault routes | Each shows its message; batch 1 events stay and filter. | FR-83, NFR-14 | E2E · Automated · Playwright · W-38 |
| TC-76 | **Cache reused for 24 hours (boundary).** Load Curie; reopen at 23 h 59 min and at 24 h 1 min (controlled clock). | Curie fixtures | First reopen sends no request and shows the fetch time and Refresh; second fetches again. | FR-88, FR-89 | E2E · Automated · Playwright · W-58 |
| TC-77 | **Imported or cached data shows its fetch time.** Import a full file fetched two days ago; select Refresh. | Curie file | The fetch date shows; Refresh reloads from Wikidata and keeps the selection. | FR-97 | E2E · Automated · Playwright · W-58 |

### 7.9 Export, import, and selection

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-78 | **Export all while loading.** Start loading California; Export all during batch 2. | California fixtures | The file validates against schema version 1, is marked full, and holds progress. | FR-90, FR-91 | E2E · Automated · Playwright · W-39 |
| TC-79 | **Full round trip in a new browser.** Export a filtered, sorted view; import it in a new context. | Trump fixtures | Same events, order, filters, and sort; zero Wikidata requests. | FR-92, FR-93, NFR-19 | E2E · Automated · Playwright · W-40 |
| TC-80 | **Bad files are rejected (negative).** Import schemaVersion 2, missing events, item "Q1;DROP", a javascript: link, a __proto__ key, and 10,000 levels of nesting. | Synthetic files | Each is rejected with a reason; the current timeline is unchanged; Object.prototype is untouched. | FR-96, NFR-30 | Unit · Automated · Vitest, fast-check · W-40 |
| TC-81 | **Import error dialog.** Import a schemaVersion 2 file. | Synthetic file | An alert dialog reads "This file could not be opened" with the reason; focus returns to the File menu. | FR-96 | E2E · Automated · Playwright · W-40 |
| TC-82 | **50 MB size limit (boundary).** Import a file of exactly 50 MB and one of 50 MB plus 1 byte. | Generated files | The first is read; the second is refused before parsing. | NFR-31 | Unit · Automated · Vitest · W-40 |
| TC-83 | **Resume an imported timeline.** Import a file with 2 of 3 batches complete; Resume. | California file | Loading restarts one batch early (offset 5000, OD-21); overlap rows are dropped; no key twice. | FR-94, FR-95, NFR-18 | Integration · Automated · Vitest · W-41 |
| TC-84 | **Selection survives navigation.** Select 3 events on page 1; change page, filter, sort, then clear filters. | Curie fixtures | The same 3 stay selected and the count reads 3. | FR-99, FR-103, FR-104, FR-105, NFR-21 | E2E · Automated · Playwright · W-42 |
| TC-85 | **Select page, select all filtered, clear.** Use Select page, Select all filtered, and Clear. | Curie fixtures | Page checkbox shows mixed when partly selected; counts update to 50, then 508, then 0. | FR-100, FR-101, FR-102 | E2E · Automated · Playwright · W-43 |
| TC-86 | **Selection kept through Stop and Resume.** Select 5 events; Stop; Resume to the end. | California fixtures | The same 5 are selected afterwards. | FR-105, NFR-21 | Integration · Automated · Vitest · W-42 |
| TC-87 | **Export selected includes hidden events.** Select 5 events, hide 2 with a filter, Export selected. | Curie fixtures | File marked curated holds all 5 with labels, dates, relationships, and source links. | FR-106, FR-107, FR-108, FR-109 | E2E · Automated · Playwright · W-44 |
| TC-88 | **Import a curated file.** Import a curated file of 40 events. | Generated curated file | Exactly 40 events show, all selected; zero Wikidata requests. | FR-110, NFR-20 | E2E · Automated · Playwright · W-45 |
| TC-89 | **Load the rest after a curated import.** Import 40 curated Trump events; select Load the rest. | Trump fixtures | The full timeline loads; the 40 stay selected; no key twice. | FR-111, FR-112, NFR-18 | E2E · Automated · Playwright · W-45 |
| TC-90 | **Round-trip properties.** Generate timelines, splits, resume points, and selections; export, import, resume, load the rest. | fast-check, 200 runs | Events, order, filters, sort, progress, and selection are identical; no key repeats. | NFR-17, NFR-18, NFR-19, NFR-20, NFR-21 | Unit · Automated · Vitest, fast-check · W-46 |
| TC-91 | **CSV download follows RFC 4180.** Export filtered events with commas, quotes, and line breaks in labels; parse the CSV back. | `labels-hard.json` | Fields are quoted and the parsed values equal the originals. | FR-98, NFR-24 | Unit · Automated · Vitest · W-61 |

### 7.10 Notes and tags

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-92 | **Notes and tags save, with length limits (boundary).** Add a 2,000-character note, then try 2,001; add a 40-character tag, then 41; reload. | Curie fixtures | 2,000 and 40 save and survive reload; 2,001 and 41 are blocked with a counter message. | FR-114, FR-115, FR-117, NFR-32 | E2E · Automated · Playwright · W-52 |
| TC-93 | **Storage full keeps the note.** Make the IndexedDB write throw QuotaExceededError; save a note. | Stubbed storage | A warning shows and the unsaved note stays in the field. | NFR-33 | E2E · Automated · Playwright · W-52 |
| TC-94 | **Tag filter, Selected only, and delete saved data.** Tag one event trade; reload; filter by trade; then Selected only; then Delete saved data. | Trump fixtures | Only the tagged event shows with its note; Selected only shows picks; delete clears selection, notes, and tags. | FR-113, FR-116, FR-120 | E2E · Automated · Playwright · W-53 |
| TC-95 | **Notes and tags travel in files.** Export full and curated files with notes and tags; import each. | Synthetic timeline | Both files carry them, and import restores them. | FR-118, FR-119 | Unit · Automated · Vitest · W-54 |
| TC-96 | **Notes never leave the browser.** Add a note and tag; record every request through a full session. | Trump fixtures | No request URL or body contains the note or tag text. | NFR-28 | E2E · Automated · Playwright · W-54 |
| TC-97 | **Text filter matches notes and tags.** Filter by "translation" where only a note contains it. | Synthetic events | That event remains. | FR-121 | Unit · Automated · Vitest · W-62 |

### 7.11 Privacy and security

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-98 | **Script text renders as text.** Load and import fixtures with labels `<script>alert(1)</script>` and `<img src=x onerror=alert(1)>`. | `labels-script.json`, synthetic file | The text shows literally; no dialog opens and no element is created. | NFR-27, NFR-30 | E2E · Automated · Playwright · W-49 |
| TC-99 | **No cookies, trackers, or other hosts.** Run search, load, select, and export while recording requests and cookies. | Trump fixtures | Zero cookies; every request goes to a host in the Wikidata endpoint reference; no selection data in any request. | NFR-25, NFR-26, NFR-28 | E2E · Automated · Playwright · W-49 |
| TC-100 | **Content Security Policy.** Read the CSP meta tag; try a fetch to example.com from the page. | Built site | connect-src lists only Wikidata hosts; the fetch is blocked. | NFR-34 | E2E · Automated · Playwright · W-14 |
| TC-101 | **Audit and license gates.** Run npm audit and the license check; plant a package with a high finding on a test branch. | Lockfile | Clean main passes; the planted case fails CI. | NFR-35, NFR-54 | Static · Automated · npm audit, license checker · W-04 |

### 7.12 Accessibility and layout

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-102 | **axe in every listed state.** Run axe on each state in the UI design axe list at 320 and 1280 px, light and dark. | Fixtures per state | Zero serious or critical violations. | NFR-36, NFR-37 | Accessibility · Automated · Playwright, axe · W-47 |
| TC-103 | **Keyboard-only tasks.** Find a subject, filter it, select three events, and export, using only the keyboard. | Curie fixtures | Every step works; focus is always visible and returns after menus and dialogs. | NFR-38 | E2E · Automated · Playwright · W-47 |
| TC-104 | **Color is never the only signal.** Review the main states in grayscale and with forced colors. | Fixtures | Selected rows, too-large relationships, and banners are still clear by text, check, or icon. | NFR-39 | Manual · Manual · Playwright screenshots, review · W-47 |
| TC-105 | **No sideways scroll from 320 to 1920 px.** Open home and timeline at 320, 360, 900, 1280, and 1920 px. | Curie fixtures | Page scrollWidth never exceeds the viewport width. | NFR-40 | E2E · Automated · Playwright · W-47 |
| TC-106 | **Counts and page changes are announced.** Change a filter and the page; read the live region. | Curie fixtures | The polite live region holds the new count and page number. | NFR-41 | E2E · Automated · Playwright · W-47 |
| TC-107 | **Token contrast.** Compute every token pair from tokens.css. | tokens.css | Text pairs 4.5:1 or more; control and focus pairs 3:1 or more, light and dark. | NFR-36 | Unit · Automated · Vitest · W-12 |
| TC-108 | **Screen reader pass.** Run UC-01 and UC-08 with NVDA and Firefox, and with VoiceOver and Safari. | Live or fixture build | Each step is reachable and announced sensibly; notes kept in a short session log. | NFR-36, NFR-41 | Manual · Manual · NVDA, VoiceOver · W-47 |
| TC-109 | **CC0 attribution on every page.** Open home, timeline, and About. | None | Each footer says the data comes from Wikidata under CC0. | FR-122 | E2E · Automated · Playwright · W-13 |

### 7.13 Build, CI, deploy, and live checks

| ID | Test and steps | Data | Expected result | Covers | Level · mode · tool · item |
|---|---|---|---|---|---|
| TC-110 | **Strict types and layer boundaries.** Run typecheck and lint; lint planted violations (fetch in src/ui, React in src/core, innerHTML). | Lint fixtures | Main passes; each planted file fails with the boundary rule named. | NFR-43, NFR-44, NFR-45 | Static · Automated · TypeScript, ESLint · W-02 |
| TC-111 | **Core runs on FakeSource only.** Run the core suite with global fetch replaced by a function that throws. | FakeSource | The suite passes; fetch is never called. | NFR-44, NFR-47 | Integration · Automated · Vitest · W-16 |
| TC-112 | **CI runs every layer and blocks.** Push a commit to main with one failing test; Playwright routes block live Wikidata hosts. | Main branch | Every layer runs; the failing test turns CI red on main and must be fixed before further work; any live call fails its test. | NFR-47, NFR-48 | Static · Automated · GitHub Actions · W-04 |
| TC-113 | **Coverage thresholds.** Run the unit layers with coverage; then remove tests on a branch until under target. | None | Main meets the targets in 7.3; a push that falls under target fails CI. | NFR-46 | Static · Automated · Vitest coverage · W-51 |
| TC-114 | **Coverage shown as text.** Read the README and a CI run. | None | The README states the targets in text and CI shows the summary (decision D-02 of the plan). | NFR-50 | Manual · Manual · Review · W-51 |
| TC-115 | **Every use case in every browser project.** Run the UC suite in Chromium, Firefox, WebKit, Pixel, and iPhone emulation. | All fixtures | Every Must use case passes in each project. | NFR-51 | E2E · Automated · Playwright · W-48 |
| TC-116 | **Deployed site under /chronicle/.** After deploy, open the public URL and the About page. | Live Pages site | Both load from fillicianoplong.github.io/chronicle/ with all assets on the base path. | NFR-52 | E2E · Automated · Playwright (post-deploy) · W-05 |
| TC-117 | **Weekly live contract check.** Replay the recorded requests for small subjects against the live services. | Live service | Shapes match, or the job fails naming the changed field. | NFR-49 | Contract · Automated · Vitest, GitHub Actions schedule · W-59 |
| TC-118 | **Opt-in live smoke suite.** Run `npm run test:live`: search, load, and label three small subjects, spaced 5 s apart. | Live service | Each subject shows a labeled timeline; the suite never runs on pushes to main, only on a schedule or by hand. | FR-02, FR-12, FR-16 | E2E · Manual · Playwright (live) · W-59 |
| TC-119 | **Exploratory sessions.** Three 45-minute charters before release: a huge subject, a flaky phone connection, and a curated research file. | Live service, a phone | Findings logged as Jira Bugs; no blocker or major left open. | NFR-38, NFR-42 | Manual · Manual · Real devices · W-64 |

## 8. Requirement-to-test matrix

Every FR and NFR in SRS 1.4. All 124 Must requirements have at least one test case (124 of 124); the build stops if one does not. Should and Could items are covered or deferred to their M8 work items.

### 8.1 Functional requirements

| ID | Priority | Test cases | Status | ID | Priority | Test cases | Status |
|---|---|---|---|---|---|---|---|
| FR-01 | Must | TC-03 | Covered | FR-63 | Must | TC-53 | Covered |
| FR-02 | Must | TC-01, TC-118 | Covered | FR-64 | Must | TC-53 | Covered |
| FR-03 | Must | TC-01, TC-37 | Covered | FR-65 | Must | TC-53 | Covered |
| FR-04 | Must | TC-01 | Covered | FR-66 | Must | TC-54 | Covered |
| FR-05 | Must | TC-03, TC-04, TC-37 | Covered | FR-67 | Must | TC-55 | Covered |
| FR-06 | Must | TC-04 | Covered | FR-68 | Should | TC-52 | Covered |
| FR-07 | Must | TC-07 | Covered | FR-69 | Should | TC-56 | Covered |
| FR-08 | Must | TC-07 | Covered | FR-70 | Should | TC-55 | Covered |
| FR-09 | Should | TC-05 | Covered | FR-71 | Must | TC-65 | Covered |
| FR-10 | Should | TC-03 | Covered | FR-72 | Must | TC-65 | Covered |
| FR-11 | Should | TC-06 | Covered | FR-73 | Must | TC-66 | Covered |
| FR-12 | Must | TC-08, TC-118 | Covered | FR-74 | Must | TC-67, TC-68 | Covered |
| FR-13 | Must | TC-08 | Covered | FR-75 | Should | TC-69 | Covered |
| FR-14 | Must | TC-09 | Covered | FR-76 | Should | TC-70 | Covered |
| FR-15 | Must | TC-08 | Covered | FR-77 | Should | TC-71 | Covered |
| FR-16 | Must | TC-34, TC-118 | Covered | FR-78 | Should | TC-72 | Covered |
| FR-17 | Must | TC-35 | Covered | FR-79 | Should | TC-72 | Covered |
| FR-18 | Must | TC-08 | Covered | FR-80 | Should | TC-72 | Covered |
| FR-19 | Must | TC-18 | Covered | FR-81 | Should | TC-72 | Covered |
| FR-20 | Must | TC-18, TC-24 | Covered | FR-82 | Must | TC-43 | Covered |
| FR-21 | Must | TC-19 | Covered | FR-83 | Must | TC-73, TC-75 | Covered |
| FR-22 | Should | TC-36 | Covered | FR-84 | Must | TC-29, TC-74 | Covered |
| FR-23 | Should | TC-10 | Covered | FR-85 | Must | TC-32, TC-74 | Covered |
| FR-24 | Should | TC-21, TC-38 | Covered | FR-86 | Must | TC-26 | Covered |
| FR-25 | Must | TC-22 | Covered | FR-87 | Must | TC-02 | Covered |
| FR-26 | Must | TC-08 | Covered | FR-88 | Should | TC-76 | Covered |
| FR-27 | Must | TC-22 | Covered | FR-89 | Should | TC-76 | Covered |
| FR-28 | Must | TC-22, TC-23 | Covered | FR-90 | Must | TC-78 | Covered |
| FR-29 | Must | TC-22, TC-43 | Covered | FR-91 | Must | TC-78 | Covered |
| FR-30 | Must | TC-22, TC-43 | Covered | FR-92 | Must | TC-79 | Covered |
| FR-31 | Must | TC-24, TC-43 | Covered | FR-93 | Must | TC-79 | Covered |
| FR-32 | Must | TC-24, TC-43 | Covered | FR-94 | Must | TC-83 | Covered |
| FR-33 | Must | TC-22, TC-23 | Covered | FR-95 | Must | TC-83 | Covered |
| FR-34 | Must | TC-25 | Covered | FR-96 | Must | TC-80, TC-81 | Covered |
| FR-35 | Must | TC-44 | Covered | FR-97 | Should | TC-77 | Covered |
| FR-36 | Must | TC-45 | Covered | FR-98 | Could | TC-91 | Covered |
| FR-37 | Must | TC-44 | Covered | FR-99 | Must | TC-84 | Covered |
| FR-38 | Must | TC-46 | Covered | FR-100 | Must | TC-85 | Covered |
| FR-39 | Must | TC-47 | Covered | FR-101 | Must | TC-85 | Covered |
| FR-40 | Must | TC-47 | Covered | FR-102 | Must | TC-85 | Covered |
| FR-41 | Must | TC-48 | Covered | FR-103 | Must | TC-84 | Covered |
| FR-42 | Must | TC-49 | Covered | FR-104 | Must | TC-84 | Covered |
| FR-43 | Should | TC-50 | Covered | FR-105 | Must | TC-84, TC-86 | Covered |
| FR-44 | Must | TC-12, TC-15, TC-16 | Covered | FR-106 | Must | TC-87 | Covered |
| FR-45 | Must | TC-13, TC-14, TC-16 | Covered | FR-107 | Must | TC-87 | Covered |
| FR-46 | Must | TC-13, TC-16, TC-38 | Covered | FR-108 | Must | TC-87 | Covered |
| FR-47 | Could | TC-15 | Covered | FR-109 | Must | TC-87 | Covered |
| FR-48 | Could | TC-17 | Covered | FR-110 | Must | TC-88 | Covered |
| FR-49 | Must | TC-37, TC-42 | Covered | FR-111 | Must | TC-89 | Covered |
| FR-50 | Must | TC-42 | Covered | FR-112 | Must | TC-89 | Covered |
| FR-51 | Must | TC-38 | Covered | FR-113 | Should | TC-94 | Covered |
| FR-52 | Must | TC-21, TC-38 | Covered | FR-114 | Should | TC-92 | Covered |
| FR-53 | Must | TC-37 | Covered | FR-115 | Should | TC-92 | Covered |
| FR-54 | Must | TC-37, TC-40 | Covered | FR-116 | Should | TC-94 | Covered |
| FR-55 | Must | TC-41 | Covered | FR-117 | Should | TC-92 | Covered |
| FR-56 | Must | TC-41 | Covered | FR-118 | Should | TC-95 | Covered |
| FR-57 | Must | TC-41 | Covered | FR-119 | Should | TC-95 | Covered |
| FR-58 | Should | TC-54 | Covered | FR-120 | Should | TC-94 | Covered |
| FR-59 | Must | TC-51 | Covered | FR-121 | Could | TC-97 | Covered |
| FR-60 | Must | TC-51 | Covered | FR-122 | Must | TC-109 | Covered |
| FR-61 | Must | TC-51 | Covered | FR-123 | Must | TC-39 | Covered |
| FR-62 | Must | TC-53 | Covered | FR-124 | Should | TC-50 | Covered |

### 8.2 Non-functional requirements

| ID | Priority | Test cases | Status | ID | Priority | Test cases | Status |
|---|---|---|---|---|---|---|---|
| NFR-01 | Must | TC-57 | Covered | NFR-28 | Must | TC-96, TC-99 | Covered |
| NFR-02 | Should | TC-62 | Covered | NFR-29 | Must | TC-06, TC-68 | Covered |
| NFR-03 | Should | TC-61 | Covered | NFR-30 | Must | TC-80, TC-98 | Covered |
| NFR-04 | Should | TC-36 | Covered | NFR-31 | Should | TC-82 | Covered |
| NFR-05 | Should | TC-59 | Covered | NFR-32 | Should | TC-92 | Covered |
| NFR-06 | Should | TC-60 | Covered | NFR-33 | Should | TC-93 | Covered |
| NFR-07 | Should | TC-58 | Covered | NFR-34 | Should | TC-100 | Covered |
| NFR-08 | Should | TC-63 | Covered | NFR-35 | Should | TC-101 | Covered |
| NFR-09 | Must | TC-29 | Covered | NFR-36 | Must | TC-102, TC-107, TC-108 | Covered |
| NFR-10 | Must | TC-25, TC-30 | Covered | NFR-37 | Must | TC-102 | Covered |
| NFR-11 | Must | TC-31 | Covered | NFR-38 | Must | TC-103, TC-119 | Covered |
| NFR-12 | Must | TC-28 | Covered | NFR-39 | Must | TC-48, TC-104 | Covered |
| NFR-13 | Must | TC-27 | Covered | NFR-40 | Must | TC-105 | Covered |
| NFR-14 | Must | TC-24, TC-25, TC-75 | Covered | NFR-41 | Should | TC-106, TC-108 | Covered |
| NFR-15 | Should | TC-64 | Covered | NFR-42 | Should | TC-03, TC-119 | Covered |
| NFR-16 | Must | TC-21 | Covered | NFR-43 | Must | TC-110 | Covered |
| NFR-17 | Must | TC-20, TC-90 | Covered | NFR-44 | Must | TC-110, TC-111 | Covered |
| NFR-18 | Must | TC-18, TC-83, TC-89, TC-90 | Covered | NFR-45 | Must | TC-110 | Covered |
| NFR-19 | Must | TC-79, TC-90 | Covered | NFR-46 | Must | TC-113 | Covered |
| NFR-20 | Must | TC-88, TC-90 | Covered | NFR-47 | Must | TC-111, TC-112 | Covered |
| NFR-21 | Must | TC-84, TC-86, TC-90 | Covered | NFR-48 | Must | TC-112 | Covered |
| NFR-22 | Must | TC-11 | Covered | NFR-49 | Should | TC-117 | Covered |
| NFR-23 | Must | TC-12 | Covered | NFR-50 | Should | TC-114 | Covered |
| NFR-24 | Could | TC-91 | Covered | NFR-51 | Must | TC-115 | Covered |
| NFR-25 | Must | TC-99 | Covered | NFR-52 | Must | TC-116 | Covered |
| NFR-26 | Must | TC-99 | Covered | NFR-53 | Should | TC-33 | Covered |
| NFR-27 | Must | TC-98 | Covered | NFR-54 | Should | TC-101 | Covered |

## 9. Defect handling

Bugs are filed as Jira Bugs under the relevant epic in the Chronicle project (CHR):

- A bug found while working on a story is fixed in that same commit when it can be, with a regression test.
- A bug that has to wait is filed as a Jira Bug under the epic it belongs to, and is listed in the release notes if it is still open at release.
- Every fixed bug gets a test that failed before the fix.

Each bug names what failed, how to reproduce it, and the severity:

| Field | What to record |
|---|---|
| Summary | The problem in plain words |
| Found by | A test case, such as TC-xx, or an exploratory charter |
| Severity | Blocker, major, or minor |
| Status | Open, in progress, or done |
| Note | One line, plus the regression test name once it exists |

Blocker: a Must use case cannot finish. Major: wrong data, lost work, or an accessibility failure. Minor: anything else.

## 10. Risks

Risks to the testing itself. Product risks are in the architecture risk register.

| Risk | Response |
|---|---|
| Fixtures drift from live Wikidata (R-02) | The weekly contract check fails and names the field; re-record with the fixture recorder (W-07). |
| Timing tests flake | Fake clocks in Vitest and a controlled clock in Playwright; no real sleeps over 1 s. |
| Shared CI runners vary in speed | Performance cases record medians; only the bundle budget and the 200 ms filter benchmark gate CI. |
| WebKit and Firefox differ on clipboard and IndexedDB | Grant permissions per project; mark known engine gaps in the test, not by skipping silently. |
| The live suite hits rate limits (R-10) | Three small subjects, 5 s apart, opt-in only. |
| Property tests run long | 200 runs in CI; a fixed seed is printed on failure so it can be replayed. |
| Emulation is not a real phone (R-05) | Exploratory charter on real phones before release. |

## 11. Decisions

The decisions below were approved on November 20, 2026.

| ID | Decision | Why needed | Approved default |
|---|---|---|---|
| TD-01 | Coverage scope | NFR-46 says 80% of lines and 70% of branches; the brief also asked for 80% of lines in `src/core` | Gate on NFR-46 across `src/` (80% lines, 70% branches) and also gate `src/core` at 80% lines. No SRS change needed. |
| TD-02 | Resume after an import or cache | AC-14 and QS-09 say only batch 3 is fetched; OD-21 restarts one batch early | Tests follow OD-21 (refetch from one batch early; overlap dropped; no key twice). The SRS wording for AC-14 and QS-09 is still to be updated. |
| TD-03 | What 50 MB means (NFR-31) | Decimal and binary sizes differ by about 2.4 MB | 50 × 1,048,576 bytes. |
| TD-04 | Previous browser versions | Playwright ships only current engines | Manual spot check on second-latest versions before release; noted as a limit. |

## 12. Files

| Path | What |
|---|---|
| `docs/TEST_PLAN.md` | This plan |
| `docs/Plong_Chronicle_Test_Plan.docx` | Word copy |
| `docs/out/Plong_Chronicle_Test_Plan.pdf` | PDF copy |
