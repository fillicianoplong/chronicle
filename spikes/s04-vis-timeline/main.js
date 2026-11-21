const ITEM_COUNT = 5000

function makeItems() {
  const items = []
  for (let i = 0; i < ITEM_COUNT; i += 1) {
    items.push({
      id: i,
      content: `Event ${i}`,
      start: new Date(Date.UTC(100 + (i % 1900), i % 12, (i % 27) + 1)),
    })
  }
  return items
}

function summarize(times) {
  if (times.length === 0) {
    return { runs: 0, medianMs: null, maxMs: null }
  }
  const sorted = [...times].sort((a, b) => a - b)
  return {
    runs: times.length,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    maxMs: sorted[sorted.length - 1],
  }
}

function sampleFrames(ms) {
  const gaps = []
  let last = 0
  return new Promise((resolve) => {
    const started = performance.now()
    function tick(now) {
      if (last !== 0) gaps.push(now - last)
      last = now
      if (performance.now() - started < ms) requestAnimationFrame(tick)
      else resolve(gaps)
    }
    requestAnimationFrame(tick)
  })
}

function frameReport(gaps) {
  return {
    frames: gaps.length,
    over32Ms: gaps.filter((gap) => gap > 32).length,
    over50Ms: gaps.filter((gap) => gap > 50).length,
    ...summarize(gaps),
  }
}

window.runVisSpike = async function runVisSpike() {
  const loadStart = performance.now()
  const [{ Timeline }, { DataSet }] = await Promise.all([
    import('vis-timeline/esnext'),
    import('vis-data'),
  ])
  await import('vis-timeline/styles/vis-timeline-graph2d.css')
  const loadMs = performance.now() - loadStart

  const container = document.getElementById('timeline')
  const items = makeItems()
  const dataset = new DataSet(items)
  const createStart = performance.now()
  const timeline = new Timeline(container, dataset, {
    height: '320px',
    zoomable: true,
    moveable: true,
    selectable: true,
  })
  await sampleFrames(100)
  const createMs = performance.now() - createStart
  const visibleAfterCreate = timeline.getVisibleItems().length

  const zoomInTimes = []
  for (let i = 0; i < 6; i += 1) {
    const started = performance.now()
    timeline.zoomIn(0.5, { animation: false })
    await sampleFrames(32)
    zoomInTimes.push(performance.now() - started)
  }

  const windowBeforePan = timeline.getWindow()
  const span = windowBeforePan.end.getTime() - windowBeforePan.start.getTime()
  const panTimes = []
  for (let i = 0; i < 6; i += 1) {
    const shift = span * 0.25 * (i + 1)
    const started = performance.now()
    timeline.setWindow(
      new Date(windowBeforePan.start.getTime() + shift),
      new Date(windowBeforePan.end.getTime() + shift),
      { animation: false },
    )
    await sampleFrames(32)
    panTimes.push(performance.now() - started)
  }

  const animatedStart = performance.now()
  timeline.zoomOut(0.8, { animation: true })
  const animatedFrames = await sampleFrames(800)
  const animatedMs = performance.now() - animatedStart
  const visibleAfterZoom = timeline.getVisibleItems().length

  return {
    itemCount: ITEM_COUNT,
    loadMs,
    createMs,
    visibleAfterCreate,
    visibleAfterZoom,
    zoomIn: summarize(zoomInTimes),
    pan: summarize(panTimes),
    animatedZoomMs: animatedMs,
    animatedFrames: frameReport(animatedFrames),
    threw: null,
  }
}
