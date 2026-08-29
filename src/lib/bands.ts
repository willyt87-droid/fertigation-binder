import type { BandTone, Stage, StageKey } from '../types'
import { todayISO } from './format'

export const FEED_PH = { min: 5.8, max: 6.2 }
export const RO_PH = { min: 5.3, max: 6.3 }

export const FEED_ML: Record<StageKey, { min: number; max: number }> = {
  early: { min: 1800, max: 2880 },
  mid: { min: 2100, max: 4680 },
  late: { min: 2100, max: 3800 },
}

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

export function toneForBand(value: number | null, min: number, max: number): BandTone {
  if (value === null) return 'none'
  if (value < min) return 'low'
  if (value > max) return 'high'
  return 'ok'
}

export function feedMlTone(value: number | null, stage: StageKey | null): BandTone {
  if (!stage) return 'none'
  const band = FEED_ML[stage]
  return toneForBand(value, band.min, band.max)
}
