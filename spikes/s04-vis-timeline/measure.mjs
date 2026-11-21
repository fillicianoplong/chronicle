import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { chromium, devices } from 'playwright'

const root = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(root, '../..')
const dist = path.join(root, 'dist')

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

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['vite', 'build', '--config', path.join(root, 'vite.config.js')],
      { cwd: repoRoot, stdio: 'inherit' },
    )
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`vite build exited ${String(code)}`))
    })
  })
}

async function assetSizes() {
  const assetsDir = path.join(dist, 'assets')
  const names = await readdir(assetsDir)
  const assets = []
  for (const name of names) {
    const bytes = await readFile(path.join(assetsDir, name))
    assets.push({
      name,
      bytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
    })
  }
  const standalonePath = path.join(
    repoRoot,
    'node_modules/vis-timeline/standalone/umd/vis-timeline-graph2d.min.js',
  )
  const standalone = await readFile(standalonePath)
  const standaloneCss = await readFile(
    path.join(
      repoRoot,
      'node_modules/vis-timeline/styles/vis-timeline-graph2d.min.css',
    ),
  )
  return {
    viteAssets: assets.sort((a, b) => b.gzipBytes - a.gzipBytes),
    publishedStandaloneMinJs: {
      bytes: standalone.length,
      gzipBytes: gzipSync(standalone).length,
    },
    publishedMinCss: {
      bytes: standaloneCss.length,
      gzipBytes: gzipSync(standaloneCss).length,
    },
  }
}

function contentType(filePath) {
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.map')) return 'application/json'
  return 'application/octet-stream'
}

function listen() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const relative = decodeURIComponent(
      url.pathname === '/' ? '/index.html' : url.pathname,
    )
    const filePath = path.normalize(path.join(dist, relative))
    if (!filePath.startsWith(dist)) {
      response.writeHead(403)
      response.end()
      return
    }
    try {
      const body = await readFile(filePath)
      response.writeHead(200, { 'content-type': contentType(filePath) })
      response.end(body)
    } catch {
      response.writeHead(404)
      response.end()
    }
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        throw new Error('Could not bind the vis-timeline spike server')
      }
      resolve({ server, url: `http://127.0.0.1:${String(address.port)}/` })
    })
  })
}

async function openAndMeasure(url, rate) {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  })
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  await client.send('Emulation.setCPUThrottlingRate', { rate })
  const errors = []
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })
  try {
    await page.goto(url)
    const result = await page.evaluate(() => window.runVisSpike())
    return { rate, result, errors }
  } finally {
    await browser.close()
  }
}

await runBuild()
const sizes = await assetSizes()
const { server, url } = await listen()
try {
  console.error('opening unthrottled')
  const unthrottled = await openAndMeasure(url, 1)
  console.error('opening 4x CPU throttle')
  const throttled = await openAndMeasure(url, 4)
  const results = {
    measuredAt: new Date().toISOString(),
    host: hostInfo(),
    library: 'vis-timeline@8.5.6',
    importPath: 'vis-timeline/esnext with vis-data, built by Vite',
    viewport: { width: 1280, height: 720 },
    note: 'Headless Chromium on this machine. Not a phone. 4x is Chrome DevTools CPU throttling.',
    sizes,
    unthrottled,
    throttled4x: throttled,
    pixel7: devices['Pixel 7'].viewport,
  }
  await mkdir(root, { recursive: true })
  await writeFile(
    path.join(root, 'results.json'),
    `${JSON.stringify(results, null, 2)}\n`,
  )
  console.log(
    JSON.stringify(
      {
        sizes,
        unthrottled: unthrottled.result,
        throttled: throttled.result,
        errors: unthrottled.errors,
      },
      null,
      2,
    ),
  )
} finally {
  server.close()
}
