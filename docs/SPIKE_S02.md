# Spike S-02: Filtering 20,000 events

November 21, 2026

## Question

Can a text filter over 20,000 events finish within 200 ms on a phone-class device, or does the filter need a Web Worker?

## What was measured

The spike is in `spikes/s02-filter/`. It is not part of the app. Re-run it with `node spikes/s02-filter/measure.mjs`. The numbers below are from `spikes/s02-filter/results.json`, measured at 2026-11-21T18:10:29Z.

The page built 20,000 synthetic events. Each event has a label, a description, and one relationship name. One event is titled "Paris Agreement". One is titled "École normale supérieure". Forty more mention both "Paris" and "agreement".

The filter folds case and accents once, when the events are prepared, and stores that text on the event. A later filter splits the query into words and keeps events whose stored text contains every word. A second, slower version folds the text again on every filter, for comparison.

Playwright opened the page in Chromium with a Pixel 7 viewport (412 by 839). One run had no CPU throttle. One run set Chrome DevTools CPU throttling to 4x. Each filter was timed 31 times after a short warm-up. Typing "agreement" one letter at a time was timed 11 times per prefix.

This machine is a 4-vCPU cloud VM (`Intel(R) Xeon(R) Processor`, Node 22.23.4). It is not a phone. A fixed counting loop took 8.6 ms unthrottled and 34.6 ms at 4x, so the throttle did slow the page by about four times. A real mid-range phone was not available here.

The DOM check only replaces 50 text rows. It is not a React render of a full event row.

## Results

Match counts were the same in both runs: "paris agreement" matched 41 events, "ecole" matched the accented school name, and a one-letter "a" matched all 20,000 because the stored text contains "about".

| Step | No throttle, median | 4x throttle, median | 4x throttle, slowest sample |
| --- | --- | --- | --- |
| Prepare the search text once | 13 ms | 36 ms | one sample |
| Filter "paris agreement" | 0.5 ms | 1.7 ms | 2.2 ms |
| Filter "ecole" | 1.3 ms | 3.9 ms | 4.7 ms |
| Type "a" (matches all 20,000) | 0.3 ms | 1.1 ms | 1.4 ms |
| Fold text again on every filter | 6.9 ms | 28.2 ms | 31.8 ms |
| Write 50 matching rows into the page | 0 ms | 0 ms | 0.8 ms |

Every precomputed filter stayed under 5 ms at 4x. The version that folds text on every keystroke stayed under 32 ms. Both are well under 200 ms on this proxy. The 50-row DOM write was too small for a stable median.

## Recommendation

Keep the filter on the main thread. Prepare the folded search text when events load, and do not add a Web Worker for v1.

The margin under 200 ms is large on this proxy, including the slower fold-every-time version. A physical phone could still be slower than 4x on this VM. The phone check in the test plan should still be run before release. Add a Worker only if that check, or the later performance test, misses 200 ms.

## Proposed doc edits

Drafts only. The SRS, architecture, and implementation plan are unchanged.

- Architecture, risk R-05: record the S-02 result. The precomputed filter stayed under 5 ms median at 4x CPU throttle on a 4-vCPU cloud VM with a Pixel 7 viewport. Do not plan a Worker unless a real phone misses 200 ms.
- Architecture, QS-02: keep the 200 ms target. Note that S-02 measured a synthetic filter, not the finished screen, and that a physical phone was not measured.
- SRS, NFR-01: no change to the 200 ms wording. Add a note that S-02's proxy was far under the target.
- Implementation plan, W-34 and W-50: keep the performance test. Do not add a Worker task unless that test or the phone charter misses 200 ms.
