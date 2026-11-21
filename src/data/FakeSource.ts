import type {
  BatchRequest,
  BatchResult,
  EntityId,
  LabelText,
  PId,
  PropertyHit,
  QId,
  Row,
  SubjectHit,
  TimelineSource,
} from './TimelineSource.ts'

interface RecordedFixture {
  query: string
  response: { body: unknown }
}

const recordedModules = import.meta.glob('../../tests/fixtures/*.json', {
  eager: true,
  import: 'default',
})

function recordedFixtures(): RecordedFixture[] {
  return Object.values(recordedModules) as RecordedFixture[]
}

function entityId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const id = value.split('/').pop()
  if (!id || !/^[QP][1-9][0-9]*$/.test(id)) return null
  return id
}

function textValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'value' in value) {
    const inner = (value as { value?: unknown }).value
    return typeof inner === 'string' ? inner : ''
  }
  return ''
}

function searchHits(body: unknown): unknown[] {
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
  if (typeof record.id !== 'string' || !record.id.startsWith('Q')) return null
  const label = textValue(record.display?.label) || textValue(record.label)
  const description =
    textValue(record.display?.description) || textValue(record.description)
  return { id: record.id as QId, label, description }
}

function propertyHit(entry: unknown): PropertyHit | null {
  if (!entry || typeof entry !== 'object') return null
  const record = entry as {
    id?: unknown
    label?: unknown
    description?: unknown
  }
  if (typeof record.id !== 'string' || !record.id.startsWith('P')) return null
  return {
    id: record.id as PId,
    label: textValue(record.label),
    description: textValue(record.description),
  }
}

function bindingsOf(body: unknown): unknown[] {
  if (!body || typeof body !== 'object' || !('results' in body)) return []
  const results = (body as { results?: { bindings?: unknown } }).results
  return Array.isArray(results?.bindings) ? results.bindings : []
}

function rowFromBinding(entry: unknown): Row | null {
  if (!entry || typeof entry !== 'object') return null
  const record = entry as {
    item?: { value?: unknown }
    prop?: { value?: unknown }
    date?: { value?: unknown }
    dateProp?: { value?: unknown }
    precision?: { value?: unknown }
  }
  const itemId = entityId(record.item?.value)
  const propertyId = entityId(record.prop?.value)
  const datePropertyId = entityId(record.dateProp?.value)
  const date = record.date?.value
  const precision = Number(record.precision?.value)
  if (!itemId || !propertyId || !datePropertyId) return null
  if (typeof date !== 'string' || !Number.isInteger(precision)) return null
  return {
    itemId: itemId as QId,
    propertyId: propertyId as PId,
    date,
    datePropertyId: datePropertyId as PId,
    precision,
  }
}

function labelMap(
  body: unknown,
  ids: readonly EntityId[],
): Map<EntityId, LabelText> {
  const map = new Map<EntityId, LabelText>()
  if (!body || typeof body !== 'object' || !('entities' in body)) return map
  const entities = (body as { entities?: Record<string, unknown> }).entities
  if (!entities) return map
  for (const id of ids) {
    const entity = entities[id as string]
    if (!entity || typeof entity !== 'object') continue
    const record = entity as {
      labels?: { en?: { value?: unknown } }
      descriptions?: { en?: { value?: unknown } }
    }
    const label = record.labels?.en?.value
    const description = record.descriptions?.en?.value
    map.set(id, {
      label: typeof label === 'string' ? label : id,
      description: typeof description === 'string' ? description : '',
    })
  }
  return map
}

export class FakeSource implements TimelineSource {
  private readonly fixtures: RecordedFixture[]

  constructor(fixtures: RecordedFixture[] = recordedFixtures()) {
    this.fixtures = fixtures
  }

  searchSubjects(text: string, signal: AbortSignal): Promise<SubjectHit[]> {
    if (signal.aborted) return Promise.resolve([])
    const fixture = this.fixtures.find((entry) => entry.query === text)
    const hits = searchHits(fixture?.response.body)
      .map(subjectHit)
      .filter((hit): hit is SubjectHit => hit !== null)
    return Promise.resolve(hits)
  }

  searchProperties(text: string, signal: AbortSignal): Promise<PropertyHit[]> {
    if (signal.aborted) return Promise.resolve([])
    const fixture = this.fixtures.find((entry) => entry.query === text)
    const hits = searchHits(fixture?.response.body)
      .map(propertyHit)
      .filter((hit): hit is PropertyHit => hit !== null)
    return Promise.resolve(hits)
  }

  fetchBatch(request: BatchRequest, signal: AbortSignal): Promise<BatchResult> {
    if (signal.aborted) {
      return Promise.resolve({ ok: false, error: { kind: 'aborted' } })
    }
    const needle = `wd:${request.subjectId}`
    const offset = `OFFSET ${String(request.offset)}`
    const fixture = this.fixtures.find(
      (entry) => entry.query.includes(needle) && entry.query.includes(offset),
    )
    if (!fixture) {
      return Promise.resolve({
        ok: false,
        error: { kind: 'badShape', detail: 'No recorded batch' },
      })
    }
    const rows = bindingsOf(fixture.response.body)
      .map(rowFromBinding)
      .filter((row): row is Row => row !== null)
    return Promise.resolve({ ok: true, rows })
  }

  fetchLabels(
    ids: EntityId[],
    signal: AbortSignal,
  ): Promise<Map<EntityId, LabelText>> {
    if (signal.aborted) {
      return Promise.resolve(new Map<EntityId, LabelText>())
    }
    const fixture = this.fixtures.find((entry) =>
      ids.every((id) => entry.query.split('|').includes(id)),
    )
    return Promise.resolve<Map<EntityId, LabelText>>(
      labelMap(fixture?.response.body, ids),
    )
  }
}
