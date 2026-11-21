# Spike S-04: vis-timeline chunk size and 5,000 events

November 21, 2026

## Question

How big is the vis-timeline 8.5.6 chunk once Vite builds it, and does a view of 5,000 events stay usable?

## What was measured

The spike is in `spikes/s04-vis-timeline/`. It is not imported by the app. Re-run it with `node spikes/s04-vis-timeline/measure.mjs`. The numbers below are from `spikes/s04-vis-timeline/results.json`, measured at 2026-11-21T18:18:06Z.

The page dynamic-imports `vis-timeline/esnext` and `vis-data`, plus the vis-timeline stylesheet. Vite built that page in production mode. Gzip sizes are from Node's gzip, on the files in the spike's dist folder. The published standalone minified file in the package was gzipped the same way, for comparison.

Playwright then opened the built page in headless Chromium at 1280 by 720. One run had no CPU throttle. One run used Chrome DevTools 4x CPU throttling. The page created 5,000 point events spread from the year 100 through the 20th century, constructed a timeline, zoomed in six times without animation, panned six times without animation, then ran one animated zoom for 800 ms and counted animation frames.

This is the same 4-vCPU cloud VM as the other spikes. It is not a phone. No page error was thrown.

## Results

The library landed in its own files. The page's own script stayed small.

| File | Bytes | Gzip bytes |
| --- | --- | --- |
| vis-timeline JavaScript chunk | 420,190 | 113,882 |
| vis-data JavaScript chunk | 107,392 | 38,990 |
| vis-timeline CSS | 18,064 | 3,356 |
| Page script | 4,147 | 1,873 |
| Published standalone minified JavaScript | 548,303 | 157,066 |
| Published minified CSS | 19,837 | 3,629 |

The two JavaScript chunks together are 152,872 bytes gzipped. That is under the 300 KB first-load budget, and they were not in the page script. The stylesheet adds 3,356 bytes gzipped.

Opening the timeline showed all 5,000 items at once. The default window was wide enough to include every event. After zooming in, 849 items were still in view.

| Step | No throttle | 4x CPU throttle |
| --- | --- | --- |
| Load the chunks | 21 ms | 64 ms |
| Create the timeline | 532 ms | 2.16 s |
| Zoom-in step, median (slowest) | 144 ms (291 ms) | 538 ms (1.23 s) |
| Pan step, median (slowest) | 34 ms (48 ms) | 95 ms (99 ms) |
| Animated zoom, frames in 800 ms | 35 frames, median gap 16.7 ms, none over 50 ms | 12 frames, median gap 67 ms, 6 over 50 ms, slowest gap 167 ms |

On this machine, with no throttle, creation took 532 ms and an animated zoom stayed near a frame every 16.7 ms, with some frames over 32 ms. At 4x, creation took 2.16 s, a zoom step took about half a second, and the animated zoom produced 12 frames in 800 ms. That would feel sluggish.

## Recommendation

Keep vis-timeline 8.5.6. Load it only when the visual view is opened, from the esnext build, so the home page does not download it. The chunk is not a reason to write a custom timeline.

Do not open that view with all 5,000 items on screen. The first window should be a shorter span. Zoom and pan were much cheaper once fewer items were visible, and the 4x run was slow while all 5,000 were in view.

A real phone was not measured. The 4x run is only a proxy, and it was the sluggish one.

## Proposed doc edits

Drafts only. The SRS, architecture, and implementation plan are unchanged.

- Architecture, OD-23: record the S-04 sizes. The Vite esnext chunks were 113,882 and 38,990 bytes gzipped, plus 3,356 bytes of CSS. Keep vis-timeline. Do not switch to a custom SVG view for size.
- Architecture, risk R-08: the separate chunk does not by itself break the 300 KB first-load budget. The remaining risk is drawing every event at once, which was sluggish at 4x CPU throttle.
- Architecture, NFR-08 trace: the budget still applies to the first load. The visual view stays a separate chunk.
- SRS, NFR-08: no change to the 300 KB target.
- Implementation plan, W-57: keep vis-timeline, lazy-loaded. The first visual window should be a short span rather than every loaded event.
