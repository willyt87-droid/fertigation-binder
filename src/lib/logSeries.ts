import type { Entry } from '../types'

export type LogDay = {
  date: string
  feed_ec: number | null
  runoff_ec: number | null
  feed_ph: number | null
  runoff_ph: number | null
  feed_ml: number | null
  runoff_ml: number | null
  samples: number
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function nums(rows: Entry[], key: keyof Pick<Entry, 'feed_ec' | 'runoff_ec' | 'feed_ph' | 'runoff_ph' | 'feed_ml' | 'runoff_ml'>) {
  return rows.map((row) => row[key]).filter((value): value is number => value != null)
}

/** Oldest-first daily averages (zone average when a date has more than one collection). */
export function entriesByDate(entries: Entry[]): LogDay[] {
  const groups = new Map<string, Entry[]>()
  for (const entry of entries) {
    const list = groups.get(entry.date) ?? []
    list.push(entry)
    groups.set(entry.date, list)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rows]) => ({
      date,
      feed_ec: avg(nums(rows, 'feed_ec')),
      runoff_ec: avg(nums(rows, 'runoff_ec')),
      feed_ph: avg(nums(rows, 'feed_ph')),
      runoff_ph: avg(nums(rows, 'runoff_ph')),
      feed_ml: avg(nums(rows, 'feed_ml')),
      runoff_ml: avg(nums(rows, 'runoff_ml')),
      samples: rows.length,
    }))
}

export function seriesHasPoints(days: LogDay[], keys: Array<keyof Omit<LogDay, 'date' | 'samples'>>) {
  return days.some((day) => keys.some((key) => day[key] != null))
}
