import { formatPartialDate } from '../core/dates.ts'

export function Label(value: string) {
  return <p>{formatPartialDate(value)}</p>
}
