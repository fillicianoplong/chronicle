export interface PartialDate {
  year: number
  month: number | null
  day: number | null
}

const PARTIAL_DATE = /^(-?\d+)(?:-(\d{2})(?:-(\d{2}))?)?$/

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

/** Astronomical year numbering: year 0 is 1 BCE, and year -N is N + 1 BCE. */
function formatYear(year: number): string {
  if (year > 0) return String(year)
  return `${String(1 - year)} BCE`
}

function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true
  if (year % 100 === 0) return false
  return year % 4 === 0
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29
  const days = DAYS_IN_MONTH[month - 1]
  return days ?? 0
}

function buildDate(
  year: number,
  month: number | null,
  day: number | null,
): PartialDate | null {
  if (!Number.isSafeInteger(year)) return null
  if (month === null) {
    return day === null ? { year, month: null, day: null } : null
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (day === null) return { year, month, day: null }
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) {
    return null
  }
  return { year, month, day }
}

export function parsePartialDate(value: string): PartialDate | null {
  const match = PARTIAL_DATE.exec(value.trim())
  if (!match) return null
  const yearText = match[1]
  if (yearText === undefined) return null
  const year = Number(yearText)
  const month = match[2] === undefined ? null : Number(match[2])
  const day = match[3] === undefined ? null : Number(match[3])
  return buildDate(year, month, day)
}

export function formatPartialDate(value: string): string {
  const parsed = parsePartialDate(value)
  if (!parsed) return value.trim()
  const yearLabel = formatYear(parsed.year)
  if (parsed.month === null) return yearLabel
  const monthName = MONTH_NAMES[parsed.month - 1]
  if (!monthName) return value.trim()
  if (parsed.day === null) return `${monthName} ${yearLabel}`
  return `${monthName} ${parsed.day}, ${yearLabel}`
}

function sortKey(value: string): readonly [number, number, number, number] {
  const parsed = parsePartialDate(value)
  if (!parsed) {
    return [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      1,
    ]
  }
  return [parsed.year, parsed.month ?? 0, parsed.day ?? 0, 0]
}

export function comparePartialDates(a: string, b: string): number {
  const left = sortKey(a)
  const right = sortKey(b)
  for (let index = 0; index < left.length; index += 1) {
    const leftPart = left[index] ?? 0
    const rightPart = right[index] ?? 0
    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }
  return 0
}

export function sortByPartialDate<T>(
  items: readonly T[],
  getDate: (item: T) => string,
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const compared = comparePartialDates(
        getDate(left.item),
        getDate(right.item),
      )
      return compared === 0 ? left.index - right.index : compared
    })
    .map(({ item }) => item)
}
