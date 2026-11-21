import { afterEach, describe, expect, it, vi } from 'vitest'
import { systemClock, type Clock } from './Clock.ts'
import { API_USER_AGENT, RequestGate, type Lane } from './RequestGate.ts'

interface Started {
  url: string
  init: RequestInit
  at: number
  respond: (response: Response) => void
  fail: (error?: Error) => void
}

class FakeClock implements Clock {
  private time = 0
  private readonly waiters: {
    at: number
    resolve: () => void
    reject: (error: unknown) => void
    signal?: AbortSignal
    onAbort: () => void
  }[] = []

  now(): number {
    return this.time
  }

  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(abortError())
    if (ms <= 0) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const waiter: FakeClock['waiters'][number] = {
        at: this.time + ms,
        resolve,
        reject,
        signal,
        onAbort: () => undefined,
      }
      waiter.onAbort = () => {
        const index = this.waiters.indexOf(waiter)
        if (index >= 0) this.waiters.splice(index, 1)
        reject(abortError())
      }
      signal?.addEventListener('abort', waiter.onAbort, { once: true })
      this.waiters.push(waiter)
    })
  }

  async advance(ms: number): Promise<void> {
    const target = this.time + ms
    for (;;) {
      await flush()
      let next: number | null = null
      for (const waiter of this.waiters) {
        if (next === null || waiter.at < next) next = waiter.at
      }
      if (next === null || next > target) break
      this.time = next
      this.releaseDue()
    }
    this.time = target
    await flush()
  }

  private releaseDue(): void {
    const due = this.waiters.filter((waiter) => waiter.at <= this.time)
    for (const waiter of due) {
      const index = this.waiters.indexOf(waiter)
      if (index >= 0) this.waiters.splice(index, 1)
      waiter.signal?.removeEventListener('abort', waiter.onAbort)
      waiter.resolve()
    }
  }
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

async function flush(): Promise<void> {
  for (let step = 0; step < 20; step += 1) await Promise.resolve()
}

function installFetch(clock: FakeClock): {
  started: Started[]
  transport: typeof fetch
} {
  const started: Started[] = []
  const transport: typeof fetch = (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    return new Promise((resolve, reject) => {
      let settled = false
      const entry: Started = {
        url,
        init: init ?? {},
        at: clock.now(),
        respond: (response) => {
          if (settled) return
          settled = true
          resolve(response)
        },
        fail: (error?: Error) => {
          if (settled) return
          settled = true
          reject(error ?? new TypeError('network'))
        },
      }
      started.push(entry)
      init?.signal?.addEventListener(
        'abort',
        () => {
          entry.fail(abortError())
        },
        { once: true },
      )
    })
  }
  return { started, transport }
}

function http(
  status: number,
  body = '',
  headers: Record<string, string> = {},
): Response {
  return new Response(body, { status, headers })
}

function json(body: unknown, status = 200): Response {
  return http(status, JSON.stringify(body), {
    'content-type': 'application/json',
  })
}

const QUERY = 'https://query.wikidata.org/sparql'
const API = 'https://www.wikidata.org/w/api.php'

describe('RequestGate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts the second query only after the first finishes and two seconds pass', async () => {
    const clock = new FakeClock()
    const { started, transport } = installFetch(clock)
    const gate = new RequestGate(clock, transport)
    const first = gate.send({ lane: 'query', url: QUERY })
    const second = gate.send({ lane: 'query', url: `${QUERY}?page=2` })
    await flush()
    expect(started).toHaveLength(1)
    started[0]?.respond(json({ rows: 1 }))
    await flush()
    expect(started).toHaveLength(1)
    await clock.advance(1_999)
    expect(started).toHaveLength(1)
    await clock.advance(1)
    expect(started).toHaveLength(2)
    expect(started[1]?.at).toBeGreaterThanOrEqual(2_000)
    started[1]?.respond(json({ rows: 2 }))
    await expect(first).resolves.toMatchObject({ ok: true, status: 200 })
    await expect(second).resolves.toMatchObject({
      ok: true,
      body: { rows: 2 },
    })
  })

  it('keeps one query and one API request in flight', async () => {
    const clock = new FakeClock()
    const { started, transport } = installFetch(clock)
    const gate = new RequestGate(clock, transport)
    const sends = [
      gate.send({ lane: 'query', url: `${QUERY}?n=0` }),
      gate.send({ lane: 'query', url: `${QUERY}?n=1` }),
      gate.send({ lane: 'query', url: `${QUERY}?n=2` }),
      gate.send({ lane: 'api', url: `${API}?n=0` }),
      gate.send({ lane: 'api', url: `${API}?n=1` }),
    ]
    await flush()
    expect(inFlight(started, 'query')).toBe(1)
    expect(inFlight(started, 'api')).toBe(1)
    started[0]?.respond(json({}))
    await flush()
    expect(inFlight(started, 'query')).toBe(1)
    await clock.advance(2_000)
    expect(
      started.filter((entry) => entry.url.includes('sparql')),
    ).toHaveLength(2)
    expect(
      started.filter((entry) => entry.url.includes('api.php')),
    ).toHaveLength(1)
    for (let step = 0; step < 6; step += 1) {
      for (const entry of started) entry.respond(json({}))
      await clock.advance(2_000)
    }
    await Promise.all(sends)
  })

  it('aborts a request at 60 seconds and does not retry it', async () => {
    const clock = new FakeClock()
    const { started, transport } = installFetch(clock)
    const gate = new RequestGate(clock, transport)
    const pending = gate.send({ lane: 'query', url: QUERY })
    await flush()
    expect(started).toHaveLength(1)
    await clock.advance(59_900)
    expect(started).toHaveLength(1)
    let settled = false
    void pending.then(() => {
      settled = true
    })
    await flush()
    expect(settled).toBe(false)
    await clock.advance(100)
    await expect(pending).resolves.toEqual({
      ok: false,
      error: { kind: 'timeout' },
    })
    await clock.advance(20_000)
    expect(started).toHaveLength(1)
  })

  it('retries HTTP 502 twice, after 2 seconds and then 8 seconds', async () => {
    const clock = new FakeClock()
    const times: number[] = []
    const transport: typeof fetch = () => {
      times.push(clock.now())
      return Promise.resolve(http(502, 'unavailable'))
    }
    const gate = new RequestGate(clock, transport)
    const pending = gate.send({ lane: 'query', url: QUERY })
    await clock.advance(30_000)
    await expect(pending).resolves.toEqual({
      ok: false,
      error: { kind: 'server', status: 502 },
    })
    expect(times).toEqual([0, 2_000, 10_000])
  })

  it('retries a network failure twice, after 2 seconds and then 8 seconds', async () => {
    const clock = new FakeClock()
    const times: number[] = []
    const transport: typeof fetch = () => {
      times.push(clock.now())
      return Promise.reject(new TypeError('offline'))
    }
    const gate = new RequestGate(clock, transport)
    const pending = gate.send({ lane: 'api', url: API })
    await clock.advance(30_000)
    await expect(pending).resolves.toEqual({
      ok: false,
      error: { kind: 'network' },
    })
    expect(times).toEqual([0, 2_000, 10_000])
  })

  it('does not retry HTTP 400', async () => {
    const clock = new FakeClock()
    const { started, transport } = installFetch(clock)
    const gate = new RequestGate(clock, transport)
    const pending = gate.send({ lane: 'query', url: QUERY })
    await flush()
    started[0]?.respond(http(400, 'bad request'))
    await expect(pending).resolves.toEqual({
      ok: false,
      error: { kind: 'badQuery' },
    })
    await clock.advance(30_000)
    expect(started).toHaveLength(1)
  })

  it('waits for Retry-After before retrying HTTP 429', async () => {
    const clock = new FakeClock()
    const { started, transport } = installFetch(clock)
    const gate = new RequestGate(clock, transport)
    const pending = gate.send({ lane: 'api', url: API })
    await flush()
    started[0]?.respond(http(429, '', { 'Retry-After': '30' }))
    await flush()
    expect(started).toHaveLength(1)
    await clock.advance(29_999)
    expect(started).toHaveLength(1)
    await clock.advance(1)
    expect(started).toHaveLength(2)
    expect(started[1]?.at).toBe(30_000)
    started[1]?.respond(json({ search: [] }))
    await expect(pending).resolves.toMatchObject({
      ok: true,
      body: { search: [] },
    })
  })

  it('waits 30 seconds when HTTP 429 has no Retry-After', async () => {
    const clock = new FakeClock()
    const { started, transport } = installFetch(clock)
    const gate = new RequestGate(clock, transport)
    const pending = gate.send({ lane: 'api', url: API })
    await flush()
    started[0]?.respond(http(429, ''))
    await flush()
    await clock.advance(29_999)
    expect(started).toHaveLength(1)
    await clock.advance(1)
    expect(started[1]?.at).toBe(30_000)
    started[1]?.respond(json({ search: [] }))
    await pending
  })

  it('sends an Api-User-Agent header naming Chronicle, the version, and a contact', async () => {
    const clock = new FakeClock()
    const { started, transport } = installFetch(clock)
    const gate = new RequestGate(clock, transport)
    const pending = gate.send({
      lane: 'api',
      url: API,
      headers: { Accept: 'application/json' },
    })
    await flush()
    const headers = new Headers(started[0]?.init.headers)
    expect(headers.get('Api-User-Agent')).toBe(API_USER_AGENT)
    expect(API_USER_AGENT).toContain('Chronicle')
    expect(API_USER_AGENT).toContain('0.1.0')
    expect(API_USER_AGENT).toContain(
      'https://github.com/fillicianoplong/chronicle',
    )
    expect(headers.get('Accept')).toBe('application/json')
    started[0]?.respond(json({}))
    await pending
  })

  it('sleeps and aborts on the system clock', async () => {
    vi.useFakeTimers()
    const clock = systemClock()
    const slept = clock.sleep(500)
    await vi.advanceTimersByTimeAsync(500)
    await slept
    const controller = new AbortController()
    const aborted = clock.sleep(5_000, controller.signal)
    controller.abort()
    await expect(aborted).rejects.toThrow(/aborted/i)
    expect(clock.now()).toBeGreaterThan(0)
  })
})

function inFlight(started: Started[], lane: Lane): number {
  const needle = lane === 'query' ? 'sparql' : 'api.php'
  return started.filter((entry) => entry.url.includes(needle)).length
}
