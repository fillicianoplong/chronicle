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
  return new RecordingGate(systemClock(), () =>
    Promise.resolve(jsonResponse(body)),
  )
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
})
