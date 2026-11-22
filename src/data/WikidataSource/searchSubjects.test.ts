import { afterEach, describe, expect, it, vi } from 'vitest'
import { TYPING_PAUSE_MS, createTypingPause } from '../../core/typingPause.ts'
import { systemClock } from '../Clock.ts'
import {
  RequestGate,
  type GateOutcome,
  type GateRequest,
} from '../RequestGate.ts'
import type { SubjectHit } from '../TimelineSource.ts'
import { WikidataSource } from './WikidataSource.ts'

interface RecordedSearch {
  response: { body: unknown }
}

const recordedModules = import.meta.glob(
  '../../../tests/fixtures/search-donald-tru.json',
  { eager: true, import: 'default' },
)

function recordedSearch(): RecordedSearch {
  const fixture = Object.values(recordedModules)[0]
  if (!fixture || typeof fixture !== 'object') {
    throw new Error('Recorded subject search is missing')
  }
  return fixture as RecordedSearch
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

class RecordingGate extends RequestGate {
  readonly sent: GateRequest[] = []

  override send(request: GateRequest): Promise<GateOutcome> {
    this.sent.push(request)
    return super.send(request)
  }
}

function gateFor(body: unknown): RecordingGate {
  return gateForBody(() => body)
}

describe('Wikidata subject search', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the recorded match for a partial name', async () => {
    const fixture = recordedSearch()
    const gate = gateFor(fixture.response.body)
    const source = new WikidataSource(gate)
    const hits = await source.searchSubjects(
      'Donald Tru',
      new AbortController().signal,
    )
    expect(gate.sent).toHaveLength(1)
    expect(gate.sent[0]?.lane).toBe('api')
    const url = new URL(gate.sent[0]?.url ?? '')
    expect(url.origin + url.pathname).toBe('https://www.wikidata.org/w/api.php')
    expect(url.searchParams.get('action')).toBe('wbsearchentities')
    expect(url.searchParams.get('search')).toBe('Donald Tru')
    expect(url.searchParams.get('type')).toBe('item')
    expect(url.searchParams.get('language')).toBe('en')
    expect(hits[0]).toMatchObject({
      id: 'Q22686',
      label: 'Donald Trump',
      description: 'President of the United States (2017–2021; since 2025)',
    })
    expect(hits[0]?.description).not.toBe('')
  })

  it('sends one request after six quick keystrokes', async () => {
    vi.useFakeTimers()
    const fixture = recordedSearch()
    const gate = gateFor(fixture.response.body)
    const source = new WikidataSource(gate)
    const pause = createTypingPause((ms) => systemClock().sleep(ms))
    const signal = new AbortController().signal
    const texts = ['D', 'Do', 'Don', 'Dona', 'Donald', 'Donald Tru']
    const pending: Promise<SubjectHit[]>[] = []
    for (let index = 0; index < texts.length; index += 1) {
      const text = texts[index] ?? ''
      pending.push(
        pause.schedule(text).then((settled) => {
          if (settled === null) return []
          return source.searchSubjects(settled, signal)
        }),
      )
      if (index < texts.length - 1) {
        await vi.advanceTimersByTimeAsync(50)
        expect(gate.sent).toHaveLength(0)
      }
    }
    await vi.advanceTimersByTimeAsync(TYPING_PAUSE_MS - 1)
    expect(gate.sent).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    const results = await Promise.all(pending)
    expect(gate.sent).toHaveLength(1)
    expect(new URL(gate.sent[0]?.url ?? '').searchParams.get('search')).toBe(
      'Donald Tru',
    )
    expect(new URL(gate.sent[0]?.url ?? '').hostname).toBe('www.wikidata.org')
    const hits = results.find((list) => list.length > 0)
    expect(hits?.[0]).toMatchObject({
      id: 'Q22686',
      label: 'Donald Trump',
    })
  })

  it('offers a close label when the entity search is empty', async () => {
    vi.useFakeTimers()
    const gate = gateForBody((url) => bodyFor(url))
    const source = new WikidataSource(gate)
    const pending = source.searchSubjects(
      'Donld Trump',
      new AbortController().signal,
    )
    await vi.advanceTimersByTimeAsync(20_000)
    const hits = await pending
    expect(hits.find((hit) => hit.id === 'Q22686')).toMatchObject({
      label: 'Donald Trump',
      match: 'fuzzy',
    })
    expect(hits.every((hit) => hit.match === 'fuzzy')).toBe(true)
    expect(
      gate.sent.map((request) =>
        new URL(request.url).searchParams.get('action'),
      ),
    ).toEqual(['wbsearchentities', 'query', 'wbgetentities'])
    expect(new URL(gate.sent[1]?.url ?? '').searchParams.get('srsearch')).toBe(
      'Donld~ Trump~',
    )
  })

  it('offers nothing for a nonsense name after the fuzzy results are too far', async () => {
    vi.useFakeTimers()
    const gate = gateForBody((url) => bodyFor(url))
    const source = new WikidataSource(gate)
    const pending = source.searchSubjects(
      'zzqqxx',
      new AbortController().signal,
    )
    await vi.advanceTimersByTimeAsync(20_000)
    await expect(pending).resolves.toEqual([])
  })

  it('offers Marie Curie for a typed Q-ID', async () => {
    const gate = gateForBody((url) => bodyFor(url))
    const source = new WikidataSource(gate)
    const hits = await source.searchSubjects(
      'Q7186',
      new AbortController().signal,
    )
    expect(hits[0]).toMatchObject({
      id: 'Q7186',
      label: 'Marie Curie',
      match: 'exact',
    })
    expect(hits[0]?.description).not.toBe('')
    const url = new URL(gate.sent[0]?.url ?? '')
    expect(url.searchParams.get('action')).toBe('wbgetentities')
    expect(url.searchParams.get('ids')).toBe('Q7186')
    expect(url.searchParams.get('languagefallback')).toBe('1')
  })

  it('treats a non-id as a name search and looks up a bare Q-ID', async () => {
    for (const text of ['Q0', 'Q01', 'Q7186 x']) {
      const gate = gateForBody(() => ({
        search: [{ id: 'Q1', label: 'Universe', description: '' }],
      }))
      const source = new WikidataSource(gate)
      await source.searchSubjects(text, new AbortController().signal)
      const url = new URL(gate.sent[0]?.url ?? '')
      expect(url.searchParams.get('action')).toBe('wbsearchentities')
      expect(url.searchParams.get('search')).toBe(text)
    }
    const gate = gateForBody(() => ({
      entities: {
        Q1: {
          labels: { en: { value: 'Universe' } },
          descriptions: { en: { value: 'everything' } },
        },
      },
    }))
    const source = new WikidataSource(gate)
    const found = await source.searchSubjects(
      'Q1',
      new AbortController().signal,
    )
    expect(found[0]?.label).toBe('Universe')
    expect(new URL(gate.sent[0]?.url ?? '').searchParams.get('action')).toBe(
      'wbgetentities',
    )
    expect(new URL(gate.sent[0]?.url ?? '').searchParams.get('ids')).toBe('Q1')
  })
})

const fixtureModules = import.meta.glob('../../../tests/fixtures/*.json', {
  eager: true,
  import: 'default',
})

function fixtureBody(name: string): unknown {
  const entry = Object.entries(fixtureModules).find(([file]) =>
    file.endsWith(`/${name}`),
  )
  const fixture = entry?.[1] as { response?: { body?: unknown } } | undefined
  if (!fixture?.response) throw new Error(`Missing fixture ${name}`)
  return fixture.response.body
}

function bodyFor(url: string): unknown {
  const parsed = new URL(url)
  const action = parsed.searchParams.get('action')
  const search = parsed.searchParams.get('search') ?? ''
  const srsearch = parsed.searchParams.get('srsearch') ?? ''
  const ids = parsed.searchParams.get('ids') ?? ''
  if (action === 'wbsearchentities' && search === 'Donld Trump') {
    return fixtureBody('search-donld-trump.json')
  }
  if (action === 'wbsearchentities' && search === 'zzqqxx') {
    return fixtureBody('search-zzqqxx.json')
  }
  if (action === 'query' && srsearch.startsWith('Donld')) {
    return fixtureBody('search-donld-trump-fuzzy.json')
  }
  if (action === 'query' && srsearch.startsWith('zzqqxx')) {
    return fixtureBody('search-zzqqxx-fuzzy.json')
  }
  if (action === 'wbgetentities' && ids === 'Q7186') {
    return fixtureBody('entity-q7186.json')
  }
  if (action === 'wbgetentities' && ids.includes('Q22686')) {
    return fixtureBody('labels-donld-trump.json')
  }
  if (action === 'wbgetentities') return fixtureBody('labels-zzqqxx.json')
  return { search: [] }
}

function gateForBody(select: (url: string) => unknown): RecordingGate {
  return new RecordingGate(systemClock(), (input) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    return Promise.resolve(jsonResponse(select(url)))
  })
}
