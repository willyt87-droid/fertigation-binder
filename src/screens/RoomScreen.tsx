import type { Cycle, Entry, Room } from '../types'
import { feedMlTone, stageForCycle, toneForBand, FEED_PH, RO_PH } from '../lib/bands'
import { formatDate, formatEc, formatMl, formatPct, formatPh, formatRoPct } from '../lib/format'
import { chipInk, techColor } from '../lib/tech'
import { ToneValue } from '../components/ToneValue'

type RoomScreenProps = {
  room: Room
  cycle: Cycle | undefined
  entries: Entry[]
  onStartCycle: () => void
  onAddEntry: () => void
  onEditEntry: (entry: Entry) => void
}

export function RoomScreen({
  room,
  cycle,
  entries,
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
                  tone={feedMlTone(entry.feed_ml, stage?.key ?? null)}
                />
                <ToneValue
                  label="Feed pH"
                  value={formatPh(entry.feed_ph)}
                  tone={toneForBand(entry.feed_ph, FEED_PH.min, FEED_PH.max)}
                />
                <ToneValue label="Feed EC" value={formatEc(entry.feed_ec)} />
                <ToneValue label="RO %" value={formatPct(ro)} />
                <ToneValue
                  label="RO pH"
                  value={formatPh(entry.runoff_ph)}
                  tone={toneForBand(entry.runoff_ph, RO_PH.min, RO_PH.max)}
                />
                <ToneValue label="RO mL" value={formatMl(entry.runoff_ml)} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
