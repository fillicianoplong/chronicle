import { describe, expect, it } from 'vitest'
import { batchQuery } from '../scripts/record-fixtures.mjs'

describe('batch query builder', () => {
  it('builds a paged query for one subject', () => {
    const query = batchQuery('Q22686', 5000)
    expect(query).toContain('wd:Q22686')
    expect(query).toContain('LIMIT 5000')
    expect(query).toContain('OFFSET 5000')
    expect(query).toContain('ORDER BY ?date ?item ?prop')
    expect(query).not.toContain('SERVICE wikibase:label')
  })

  it('refuses a subject id or offset that is not part of the template', () => {
    expect(() => batchQuery('Q22686 }', 0)).toThrow(/Refusing/)
    expect(() => batchQuery('P31', 0)).toThrow(/Refusing/)
    expect(() => batchQuery('Q22686', 1)).toThrow(/Offset/)
  })
})
