import { lazy, Suspense } from 'react'
import type { Cycle, Entry, Room } from '../types'
import { stageForCycle } from '../lib/bands'
import { formatRange, rangeHasValues, type FacilityTargets } from '../lib/targets'
import { RoomLogTable } from '../components/RoomLogTable'

const RoomLogChart = lazy(async () => {
  const mod = await import('../components/RoomLogChart')
  return { default: mod.RoomLogChart }
})

type RoomScreenProps = {
  room: Room
  cycle: Cycle | undefined
  entries: Entry[]
  targets: FacilityTargets
  onStartCycle: () => void
  onAddEntry: () => void
  onEditEntry: (entry: Entry) => void
  readOnly?: boolean
}

export function RoomScreen({
  room,
  cycle,
  entries,
  targets,
  onStartCycle,
  onAddEntry,
  onEditEntry,
  readOnly = false,
}: RoomScreenProps) {
  const flower = room.type === 'flower'
  const stage = cycle ? stageForCycle(cycle.start_date) : null
  const needsCycle = flower && !cycle

  return (
    <div className="app-main">
      <div className="room-hero">
        <div>
          <p className="kicker">{room.type}</p>
          <h1>{room.name}</h1>
          {flower && cycle && stage ? (
            <p className="quiet">
              Cycle {cycle.number} · Day {stage.day} · started {cycle.start_date}
            </p>
          ) : (
            <p className="quiet">{room.max_zones} zones</p>
          )}
        </div>
        {stage ? <span className={`chip ${stage.key}`}>{stage.label}</span> : null}
      </div>
      <div className="room-meta" style={{ marginBottom: 12 }}>
        {rangeHasValues(targets.substrate.vwcPct) ? (
          <span className="chip type">VWC {formatRange(targets.substrate.vwcPct, '%')}</span>
        ) : null}
        {rangeHasValues(targets.substrate.fieldCapacityPct) ? (
          <span className="chip type">FC {formatRange(targets.substrate.fieldCapacityPct, '%')}</span>
        ) : null}
        {rangeHasValues(targets.substrate.drybackDayPct) ? (
          <span className="chip type">Dryback {formatRange(targets.substrate.drybackDayPct, '%')}</span>
        ) : null}
        {rangeHasValues(targets.irrigation.shotSizeMl) ? (
          <span className="chip type">Shot {formatRange(targets.irrigation.shotSizeMl, ' mL')}</span>
        ) : null}
        {rangeHasValues(targets.irrigation.shotEc) ? (
          <span className="chip type">Shot EC {formatRange(targets.irrigation.shotEc)}</span>
        ) : null}
      </div>

      {needsCycle ? (
        <div className="form-card stack" style={{ marginBottom: 14 }}>
          <p className="lede" style={{ marginBottom: 0 }}>
            {readOnly
              ? 'Flower rooms collect against the active cycle. No cycle has been started yet.'
              : 'Flower rooms collect against the active cycle. Start a cycle to add entries.'}
          </p>
          {readOnly ? null : (
            <button type="button" className="btn btn-primary" onClick={onStartCycle}>
              Start cycle
            </button>
          )}
        </div>
      ) : readOnly ? null : (
        <button type="button" className="btn btn-primary" style={{ width: '100%', marginBottom: 14 }} onClick={onAddEntry}>
          Add entry
        </button>
      )}

      {needsCycle ? null : (
        <>
          <Suspense fallback={<div className="log-chart skeleton-card short" aria-hidden="true" />}>
            <RoomLogChart entries={entries} />
          </Suspense>
          <RoomLogTable
            entries={entries}
            cycle={cycle}
            targets={targets}
            maxZones={room.max_zones}
            readOnly={readOnly}
            onEditEntry={onEditEntry}
          />
        </>
      )}
    </div>
  )
}
