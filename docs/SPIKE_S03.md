# Spike S-03: IndexedDB size and persistent storage

November 21, 2026

## Question

Can the browser store a 20 MB IndexedDB value, and does `navigator.storage.persist()` make that storage stick?

## What was measured

The spike is in `spikes/s03-indexeddb/`. It is not part of the app. Re-run it with `node spikes/s03-indexeddb/measure.mjs`. The numbers below are from `spikes/s03-indexeddb/results.json`, measured at 2026-11-21T18:15:42Z.

Playwright opened a local page in headless Chromium, Firefox, and WebKit. The page created a 20,971,520 byte array (20 × 1024 × 1024) filled with a mixed byte stream, stored it in IndexedDB under the database name `chronicle-spike`, read it back, and checked several offsets. It then called `navigator.storage.persist()` and `navigator.storage.estimate()`. A second page in the same browser profile read the value again.

This is the same 4-vCPU cloud VM as the filter spike. It is not a phone, and it has a large disk. Nothing here watched a browser for days, so eviction was not measured.

## Results

All three browsers stored the array and returned every byte, including from the second page.

| Browser | Write and read | persist() | persisted() afterward | Reported quota | Reported usage |
| --- | --- | --- | --- | --- | --- |
| Chromium 159 | 72 ms, round trip ok | false | false | 10,737,491,968 bytes | 73,728 bytes |
| Firefox 159 | 155 ms, round trip ok | no answer within 20 s | false | 10,737,418,240 bytes | 1,116,776 bytes |
| WebKit (Playwright, Safari 27.2 user agent) | 138 ms, round trip ok | false | false | 1,048,576,000 bytes | 20,971,587 bytes |

The second page read 20,971,520 bytes in each browser.

Chromium and Firefox reported far less usage than the number of bytes that read back. WebKit's usage rose by about the full 20 MB. I did not find out why those usage figures disagree. The round trip is the check that the bytes were stored.

The quota numbers are what these desktop builds reported on this machine. I did not try to fill them, and I did not measure a phone.

`persist()` did not grant persistent storage in any of the three. Chromium and WebKit returned false. Firefox's call was still pending after 20 seconds, so the spike aborted it. `persisted()` stayed false in all three.

## What the docs say, which this spike did not watch

I did not leave a browser running long enough to see eviction. These are the published rules I read, not measurements:

- MDN, [Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria): data is best-effort until `persist()` is granted. Under storage pressure, browsers delete best-effort origins, least recently used first. Granted persistent storage is skipped. Safari also deletes script-written data after seven days of browser use without a user interaction on the site, when tracking prevention is on.
- WebKit, [Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/) (the 7-day cap section): IndexedDB and other script-writable storage are deleted after seven days of Safari use with no user interaction on the site. A site added to the Home Screen keeps its own counter.
- WebKit, [Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/) (August 10, 2023): eviction can happen for quota, storage pressure, or lack of interaction. `persist()` exists from Safari 17. WebKit grants it from heuristics such as a Home Screen web app, not for every page.

## Recommendation

Use IndexedDB for the 24-hour cache and for notes. A 20 MB value fit in all three engines here, with time to spare.

Still ask for persistent storage once, the first time someone selects an event or writes a note. Do not treat a granted answer as likely. These automated browsers refused it or did not answer. Keep telling the user that exporting a file is the copy that survives a cleared browser.

The seven-day Safari rule is documented by WebKit. This spike did not see it happen. The About page should still say that notes live in this browser and can be deleted.

localStorage was not measured. The architecture's note that it is about 5 MB is still unchecked.

## Proposed doc edits

Drafts only. The SRS, architecture, and implementation plan are unchanged.

- Architecture, ADR-009: add the S-03 result. 20 MB was written and read back in Chromium, Firefox, and Playwright WebKit. `persist()` was not granted in those runs. Export stays the safe copy.
- Architecture, ADR-009 alternatives: leave the localStorage size line unverified. S-03 did not measure it.
- Architecture, risk R-06: cite the two WebKit posts and the MDN eviction page as the source for the seven-day Safari rule. Note that S-03 did not observe eviction, and that `persist()` returned false or did not return in these automated browsers.
- Architecture, OD-24: keep the one-time request. Add that S-03 did not get a grant, so the short note shown to the user should say the browser may refuse and that export is the safe copy.
- Implementation plan, W-52: keep the persistent-storage request, and do not block that work on a successful grant in tests. A test can accept false.
