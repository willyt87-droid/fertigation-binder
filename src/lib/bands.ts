import type { BandTone, Stage, StageKey } from '../types'
import type { FacilityTargets, MinMax } from './targets'
import { todayISO } from './format'

export function cycleDay(startDate: string, onDate = todayISO()) {
  const start = Date.parse(`${startDate}T00:00:00`)
  const on = Date.parse(`${onDate}T00:00:00`)
  if (Number.isNaN(start) || Number.isNaN(on)) return 1
  const day = Math.floor((on - start) / 86_400_000) + 1
  return Math.max(1, day)
}

export function stageForDay(day: number): Stage {
  if (day <= 21) return { key: 'early', label: 'Early', day }
  if (day <= 42) return { key: 'mid', label: 'Mid Bulk', day }
  return { key: 'late', label: 'Late', day }
}

export function stageForCycle(startDate: string, onDate = todayISO()) {
  return stageForDay(cycleDay(startDate, onDate))
}

export function toneForTarget(value: number | null, range: MinMax): BandTone {
  if (value === null) return 'none'
  if (range.min == null && range.max == null) return 'none'
  if (range.min != null && value < range.min) return 'low'
  if (range.max != null && value > range.max) return 'high'
  return 'ok'
}

export function feedMlTone(
  value: number | null,
  stage: StageKey | null,
  targets: FacilityTargets,
): BandTone {
  if (!stage) return 'none'
  return toneForTarget(value, targets.binder.feedMl[stage])
}
