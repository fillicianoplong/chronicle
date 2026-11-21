/**
 * The only caller of fetch. One query and one API request run at a time.
 * A lane waits two seconds after a request finishes before the next one
 * starts. A request with no answer is aborted at 60 seconds and is not
 * retried. Network errors and 5xx responses are retried twice, after 2
 * seconds and then 8 seconds. HTTP 400 is never retried. HTTP 429 waits
 * for Retry-After, or 30 seconds when that header is missing.
 */

import type { Clock } from './Clock.ts'
import { systemClock } from './Clock.ts'
import type { SourceError } from './TimelineSource.ts'

export type Lane = 'query' | 'api'

export const API_USER_AGENT =
  'Chronicle/0.1.0 (https://github.com/fillicianoplong/chronicle)'

const SPACING_MS = 2_000
const TIMEOUT_MS = 60_000
const RETRY_DELAYS_MS = [2_000, 8_000]
const DEFAULT_RETRY_AFTER_MS = 30_000

export interface GateRequest {
  lane: Lane
  url: string
  method?: string
  headers?: HeadersInit
  body?: string
  signal?: AbortSignal
}

export type GateOutcome =
  | { ok: true; status: number; body: unknown }
  | { ok: false; error: SourceError }

type Attempt =
  | { type: 'response'; response: Response }
  | { type: 'timeout' }
  | { type: 'aborted' }
  | { type: 'network' }

export class RequestGate {
  private readonly clock: Clock
  private readonly transport: typeof fetch | undefined
  private readonly tails: Record<Lane, Promise<void>> = {
    query: Promise.resolve(),
    api: Promise.resolve(),
  }

  constructor(clock: Clock = systemClock(), transport?: typeof fetch) {
    this.clock = clock
    this.transport = transport
  }

  send(request: GateRequest): Promise<GateOutcome> {
    const outcome = this.tails[request.lane].then(() => this.execute(request))
    this.tails[request.lane] = outcome.then(
      () => this.clock.sleep(SPACING_MS),
      () => this.clock.sleep(SPACING_MS),
    )
    return outcome
  }

  private async execute(request: GateRequest): Promise<GateOutcome> {
    let failureRetries = 0
    for (;;) {
      if (request.signal?.aborted) return failure({ kind: 'aborted' })
      const result = await this.attempt(request)
      if (result.type === 'timeout') return failure({ kind: 'timeout' })
      if (result.type === 'aborted') return failure({ kind: 'aborted' })
      if (result.type === 'network') {
        const delay = RETRY_DELAYS_MS[failureRetries]
        failureRetries += 1
        if (delay === undefined) return failure({ kind: 'network' })
        if (!(await this.pause(delay, request.signal))) {
          return failure({ kind: 'aborted' })
        }
        continue
      }
      const status = result.response.status
      if (status === 429) {
        const delay = retryAfterMs(result.response, this.clock.now())
        if (!(await this.pause(delay, request.signal))) {
          return failure({ kind: 'aborted' })
        }
        continue
      }
      if (status === 400) return failure({ kind: 'badQuery' })
      if (status >= 500 && status <= 599) {
        const delay = RETRY_DELAYS_MS[failureRetries]
        failureRetries += 1
        if (delay === undefined) return failure({ kind: 'server', status })
        if (!(await this.pause(delay, request.signal))) {
          return failure({ kind: 'aborted' })
        }
        continue
      }
      if (status >= 400) return failure({ kind: 'server', status })
      return this.readBody(result.response)
    }
  }

  private attempt(request: GateRequest): Promise<Attempt> {
    if (request.signal?.aborted) return Promise.resolve({ type: 'aborted' })
    const controller = new AbortController()
    const timeoutControl = new AbortController()
    let timedOut = false
    const onCallerAbort = () => {
      controller.abort()
    }
    request.signal?.addEventListener('abort', onCallerAbort)
    void this.clock.sleep(TIMEOUT_MS, timeoutControl.signal).then(
      () => {
        timedOut = true
        controller.abort()
      },
      () => undefined,
    )
    const init: RequestInit = {
      method: request.method ?? 'GET',
      headers: withUserAgent(request.headers),
      signal: controller.signal,
    }
    if (request.body !== undefined) init.body = request.body
    return this.load(request.url, init).then(
      (response) => {
        finishAttempt(request, timeoutControl, onCallerAbort)
        return { type: 'response', response }
      },
      () => {
        finishAttempt(request, timeoutControl, onCallerAbort)
        if (timedOut) return { type: 'timeout' }
        if (request.signal?.aborted) return { type: 'aborted' }
        return { type: 'network' }
      },
    )
  }

  private load(url: string, init: RequestInit): Promise<Response> {
    const transport = this.transport
    if (transport !== undefined) return transport(url, init)
    return fetch(url, init)
  }

  private async pause(ms: number, signal?: AbortSignal): Promise<boolean> {
    try {
      await this.clock.sleep(ms, signal)
      return true
    } catch {
      return false
    }
  }

  private async readBody(response: Response): Promise<GateOutcome> {
    const status = response.status
    let text: string
    try {
      text = await response.text()
    } catch {
      return failure({
        kind: 'badShape',
        detail: 'Response body could not be read',
      })
    }
    const type = response.headers.get('content-type') ?? ''
    if (!type.includes('json')) return { ok: true, status, body: text }
    try {
      return { ok: true, status, body: JSON.parse(text) as unknown }
    } catch {
      return failure({ kind: 'badShape', detail: 'Response was not JSON' })
    }
  }
}

function withUserAgent(extra: HeadersInit | undefined): Headers {
  const headers = new Headers(extra)
  headers.set('Api-User-Agent', API_USER_AGENT)
  return headers
}

function retryAfterMs(response: Response, now: number): number {
  const raw = response.headers.get('Retry-After')
  if (raw === null || raw.trim() === '') return DEFAULT_RETRY_AFTER_MS
  const trimmed = raw.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000
  const date = Date.parse(trimmed)
  if (Number.isNaN(date)) return DEFAULT_RETRY_AFTER_MS
  return Math.max(0, date - now)
}

function finishAttempt(
  request: GateRequest,
  timeoutControl: AbortController,
  onCallerAbort: () => void,
): void {
  timeoutControl.abort()
  request.signal?.removeEventListener('abort', onCallerAbort)
}

function failure(error: SourceError): GateOutcome {
  return { ok: false, error }
}
