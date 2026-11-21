/**
 * Wikidata adapter. Subject search uses the entity search on the API lane.
 * Batch loading and property search come later.
 */

import type { RequestGate } from '../RequestGate.ts'
import type {
  BatchRequest,
  BatchResult,
  EntityId,
  LabelText,
  PropertyHit,
  QId,
  SubjectHit,
  TimelineSource,
} from '../TimelineSource.ts'

const API = 'https://www.wikidata.org/w/api.php'

export class WikidataSource implements TimelineSource {
  private readonly gate: RequestGate

  constructor(gate: RequestGate) {
    this.gate = gate
  }

  async searchSubjects(
    text: string,
    signal: AbortSignal,
  ): Promise<SubjectHit[]> {
    const query = text.trim()
    if (query === '') return []
    const outcome = await this.gate.send({
      lane: 'api',
      url: subjectSearchUrl(query),
      headers: { Accept: 'application/json' },
      signal,
    })
    if (!outcome.ok) return []
    return subjectHits(outcome.body)
  }

  searchProperties(text: string, signal: AbortSignal): Promise<PropertyHit[]> {
    return unavailable(text, signal)
  }

  fetchBatch(request: BatchRequest, signal: AbortSignal): Promise<BatchResult> {
    void request
    void signal
    return Promise.resolve({
      ok: false,
      error: { kind: 'badShape', detail: 'Batch loading is not available yet' },
    })
  }

  fetchLabels(
    ids: EntityId[],
    signal: AbortSignal,
  ): Promise<Map<EntityId, LabelText>> {
    return unavailable(ids, signal)
  }
}

function unavailable<T>(unused: unknown, signal: AbortSignal): Promise<T> {
  void unused
  void signal
  return Promise.reject(new Error('This lookup is not available yet'))
}

function subjectSearchUrl(text: string): string {
  const url = new URL(API)
  url.searchParams.set('action', 'wbsearchentities')
  url.searchParams.set('format', 'json')
  url.searchParams.set('language', 'en')
  url.searchParams.set('uselang', 'en')
  url.searchParams.set('type', 'item')
  url.searchParams.set('limit', '10')
  url.searchParams.set('origin', '*')
  url.searchParams.set('search', text)
  return url.toString()
}

function subjectHits(body: unknown): SubjectHit[] {
  return searchEntries(body)
    .map(subjectHit)
    .filter((hit): hit is SubjectHit => hit !== null)
}

function searchEntries(body: unknown): unknown[] {
  if (!body || typeof body !== 'object' || !('search' in body)) return []
  const search = (body as { search?: unknown }).search
  return Array.isArray(search) ? search : []
}

function subjectHit(entry: unknown): SubjectHit | null {
  if (!entry || typeof entry !== 'object') return null
  const record = entry as {
    id?: unknown
    label?: unknown
    description?: unknown
    display?: { label?: unknown; description?: unknown }
  }
  if (typeof record.id !== 'string' || !/^Q[1-9][0-9]*$/.test(record.id)) {
    return null
  }
  const label = textValue(record.display?.label) || textValue(record.label)
  const description =
    textValue(record.display?.description) || textValue(record.description)
  return { id: record.id as QId, label, description }
}

function textValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'value' in value) {
    const inner = (value as { value?: unknown }).value
    return typeof inner === 'string' ? inner : ''
  }
  return ''
}
