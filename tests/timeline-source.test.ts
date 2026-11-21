import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceFile = path.resolve(
  import.meta.dirname,
  '../src/data/TimelineSource.ts',
)

describe('TimelineSource interface', () => {
  it('speaks in subjects, series, batches, and labels', () => {
    const source = readFileSync(sourceFile, 'utf8')
    expect(source).toContain('searchSubjects')
    expect(source).toContain('searchProperties')
    expect(source).toContain('fetchBatch')
    expect(source).toContain('fetchLabels')
    expect(source.toLowerCase()).not.toContain('sparql')
  })
})
