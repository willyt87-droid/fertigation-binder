import type { Cycle, Entry, Room } from '../types'
import { feedMlTone, stageForCycle, toneForTarget } from '../lib/bands'
import { formatDate, formatEc, formatMl, formatPct, formatPh, formatRoPct } from '../lib/format'
import { formatRange, rangeHasValues, type FacilityTargets } from '../lib/targets'
import { chipInk, techColor } from '../lib/tech'
import { ToneValue } from '../components/ToneValue'

type RoomScreenProps = {
  room: Room
  cycle: Cycle | undefined
  entries: Entry[]
  targets: FacilityTargets
  onStartCycle: () => void
  onAddEntry: () => void
  onEditEntry: (entry: Entry) => void
}

export function RoomScreen({
  room,
  cycle,
  entries,
  targets,
  onStartCycle,
  onAddEntry,
  onEditEntry,
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
            Flower rooms collect against the active cycle. Start a cycle to add entries.
          </p>
          <button type="button" className="btn btn-primary" onClick={onStartCycle}>
            Start cycle
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary" style={{ width: '100%', marginBottom: 14 }} onClick={onAddEntry}>
          Add entry
        </button>
      )}

      <div className="stack">
        {entries.length === 0 && !needsCycle ? (
          <div className="empty-slot">No entries in the active cycle yet.</div>
        ) : null}
        {entries.map((entry) => {
          const ro = formatRoPct(entry.feed_ml, entry.runoff_ml)
          const color = entry.tech ? techColor(entry.tech) : null
          return (
            <button
              key={entry.id}
              type="button"
              className="entry-card"
              onClick={() => onEditEntry(entry)}
            >
              <div className="entry-top">
                <div>
                  <div className="entry-id">
                    {formatDate(entry.date)} · Z{entry.zone}
                    {entry.cultivar ? ` · ${entry.cultivar}` : ''}
                  </div>
                  <div className="entry-sub">{entry.notes || 'No notes'}</div>
                </div>
                {entry.tech && color ? (
                  <span className="tech-chip" style={{ background: color, color: chipInk(color) }}>
                    {entry.tech}
                  </span>
                ) : null}
              </div>
              <div className="metrics">
                <ToneValue
                  label="Feed mL"
                  value={formatMl(entry.feed_ml)}
                  tone={feedMlTone(entry.feed_ml, stage?.key ?? null, targets)}
                />
                <ToneValue
                  label="Feed pH"
                  value={formatPh(entry.feed_ph)}
                  tone={toneForTarget(entry.feed_ph, targets.binder.feedPh)}
                />
                <ToneValue
                  label="Feed EC"
                  value={formatEc(entry.feed_ec)}
                  tone={toneForTarget(entry.feed_ec, targets.binder.feedEc)}
                />
                <ToneValue
                  label="RO %"
                  value={formatPct(ro)}
                  tone={toneForTarget(ro, targets.binder.roPct)}
                />
                <ToneValue
                  label="RO pH"
                  value={formatPh(entry.runoff_ph)}
                  tone={toneForTarget(entry.runoff_ph, targets.binder.roPh)}
                />
                <ToneValue
                  label="RO mL"
                  value={formatMl(entry.runoff_ml)}
                  tone={toneForTarget(entry.runoff_ml, targets.binder.runoffMl)}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
