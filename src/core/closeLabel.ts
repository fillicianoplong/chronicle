/**
 * A fuzzy hit is worth showing when its label is the typed text with one
 * or two small edits. A longer query may be two edits away. Anything looser
 * is noise from the full-text index, and the search reports no match.
 */

export function isCloseLabel(query: string, label: string): boolean {
  const left = query.trim().toLowerCase()
  const right = label.trim().toLowerCase()
  if (left === '' || right === '') return false
  const limit = left.length >= 8 ? 2 : 1
  return editDistance(left, right) <= limit
}

function editDistance(left: string, right: string): number {
  const rows: number[][] = Array.from(
    { length: right.length + 1 },
    (_, row) => [row],
  )
  const first = rows[0]
  if (!first) return 0
  for (let column = 0; column <= left.length; column += 1)
    first[column] = column
  for (let row = 1; row <= right.length; row += 1) {
    const current = rows[row]
    const previous = rows[row - 1]
    if (!current || !previous) continue
    for (let column = 1; column <= left.length; column += 1) {
      const cost = right[row - 1] === left[column - 1] ? 0 : 1
      current[column] = Math.min(
        (previous[column] ?? 0) + 1,
        (current[column - 1] ?? 0) + 1,
        (previous[column - 1] ?? 0) + cost,
      )
    }
  }
  return rows[right.length]?.[left.length] ?? 0
}
