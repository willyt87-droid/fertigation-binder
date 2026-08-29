export type MinMax = {
  min: number | null
  max: number | null
}

export type FacilityTargets = {
  binder: {
    feedPh: MinMax
    roPh: MinMax
    feedMl: {
      early: MinMax
      mid: MinMax
      late: MinMax
    }
    feedEc: MinMax
    runoffMl: MinMax
    runoffPh: MinMax
    runoffEc: MinMax
    roPct: MinMax
  }
  substrate: {
    vwcPct: MinMax
    fieldCapacityPct: MinMax
    drybackDayPct: MinMax
    drybackOvernightPct: MinMax
    substrateEc: MinMax
    substrateTemp: MinMax
  }
  irrigation: {
    shotSizeMl: MinMax
    shotSizePctMedia: MinMax
    shotEc: MinMax
    restPeriod: MinMax
  }
  climate: {
    vpd: MinMax
    rh: MinMax
    light: MinMax
    co2: MinMax
    airTemp: MinMax
  }
}

const mm = (min: number | null, max: number | null): MinMax => ({ min, max })

/** Starting points for a new facility — typical binder figures, not a branded grow. */
export const DEFAULT_TARGETS: FacilityTargets = {
  binder: {
    feedPh: mm(5.8, 6.2),
    roPh: mm(5.3, 6.3),
    feedMl: {
      early: mm(1800, 2880),
      mid: mm(2100, 4680),
      late: mm(2100, 3800),
    },
    feedEc: mm(null, null),
    runoffMl: mm(null, null),
    runoffPh: mm(5.3, 6.3),
    runoffEc: mm(null, null),
    roPct: mm(null, null),
  },
  substrate: {
    vwcPct: mm(null, null),
    fieldCapacityPct: mm(45, 65),
    drybackDayPct: mm(15, 25),
    drybackOvernightPct: mm(15, 25),
    substrateEc: mm(null, null),
    substrateTemp: mm(null, null),
  },
  irrigation: {
    shotSizeMl: mm(null, null),
    shotSizePctMedia: mm(null, null),
    shotEc: mm(null, null),
    restPeriod: mm(null, null),
  },
  climate: {
    vpd: mm(null, null),
    rh: mm(null, null),
    light: mm(null, null),
    co2: mm(null, null),
    airTemp: mm(null, null),
  },
}

function mergeMm(a: MinMax | undefined, b: MinMax): MinMax {
  if (!a) return { ...b }
  return {
    min: a.min === undefined ? b.min : a.min,
    max: a.max === undefined ? b.max : a.max,
  }
}

export function mergeTargets(raw: unknown): FacilityTargets {
  const src = raw && typeof raw === 'object' ? (raw as Partial<FacilityTargets>) : {}
  const b = src.binder ?? DEFAULT_TARGETS.binder
  const s = src.substrate ?? DEFAULT_TARGETS.substrate
  const i = src.irrigation ?? DEFAULT_TARGETS.irrigation
  const c = src.climate ?? DEFAULT_TARGETS.climate
  return {
    binder: {
      feedPh: mergeMm(b.feedPh, DEFAULT_TARGETS.binder.feedPh),
      roPh: mergeMm(b.roPh, DEFAULT_TARGETS.binder.roPh),
      feedMl: {
        early: mergeMm(b.feedMl?.early, DEFAULT_TARGETS.binder.feedMl.early),
        mid: mergeMm(b.feedMl?.mid, DEFAULT_TARGETS.binder.feedMl.mid),
        late: mergeMm(b.feedMl?.late, DEFAULT_TARGETS.binder.feedMl.late),
      },
      feedEc: mergeMm(b.feedEc, DEFAULT_TARGETS.binder.feedEc),
      runoffMl: mergeMm(b.runoffMl, DEFAULT_TARGETS.binder.runoffMl),
      runoffPh: mergeMm(b.runoffPh, DEFAULT_TARGETS.binder.runoffPh),
      runoffEc: mergeMm(b.runoffEc, DEFAULT_TARGETS.binder.runoffEc),
      roPct: mergeMm(b.roPct, DEFAULT_TARGETS.binder.roPct),
    },
    substrate: {
      vwcPct: mergeMm(s.vwcPct, DEFAULT_TARGETS.substrate.vwcPct),
      fieldCapacityPct: mergeMm(s.fieldCapacityPct, DEFAULT_TARGETS.substrate.fieldCapacityPct),
      drybackDayPct: mergeMm(s.drybackDayPct, DEFAULT_TARGETS.substrate.drybackDayPct),
      drybackOvernightPct: mergeMm(s.drybackOvernightPct, DEFAULT_TARGETS.substrate.drybackOvernightPct),
      substrateEc: mergeMm(s.substrateEc, DEFAULT_TARGETS.substrate.substrateEc),
      substrateTemp: mergeMm(s.substrateTemp, DEFAULT_TARGETS.substrate.substrateTemp),
    },
    irrigation: {
      shotSizeMl: mergeMm(i.shotSizeMl, DEFAULT_TARGETS.irrigation.shotSizeMl),
      shotSizePctMedia: mergeMm(i.shotSizePctMedia, DEFAULT_TARGETS.irrigation.shotSizePctMedia),
      shotEc: mergeMm(i.shotEc, DEFAULT_TARGETS.irrigation.shotEc),
      restPeriod: mergeMm(i.restPeriod, DEFAULT_TARGETS.irrigation.restPeriod),
    },
    climate: {
      vpd: mergeMm(c.vpd, DEFAULT_TARGETS.climate.vpd),
      rh: mergeMm(c.rh, DEFAULT_TARGETS.climate.rh),
      light: mergeMm(c.light, DEFAULT_TARGETS.climate.light),
      co2: mergeMm(c.co2, DEFAULT_TARGETS.climate.co2),
      airTemp: mergeMm(c.airTemp, DEFAULT_TARGETS.climate.airTemp),
    },
  }
}

export function rangeHasValues(range: MinMax) {
  return range.min != null || range.max != null
}

export function formatRange(range: MinMax, suffix = '') {
  if (range.min != null && range.max != null) return `${range.min}–${range.max}${suffix}`
  if (range.min != null) return `≥${range.min}${suffix}`
  if (range.max != null) return `≤${range.max}${suffix}`
  return 'off'
}
