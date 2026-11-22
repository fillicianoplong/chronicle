import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'tests', 'fixtures')
const USER_AGENT =
  'Chronicle/0.1.0 (https://github.com/fillicianoplong/chronicle; fixture recorder)'
const API = 'https://www.wikidata.org/w/api.php'
const SPARQL = 'https://query.wikidata.org/sparql'
const API_GAP_MS = 5_000
const SPARQL_GAP_MS = 12_000
const TIMEOUT_MS = 90_000

const session = new Date().toISOString()
let sequence = 0
let lastFinishedAt = 0

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function batchQuery(qid, offset) {
  if (!/^Q[1-9][0-9]*$/.test(qid)) {
    throw new Error(`Refusing to record a query for ${qid}`)
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % 5000 !== 0) {
    throw new Error(`Offset must be a multiple of 5000, got ${String(offset)}`)
  }
  return `SELECT ?item ?prop ?date ?dateProp ?precision WHERE {
  ?item ?p wd:${qid} .
  ?prop wikibase:directClaim ?p .
  VALUES (?dateProp ?value) {
    (p:P585 psv:P585)
    (p:P577 psv:P577)
    (p:P580 psv:P580)
    (p:P571 psv:P571)
  }
  ?item ?dateProp ?st .
  ?st a wikibase:BestRank ; ?value ?v .
  ?v wikibase:timeValue ?date ; wikibase:timePrecision ?precision .
}
ORDER BY ?date ?item ?prop
LIMIT 5000
OFFSET ${String(offset)}
`
}

function apiUrl(params) {
  const url = new URL(API)
  url.searchParams.set('format', 'json')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

async function waitForGap(gapMs) {
  if (lastFinishedAt === 0) return null
  const since = Date.now() - lastFinishedAt
  const remaining = gapMs - since
  if (remaining > 0) await sleep(remaining)
  return Date.now() - lastFinishedAt
}

async function sendOnce(spec) {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, TIMEOUT_MS)
  try {
    return await fetch(spec.url, {
      method: spec.method,
      headers: spec.headers,
      body: spec.body,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function send(spec) {
  let lastError = null
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await sendOnce(spec)
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get('retry-after'))
        const pauseMs =
          response.status === 429
            ? (Number.isFinite(retryAfter) && retryAfter > 0
                ? retryAfter
                : 60) * 1000
            : SPARQL_GAP_MS
        await response.arrayBuffer()
        console.error(
          `${spec.name}: HTTP ${String(response.status)} on attempt ${String(attempt)}, waiting ${String(pauseMs)} ms`,
        )
        if (attempt === 2) {
          throw new Error(
            `${spec.name} failed with HTTP ${String(response.status)}`,
          )
        }
        await sleep(pauseMs)
        continue
      }
      const text = await response.text()
      return { response, text }
    } catch (error) {
      lastError = error
      if (attempt === 2) break
      console.error(
        `${spec.name}: ${error instanceof Error ? error.message : 'request failed'} on attempt ${String(attempt)}, waiting ${String(SPARQL_GAP_MS)} ms`,
      )
      await sleep(SPARQL_GAP_MS)
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`${spec.name} failed`)
}

async function record(spec) {
  sequence += 1
  const sincePreviousMs = await waitForGap(spec.gapMs)
  const headers = {
    'User-Agent': USER_AGENT,
    'Api-User-Agent': USER_AGENT,
    Accept: spec.accept,
  }
  if (spec.body !== undefined) {
    headers['Content-Type'] = 'application/sparql-query'
  }
  const started = Date.now()
  console.error(`recording ${spec.name} (sequence ${String(sequence)})`)
  const { response, text } = await send({ ...spec, headers })
  const elapsedMs = Date.now() - started
  lastFinishedAt = Date.now()
  if (response.status !== 200) {
    throw new Error(
      `${spec.name} returned HTTP ${String(response.status)}: ${text.slice(0, 300)}`,
    )
  }
  let body
  try {
    body = JSON.parse(text)
  } catch {
    throw new Error(`${spec.name} did not return JSON: ${text.slice(0, 300)}`)
  }
  const fixture = {
    recordedAt: new Date().toISOString(),
    session,
    sequence,
    sincePreviousMs,
    elapsedMs,
    query: spec.query,
    request: {
      url: spec.url,
      method: spec.method,
      headers,
      body: spec.body ?? null,
    },
    response: {
      status: response.status,
      contentType: response.headers.get('content-type'),
      body,
    },
  }
  await writeFile(path.join(OUT_DIR, spec.name), JSON.stringify(fixture))
  console.error(
    `wrote ${spec.name} in ${String(elapsedMs)} ms` +
      (sincePreviousMs === null ? '' : ` after ${String(sincePreviousMs)} ms`),
  )
  return body
}

function entityIds(bindings) {
  const ids = []
  const seen = new Set()
  for (const row of bindings) {
    const value = row.item?.value
    if (typeof value !== 'string') continue
    const id = value.split('/').pop()
    if (!id || !/^Q[1-9][0-9]*$/.test(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
    if (ids.length === 50) break
  }
  return ids
}

function requireHit(body, id, label) {
  const hits = Array.isArray(body.search) ? body.search : []
  const found = hits.some((hit) => hit.id === id)
  if (!found) {
    const listed = hits.map((hit) => `${hit.id} ${hit.label}`).join(', ')
    throw new Error(
      `Search for ${label} did not include ${id}. Hits: ${listed}`,
    )
  }
}

async function recordBatches(filePrefix, qid) {
  const files = []
  for (let offset = 0; offset <= 10_000; offset += 5_000) {
    const name = `${filePrefix}-batch-${String(offset / 5000 + 1)}.json`
    const body = await record({
      name,
      gapMs: SPARQL_GAP_MS,
      method: 'POST',
      url: SPARQL,
      accept: 'application/sparql-results+json',
      query: batchQuery(qid, offset),
      body: batchQuery(qid, offset),
    })
    const count = Array.isArray(body.results?.bindings)
      ? body.results.bindings.length
      : 0
    console.error(`${name}: ${String(count)} rows`)
    files.push({ name, count, body })
    if (count < 5000) break
  }
  return files
}

const SEARCHES = [
  { name: 'search-marie-cu.json', query: 'Marie Cu', expectId: 'Q7186' },
  { name: 'search-zzqqxx.json', query: 'zzqqxx', expectId: null },
  {
    name: 'search-zzqqxx-fuzzy.json',
    query: 'zzqqxx',
    kind: 'fuzzy',
    labelsName: 'labels-zzqqxx.json',
  },
  {
    name: 'search-donld-trump.json',
    query: 'Donld Trump',
    expectId: null,
    expectEmpty: true,
  },
  {
    name: 'search-donld-trump-fuzzy.json',
    query: 'Donld Trump',
    kind: 'fuzzy',
    expectId: 'Q22686',
    labelsName: 'labels-donld-trump.json',
  },
  {
    name: 'entity-q7186.json',
    query: 'Q7186',
    kind: 'entity',
    expectLabel: 'Marie Curie',
  },
]

function fuzzyWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word}~`)
    .join(' ')
}

function searchSpec(entry) {
  if (entry.kind === 'fuzzy') {
    return {
      name: entry.name,
      gapMs: API_GAP_MS,
      method: 'GET',
      url: apiUrl({
        action: 'query',
        list: 'search',
        srsearch: fuzzyWords(entry.query),
        srnamespace: '0',
        srlimit: '10',
      }),
      accept: 'application/json',
      query: entry.query,
    }
  }
  if (entry.kind === 'entity') {
    return {
      name: entry.name,
      gapMs: API_GAP_MS,
      method: 'GET',
      url: apiUrl({
        action: 'wbgetentities',
        ids: entry.query,
        props: 'labels|descriptions',
        languages: 'en',
        languagefallback: '1',
      }),
      accept: 'application/json',
      query: entry.query,
    }
  }
  return {
    name: entry.name,
    gapMs: API_GAP_MS,
    method: 'GET',
    url: apiUrl({
      action: 'wbsearchentities',
      language: 'en',
      uselang: 'en',
      type: 'item',
      limit: '10',
      search: entry.query,
    }),
    accept: 'application/json',
    query: entry.query,
  }
}

async function recordSearch(entry) {
  const body = await record(searchSpec(entry))
  if (entry.kind === 'fuzzy') {
    const hits = Array.isArray(body.query?.search) ? body.query.search : []
    const ids = hits
      .map((hit) => hit.title)
      .filter(
        (title) => typeof title === 'string' && /^Q[1-9][0-9]*$/.test(title),
      )
    if (entry.expectId && !ids.includes(entry.expectId)) {
      throw new Error(
        `Fuzzy search for ${entry.query} did not include ${entry.expectId}. Titles: ${ids.join(', ')}`,
      )
    }
    if (entry.labelsName && ids.length > 0) {
      await record({
        name: entry.labelsName,
        gapMs: API_GAP_MS,
        method: 'GET',
        url: apiUrl({
          action: 'wbgetentities',
          ids: ids.join('|'),
          props: 'labels|descriptions',
          languages: 'en',
          languagefallback: '1',
        }),
        accept: 'application/json',
        query: ids.join('|'),
      })
    }
    return body
  }
  if (entry.kind === 'entity') {
    const label = body.entities?.[entry.query]?.labels?.en?.value
    if (label !== entry.expectLabel) {
      throw new Error(
        `${entry.name} label was ${String(label)}, expected ${entry.expectLabel}`,
      )
    }
    return body
  }
  if (entry.expectId) {
    requireHit(body, entry.expectId, entry.query)
    return body
  }
  if (!Array.isArray(body.search)) {
    throw new Error(`${entry.name} did not return a search list`)
  }
  if (entry.expectEmpty && body.search.length !== 0) {
    throw new Error(`${entry.name} was not empty`)
  }
  return body
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const wanted = process.argv.slice(2)
  if (wanted.length > 0) {
    for (const name of wanted) {
      const entry = SEARCHES.find((item) => item.name === name)
      if (!entry) throw new Error(`No recorder entry named ${name}`)
      await recordSearch(entry)
    }
    console.error('fixture recording finished')
    return
  }

  const trumpSearch = await record({
    name: 'search-donald-tru.json',
    gapMs: API_GAP_MS,
    method: 'GET',
    url: apiUrl({
      action: 'wbsearchentities',
      language: 'en',
      uselang: 'en',
      type: 'item',
      limit: '10',
      search: 'Donald Tru',
    }),
    accept: 'application/json',
    query: 'Donald Tru',
  })
  requireHit(trumpSearch, 'Q22686', 'Donald Trump')

  const californiaSearch = await record({
    name: 'search-california.json',
    gapMs: API_GAP_MS,
    method: 'GET',
    url: apiUrl({
      action: 'wbsearchentities',
      language: 'en',
      uselang: 'en',
      type: 'item',
      limit: '10',
      search: 'California',
    }),
    accept: 'application/json',
    query: 'California',
  })
  requireHit(californiaSearch, 'Q99', 'California')

  const caesarSearch = await record({
    name: 'search-julius-caesar.json',
    gapMs: API_GAP_MS,
    method: 'GET',
    url: apiUrl({
      action: 'wbsearchentities',
      language: 'en',
      uselang: 'en',
      type: 'item',
      limit: '10',
      search: 'Julius Caesar',
    }),
    accept: 'application/json',
    query: 'Julius Caesar',
  })
  requireHit(caesarSearch, 'Q1048', 'Julius Caesar')

  const properties = await record({
    name: 'properties-juris.json',
    gapMs: API_GAP_MS,
    method: 'GET',
    url: apiUrl({
      action: 'wbsearchentities',
      language: 'en',
      uselang: 'en',
      type: 'property',
      limit: '10',
      search: 'jurisdiction',
    }),
    accept: 'application/json',
    query: 'jurisdiction',
  })
  requireHit(properties, 'P1001', 'applies to jurisdiction')

  const trump = await recordBatches('trump', 'Q22686')
  const trumpRows = trump[0]?.body.results?.bindings ?? []
  const labelIds = entityIds(trumpRows)
  if (labelIds.length === 0) {
    throw new Error('Donald Trump batch had no item ids to label')
  }
  await record({
    name: 'labels-trump-1.json',
    gapMs: API_GAP_MS,
    method: 'GET',
    url: apiUrl({
      action: 'wbgetentities',
      languages: 'en',
      props: 'labels|descriptions',
      ids: labelIds.join('|'),
    }),
    accept: 'application/json',
    query: labelIds.join('|'),
  })

  await recordBatches('caesar', 'Q1048')
  await recordBatches('california', 'Q99')
  for (const entry of SEARCHES) {
    await recordSearch(entry)
  }
  console.error('fixture recording finished')
}

const isDirect = process.argv[1]?.endsWith('record-fixtures.mjs')
if (isDirect) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
