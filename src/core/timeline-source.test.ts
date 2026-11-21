import { afterEach, describe, expect, it, vi } from 'vitest'
import { FakeSource, type EntityId, type QId } from '../data/TimelineSource.ts'

describe('TimelineSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads recorded fixtures without calling fetch', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', (url: string) => {
      calls.push(url)
      throw new Error('fetch was called')
    })
    const source = new FakeSource()
    const signal = new AbortController().signal

    const subjects = await source.searchSubjects('Donald Tru', signal)
    const properties = await source.searchProperties('jurisdiction', signal)
    const batch = await source.fetchBatch(
      {
        subjectId: 'Q22686' as QId,
        series: 'all',
        scope: { relationships: [] },
        offset: 0,
        limit: 5000,
      },
      signal,
    )
    const labels = await source.fetchLabels(['Q30' as EntityId], signal)

    expect(subjects[0]).toMatchObject({
      id: 'Q22686',
      label: 'Donald Trump',
    })
    expect(subjects[0]?.description.length).toBeGreaterThan(0)
    expect(properties[0]).toMatchObject({
      id: 'P1001',
      label: 'applies to jurisdiction',
    })
    expect(batch.ok).toBe(true)
    if (batch.ok) {
      expect(batch.rows.length).toBeGreaterThan(0)
      expect(batch.rows[0]?.itemId).toMatch(/^Q/)
    }
    expect(labels.get('Q30' as EntityId)?.label).toBe('United States')
    expect(calls).toEqual([])
  })
})
