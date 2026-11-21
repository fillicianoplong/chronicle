import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const browsers = [
  ['chromium', chromium],
  ['firefox', firefox],
  ['webkit', webkit],
]

function hostInfo() {
  const cpuinfo = readFileSync('/proc/cpuinfo', 'utf8')
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpuModel: cpuinfo.match(/model name\s+:\s+(.+)/)?.[1] ?? 'unknown',
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
        throw new Error('Could not bind the IndexedDB spike server')
      }
      resolve({ server, url: `http://127.0.0.1:${String(address.port)}/` })
    })
  })
}

function evaluateLimited(page, expression, ms) {
  const pending = page.evaluate(expression)
  pending.catch(() => {})
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`page.evaluate timed out after ${String(ms)} ms`))
    }, ms)
  })
  return Promise.race([pending, timeout]).finally(() => {
    clearTimeout(timer)
  })
}

async function measureBrowser(name, browserType, url) {
  const browser = await browserType.launch()
  const context = await browser.newContext()
  try {
    const writer = await context.newPage()
    writer.setDefaultTimeout(30_000)
    await writer.goto(url)
    const write = await evaluateLimited(
      writer,
      () => window.writeSpike(),
      45_000,
    )
    console.error(`${name}: write finished`)
    await writer.close()
    const reader = await context.newPage()
    reader.setDefaultTimeout(30_000)
    await reader.goto(url)
    const reread = await evaluateLimited(
      reader,
      () => window.readSpike(),
      20_000,
    )
    console.error(`${name}: reread finished`)
    return { browser: name, write, reread }
  } finally {
    await browser.close()
  }
}

const pageHtml = await readFile(path.join(root, 'page.html'), 'utf8')
const { server, url } = await listen(pageHtml)
try {
  const browsersResult = []
  for (const [name, browserType] of browsers) {
    console.error(`measuring ${name}`)
    try {
      browsersResult.push(await measureBrowser(name, browserType, url))
    } catch (error) {
      browsersResult.push({
        browser: name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  const results = {
    measuredAt: new Date().toISOString(),
    host: hostInfo(),
    note: 'Playwright browsers on this machine. Eviction over days was not observed.',
    browsers: browsersResult,
  }
  await mkdir(root, { recursive: true })
  await writeFile(
    path.join(root, 'results.json'),
    `${JSON.stringify(results, null, 2)}\n`,
  )
  console.log(
    JSON.stringify(
      browsersResult.map((entry) => ({
        browser: entry.browser,
        error: entry.error ?? null,
        roundTrip: entry.write?.roundTrip ?? null,
        persist: entry.write?.persist ?? null,
        writeError: entry.write?.writeError ?? null,
        quota: entry.write?.after?.estimate?.quota ?? null,
        reread: entry.reread?.readBytes ?? null,
      })),
      null,
      2,
    ),
  )
} finally {
  server.close()
}
