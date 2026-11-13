# Chronicle v1: Software Requirements Specification

A searchable, date-sorted timeline of any subject, built from Wikidata  
Prepared by Filliciano Plong  
November 13, 2026  
Version 1.4  

## Contents

- [Revision history](#revision-history)
- [1. Introduction](#1-introduction)
- [2. Scope](#2-scope)
- [3. Overall description](#3-overall-description)
- [4. User classes](#4-user-classes)
- [5. Constraints and assumptions](#5-constraints-and-assumptions)
- [6. Functional requirements](#6-functional-requirements)
- [7. Non-functional requirements](#7-non-functional-requirements)
- [8. Use cases](#8-use-cases)
- [9. Data requirements](#9-data-requirements)
- [10. External interfaces](#10-external-interfaces)
- [11. Decisions](#11-decisions)
- [12. Acceptance criteria](#12-acceptance-criteria)
- [13. Future features](#13-future-features)
- [14. Traceability](#14-traceability)
- [References](#references)
- [Appendix A. Load-test evidence](#appendix-a-load-test-evidence)

## Revision history

| Version | Date | Changes |
|---|---|---|
| 1.0 | November 13, 2026 | First release of the Chronicle v1 requirements. |
| 1.1 | November 13, 2026 | Recorded all 13 decisions. Replaced the result cap with 5,000-row batches, a Load more control, and 50-event pages. The repository is public under the MIT license from the start. |
| 1.2 | November 13, 2026 | Rows now load without labels, in batches that follow one another on their own, with Stop and Resume; labels follow in groups of 50. Added too-broad subject handling by relationship, JSON export and import with resume, row keys that prevent duplicates, and the load-test evidence in *Appendix A*. Dropped the Load more button. |
| 1.3 | November 13, 2026 | Added curation: event selection, Export selected for curated research files, and notes and tags with a tag filter. Recorded the too-broad rule (60 s, with Try again) and the loading targets as decided. |
| 1.4 | November 13, 2026 | Date precision and BCE years are now Musts, with precision fetched in every batch query; the cost is measured in *Appendix A*. Resume starts one batch early for timelines reopened from a file or the cache. Brought the scope and user interface sections in line with curation. |

## 1. Introduction

### 1.1 Purpose

This document states what Chronicle v1 must do and how well. It is the base for the architecture document, the implementation plan, and the test plan.

### 1.2 Intended audience

The developer and owner, Filliciano Plong, and reviewers of the project, such as hiring managers for software and test engineering roles.

### 1.3 Problem statement

Wikidata holds dated facts about almost any subject, but there is no simple way to see them as one timeline. Its query tools expect SPARQL, and raw results are flat rows with repeats and mixed date precision.

### 1.4 Product overview

Chronicle is a static website. The user types any subject, such as a person, event, or organization, and picks the matching Wikidata item. Chronicle then queries Wikidata live and shows every dated item linked to that subject as a date-sorted, filterable, shareable timeline.

### 1.5 Definitions

| Term | Meaning |
|---|---|
| Subject | The Wikidata item the user searches for, such as Donald Trump (Q22686). |
| Event | A dated Wikidata item linked to the subject. Anything with a date counts, including books, films, and artworks. |
| Relationship | The property that links an event to the subject, such as author, participant, or main subject. |
| Q-ID | A Wikidata item identifier: Q followed by digits. |
| Entity search | The Wikidata API action `wbsearchentities`, which matches names and aliases by prefix. |
| SPARQL | The query language of the Wikidata Query Service (WDQS). |
| WDQS | Wikidata Query Service, the public SPARQL endpoint at `query.wikidata.org`. |
| Precision | How exactly a date is known in Wikidata: year, month, or day (and coarser). |
| BCE | Before Common Era; years before year 1. |
| Data-access layer | The one module that talks to data sources. v2 can swap it for a backend. |
| Contract test | A test that checks a live or recorded response still has the expected shape. |
| Batch | One query returning up to 5,000 rows, sorted by date, item, and property. |
| Row key | Item ID, property ID, and date joined together, such as `Q12345\|P50\|2017-01-20`. It identifies one row. |
| Event key | Item ID and date, such as `Q12345\|2017-01-20`. Shared by the rows merged into one event. |
| Curated file | An export holding only the events the user selected, with any notes and tags. |
| Too-broad subject | A subject whose first sorted batch cannot finish within Wikidata's 60-second limit, such as a country. |
| E2E | End-to-end test that drives the real site in a browser. |
| CI | Continuous integration: checks that run on every pull request. |
| MoSCoW | Priority scheme: Must, Should, Could. Won't items go in *Future features*. |
| OD | Decision record: a question the owner settled, with the options considered. |

### 1.6 References

Sources used in this document. Each was read on November 13, 2026.

| Source | Used for |
|---|---|
| Wikidata Query Service User Manual (mediawiki.org) | 60 s deadline, per-client limits, HTTP 429 and Retry-After, label service |
| Wikidata API: `wbsearchentities` (wikidata.org/w/api.php) | Subject suggestions; prefix matching; `origin=*` for browser calls |
| Wikimedia User-Agent policy (foundation.wikimedia.org) | Identifying the client with `Api-User-Agent` |
| WCAG 2.2 (w3.org) | Accessibility target |
| RFC 4180 | CSV quoting for the Could-priority download |
| Sample query and results (`wd.rq`, `wd.csv`) | The Donald Trump findings in *Data requirements* |

## 2. Scope

Chronicle v1 turns one subject into one timeline, using Wikidata only, entirely in the browser.

### 2.1 In scope

- Fuzzy subject search that resolves typed text to a Wikidata item, with a picker when names clash.
- Live queries, in back-to-back batches of 5,000 rows, for every dated item linked to the subject, with no date limit.
- Labels fetched separately in small lookups, and events shown as each batch arrives, with Stop and Resume.
- Loading a too-broad subject, such as a country, one relationship at a time.
- JSON export and import, so a timeline can be reopened instantly and resumed without duplicates.
- Curation: selecting events, Export selected as a research file, and notes and tags (Should).
- A date-sorted list in pages of 50, with a text filter, relationship filter, date range, and sort order.
- A Wikidata source link on every event, and shareable URLs for every view.
- A zoomable visual timeline (Should).
- Clear handling of slow, throttled, and failed queries, plus short-term browser caching.
- Unit, contract, end-to-end, accessibility, and data-validation tests in CI.

### 2.2 Out of scope for v1

- Other data sources, such as the Federal Register and Congress.gov, and merging sources.
- A backend server or database.
- Hiding or deleting events. Every dated item is shown; users narrow with filters and selection.
- Accounts, and timelines or notes saved on a server.
- Editing Wikidata.
- A non-English interface.
- Comparing several subjects on one timeline.

## 3. Overall description

### 3.1 Product context

Chronicle runs in the user's browser. It talks to two public Wikidata services and nothing else. All calls go through one data-access layer so a v2 backend can replace them without touching the screens.

**Product context**

| Part | Role in v1 | v2 direction |
|---|---|---|
| Browser app | Search, query, filter, and display | Same screens |
| Data-access layer | Calls Wikidata directly | Calls a Chronicle API instead |
| Wikidata entity search | Subject suggestions | Unchanged or proxied |
| WDQS | Timeline query | Fed into a backend store |
| GitHub Pages | Hosts static files | May remain for the front end |

### 3.2 Main functions

- Search for a subject and pick it, optionally limiting relationships and dates up front.
- See every dated item linked to it, sorted by date, 50 per page, while batches keep loading.
- Save the timeline to a file and open it again later.
- Pick the events that matter, add notes and tags, and export them as a research file.
- Filter by words, relationship, and date range; flip the sort order.
- Open any event's Wikidata page; share the current view by link.
- Browse the same events on a zoomable visual timeline.

### 3.3 Operating environment

A current desktop or mobile browser with an internet connection. No install, sign-in, or server. Supported browsers are in the *Browser support reference*.

## 4. User classes

| Class | Role | Experience | Main tasks | Frequency |
|---|---|---|---|---|
| Visitor | Curious reader of any subject | General web user; no SPARQL | Search, filter, read, share | Occasional |
| Researcher | Student, writer, or fact checker | Comfortable with sources | Filter by relationship and date; follow source links | Repeated sessions |
| Reviewer | Hiring manager or engineer reading the repo | Technical | Read code, tests, CI, docs; try the site | Once or twice |
| Developer | Owner, Filliciano Plong | Technical | Build, test, deploy, extend to v2 | Ongoing |

## 5. Constraints and assumptions

### 5.1 Constraints

| ID | Constraint | Source |
|---|---|---|
| C-01 | Static site on GitHub Pages; no backend in v1. | Owner decision, Nov 13, 2026 |
| C-02 | Wikidata is the only data source in v1. | Owner decision, Nov 13, 2026 |
| C-03 | React, TypeScript, and Vite; Vitest, Playwright, and axe; GitHub Actions CI. | Proposed stack in the approved plan, Nov 13, 2026 |
| C-04 | WDQS stops queries at 60 s, allows 60 s of processing per minute per client and 5 parallel queries per IP, and answers HTTP 429 with Retry-After when exceeded. | WDQS User Manual, read Nov 13, 2026 |
| C-05 | Repository `fillicianoplong/chronicle` is public under the MIT license from the start. The owner confirms before the first push. | Owner decision, Nov 13, 2026 |
| C-06 | Presentation stays neutral and factual for every subject. | Owner decision, Nov 13, 2026 |
| C-07 | Solo portfolio project on free tiers only. | Project context |

The stack is a design direction, not a user need. The architecture document records the reasons.

### 5.2 Assumptions

| ID | Assumption | How to validate |
|---|---|---|
| A-01 | Both Wikidata services keep allowing browser calls from any origin. | Checked Nov 13, 2026 (`Access-Control-Allow-Origin: *`). Recheck in the weekly contract job. |
| A-02 | Without labels, a 5,000-row batch finishes well within 60 s for all but country-sized subjects. | Measured Nov 13, 2026 (*Appendix A*). Recheck timings in the weekly contract job. |
| A-03 | Traffic stays low, well under 100 queries a day. | Watch for 429 responses in error reports. |
| A-04 | English labels cover most items people look up. | Count Q-ID-only labels in recorded fixtures. |
| A-05 | Visitors use current evergreen browsers. | No check needed for a portfolio site. |
| A-06 | The SPARQL JSON results shape stays stable. | Weekly contract job (NFR-49). |

## 6. Functional requirements

Each line is one testable behavior with one MoSCoW priority. Where a line follows a recorded decision, the verification column names it. Priority labels map to GitHub labels: Must is `priority:high`, Should is `priority:medium`, Could is `priority:low`.

### 6.1 Subject search

The user starts by naming a subject. Chronicle turns that text into a Wikidata item.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-01 | The system shall show a subject search box on the home page. | Must | Test (E2E) |
| FR-02 | The system shall suggest matching Wikidata items as the user types, using the entity search. | Must | Test (contract, E2E) |
| FR-03 | The system shall match partial names, so "Donald Tru" suggests Donald Trump. | Must | Test (contract) |
| FR-04 | The system shall show each suggestion's label, description, and Q-ID. | Must | Test (unit, E2E) |
| FR-05 | The system shall run the timeline query only after the user picks a subject. | Must | Test (E2E) |
| FR-06 | The system shall show a "no matching subject" message when the search finds nothing. | Must | Test (E2E) |
| FR-07 | The system shall offer optional relationship and date range fields on the search form. | Must | Test (E2E) |
| FR-08 | The system shall limit the timeline query to the relationships and dates set on the search form. | Must | Test (unit, contract) |
| FR-09 | The system shall fall back to a fuzzy full-text search when the entity search finds nothing. | Should | Test (contract). See OD-01 |
| FR-10 | The system shall pick the top suggestion when the user presses Enter without choosing. | Should | Test (E2E) |
| FR-11 | The system shall accept a typed Q-ID, such as Q22686, as the subject. | Should | Test (unit, E2E) |

### 6.2 Timeline query

Once a subject is picked, Chronicle queries for every dated item linked to it. Rows arrive without labels, which keeps each query small; labels follow separately.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-12 | The system shall query for every item linked to the subject through any direct property. | Must | Test (contract) |
| FR-13 | The system shall include items dated by any property in the *Date property reference*. | Must | Test (contract). See OD-05 |
| FR-14 | The system shall include all dates, with no lower or upper date limit. | Must | Test (contract). See OD-02 |
| FR-15 | The system shall fetch only item, property, date, date property, and date precision in each batch, without the SPARQL label service. | Must | Inspection, Test (contract). See OD-13 |
| FR-16 | The system shall fetch English labels and descriptions with `wbgetentities`, 50 IDs per request. | Must | Test (contract). See OD-13 |
| FR-17 | The system shall show the Q-ID or P-ID until a label arrives, or when none exists in English. | Must | Test (unit). See OD-09 |
| FR-18 | The system shall request query results in the SPARQL JSON results format. | Must | Inspection, Test (unit) |
| FR-19 | The system shall give each row a key made of item ID, property ID, and date. | Must | Test (unit) |
| FR-20 | The system shall skip any row whose key is already loaded, from batches, retries, resume, or import. | Must | Test (unit) |
| FR-21 | The system shall merge rows for the same item and date into one event, across all loaded batches. | Must | Test (unit). See OD-04 |
| FR-22 | The system shall fetch labels for the visible page before labels for other events. | Should | Test (unit) |
| FR-23 | The system shall also include the subject's own dated statements, such as date of birth. | Should | Test (contract). See OD-06 |
| FR-24 | The system shall show which date property supplied each event's date. | Should | Test (unit) |

### 6.3 Batch loading

Large timelines load in batches of 5,000 rows, one after another, until done or stopped. Events appear as each batch arrives.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-25 | The system shall fetch timeline results in batches of 5,000 rows using LIMIT and OFFSET. | Must | Test (unit, contract). See OD-07 |
| FR-26 | The system shall order every batch query by date, item, and property so batches never overlap or skip rows. | Must | Test (contract) |
| FR-27 | The system shall fetch the first batch as soon as the user picks a subject. | Must | Test (E2E) |
| FR-28 | The system shall fetch the next batch after each full batch, until a batch is short or the user stops. | Must | Test (unit, E2E) |
| FR-29 | The system shall show each batch's events as soon as that batch arrives. | Must | Test (E2E) |
| FR-30 | The system shall show a progress indicator with events and batches loaded so far. | Must | Test (E2E) |
| FR-31 | The system shall offer a Stop button that ends loading and keeps every event loaded so far. | Must | Test (E2E) |
| FR-32 | The system shall offer a Resume button that continues loading from where it stopped. | Must | Test (unit, E2E) |
| FR-33 | The system shall treat a batch with fewer than 5,000 rows as the last one. | Must | Test (unit) |
| FR-34 | The system shall pause loading and offer Retry when a later batch fails after retries. | Must | Test (unit, E2E) |

### 6.4 Too-broad subjects

Some subjects, such as countries, cannot be loaded in one sorted series within Wikidata's 60-second limit. Chronicle then loads them one relationship at a time. See OD-14.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-35 | The system shall treat a subject as too broad when its first batch gets no answer within 60 s. | Must | Test (unit, recorded timeout). See OD-16 |
| FR-36 | The system shall also treat it as too broad when 502 or 504 errors persist after retries. | Must | Test (unit) |
| FR-37 | The system shall show a "subject too broad" message offering to load one relationship at a time. | Must | Test (E2E) |
| FR-38 | The system shall offer Try again on the too-broad message, since the service sometimes times out briefly. | Must | Test (E2E) |
| FR-39 | The system shall let the user find a relationship by name with Wikidata property search. | Must | Test (contract, E2E) |
| FR-40 | The system shall load each chosen relationship as its own sorted series of batches. | Must | Test (unit, contract) |
| FR-41 | The system shall mark the properties in the *Generic place link reference* as too large to load. | Must | Test (unit, E2E) |
| FR-42 | The system shall mark a relationship as too large when its own first batch times out. | Must | Test (unit) |
| FR-43 | The system shall explain on the About page that a date range does not make a too-broad subject loadable. | Should | Inspection |

### 6.5 Dates

Wikidata dates range from deep history to scheduled future events, and many are known only to the year.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-44 | The system shall sort events in true date order, including dates before year 1. | Must | Test (unit) |
| FR-45 | The system shall show a date before year 1 as a BCE year, such as 44 BCE. | Must | Test (unit). See OD-03 |
| FR-46 | The system shall show each date at its recorded precision, such as year, month, or day. | Must | Test (unit). See OD-03 |
| FR-47 | The system shall sort a year-only date before full dates in the same year. | Could | Test (unit) |
| FR-48 | The system shall mark events dated after today as future. | Could | Test (unit) |

### 6.6 Timeline list

The list is the main view. It works without the visual timeline and shows one page at a time.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-49 | The system shall list the subject's events by date, oldest first by default. | Must | Test (E2E) |
| FR-50 | The system shall let the user switch between oldest-first and newest-first. | Must | Test (E2E) |
| FR-51 | The system shall show each event's date, label, description, and relationships. | Must | Test (unit, E2E) |
| FR-52 | The system shall link every event to its Wikidata item page. | Must | Test (E2E, data validation) |
| FR-53 | The system shall show the subject's label, description, and Wikidata link above the list. | Must | Test (E2E) |
| FR-54 | The system shall show the loaded event count and the count after filters. | Must | Test (E2E) |
| FR-55 | The system shall show the list in pages of 50 events by default. | Must | Test (unit, E2E) |
| FR-56 | The system shall let the user move to the next, previous, first, or last page. | Must | Test (E2E) |
| FR-57 | The system shall show the current page number and the total number of pages. | Must | Test (E2E) |
| FR-58 | The system shall return to page 1 when a filter or the sort order changes. | Should | Test (unit) |

### 6.7 Filters

Filters work on every event loaded so far, across all batches and pages, so they never send a new query. The text filter is not an exact title match: words can match anywhere in an event's text.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-59 | The system shall offer a text filter over the loaded events. | Must | Test (E2E) |
| FR-60 | The system shall match filter words anywhere in an event's label, description, or relationships. | Must | Test (unit) |
| FR-61 | The system shall show only events containing every filter word, in any order. | Must | Test (unit) |
| FR-62 | The system shall let the user show only events with one or more chosen relationships. | Must | Test (unit, E2E) |
| FR-63 | The system shall let the user set a from date and a to date. | Must | Test (unit, E2E) |
| FR-64 | The system shall accept a year alone as a from or to date. | Must | Test (unit) |
| FR-65 | The system shall apply the text, relationship, and date filters together. | Must | Test (unit) |
| FR-66 | The system shall run filters, text search, and sort over all loaded events, not only the current page. | Must | Test (unit, E2E) |
| FR-67 | The system shall show a message when the filters hide every event. | Must | Test (E2E) |
| FR-68 | The system shall ignore letter case and accents when matching filter words. | Should | Test (unit) |
| FR-69 | The system shall show the number of events beside each relationship option. | Should | Test (unit) |
| FR-70 | The system shall clear all filters in one action. | Should | Test (E2E) |

### 6.8 Shareable links

A link should reopen exactly what the sender saw.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-71 | The system shall keep the view state in the URL, as listed in the *URL parameter reference*. | Must | Test (unit) |
| FR-72 | The system shall restore the same view when a shared URL is opened. | Must | Test (E2E) |
| FR-73 | The system shall show a shared page number once enough batches have loaded to fill it. | Must | Test (E2E) |
| FR-74 | The system shall ignore invalid URL parameters and tell the user which were ignored. | Must | Test (unit, E2E) |
| FR-75 | The system shall offer a button that copies the current view's link. | Should | Test (E2E) |
| FR-76 | The system shall give each event a link that opens the page holding that event, scrolled to it. | Should | Test (E2E) |
| FR-77 | The system shall restore earlier views with the browser Back and Forward buttons. | Should | Test (E2E) |

### 6.9 Visual timeline

The visual timeline is a Should. It shows the same filtered events as the list.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-78 | The system shall offer a visual timeline view of the filtered events. | Should | Test (E2E) |
| FR-79 | The system shall let the user zoom the visual timeline from centuries down to single days. | Should | Test (E2E), Demo |
| FR-80 | The system shall let the user pan the visual timeline by mouse, touch, and keyboard. | Should | Test (E2E), Demo |
| FR-81 | The system shall show an event's details when the user selects it on the visual timeline. | Should | Test (E2E) |

### 6.10 Loading, errors, and caching

Queries run live against a shared public service, so slow and failed requests are normal cases.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-82 | The system shall show a progress indicator while any request runs. | Must | Test (E2E) |
| FR-83 | The system shall show the matching message from the *Error message reference* when a request fails. | Must | Test (unit, E2E) |
| FR-84 | The system shall offer a Retry button after a failed query. | Must | Test (E2E) |
| FR-85 | The system shall wait the Retry-After time before retrying after an HTTP 429 response. | Must | Test (unit) |
| FR-86 | The system shall cancel a running timeline query when the user picks another subject. | Must | Test (unit) |
| FR-87 | The system shall wait for a pause in typing before sending a subject search request. | Must | Test (unit) |
| FR-88 | The system shall reuse a cached result, with its loading progress, for a subject fetched in the last 24 hours. | Should | Test (unit). See OD-08 |
| FR-89 | The system shall show when cached results were fetched and offer a Refresh button. | Should | Test (E2E) |

### 6.11 Export and import

A saved file lets the user reopen a timeline instantly and keep loading it later. See OD-15.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-90 | The system shall export the loaded timeline as a JSON file in the *Export file reference* format. | Must | Test (unit, E2E) |
| FR-91 | The system shall allow export while loading runs or after it stops. | Must | Test (E2E) |
| FR-92 | The system shall import an exported file and show its sorted, labeled list without querying Wikidata. | Must | Test (E2E network log) |
| FR-93 | The system shall restore the file's subject, filters, sort, and loading progress on import. | Must | Test (unit, E2E) |
| FR-94 | The system shall offer Resume for an imported timeline that is not complete. | Must | Test (E2E) |
| FR-95 | The system shall re-fetch only incomplete relationships and batches, starting one batch early for a file or cached timeline. | Must | Test (unit) |
| FR-96 | The system shall reject a file with an unknown schema version or invalid content, and say why. | Must | Test (unit, E2E) |
| FR-97 | The system shall show an imported file's fetch time and offer a full refresh. | Should | Test (E2E) |
| FR-98 | The system shall let the user download the filtered events as CSV. | Could | Test (unit) |

### 6.12 Curation

Curation turns a timeline into a research file: the user picks the events that matter and can add notes and tags. See OD-18.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-99 | The system shall show a checkbox on each event that selects or clears it. | Must | Test (E2E) |
| FR-100 | The system shall offer Select all on this page. | Must | Test (E2E) |
| FR-101 | The system shall offer Select all filtered events, across every page. | Must | Test (unit, E2E) |
| FR-102 | The system shall offer Clear selection. | Must | Test (E2E) |
| FR-103 | The system shall show how many events are selected. | Must | Test (E2E) |
| FR-104 | The system shall track selection by event key, not by position in the list. | Must | Test (unit) |
| FR-105 | The system shall keep the selection across page changes, filter changes, Stop, and Resume. | Must | Test (unit, E2E) |
| FR-106 | The system shall offer Export selected next to Export all. | Must | Test (E2E) |
| FR-107 | The system shall write only the selected events to a curated file, in the *Export file reference* format. | Must | Test (unit) |
| FR-108 | The system shall include selected events hidden by the current filters in Export selected. | Must | Test (unit) |
| FR-109 | The system shall mark each export file as curated or full. | Must | Test (unit) |
| FR-110 | The system shall show exactly the file's events, all selected, when a curated file is imported. | Must | Test (E2E) |
| FR-111 | The system shall offer to load the rest of the subject after a curated import. | Must | Test (E2E) |
| FR-112 | The system shall skip curated events' keys and keep them selected when the rest loads. | Must | Test (unit) |
| FR-113 | The system shall offer a Selected only view. | Should | Test (E2E) |
| FR-114 | The system shall let the user add a free-text note to any event. | Should | Test (E2E) |
| FR-115 | The system shall let the user add one or more tags to any event. | Should | Test (E2E) |
| FR-116 | The system shall let the user show only events with one or more chosen tags. | Should | Test (unit, E2E) |
| FR-117 | The system shall save selection, notes, and tags in browser storage, by subject and event key. | Should | Test (unit, E2E reload) |
| FR-118 | The system shall include notes and tags in both full and curated exports. | Should | Test (unit) |
| FR-119 | The system shall restore notes and tags when a file is imported. | Should | Test (unit, E2E) |
| FR-120 | The system shall let the user delete all saved selection, notes, and tags for a subject. | Should | Test (E2E) |
| FR-121 | The system shall also match text filter words in notes and tags. | Could | Test (unit) |

### 6.13 About and attribution

Chronicle covers any subject, including political ones, so it must stay neutral.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| FR-122 | The system shall state on every page that the data comes from Wikidata under CC0. | Must | Test (E2E) |
| FR-123 | The system shall show Wikidata text unchanged, with no ranking, rating, or commentary. | Must | Inspection, Test (unit) |
| FR-124 | The system shall offer an About page explaining how events are gathered and their limits. | Should | Inspection, Test (E2E) |

## 7. Non-functional requirements

Every number below is a target until it is measured. Quality scenarios at the end of this section show how the key targets are checked.

### 7.1 Performance

All numbers are targets until measured on the mid-range laptop and phone named in *Browser support reference*.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| NFR-01 | The system shall update the list within 200 ms of a filter change, with 20,000 events loaded (target). | Must | Test (performance unit) |
| NFR-02 | The system shall show subject suggestions within 1 s of a typing pause on broadband (target). | Should | Test (E2E timing) |
| NFR-03 | The system shall show the first page within 10 s of picking a subject with about 2,000 events, median (target). | Should | Analysis (live timing runs) |
| NFR-04 | The system shall show labels for the visible page within 2 s of the page appearing. | Should | Test (E2E timing). See OD-17 |
| NFR-05 | The system shall apply Select all filtered within 200 ms, with 20,000 events loaded (target). | Should | Test (performance unit) |
| NFR-06 | The system shall show an imported 20,000-event timeline within 2 s (target). | Should | Test (performance unit) |
| NFR-07 | The system shall show a new page within 100 ms of a page change, with 20,000 events loaded (target). | Should | Test (performance unit) |
| NFR-08 | The system shall load with under 300 KB of compressed JavaScript on first visit (target). | Should | Inspection (build report in CI) |

### 7.2 Reliability

These protect both the user and the shared Wikidata service.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| NFR-09 | The system shall abort any batch request with no answer after 60 s. | Must | Test (unit, fake timers) |
| NFR-10 | The system shall retry network and 5xx failures at most twice, with growing delays. | Must | Test (unit) |
| NFR-11 | The system shall not retry a query that Wikidata rejected as invalid (HTTP 400). | Must | Test (unit) |
| NFR-12 | The system shall send at most one query request and one label request at a time per tab. | Must | Test (unit) |
| NFR-13 | The system shall wait at least 2 s between one batch request and the next. | Must | Test (unit, fake timers). See OD-17 |
| NFR-14 | The system shall keep all loaded events when a later batch fails or loading is stopped. | Must | Test (unit, E2E) |
| NFR-15 | The system shall keep filtering loaded events after the network drops. | Should | Test (E2E, offline mode) |

### 7.3 Data correctness

Data-validation tests run these checks over every recorded response.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| NFR-16 | Every shown event shall have a date, a label or Q-ID, and a Wikidata link. | Must | Test (data validation) |
| NFR-17 | All batches combined shall equal a single unpaged query of the same fixture, with no duplicates or gaps. | Must | Test (contract, fixtures) |
| NFR-18 | No two loaded rows shall share a key after any mix of batches, retries, resume, and import. | Must | Test (unit, property-based) |
| NFR-19 | Exporting then importing shall restore identical events, order, filters, sort, and progress. | Must | Test (unit, round trip) |
| NFR-20 | Exporting then importing a curated file shall restore the same events, notes, and tags. | Must | Test (unit, round trip) |
| NFR-21 | No selected event shall be lost or added by paging, filtering, sorting, Stop, Resume, or loading the rest. | Must | Test (unit, property-based) |
| NFR-22 | The system shall handle labels containing commas, quotes, line breaks, and non-Latin scripts. | Must | Test (unit, fixtures) |
| NFR-23 | The system shall parse every Wikidata date form, including negative and five-digit years. | Must | Test (unit, fixtures) |
| NFR-24 | The CSV download shall quote fields as RFC 4180 describes. | Could | Test (unit, round trip) |

### 7.4 Security and privacy

There are no accounts and nothing personal is stored.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| NFR-25 | The system shall set no cookies and load no analytics or tracking scripts. | Must | Inspection, Test (E2E) |
| NFR-26 | The system shall send user input only to the hosts in the *Wikidata endpoint reference*. | Must | Test (E2E network log) |
| NFR-27 | The system shall render all Wikidata, imported, and user-written text as plain text, never as HTML. | Must | Test (unit, script-label fixture) |
| NFR-28 | The system shall keep selection, notes, and tags in the browser and send them nowhere. | Must | Test (E2E network log) |
| NFR-29 | The system shall put a subject into the query only if it matches `^Q[1-9][0-9]*$`. | Must | Test (unit) |
| NFR-30 | The system shall treat imported files as untrusted: validate every ID and render text as plain text. | Must | Test (unit, hostile-file fixtures) |
| NFR-31 | The system shall refuse import files over 50 MB. | Should | Test (unit). See OD-17 |
| NFR-32 | The system shall limit notes to 2,000 characters and tags to 40 characters (target). | Should | Test (unit) |
| NFR-33 | The system shall warn, and keep the unsaved note on screen, when browser storage is full. | Should | Test (unit, storage mock) |
| NFR-34 | The system shall declare a Content Security Policy allowing connections only to Wikidata hosts. | Should | Inspection, Test (E2E) |
| NFR-35 | The build shall fail on any high or critical dependency vulnerability. | Should | Inspection (CI) |

### 7.5 Usability and accessibility

Accessibility checks run in CI, not only by hand.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| NFR-36 | The system shall meet WCAG 2.2 level AA. | Must | Test (axe), manual screen reader check |
| NFR-37 | CI shall report zero serious or critical axe violations on every screen. | Must | Test (axe in Playwright) |
| NFR-38 | The system shall support every task with the keyboard alone. | Must | Test (E2E keyboard only) |
| NFR-39 | The system shall never use color as the only signal. | Must | Inspection |
| NFR-40 | The system shall work from 320 to 1920 px wide without horizontal scrolling. | Must | Test (E2E viewports) |
| NFR-41 | The system shall announce result count and page changes to screen readers. | Should | Test (unit, ARIA live region) |
| NFR-42 | A first-time user shall reach a timeline in three steps or fewer: type, pick, view. | Should | Demo |

### 7.6 Maintainability and testing

Testing is a visible part of the project. The layers are in the *Test layer reference*.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| NFR-43 | The system shall reach Wikidata only through one data-access layer. | Must | Inspection (lint rule bans fetch elsewhere) |
| NFR-44 | The data-access layer shall expose a source-neutral interface that a v2 backend can implement. | Must | Inspection, Test (fake source) |
| NFR-45 | The code shall pass TypeScript strict mode and lint with zero errors. | Must | Inspection (CI) |
| NFR-46 | Unit tests shall cover at least 80% of lines and 70% of branches (target). | Must | Inspection (coverage report) |
| NFR-47 | CI tests shall use recorded Wikidata responses and make no live calls. | Must | Test (E2E network log) |
| NFR-48 | CI shall run every layer in the *Test layer reference* on each pull request and block failing merges. | Must | Inspection (branch rules) |
| NFR-49 | A weekly scheduled job shall check that live Wikidata responses still match the recorded shapes. | Should | Test (contract) |
| NFR-50 | The README shall show the current coverage as a badge. | Should | Inspection |

### 7.7 Portability and compliance

Chronicle is static files only, so it can move to any static host later.

| ID | Requirement | Priority | Verification |
|---|---|---|---|
| NFR-51 | The system shall work in every browser in the *Browser support reference*. | Must | Test (Playwright projects) |
| NFR-52 | The system shall build to static files served from GitHub Pages under `/chronicle/`. | Must | Demo (deployed site) |
| NFR-53 | The system shall send an `Api-User-Agent` header naming Chronicle and a contact address. | Should | Test (unit). See OD-10 |
| NFR-54 | The system shall use only dependencies with licenses in the *License reference*. | Should | Inspection (license check in CI) |

### 7.8 Quality scenarios

Each scenario is proposed, not confirmed. The architecture document reuses these IDs.

| ID | Stimulus | Environment | Response | Measure | NFR |
|---|---|---|---|---|---|
| QS-01 | User picks a subject with about 2,000 dated links | Broadband, mid-range laptop, no cache | First page of 50 events appears | Median 10 s or less (target) | NFR-03 |
| QS-02 | User types into the text filter | 20,000 events loaded in 4 batches | List and page count update | 200 ms or less per change (target) | NFR-01 |
| QS-03 | User moves to the next page | 20,000 events loaded | Next 50 events show | 100 ms or less (target) | NFR-07 |
| QS-04 | Batches load on their own until the last one | Recorded 12,000-row fixture | Three batches combine into one timeline | Same rows as one unpaged query; zero duplicates | NFR-17 |
| QS-05 | A new page of unlabeled events appears | Broadband; labels from `wbgetentities` | Q-IDs are replaced by labels | 2 s or less for the visible page (target) | NFR-04 |
| QS-06 | User picks the United States (Q30) | Live service; first sorted batch times out | Too-broad message with relationship loading | Shown within 60 s; no unsorted paging | FR-35 |
| QS-07 | User selects Select all filtered | 20,000 events loaded, 8,000 match filters | 8,000 events selected; count updates | 200 ms or less (target) | NFR-05 |
| QS-08 | User exports 40 selected events with notes, then imports the file | New browser profile | The same 40 events, notes, and tags appear | Zero differences; no Wikidata request | NFR-20 |
| QS-09 | User imports a file with 2 of 3 batches and resumes | Recorded 12,000-row fixture | Only batch 3 is fetched | One query sent; zero duplicate keys | NFR-18 |
| QS-10 | Wikidata answers HTTP 429 with Retry-After: 30 | Shared IP, busy service | Waits, then retries once; message shown meanwhile | No request before 30 s | FR-85 |
| QS-11 | A batch for a huge subject hits the 60 s deadline | Live service | Error message and Retry; earlier batches stay loaded and filterable | Abort at 60 s | NFR-09 |
| QS-12 | An item label contains `<script>` text | Any subject | Label shown as literal text | No script runs; test passes | NFR-27 |
| QS-13 | Wikidata changes a response field name | Weekly contract job | Job fails and names the field | Found within 7 days | NFR-49 |
| QS-14 | A v2 backend replaces direct Wikidata calls | Developer change | Only the data-access layer changes | No UI file edited | NFR-44 |

## 8. Use cases

One use case per main user goal. Step letters (3a) mark alternatives at that step.

### UC-01: Find a subject's timeline

| Field | Content |
|---|---|
| Primary actor | Visitor or researcher |
| Goal | See every dated item linked to a subject |
| Preconditions | The site is open. |
| Main flow | 1. User types a subject name.<br>2. System suggests matching items with descriptions.<br>3. User picks one.<br>4. System queries Wikidata and shows progress.<br>5. System lists events by date with a total count. |
| Expected result | A date-sorted timeline for the subject, each event linked to Wikidata. |
| Alternatives and errors | 2a. No match: system tries the fuzzy search, then shows "no matching subject".<br>4a. Cached result under 24 hours old: system shows it with its fetch time.<br>4b. First batch times out: system shows the too-broad message (UC-06).<br>5a. More rows remain: system keeps loading batches (UC-05). |
| Related requirements | FR-01 to FR-03, FR-05 to FR-25, FR-27, FR-29, FR-44 to FR-55, FR-82, FR-86 to FR-89, FR-122 to FR-124, NFR-02 to NFR-04, NFR-08, NFR-16, NFR-22 to NFR-23, NFR-25 to NFR-27, NFR-29, NFR-34, NFR-36 to NFR-40, NFR-42 to NFR-44, NFR-51 |

### UC-02: Choose between subjects with similar names

| Field | Content |
|---|---|
| Primary actor | Visitor |
| Goal | Choose the right subject when names clash |
| Preconditions | Suggestions are showing. |
| Main flow | 1. System shows label, description, and Q-ID for each suggestion.<br>2. User compares descriptions and picks one.<br>3. System continues as in UC-01 step 4. |
| Expected result | The intended subject is loaded. |
| Alternatives and errors | 2a. User presses Enter without choosing: system picks the top suggestion. |
| Related requirements | FR-02, FR-04 to FR-05 |

### UC-03: Narrow the timeline with filters

| Field | Content |
|---|---|
| Primary actor | Researcher |
| Goal | Find specific events in a long timeline |
| Preconditions | A timeline is loaded. |
| Main flow | 1. User types words in the text filter.<br>2. System narrows all loaded events, returns to page 1, and updates the count.<br>3. User picks relationships and a date range.<br>4. System applies all filters together.<br>5. User flips the sort order. |
| Expected result | Only matching events show, in the chosen order. |
| Alternatives and errors | 2a. Nothing matches: system shows an empty-state message and a Clear filters action.<br>3a. Network drops: filters keep working on loaded events. |
| Related requirements | FR-21, FR-50, FR-54, FR-58 to FR-70, FR-98, FR-116, FR-121, NFR-01, NFR-15, NFR-24, NFR-36 to NFR-38, NFR-41 |

### UC-04: Share a view by link

| Field | Content |
|---|---|
| Primary actor | Visitor or researcher |
| Goal | Send someone the exact view |
| Preconditions | A filtered timeline is open. |
| Main flow | 1. User selects Copy link.<br>2. System copies a URL holding subject, filters, and sort.<br>3. Recipient opens the URL.<br>4. System restores the same view. |
| Expected result | The recipient sees the same events in the same order. |
| Alternatives and errors | 4a. A parameter is invalid: system ignores it and names it in a notice.<br>4b. The subject is not a valid Q-ID: system sends no query and shows the home page. |
| Related requirements | FR-71 to FR-77, FR-88, NFR-29, NFR-38, NFR-52 |

### UC-05: Load and page through a large timeline

| Field | Content |
|---|---|
| Primary actor | Researcher |
| Goal | Work through a subject with thousands of events |
| Preconditions | The first batch is loaded and more rows remain. |
| Main flow | 1. System shows page 1 of 50 events and the loading progress.<br>2. System fetches the next batch, skips known row keys, and merges the rest.<br>3. System fills in labels, visible page first.<br>4. User moves between pages and filters while loading continues.<br>5. System repeats step 2 until a batch has fewer than 5,000 rows. |
| Expected result | Every row is loaded, and the user can page, filter, and share any page. |
| Alternatives and errors | 2a. Batch fails after retries: loading pauses; loaded events stay; Retry fetches the same batch.<br>4a. User selects Stop: loading ends and loaded events stay; Resume continues later. |
| Related requirements | FR-20, FR-22, FR-25 to FR-26, FR-28 to FR-34, FR-55 to FR-57, FR-66, FR-73, FR-95, FR-105, NFR-04, NFR-07, NFR-12 to NFR-14, NFR-17 to NFR-18 |

### UC-06: Explore a subject too broad to load at once

| Field | Content |
|---|---|
| Primary actor | Researcher |
| Goal | See part of a subject that is too big to load whole |
| Preconditions | The first batch for the subject timed out. |
| Main flow | 1. System shows the too-broad message with Try again and relationship loading.<br>2. User finds a relationship by name.<br>3. System loads that relationship as its own sorted series.<br>4. User adds more relationships.<br>5. System merges each series, skipping known row keys. |
| Expected result | A timeline of the chosen relationships, sorted and filterable. |
| Alternatives and errors | 1a. User selects Try again and the batch finishes: loading continues as in UC-05.<br>2a. User picks a generic place link such as country: system shows it as too large.<br>3a. That relationship's first batch also times out: system marks it too large. |
| Related requirements | FR-07 to FR-08, FR-35 to FR-43 |

### UC-07: Save a timeline to a file and resume it later

| Field | Content |
|---|---|
| Primary actor | Researcher |
| Goal | Keep a large timeline and pick it up later |
| Preconditions | A timeline is loaded or loading. |
| Main flow | 1. User selects Export.<br>2. System saves a JSON file with events, settings, and progress.<br>3. Later, user selects Import and picks the file.<br>4. System checks the file and shows the sorted, labeled list at once.<br>5. User selects Resume.<br>6. System fetches only the incomplete parts, skipping known keys. |
| Expected result | The timeline is back as it was and can finish loading without duplicates. |
| Alternatives and errors | 4a. Unknown schema version or invalid content: system rejects the file and says why.<br>4b. File is old: system shows its fetch time and offers a full refresh. |
| Related requirements | FR-19 to FR-20, FR-32, FR-90 to FR-97, FR-109, FR-118 to FR-119, NFR-06, NFR-18 to NFR-19, NFR-30 to NFR-31 |

### UC-08: Build a curated research file

| Field | Content |
|---|---|
| Primary actor | Researcher |
| Goal | Keep only the events that matter, with notes |
| Preconditions | A timeline is loaded or loading. |
| Main flow | 1. User ticks events, or selects all filtered events.<br>2. System shows the selected count.<br>3. User adds notes and tags to some events.<br>4. User selects Export selected.<br>5. System saves a curated file with the selected events, notes, and tags.<br>6. Later, user imports the file.<br>7. System shows exactly those events, all selected. |
| Expected result | A curated research file that reopens exactly as saved. |
| Alternatives and errors | 3a. Browser storage is full: system warns and keeps the note on screen.<br>7a. User selects Load the rest: system loads the subject, skipping the curated keys. |
| Related requirements | FR-99 to FR-120, NFR-05, NFR-20 to NFR-21, NFR-27 to NFR-28, NFR-32 to NFR-33 |

### UC-09: Explore events on the visual timeline

| Field | Content |
|---|---|
| Primary actor | Visitor |
| Goal | See how events cluster over time |
| Preconditions | A timeline is loaded. |
| Main flow | 1. User switches to the visual timeline.<br>2. System plots the filtered events.<br>3. User zooms and pans.<br>4. User selects an event.<br>5. System shows its details and link. |
| Expected result | The user explores the same filtered events visually. |
| Alternatives and errors | 1a. Thousands of events: system groups nearby events until the user zooms in. |
| Related requirements | FR-78 to FR-81 |

### UC-10: Recover from a slow or failed query

| Field | Content |
|---|---|
| Primary actor | Visitor |
| Goal | Get a result despite a slow or busy service |
| Preconditions | A timeline query is running. |
| Main flow | 1. Wikidata is slow, throttles, or fails.<br>2. System shows the matching message.<br>3. User selects Retry.<br>4. System retries, honoring any Retry-After wait. |
| Expected result | The timeline loads, or the user knows why it could not. |
| Alternatives and errors | 1a. Query passes 60 s: system aborts it and offers Retry.<br>1b. HTTP 400: system shows a query error and does not retry.<br>1c. A later batch fails: loading pauses, loaded events stay, and Retry fetches that batch. |
| Related requirements | FR-34, FR-82 to FR-86, NFR-09 to NFR-12, NFR-14 to NFR-15 |

## 9. Data requirements

Chronicle stores nothing on a server. It holds query results in memory and, for 24 hours, in browser storage.

### 9.1 Entities

| Entity | Field | Type and rules |
|---|---|---|
| Subject | id | Q-ID; must match `^Q[1-9][0-9]*$` |
| Subject | label, description | English text; label falls back to the Q-ID; description may be empty |
| Row | key | itemId, propertyId, and date joined with `\|`; unique among loaded rows |
| Event | itemId | Q-ID of the linked item |
| Event | label, description | As Subject; shown unchanged |
| Event | relationships | One or more property IDs and English labels |
| Event | date | Wikidata time text, kept as text; may be negative or longer than four digits |
| Event | precision | As recorded: year, month, or day, or coarser such as decade or century (see OD-03) |
| Event | dateProperty | One of the *Date property reference* properties |
| Event | sourceUrl | `https://www.wikidata.org/wiki/<itemId>` |
| Load progress | series, rowsLoaded, complete, tooLarge | One series for the whole subject, or one per chosen relationship |
| Cache entry | subjectId, fetchedAt, events, progress | Deleted after 24 hours or on Refresh |
| Curation entry | subjectId, eventKey, selected, note, tags | Browser storage with no expiry; deleted only by the user |
| Export file | See the *Export file reference* | Plain JSON; untrusted on import |

Null rules: a missing description is an empty string, not "null". A missing label is replaced by the Q-ID. An event with no date is never shown.

### 9.2 Findings from the sample data

The sample query for Donald Trump (Q22686) with a 2015 floor shows what the parser and tests must handle.

| Finding | Value | Effect on requirements |
|---|---|---|
| Rows returned | 1,791 | Typical size for a well-known person |
| Same query with no date floor | 1,897 rows in about 4 s (Nov 13, 2026) | FR-14, NFR-03 |
| Exact duplicate rows | 97 | FR-20 |
| Distinct items | 1,034 | FR-21 |
| Labels containing commas | 332 | Naive CSV splitting breaks these; FR-18, NFR-22 |
| Labels that are only a Q-ID | 31 | FR-17 |
| Dates on January 1 | 90 | Many are likely year-only dates; FR-46 |
| Latest date | 2100-01-01 | Future or placeholder dates exist; FR-48 |
| Most common relationship | author (1,233 rows) | Mostly executive orders and proclamations; FR-62 |

The CSV export of the sample is correctly quoted, but splitting on commas breaks the 332 rows above. Chronicle reads the JSON results format instead and never parses CSV.

### 9.3 Privacy, retention, and licensing

- Personal data: none collected. The only user input sent out is the search text, to Wikidata.
- Notes and tags are the user's own content. They stay in the browser and leave it only in files the user exports.
- Retention: cached results live in the browser for up to 24 hours. Selection, notes, and tags stay until the user deletes them.
- Licensing: Wikidata data is CC0, so no attribution is legally required. Chronicle credits it anyway (FR-122).

## 10. External interfaces

### 10.1 User interface

| Screen | Contents |
|---|---|
| Home | Subject search box with suggestions; Import file; short explanation; attribution |
| Timeline | Subject header; filter panel (text, relationships, dates, tags, sort); event list or visual timeline; counts; Copy link; loading progress with Stop and Resume |
| Timeline: curation | Checkbox on each event; Select all on this page; Select all filtered; Clear selection; selected count; Selected only view; note and tag editor |
| Timeline: files | Export all; Export selected; Import file; fetch time with Refresh |
| About | How events are gathered, known limits, data source and license |

Accessibility follows WCAG 2.2 AA (NFR-36). The layout works from 320 px wide (NFR-40).

### 10.2 Software interfaces

Both services are public and need no key. Details are in the *Wikidata endpoint reference*.

**UNVERIFIED:** Since 2025 the main WDQS graph no longer contains scholarly articles, which moved to a separate endpoint. So papers about a subject may be missing. Check the WDQS graph split notes on wikidata.org (OD-19).

WDQS runs the full query again for each OFFSET, so a later batch costs about as much as the first. The load test confirmed this (*Appendix A*).

### 10.3 Communications

HTTPS only. Browser calls rely on CORS: WDQS answers with `Access-Control-Allow-Origin: *`, and the API needs `origin=*` (both checked Nov 13, 2026). Hardware interfaces: none.

## 11. Decisions

The owner decided all 19 questions on November 13, 2026. OD-13 to OD-15 were added in version 1.2, and OD-16 to OD-18 in version 1.3. The requirements follow these decisions. The options considered stay here for the record.

| OD-01 | How tolerant of typos must the subject search be? |
|---|---|
| Options | A. Entity search only (`wbsearchentities`). Fast, but prefix matching only: "Donld Trump" returns nothing (checked Nov 13, 2026).<br>B. Entity search first, then a fuzzy full-text search (`list=search` with `~`) when it finds nothing. Catches typos; one extra request. |
| Decision | B, as a Should. |
| Status | Decided, Nov 13, 2026 |

| OD-02 | Should the timeline query keep a lower date limit, like the 2015 floor in the sample query? |
|---|---|
| Options | A. No limit. Every dated item appears; the date filter narrows the view.<br>B. A fixed floor. Smaller results, but hides older history (births, founding dates).<br>C. A user-set floor sent to the query. Faster for huge subjects; more complex. |
| Decision | A. No date limit in v1. |
| Status | Decided, Nov 13, 2026 |

| OD-03 | How should BCE dates and year-only or month-only dates be handled? |
|---|---|
| Options | A. Show the raw date value. Simple, but a year-only date shows as January 1.<br>B. Also query each date's precision and show year, month, or day as recorded; show BCE years. Correct, but the query is larger. |
| Decision | B. Query precision; show BCE years. Made a Must in version 1.4 (*Appendix A*). |
| Status | Decided, Nov 13, 2026 |

| OD-04 | When one item links to the subject in several ways, is it one event or several? |
|---|---|
| Options | A. One row per relationship. Mirrors the raw data; repeats the same item.<br>B. One event per item and date, listing every relationship. Cleaner list; the relationship filter matches any of them. |
| Decision | B. Merge into one event. |
| Status | Decided, Nov 13, 2026 |

| OD-05 | Which date properties make an item an event? |
|---|---|
| Options | A. The four in the sample query (P585, P577, P580, P571).<br>B. Add more, such as end time (P582) or date of first performance (P1191). More events; slower query. |
| Decision | A for v1; review after the first contract tests. |
| Status | Decided, Nov 13, 2026 |

| OD-06 | Should the subject's own dated facts appear, such as date of birth? |
|---|---|
| Options | A. No. Only items that link to the subject. The sample query works this way, so a person's birth does not appear.<br>B. Yes. Also query the subject's own dated statements (birth, death, positions held). Matches the "born on day X" example; one more query. |
| Decision | B, as a Should. |
| Status | Decided, Nov 13, 2026 |

| OD-07 | How should very large result sets be fetched and shown? |
|---|---|
| Options | A. One query with a hard cap, such as 10,000 rows, and a notice that the timeline is incomplete.<br>B. 5,000-row batches with LIMIT and OFFSET under a stable ORDER BY, fetched by a Load more button.<br>C. The same batches, each one starting after the last finishes, with progress and a Stop button.<br>D. C plus a ceiling of 50,000 rows. |
| Decision | C, with 50 events per page and the page number in the URL. No row ceiling. Filters, search, and sort run over all loaded events. Changed from B in version 1.2; D was dropped because subjects that large time out first (*Appendix A*). |
| Status | Decided, Nov 13, 2026 |

| OD-08 | How long and where should results be cached in the browser? |
|---|---|
| Options | A. Memory only. Nothing stored; lost on reload.<br>B. Browser storage for 24 hours. Fast repeat visits; data can be up to a day old. |
| Decision | B, 24 hours, with a Refresh button. |
| Status | Decided, Nov 13, 2026 |

| OD-09 | Which language are labels and descriptions shown in? |
|---|---|
| Options | A. English only, with the Q-ID when no English label exists.<br>B. The browser's language with English fallback. Wider reach; more test cases. |
| Decision | A for v1. |
| Status | Decided, Nov 13, 2026 |

| OD-10 | How does the site identify itself to Wikidata, since browsers cannot set User-Agent? |
|---|---|
| Options | A. Send an `Api-User-Agent` header naming Chronicle and a contact. The query service allows this header (checked Nov 13, 2026).<br>B. Send nothing extra. Simpler, but less polite under the Wikimedia User-Agent policy. |
| Decision | A. |
| Status | Decided, Nov 13, 2026 |

| OD-11 | Should the site collect any usage analytics? |
|---|---|
| Options | A. None. Simplest privacy story.<br>B. A cookie-free, privacy-friendly counter. Shows visitor numbers for the portfolio. |
| Decision | A for v1. |
| Status | Decided, Nov 13, 2026 |

| OD-12 | When does the repository go public, and under which license? |
|---|---|
| Options | A. Private until the owner approves; MIT license when public.<br>B. Public from the start. |
| Decision | B. Public from the start under the MIT license. The owner confirms before the first push. |
| Status | Decided, Nov 13, 2026 |

| OD-13 | Should labels come from the query itself or from a separate lookup? |
|---|---|
| Options | A. The SPARQL label service inside each batch query. One request, but big batches time out.<br>B. Rows without labels, then `wbgetentities` lookups of 50 IDs each. More requests, but each is small. |
| Decision | B. Without labels, a 5,000-row World War II batch took 5.9 s instead of timing out. A 50-ID lookup took 0.55 s (*Appendix A*). |
| Status | Decided, Nov 13, 2026 |

| OD-14 | How should a subject too broad to load at once be handled? |
|---|---|
| Options | A. Count rows first and warn. Rejected: counts took 7 to 32 s, and the United States count timed out.<br>B. Split the query into date windows. Rejected: every US window timed out, even one month.<br>C. Page without sorting. Rejected: two identical runs shared only 354 of 4,981 rows.<br>D. Load one relationship at a time, and mark generic place links as too large. |
| Decision | D in v1. Full country-sized timelines move to the v2 backend, built from Wikidata bulk dumps (*Appendix A*). |
| Status | Decided, Nov 13, 2026 |

| OD-15 | Should users be able to save a timeline and come back to it? |
|---|---|
| Options | A. No. Rely on the 24-hour browser cache.<br>B. JSON export and import that records loading progress, so a timeline can be reopened and resumed. |
| Decision | B, as a Must. Row keys stop duplicates when a resumed or imported timeline loads more rows. |
| Status | Decided, Nov 13, 2026 |

| OD-16 | When does a subject count as too broad? |
|---|---|
| Options | A. When its first batch gets no answer within 60 s, Wikidata's own query limit, with a Try again button.<br>B. After several failed attempts. Fewer false alarms, but the user can wait minutes. |
| Decision | A. 60 s with Try again, set by the owner. Quick 502 and 504 errors are retried first. |
| Status | Decided, Nov 13, 2026 |

| OD-17 | Which loading targets protect Wikidata and keep the site responsive? |
|---|---|
| Options | A. At least 2 s between batch requests, labels for the visible page within 2 s, and imports up to 50 MB.<br>B. No pause between batches and no import limit. Faster, but harder on the shared service. |
| Decision | A. Accepted by the owner as proposed in version 1.2. |
| Status | Decided, Nov 13, 2026 |

| OD-18 | Should users be able to pick events and keep notes on them? |
|---|---|
| Options | A. No. Export saves everything loaded.<br>B. Event selection with Export selected, so a file can be a curated research set.<br>C. B plus notes and tags on each event. |
| Decision | B as a Must, and notes and tags as a Should. Merging curated files and storing collections on a server move to v2. |
| Status | Decided, Nov 13, 2026 |

| OD-19 | How should the missing scholarly articles be handled? |
|---|---|
| Options | A. Accept the gap and explain it on the About page.<br>B. Also query the separate scholarly endpoint and combine results. More complete; two queries and merging. |
| Decision | A for v1; B moves to v2. |
| Status | Decided, Nov 13, 2026 |

## 12. Acceptance criteria

End-to-end checks for the release. Each runs against recorded Wikidata responses unless it says live.

| ID | Scenario | Given / When / Then | Verifies |
|---|---|---|---|
| AC-01 | Find a timeline | **Given** the home page is open<br>**When** the user types "Donald Tru" and picks Donald Trump (Q22686)<br>**Then** a date-sorted list of events appears with a total count | FR-03, FR-05, FR-49, FR-54 |
| AC-02 | No subject found | **Given** the home page is open<br>**When** the user types "zzqqxx"<br>**Then** a "no matching subject" message appears and no timeline query is sent | FR-06, FR-05 |
| AC-03 | Typo in the subject | **Given** the entity search returns nothing for "Donld Trump"<br>**When** the fuzzy fallback runs<br>**Then** Donald Trump appears among the suggestions | FR-09 |
| AC-04 | Text filter matches anywhere | **Given** the Donald Trump timeline is loaded<br>**When** the user types "paris agreement"<br>**Then** events with both words anywhere in label, description, or relationships remain | FR-60, FR-61, FR-68 |
| AC-05 | Filters combine | **Given** the Donald Trump timeline is loaded<br>**When** the user picks "signatory" and sets 2017 to 2020<br>**Then** only signatory events dated 2017 through 2020 remain | FR-62, FR-63, FR-64, FR-65 |
| AC-06 | Filters hide everything | **Given** a timeline is loaded<br>**When** the filters match no event<br>**Then** an empty-state message and a way to clear filters appear | FR-67, FR-70 |
| AC-07 | Shared link reopens the view | **Given** a filtered, newest-first view on page 3 is open<br>**When** its URL is opened in a new browser<br>**Then** the same subject, filters, sort, page, and count appear | FR-71, FR-72, FR-50 |
| AC-08 | Batches load on their own | **Given** a recorded subject has 12,000 rows<br>**When** the user picks it<br>**Then** events show after batch 1, progress reaches 12,000 rows in 3 batches, then loading ends | FR-25, FR-27, FR-28, FR-29, FR-30, FR-33 |
| AC-09 | Stop and resume | **Given** batch 1 of a 12,000-row subject is loaded<br>**When** the user selects Stop, then Resume<br>**Then** 5,000 rows stay after Stop; Resume fetches from row 5,001 with no duplicates | FR-31, FR-32, NFR-14, FR-20 |
| AC-10 | Labels fill in | **Given** a batch has arrived without labels<br>**When** the label lookups finish<br>**Then** Q-IDs on the visible page change to English labels first | FR-15, FR-16, FR-17, FR-22 |
| AC-11 | Subject too broad | **Given** the recorded first batch for Q30 times out<br>**When** the user picks United States<br>**Then** after 60 s a too-broad message offers relationship loading and Try again | FR-35, FR-37, FR-38 |
| AC-12 | Load one relationship | **Given** the too-broad message is showing<br>**When** the user finds and picks "applies to jurisdiction"<br>**Then** that relationship loads as its own sorted series; country and citizenship show as too large | FR-39, FR-40, FR-41 |
| AC-13 | Export and import round trip | **Given** a filtered, sorted timeline is loaded<br>**When** the user exports it and imports the file in a new browser<br>**Then** the same events, order, filters, and sort appear with no Wikidata request | FR-90, FR-92, FR-93, NFR-19 |
| AC-14 | Resume an imported timeline | **Given** an imported file has 2 of 3 batches complete<br>**When** the user selects Resume<br>**Then** only batch 3 is fetched and no key appears twice | FR-94, FR-95, NFR-18 |
| AC-15 | Bad import file | **Given** a file has an unknown schema version or a label with `<script>`<br>**When** the user imports it<br>**Then** an unknown version is rejected with a reason; a script label shows as plain text | FR-96, NFR-30 |
| AC-16 | Pages of 50 | **Given** 1,897 events are loaded<br>**When** the user goes to the last page<br>**Then** the page shows 47 events and reads page 38 of 38 | FR-55, FR-56, FR-57 |
| AC-17 | Filters cover all loaded events | **Given** two batches are loaded and page 1 is showing<br>**When** the user types a word found only in batch 2<br>**Then** the matching events from batch 2 appear on page 1 | FR-66, FR-58 |
| AC-18 | A later batch fails | **Given** one batch is loaded<br>**When** batch 2 gets a server error on every retry<br>**Then** loading pauses, the loaded events stay, and Retry fetches batch 2 | NFR-14, NFR-10, FR-34 |
| AC-19 | Selection survives navigation | **Given** 3 events on page 1 are selected<br>**When** the user changes page, filters, sorts, then clears filters<br>**Then** the same 3 events are still selected and the count reads 3 | FR-99, FR-104, FR-105, FR-103 |
| AC-20 | Export selected | **Given** 5 events are selected and 2 are hidden by a filter<br>**When** the user selects Export selected<br>**Then** the file is marked curated and holds all 5 events with labels, dates, relationships, and source links | FR-106, FR-107, FR-108, FR-109 |
| AC-21 | Import a curated file | **Given** a curated file holds 40 events<br>**When** the user imports it<br>**Then** exactly those 40 events show, all selected, with no Wikidata request | FR-110, NFR-20 |
| AC-22 | Load the rest after a curated import | **Given** a curated file of 40 Trump events is imported<br>**When** the user selects Load the rest<br>**Then** the full timeline loads, the 40 stay selected, and no key appears twice | FR-111, FR-112, NFR-18 |
| AC-23 | Notes and tags | **Given** the user adds a note and the tag "trade" to one event<br>**When** the page reloads and the tag filter is set to "trade"<br>**Then** only that event shows, with its note, and both appear in an export | FR-114, FR-115, FR-116, FR-117, FR-118 |
| AC-24 | Notes stay private | **Given** an event has a note<br>**When** the E2E test records all network requests<br>**Then** no request contains the note or tag text | NFR-28 |
| AC-25 | Bad URL parameter | **Given** a URL has `q=Q22686` and `sort=sideways`<br>**When** the URL is opened<br>**Then** the timeline loads oldest-first and a notice names `sort` as ignored | FR-74 |
| AC-26 | Unsafe subject in URL | **Given** a URL has a `q` value that is not a Q-ID<br>**When** the URL is opened<br>**Then** no query is sent and the home page shows a notice | NFR-29, FR-74 |
| AC-27 | Rate limited | **Given** the recorded response is HTTP 429 with Retry-After: 30<br>**When** the user picks a subject<br>**Then** a wait message shows and no retry is sent before 30 s | FR-85, FR-83 |
| AC-28 | Query times out | **Given** the recorded response never answers<br>**When** 60 s pass<br>**Then** the batch request is aborted and a timeout message with Retry appears | NFR-09, FR-84 |
| AC-29 | BCE and year-only dates | **Given** a fixture has a 44 BCE date and a year-only 1969 date<br>**When** the timeline renders<br>**Then** they show as "44 BCE" and "1969" and sort in true order | FR-44, FR-45, FR-46 |
| AC-30 | Every event has a source | **Given** any recorded response<br>**When** the data-validation test runs<br>**Then** every event has a date, a label or Q-ID, and a Wikidata link | NFR-16, FR-52 |
| AC-31 | Accessible screens | **Given** each screen with recorded data<br>**When** the axe check runs in CI<br>**Then** zero serious or critical violations are reported | NFR-37 |

## 13. Future features

These are not requirements for v1.

| Feature | Reason deferred |
|---|---|
| Federal Register, Congress.gov, and other sources | v1 proves the Wikidata flow first |
| Merging and checking facts across sources | Needs the extra sources and a data model |
| Backend API and database (likely Node and Postgres) | Data model unknown until v2 sources are chosen |
| User notes, saved timelines, accounts | Needs a backend |
| Scholarly article endpoint | Second query and merge (OD-19) |
| Interface in other languages | English first (OD-09) |
| Several subjects on one timeline | Keep v1 to one subject |
| Full country-sized timelines, built from Wikidata bulk dumps and stored server-side | Too large for live queries (OD-14) |
| Merging several curated files into one timeline | Needs rules for clashing notes and subjects (OD-18) |
| Curated collections stored on a server | Needs the v2 backend (OD-18) |

## 14. Traceability

Each requirement maps to use cases and its verification. Architecture elements are added once that document exists.

| Requirement | Priority | Use cases | Verification |
|---|---|---|---|
| FR-01 | Must | UC-01 | Test (E2E) |
| FR-02 | Must | UC-01, UC-02 | Test (contract, E2E) |
| FR-03 | Must | UC-01 | Test (contract) |
| FR-04 | Must | UC-02 | Test (unit, E2E) |
| FR-05 | Must | UC-01, UC-02 | Test (E2E) |
| FR-06 | Must | UC-01 | Test (E2E) |
| FR-07 | Must | UC-01, UC-06 | Test (E2E) |
| FR-08 | Must | UC-01, UC-06 | Test (unit, contract) |
| FR-09 | Should | UC-01 | Test (contract). See OD-01 |
| FR-10 | Should | UC-01 | Test (E2E) |
| FR-11 | Should | UC-01 | Test (unit, E2E) |
| FR-12 | Must | UC-01 | Test (contract) |
| FR-13 | Must | UC-01 | Test (contract). See OD-05 |
| FR-14 | Must | UC-01 | Test (contract). See OD-02 |
| FR-15 | Must | UC-01 | Inspection, Test (contract). See OD-13 |
| FR-16 | Must | UC-01 | Test (contract). See OD-13 |
| FR-17 | Must | UC-01 | Test (unit). See OD-09 |
| FR-18 | Must | UC-01 | Inspection, Test (unit) |
| FR-19 | Must | UC-01, UC-07 | Test (unit) |
| FR-20 | Must | UC-01, UC-05, UC-07 | Test (unit) |
| FR-21 | Must | UC-01, UC-03 | Test (unit). See OD-04 |
| FR-22 | Should | UC-01, UC-05 | Test (unit) |
| FR-23 | Should | UC-01 | Test (contract). See OD-06 |
| FR-24 | Should | UC-01 | Test (unit) |
| FR-25 | Must | UC-01, UC-05 | Test (unit, contract). See OD-07 |
| FR-26 | Must | UC-05 | Test (contract) |
| FR-27 | Must | UC-01 | Test (E2E) |
| FR-28 | Must | UC-05 | Test (unit, E2E) |
| FR-29 | Must | UC-01, UC-05 | Test (E2E) |
| FR-30 | Must | UC-05 | Test (E2E) |
| FR-31 | Must | UC-05 | Test (E2E) |
| FR-32 | Must | UC-05, UC-07 | Test (unit, E2E) |
| FR-33 | Must | UC-05 | Test (unit) |
| FR-34 | Must | UC-05, UC-10 | Test (unit, E2E) |
| FR-35 | Must | UC-06 | Test (unit, recorded timeout). See OD-16 |
| FR-36 | Must | UC-06 | Test (unit) |
| FR-37 | Must | UC-06 | Test (E2E) |
| FR-38 | Must | UC-06 | Test (E2E) |
| FR-39 | Must | UC-06 | Test (contract, E2E) |
| FR-40 | Must | UC-06 | Test (unit, contract) |
| FR-41 | Must | UC-06 | Test (unit, E2E) |
| FR-42 | Must | UC-06 | Test (unit) |
| FR-43 | Should | UC-06 | Inspection |
| FR-44 | Must | UC-01 | Test (unit) |
| FR-45 | Must | UC-01 | Test (unit). See OD-03 |
| FR-46 | Must | UC-01 | Test (unit). See OD-03 |
| FR-47 | Could | UC-01 | Test (unit) |
| FR-48 | Could | UC-01 | Test (unit) |
| FR-49 | Must | UC-01 | Test (E2E) |
| FR-50 | Must | UC-01, UC-03 | Test (E2E) |
| FR-51 | Must | UC-01 | Test (unit, E2E) |
| FR-52 | Must | UC-01 | Test (E2E, data validation) |
| FR-53 | Must | UC-01 | Test (E2E) |
| FR-54 | Must | UC-01, UC-03 | Test (E2E) |
| FR-55 | Must | UC-01, UC-05 | Test (unit, E2E) |
| FR-56 | Must | UC-05 | Test (E2E) |
| FR-57 | Must | UC-05 | Test (E2E) |
| FR-58 | Should | UC-03 | Test (unit) |
| FR-59 | Must | UC-03 | Test (E2E) |
| FR-60 | Must | UC-03 | Test (unit) |
| FR-61 | Must | UC-03 | Test (unit) |
| FR-62 | Must | UC-03 | Test (unit, E2E) |
| FR-63 | Must | UC-03 | Test (unit, E2E) |
| FR-64 | Must | UC-03 | Test (unit) |
| FR-65 | Must | UC-03 | Test (unit) |
| FR-66 | Must | UC-03, UC-05 | Test (unit, E2E) |
| FR-67 | Must | UC-03 | Test (E2E) |
| FR-68 | Should | UC-03 | Test (unit) |
| FR-69 | Should | UC-03 | Test (unit) |
| FR-70 | Should | UC-03 | Test (E2E) |
| FR-71 | Must | UC-04 | Test (unit) |
| FR-72 | Must | UC-04 | Test (E2E) |
| FR-73 | Must | UC-04, UC-05 | Test (E2E) |
| FR-74 | Must | UC-04 | Test (unit, E2E) |
| FR-75 | Should | UC-04 | Test (E2E) |
| FR-76 | Should | UC-04 | Test (E2E) |
| FR-77 | Should | UC-04 | Test (E2E) |
| FR-78 | Should | UC-09 | Test (E2E) |
| FR-79 | Should | UC-09 | Test (E2E), Demo |
| FR-80 | Should | UC-09 | Test (E2E), Demo |
| FR-81 | Should | UC-09 | Test (E2E) |
| FR-82 | Must | UC-01, UC-10 | Test (E2E) |
| FR-83 | Must | UC-10 | Test (unit, E2E) |
| FR-84 | Must | UC-10 | Test (E2E) |
| FR-85 | Must | UC-10 | Test (unit) |
| FR-86 | Must | UC-01, UC-10 | Test (unit) |
| FR-87 | Must | UC-01 | Test (unit) |
| FR-88 | Should | UC-01, UC-04 | Test (unit). See OD-08 |
| FR-89 | Should | UC-01 | Test (E2E) |
| FR-90 | Must | UC-07 | Test (unit, E2E) |
| FR-91 | Must | UC-07 | Test (E2E) |
| FR-92 | Must | UC-07 | Test (E2E network log) |
| FR-93 | Must | UC-07 | Test (unit, E2E) |
| FR-94 | Must | UC-07 | Test (E2E) |
| FR-95 | Must | UC-07, UC-05 | Test (unit) |
| FR-96 | Must | UC-07 | Test (unit, E2E) |
| FR-97 | Should | UC-07 | Test (E2E) |
| FR-98 | Could | UC-03 | Test (unit) |
| FR-99 | Must | UC-08 | Test (E2E) |
| FR-100 | Must | UC-08 | Test (E2E) |
| FR-101 | Must | UC-08 | Test (unit, E2E) |
| FR-102 | Must | UC-08 | Test (E2E) |
| FR-103 | Must | UC-08 | Test (E2E) |
| FR-104 | Must | UC-08 | Test (unit) |
| FR-105 | Must | UC-08, UC-05 | Test (unit, E2E) |
| FR-106 | Must | UC-08 | Test (E2E) |
| FR-107 | Must | UC-08 | Test (unit) |
| FR-108 | Must | UC-08 | Test (unit) |
| FR-109 | Must | UC-08, UC-07 | Test (unit) |
| FR-110 | Must | UC-08 | Test (E2E) |
| FR-111 | Must | UC-08 | Test (E2E) |
| FR-112 | Must | UC-08 | Test (unit) |
| FR-113 | Should | UC-08 | Test (E2E) |
| FR-114 | Should | UC-08 | Test (E2E) |
| FR-115 | Should | UC-08 | Test (E2E) |
| FR-116 | Should | UC-08, UC-03 | Test (unit, E2E) |
| FR-117 | Should | UC-08 | Test (unit, E2E reload) |
| FR-118 | Should | UC-08, UC-07 | Test (unit) |
| FR-119 | Should | UC-08, UC-07 | Test (unit, E2E) |
| FR-120 | Should | UC-08 | Test (E2E) |
| FR-121 | Could | UC-03 | Test (unit) |
| FR-122 | Must | UC-01 | Test (E2E) |
| FR-123 | Must | UC-01 | Inspection, Test (unit) |
| FR-124 | Should | UC-01 | Inspection, Test (E2E) |
| NFR-01 | Must | UC-03 | Test (performance unit) |
| NFR-02 | Should | UC-01 | Test (E2E timing) |
| NFR-03 | Should | UC-01 | Analysis (live timing runs) |
| NFR-04 | Should | UC-01, UC-05 | Test (E2E timing). See OD-17 |
| NFR-05 | Should | UC-08 | Test (performance unit) |
| NFR-06 | Should | UC-07 | Test (performance unit) |
| NFR-07 | Should | UC-05 | Test (performance unit) |
| NFR-08 | Should | UC-01 | Inspection (build report in CI) |
| NFR-09 | Must | UC-10 | Test (unit, fake timers) |
| NFR-10 | Must | UC-10 | Test (unit) |
| NFR-11 | Must | UC-10 | Test (unit) |
| NFR-12 | Must | UC-10, UC-05 | Test (unit) |
| NFR-13 | Must | UC-05 | Test (unit, fake timers). See OD-17 |
| NFR-14 | Must | UC-05, UC-10 | Test (unit, E2E) |
| NFR-15 | Should | UC-03, UC-10 | Test (E2E, offline mode) |
| NFR-16 | Must | UC-01 | Test (data validation) |
| NFR-17 | Must | UC-05 | Test (contract, fixtures) |
| NFR-18 | Must | UC-05, UC-07 | Test (unit, property-based) |
| NFR-19 | Must | UC-07 | Test (unit, round trip) |
| NFR-20 | Must | UC-08 | Test (unit, round trip) |
| NFR-21 | Must | UC-08 | Test (unit, property-based) |
| NFR-22 | Must | UC-01 | Test (unit, fixtures) |
| NFR-23 | Must | UC-01 | Test (unit, fixtures) |
| NFR-24 | Could | UC-03 | Test (unit, round trip) |
| NFR-25 | Must | UC-01 | Inspection, Test (E2E) |
| NFR-26 | Must | UC-01 | Test (E2E network log) |
| NFR-27 | Must | UC-01, UC-08 | Test (unit, script-label fixture) |
| NFR-28 | Must | UC-08 | Test (E2E network log) |
| NFR-29 | Must | UC-01, UC-04 | Test (unit) |
| NFR-30 | Must | UC-07 | Test (unit, hostile-file fixtures) |
| NFR-31 | Should | UC-07 | Test (unit). See OD-17 |
| NFR-32 | Should | UC-08 | Test (unit) |
| NFR-33 | Should | UC-08 | Test (unit, storage mock) |
| NFR-34 | Should | UC-01 | Inspection, Test (E2E) |
| NFR-35 | Should | - | Inspection (CI) |
| NFR-36 | Must | UC-01, UC-03 | Test (axe), manual screen reader check |
| NFR-37 | Must | UC-01, UC-03 | Test (axe in Playwright) |
| NFR-38 | Must | UC-01, UC-03, UC-04 | Test (E2E keyboard only) |
| NFR-39 | Must | UC-01 | Inspection |
| NFR-40 | Must | UC-01 | Test (E2E viewports) |
| NFR-41 | Should | UC-03 | Test (unit, ARIA live region) |
| NFR-42 | Should | UC-01 | Demo |
| NFR-43 | Must | UC-01 | Inspection (lint rule bans fetch elsewhere) |
| NFR-44 | Must | UC-01 | Inspection, Test (fake source) |
| NFR-45 | Must | - | Inspection (CI) |
| NFR-46 | Must | - | Inspection (coverage report) |
| NFR-47 | Must | - | Test (E2E network log) |
| NFR-48 | Must | - | Inspection (branch rules) |
| NFR-49 | Should | - | Test (contract) |
| NFR-50 | Should | - | Inspection |
| NFR-51 | Must | UC-01 | Test (Playwright projects) |
| NFR-52 | Must | UC-04 | Demo (deployed site) |
| NFR-53 | Should | - | Test (unit). See OD-10 |
| NFR-54 | Should | - | Inspection (license check in CI) |

## References

Named reference tables used by the requirements.

**Date property reference**

| Property | Name | Typical items |
|---|---|---|
| P585 | point in time | Events, rulings, speeches |
| P577 | publication date | Books, films, articles, orders |
| P580 | start time | Campaigns, terms, conflicts |
| P571 | inception | Organizations, works, places |

**URL parameter reference**

| Parameter | Meaning | Example |
|---|---|---|
| `q` | Subject Q-ID | `q=Q22686` |
| `text` | Text filter words | `text=paris+agreement` |
| `rel` | Chosen relationship property IDs | `rel=P50,P1891` |
| `from`, `to` | Date range; a year or a full date | `from=2017&to=2021-01-20` |
| `sort` | `asc` or `desc` | `sort=desc` |
| `page` | List page number, 50 events per page | `page=3` |
| `srel` | Relationships the query is limited to (search form) | `srel=P1001` |
| `sfrom`, `sto` | Date range the query is limited to (search form) | `sfrom=1900&sto=1950` |
| `view` | `list` or `timeline` | `view=timeline` |
| `event` | Event to scroll to | `event=Q29884942` |

**Wikidata endpoint reference**

| Service | Endpoint | Notes |
|---|---|---|
| Entity search | `https://www.wikidata.org/w/api.php?action=wbsearchentities` | `language=en`, `format=json`, `origin=*`; prefix match only |
| Fuzzy fallback | `https://www.wikidata.org/w/api.php?action=query&list=search` | `~` after a word allows typos |
| Timeline query | `https://query.wikidata.org/sparql` | Accept `application/sparql-results+json`; no label service; date and precision from the best-rank statement value (`wikibase:timeValue`, `wikibase:timePrecision`); `ORDER BY` date, item, property; `LIMIT 5000`, `OFFSET`; 60 s deadline per batch; 429 with Retry-After |
| Label lookup | `https://www.wikidata.org/w/api.php?action=wbgetentities` | Up to 50 IDs; `props=labels\|descriptions`, `languages=en`, `origin=*` |
| Property search | `https://www.wikidata.org/w/api.php?action=wbsearchentities&type=property` | Relationship picker for too-broad subjects |
| Item pages | `https://www.wikidata.org/wiki/<Q-ID>` | Source links only; no calls |

**Error message reference**

| Case | Message to the user |
|---|---|
| Network offline | You appear to be offline. Loaded events still filter. Retry when connected. |
| Timeout (60 s) | Wikidata took too long. Large subjects can time out. Retry, or try a narrower subject. |
| HTTP 429 | Wikidata is busy. Retrying in N seconds. |
| HTTP 5xx | Wikidata had a problem. Retry in a moment. |
| HTTP 400 | The query could not run. This is a Chronicle bug; please report it. |
| Loading in progress | Loaded N events in B batches. More are on the way. Stop keeps what has loaded. |
| Loading paused | Loading paused after an error. The events already loaded are still here. Retry. |
| Subject too broad | This subject is too broad to load at once. Load it one relationship at a time, or Try again. |
| Relationship too large | This relationship is too large to load. Pick a narrower one. |
| Import rejected | This file could not be opened: <reason>. |
| No subject found | No matching subject. Check the spelling or try another name. |
| Invalid URL parameter | Some link settings were ignored: <names>. |

**Test layer reference**

| Layer | Tool | What it checks |
|---|---|---|
| Unit | Vitest | Parsing, merging, dates, filters, URL state, retry logic |
| Contract | Vitest with recorded responses | Response shapes from both Wikidata services; weekly live run |
| Data validation | Vitest over fixtures | Every event has a date, label or Q-ID, and source link |
| End-to-end | Playwright | User flows in the *Browser support reference* browsers |
| Accessibility | axe with Playwright | WCAG 2.2 AA rules on every screen |
| Fault injection | Playwright with mocked routes | Timeouts, 429, 502 and 504, too-broad, Stop and Resume |
| Round trip | Vitest | Full and curated export then import; resume and load the rest; no duplicate keys; selection kept |
| Static checks | TypeScript strict, ESLint | Types, lint, data-access rule |

**Browser support reference**

| Platform | Browsers | Reference device |
|---|---|---|
| Desktop | Latest two versions of Chrome, Edge, Firefox, Safari | Mid-range laptop, 8 GB RAM |
| Mobile | Latest two versions of Safari on iOS and Chrome on Android | Mid-range phone, about 3 years old |

**License reference**

| License | Example dependencies |
|---|---|
| MIT | React, Vite, Vitest |
| Apache-2.0 | Playwright |
| MPL-2.0 | axe-core |
| BSD-2-Clause, BSD-3-Clause, ISC | Small utilities |
| CC0 (data) | Wikidata content |

**Export file reference**

| Field | Content |
|---|---|
| `schemaVersion` | Format version, starting at 1; unknown versions are rejected |
| `kind` | `full` (all loaded events with progress) or `curated` (selected events only) |
| `exportedAt` | When the file was saved, ISO 8601 in UTC |
| `subject` | Q-ID, label, and description |
| `scope` | Relationships and date range set on the search form |
| `filters`, `sort`, `page` | The view when exported |
| `progress` | Full files only. Per series: relationship or all, rows loaded, complete, too large |
| `fetchedAt` | When the rows were fetched, ISO 8601 in UTC |
| `events` | In sorted order: event key, item ID, label, description, source link, date, precision, date property, and relationships |
| `events[].selected` | True for every event in a curated file; the current selection in a full file |
| `events[].note`, `events[].tags` | Optional user note and tags (Should) |

**Generic place link reference**

| Property | Name | Basis |
|---|---|---|
| P17 | country | Measured: one year for the United States timed out |
| P27 | country of citizenship | Same kind of link to every citizen; expected to time out |

The list starts with these two. Any relationship whose first batch times out is also marked too large (FR-42).

## Appendix A. Load-test evidence

These measurements, taken on November 13, 2026, shaped the batching, label, too-broad, and export decisions. Queries ran one at a time, 5 to 15 s apart, with an `Api-User-Agent` header. The service varied from run to run, so single timings are indicative, not exact.

### A.1 Row counts and batch times

| Subject | Rows | Count query | Batch with labels | Batch without labels |
|---|---|---|---|---|
| Donald Trump (Q22686) | 1,897 | 12.6 s | 0.6 s (all rows) | Not needed |
| California (Q99) | 11,100 | 7.3 s | 42.7 s first; 29.7 s later | Not measured |
| Los Angeles (Q65) | 14,189 | 19.7 s | 24.6 s first; later timed out | Not measured |
| World War II (Q362) | 15,091 | 31.5 s | Timed out | 5.9 s first; 4.7 s later |
| United States (Q30) | Over 505,000 | Timed out | Timed out | Timed out when sorted |

Takeaways: counting first is too slow to run before every search. The label service is what makes large batches time out. A later batch costs about the same as the first. A 50-ID `wbgetentities` lookup took 0.55 s.

### A.2 Approaches tried for the United States

| Approach | Result | Verdict |
|---|---|---|
| One-year date windows (1776, 1900, 1950, 2000) | All timed out (60 s limit) | Rejected |
| One-month window (July 1776) | Timed out (60 s limit) | Rejected |
| Decade window (1800 to 1809) | Server error at 54 s | Rejected |
| Date range checked first (2000) | Timed out (60 s limit) | Rejected |
| Unsorted paging | Ran in 1.3 s at row 50,000, 32.9 s at row 500,000, and failed at row 1,000,000. Two identical runs shared only 354 of 4,981 rows. | Rejected: unstable |
| One relationship: applies to jurisdiction (P1001) | 5,000 sorted rows in 1.4 s | Chosen |
| One relationship: country (P17), year 2000 only | Timed out (60 s limit) | Marked too large |

Date windows fail because the service gathers every item linked to the subject before it applies the dates. A smaller window costs as much as the whole subject, so splitting busy years would not help. Loading the full United States live would take about 45 minutes for the first 500,000 rows and could not finish. That work belongs to the v2 backend, which can build such timelines from Wikidata bulk dumps.

### A.3 Cost of fetching date precision

Run on November 13, 2026, for version 1.4. Each batch ran once without precision (`wdt:` dates) and once with precision (best-rank statement value with `wikibase:timePrecision`), one query at a time, 12 s apart, with an `Api-User-Agent` header. Round 2 ran the pairs in the opposite order.

| Batch | Round 1: without / with | Round 2: with / without | Rows |
|---|---|---|---|
| Donald Trump, rows 1 to 1,897 | 1.6 s / 12.8 s | 0.6 s / 0.4 s (served from the service cache) | 1,897 both ways |
| World War II, rows 1 to 5,000 | 4.3 s / 9.7 s | 32.1 s / 42.2 s | 5,000 both ways |
| World War II, rows 5,001 to 10,000 | 8.4 s / 9.1 s | 25.8 s / 18.7 s | 5,000 both ways |

Precision added between 1 and 11 s in the first round, and the second round swung more than that in both directions, so service load matters more than the extra lookup. Every batch stayed well within 60 s and returned the same rows. Precision matters: in the first World War II batch, 3,424 of 5,000 dates were year-only, and 1,720 of Donald Trump's 1,897 dates were exact days.
