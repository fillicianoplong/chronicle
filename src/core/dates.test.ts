import { describe, expect, it } from 'vitest'
import {
  comparePartialDates,
  formatPartialDate,
  parsePartialDate,
  sortByPartialDate,
} from './dates.ts'

describe('parsePartialDate', () => {
  it('reads year, month, and day precision', () => {
    expect(parsePartialDate('2016')).toEqual({
      year: 2016,
      month: null,
      day: null,
    })
    expect(parsePartialDate('2016-11')).toEqual({
      year: 2016,
      month: 11,
      day: null,
    })
    expect(parsePartialDate(' 2016-11-08 ')).toEqual({
      year: 2016,
      month: 11,
      day: 8,
    })
  })

  it('rejects dates that are not on the calendar', () => {
    expect(parsePartialDate('2016-13-01')).toBeNull()
    expect(parsePartialDate('2016-00-01')).toBeNull()
    expect(parsePartialDate('2016-02-30')).toBeNull()
    expect(parsePartialDate('2015-02-29')).toBeNull()
    expect(parsePartialDate('1900-02-29')).toBeNull()
    expect(parsePartialDate('2016-11-8')).toBeNull()
    expect(parsePartialDate('not-a-date')).toBeNull()
    expect(parsePartialDate('9999999999999999999')).toBeNull()
  })

  it('accepts leap days in leap years, including year 0', () => {
    expect(parsePartialDate('2016-02-29')).toEqual({
      year: 2016,
      month: 2,
      day: 29,
    })
    expect(parsePartialDate('2000-02-29')).toEqual({
      year: 2000,
      month: 2,
      day: 29,
    })
    expect(parsePartialDate('0-02-29')).toEqual({
      year: 0,
      month: 2,
      day: 29,
    })
  })
})

describe('formatPartialDate', () => {
  it('formats each supported precision', () => {
    expect(formatPartialDate('2016')).toBe('2016')
    expect(formatPartialDate('2016-11')).toBe('November 2016')
    expect(formatPartialDate('2016-11-08')).toBe('November 8, 2016')
  })

  it('formats non-positive years as BCE', () => {
    expect(formatPartialDate('0')).toBe('1 BCE')
    expect(formatPartialDate('-43')).toBe('44 BCE')
    expect(formatPartialDate('-43-03-15')).toBe('March 15, 44 BCE')
    expect(formatPartialDate('0-02-29')).toBe('February 29, 1 BCE')
  })

  it('returns trimmed input when the value is not a partial date', () => {
    expect(formatPartialDate(' 2015-02-29 ')).toBe('2015-02-29')
    expect(formatPartialDate('not-a-date')).toBe('not-a-date')
  })
})

describe('comparePartialDates', () => {
  it('orders dates from earlier to later, with coarser precision first', () => {
    const dates = [
      '2016-01-02',
      '2016',
      '2015-12-31',
      'not-a-date',
      '2016-01',
      '-43-03-15',
    ]

    expect([...dates].sort(comparePartialDates)).toEqual([
      '-43-03-15',
      '2015-12-31',
      '2016',
      '2016-01',
      '2016-01-02',
      'not-a-date',
    ])
  })

  it('treats equal partial dates as ties', () => {
    expect(comparePartialDates('2016-11-08', '2016-11-08')).toBe(0)
    expect(comparePartialDates('nope', 'also-nope')).toBe(0)
  })
})

describe('sortByPartialDate', () => {
  it('sorts records chronologically without mutating the input', () => {
    const items = [
      { id: 'b', date: '2016-01-02' },
      { id: 'a', date: '2016' },
      { id: 'c', date: '2015-12-31' },
      { id: 'd', date: 'not-a-date' },
      { id: 'e', date: '2016-01' },
      { id: 'f', date: 'also-bad' },
    ]
    const original = items.map((item) => item.id)

    expect(
      sortByPartialDate(items, (item) => item.date).map((item) => item.id),
    ).toEqual(['c', 'a', 'e', 'b', 'd', 'f'])
    expect(items.map((item) => item.id)).toEqual(original)
  })
})
