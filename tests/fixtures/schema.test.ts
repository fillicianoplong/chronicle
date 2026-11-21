import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const fixtureDir = path.resolve(import.meta.dirname, '.')

const required = [
  'search-donald-tru.json',
  'search-california.json',
  'search-julius-caesar.json',
  'properties-juris.json',
  'trump-batch-1.json',
  'labels-trump-1.json',
  'caesar-batch-1.json',
  'california-batch-1.json',
  'california-batch-2.json',
  'california-batch-3.json',
]

interface Fixture {
  recordedAt: string
  session: string
  sequence: number
  sincePreviousMs: number | null
  query: string
  request: {
    url: string
    method: string
    headers: Record<string, string>
  }
  response: {
    status: number
    body: unknown
  }
}

async function loadFixtures(): Promise<{ name: string; fixture: Fixture }[]> {
  const names = (await readdir(fixtureDir)).filter((name) =>
    name.endsWith('.json'),
  )
  const loaded = await Promise.all(
    names.map(async (name) => {
      const raw = await readFile(path.join(fixtureDir, name), 'utf8')
      return { name, fixture: JSON.parse(raw) as Fixture }
    }),
  )
  return loaded.sort((a, b) => a.fixture.sequence - b.fixture.sequence)
}

describe('recorded Wikidata fixtures', () => {
  it('includes the first recorded responses', async () => {
    const names = (await readdir(fixtureDir)).filter((name) =>
      name.endsWith('.json'),
    )
    for (const name of required) {
      expect(names, name).toContain(name)
    }
  })

  it('stores the request, the time, and the query text', async () => {
    const fixtures = await loadFixtures()
    expect(fixtures.length).toBeGreaterThanOrEqual(required.length)
    for (const { name, fixture } of fixtures) {
      expect(fixture.recordedAt, name).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(Number.isNaN(Date.parse(fixture.recordedAt)), name).toBe(false)
      expect(fixture.request.url, name).toMatch(/^https:\/\//)
      expect(['GET', 'POST'], name).toContain(fixture.request.method)
      expect(fixture.request.headers['User-Agent'], name).toContain(
        'Chronicle/',
      )
      expect(fixture.request.headers['User-Agent'], name).toContain(
        'https://github.com/fillicianoplong/chronicle',
      )
      expect(fixture.query.length, name).toBeGreaterThan(0)
      expect(fixture.response.status, name).toBe(200)
      expect(fixture.response.body, name).toBeTypeOf('object')
    }
  })

  it('spaces requests at least 2 seconds apart', async () => {
    const fixtures = await loadFixtures()
    const session = fixtures[0]?.fixture.session
    expect(session).toBeTruthy()
    fixtures.forEach(({ name, fixture }, index) => {
      expect(fixture.session, name).toBe(session)
      expect(fixture.sequence, name).toBe(index + 1)
      if (fixture.sequence === 1) {
        expect(fixture.sincePreviousMs, name).toBeNull()
      } else {
        expect(fixture.sincePreviousMs, name).toBeGreaterThanOrEqual(2000)
      }
    })
  })

  it('keeps the query text that was sent', async () => {
    const fixtures = await loadFixtures()
    const byName = new Map(fixtures.map(({ name, fixture }) => [name, fixture]))

    expect(byName.get('search-donald-tru.json')?.query).toBe('Donald Tru')
    expect(byName.get('search-california.json')?.query).toBe('California')
    expect(byName.get('search-julius-caesar.json')?.query).toBe('Julius Caesar')
    expect(byName.get('properties-juris.json')?.query).toBe('jurisdiction')
    expect(byName.get('properties-juris.json')?.request.url).toContain(
      'type=property',
    )

    const trump = byName.get('trump-batch-1.json')
    expect(trump?.query).toContain('wd:Q22686')
    expect(trump?.query).toContain('LIMIT 5000')
    expect(trump?.query).toContain('ORDER BY ?date ?item ?prop')
    expect(trump?.query).not.toContain('SERVICE wikibase:label')

    expect(byName.get('caesar-batch-1.json')?.query).toContain('wd:Q1048')
    expect(byName.get('california-batch-1.json')?.query).toContain('wd:Q99')
    expect(byName.get('california-batch-1.json')?.query).toContain('OFFSET 0')
    expect(byName.get('california-batch-2.json')?.query).toContain(
      'OFFSET 5000',
    )
    expect(byName.get('california-batch-3.json')?.query).toContain(
      'OFFSET 10000',
    )

    for (const name of [
      'trump-batch-1.json',
      'caesar-batch-1.json',
      'california-batch-1.json',
      'california-batch-2.json',
      'california-batch-3.json',
    ]) {
      const bindings = (
        byName.get(name)?.response.body as {
          results?: { bindings?: unknown[] }
        }
      ).results?.bindings
      expect(Array.isArray(bindings), name).toBe(true)
      expect(bindings?.length, name).toBeGreaterThan(0)
    }

    const labels = byName.get('labels-trump-1.json')
    expect(labels?.request.url).toContain('action=wbgetentities')
    expect(labels?.query.split('|').length).toBeGreaterThan(0)
    expect(labels?.query.split('|').length).toBeLessThanOrEqual(50)
  })
})
