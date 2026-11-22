/**
 * Source-neutral data port. Callers speak in subjects, series, batches,
 * and labels. Adapters hide how a particular service is queried.
 */

import { RequestGate } from './RequestGate.ts'
import { WikidataSource } from './WikidataSource/WikidataSource.ts'

export type QId = string & { readonly brand: 'QId' }
export type PId = string & { readonly brand: 'PId' }
export type EntityId = QId | PId
export type DateText = string

export interface SubjectHit {
  id: QId
  label: string
  description: string
  /** Set when the hit came from the fuzzy fallback rather than entity search. */
  match?: 'exact' | 'fuzzy'
}

export interface PropertyHit {
  id: PId
  label: string
  description: string
}

export interface LabelText {
  label: string
  description: string
}

export interface BatchScope {
  relationships: PId[]
  from?: DateText
  to?: DateText
}

export interface BatchRequest {
  subjectId: QId
  series: 'all' | PId
  scope: BatchScope
  offset: number
  limit: 5000
}

export interface Row {
  itemId: QId
  propertyId: PId
  date: string
  datePropertyId: PId
  precision: number
}

export type SourceError =
  | { kind: 'timeout' }
  | { kind: 'rateLimited'; retryAfterS: number }
  | { kind: 'server'; status: number }
  | { kind: 'badQuery' }
  | { kind: 'network' }
  | { kind: 'badShape'; detail: string }
  | { kind: 'aborted' }

export type BatchResult =
  { ok: true; rows: Row[] } | { ok: false; error: SourceError }

export interface TimelineSource {
  searchSubjects(text: string, signal: AbortSignal): Promise<SubjectHit[]>
  searchProperties(text: string, signal: AbortSignal): Promise<PropertyHit[]>
  fetchBatch(request: BatchRequest, signal: AbortSignal): Promise<BatchResult>
  fetchLabels(
    ids: EntityId[],
    signal: AbortSignal,
  ): Promise<Map<EntityId, LabelText>>
}

export { FakeSource } from './FakeSource.ts'

export function createWikidataSource(): TimelineSource {
  return new WikidataSource(new RequestGate())
}
