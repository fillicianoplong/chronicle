import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const pagePath = path.join(root, 'page.html')

function hostInfo() {
  const cpuinfo = readFileSync('/proc/cpuinfo', 'utf8')
  const model = cpuinfo.match(/model name\s+:\s+(.+)/)?.[1] ?? 'unknown'
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpuModel: model,
    logicalCpus: os.cpus().length,
    node: process.version,
  }
}

function listen(pageHtml) {
  const server = createServer((request, response) => {
    if (request.url === '/' || request.url === '/index.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(pageHtml)
      return
    }
    response.writeHead(404)
    response.end()
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        throw new Error('Could not bind the filter spike server')
      }
      resolve({ server, url: `http://127.0.0.1:${String(address.port)}/` })
    })
  })
}

async function measure(url, rate) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ ...devices['Pixel 7'] })
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  await client.send('Emulation.setCPUThrottlingRate', { rate })
  await page.goto(url)
  const result = await page.evaluate(() => window.runFilterSpike())
  await browser.close()
  return result
}

const pageHtml = await readFile(pagePath, 'utf8')
const { server, url } = await listen(pageHtml)
try {
  console.error('measuring unthrottled')
  const unthrottled = await measure(url, 1)
  console.error('measuring 4x CPU throttle')
  const throttled = await measure(url, 4)
  const results = {
    measuredAt: new Date().toISOString(),
    host: hostInfo(),
    viewport: devices['Pixel 7'].viewport,
    note: 'Chrome DevTools CPU throttling on this machine. Not a physical phone.',
    unthrottled,
    throttled4x: throttled,
  }
  await mkdir(root, { recursive: true })
  await writeFile(
    path.join(root, 'results.json'),
    `${JSON.stringify(results, null, 2)}\n`,
  )
  console.log(
    JSON.stringify(
      {
        unthrottledMedian: unthrottled.parisAgreement.medianMs,
        throttledMedian: throttled.parisAgreement.medianMs,
        unthrottledCalibration: unthrottled.calibration.ms,
        throttledCalibration: throttled.calibration.ms,
        ecoleMatches: throttled.ecole.matchCount,
        parisAgreementMatches: throttled.parisAgreement.matchCount,
      },
      null,
      2,
    ),
  )
} finally {
  server.close()
}
