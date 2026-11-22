/**
 * Wikidata adapter. Subject search uses the entity search on the API lane.
 * Batch loading and property search come later.
 */

import { isCloseLabel } from '../../core/closeLabel.ts'
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
    if (isItemId(query)) return this.itemById(query, signal)
    const exact = await this.entitySearch(query, signal)
    if (exact === null || exact.length > 0) return exact ?? []
    return this.fuzzySearch(query, signal)
  }

  private async entitySearch(
    query: string,
    signal: AbortSignal,
  ): Promise<SubjectHit[] | null> {
    const outcome = await this.send(subjectSearchUrl(query), signal)
    if (outcome === null) return null
    return subjectHits(outcome).map((hit) => ({
      ...hit,
      match: 'exact' as const,
    }))
  }

  private async itemById(id: QId, signal: AbortSignal): Promise<SubjectHit[]> {
    const labels = await this.readLabels([id], signal)
    const text = labels.get(id)
    if (!text) return []
    return [
      {
        id,
        label: text.label,
        description: text.description,
        match: 'exact',
      },
    ]
  }

  private async fuzzySearch(
    query: string,
    signal: AbortSignal,
  ): Promise<SubjectHit[]> {
    const outcome = await this.send(fuzzySearchUrl(query), signal)
    if (outcome === null) return []
    const ids = fuzzyIds(outcome)
    const labels = await this.readLabels(ids, signal)
    const hits: SubjectHit[] = []
    for (const id of ids) {
      const text = labels.get(id)
      if (!text || !isCloseLabel(query, text.label)) continue
      hits.push({
        id,
        label: text.label,
        description: text.description,
        match: 'fuzzy',
      })
    }
    return hits
  }

  private async readLabels(
    ids: readonly QId[],
    signal: AbortSignal,
  ): Promise<Map<QId, LabelText>> {
    if (ids.length === 0) return new Map()
    const outcome = await this.send(entityUrl(ids), signal)
    if (outcome === null) return new Map()
    return labelsFrom(outcome, ids)
  }

  private async send(url: string, signal: AbortSignal): Promise<unknown> {
    const outcome = await this.gate.send({
      lane: 'api',
      url,
      headers: { Accept: 'application/json' },
      signal,
    })
    if (!outcome.ok) return null
    return outcome.body
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

function isItemId(text: string): text is QId {
  return /^Q[1-9][0-9]*$/.test(text)
}

function fuzzySearchUrl(text: string): string {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word !== '')
    .map((word) => `${word}~`)
  const url = new URL(API)
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('list', 'search')
  url.searchParams.set('srnamespace', '0')
  url.searchParams.set('srlimit', '10')
  url.searchParams.set('origin', '*')
  url.searchParams.set('srsearch', words.join(' '))
  return url.toString()
}

function entityUrl(ids: readonly string[]): string {
  const url = new URL(API)
  url.searchParams.set('action', 'wbgetentities')
  url.searchParams.set('format', 'json')
  url.searchParams.set('ids', ids.join('|'))
  url.searchParams.set('props', 'labels|descriptions')
  url.searchParams.set('languages', 'en')
  url.searchParams.set('languagefallback', '1')
  url.searchParams.set('origin', '*')
  return url.toString()
}

function fuzzyIds(body: unknown): QId[] {
  if (!body || typeof body !== 'object' || !('query' in body)) return []
  const search = (body as { query?: { search?: unknown } }).query?.search
  if (!Array.isArray(search)) return []
  const ids: QId[] = []
  for (const entry of search) {
    if (!entry || typeof entry !== 'object' || !('title' in entry)) continue
    const title = (entry as { title?: unknown }).title
    if (typeof title === 'string' && isItemId(title)) ids.push(title)
  }
  return ids
}

function labelsFrom(body: unknown, ids: readonly QId[]): Map<QId, LabelText> {
  const map = new Map<QId, LabelText>()
  if (!body || typeof body !== 'object' || !('entities' in body)) return map
  const entities = (body as { entities?: Record<string, unknown> }).entities
  if (!entities) return map
  for (const id of ids) {
    const text = labelText(entities[id])
    if (text) map.set(id, text)
  }
  return map
}

function labelText(entity: unknown): LabelText | null {
  if (!entity || typeof entity !== 'object' || 'missing' in entity) return null
  const record = entity as {
    labels?: { en?: { value?: unknown }; mul?: { value?: unknown } }
    descriptions?: { en?: { value?: unknown } }
  }
  const label =
    textValue(record.labels?.en?.value) || textValue(record.labels?.mul?.value)
  if (label === '') return null
  return {
    label,
    description: textValue(record.descriptions?.en?.value),
  }
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
