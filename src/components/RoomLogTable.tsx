import type { Cycle, Entry } from '../types'
import { feedMlTone, stageForCycle, toneForTarget } from '../lib/bands'
import { formatDate, formatEc, formatMl, formatPh } from '../lib/format'
import { chipInk, techColor } from '../lib/tech'
import type { FacilityTargets } from '../lib/targets'

type RoomLogTableProps = {
  entries: Entry[]
  cycle: Cycle | undefined
  targets: FacilityTargets
  readOnly?: boolean
  onEditEntry: (entry: Entry) => void
}

export function RoomLogTable({
  entries,
  cycle,
  targets,
  readOnly = false,
  onEditEntry,
}: RoomLogTableProps) {
  const showCultivar = entries.some((entry) => Boolean(entry.cultivar))
  const stageKey = cycle ? stageForCycle(cycle.start_date).key : null

  if (entries.length === 0) {
    return <div className="empty-slot">No collections in this cycle yet.</div>
  }

  return (
    <div className="log-table-wrap">
      <table className="log-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Zone</th>
            {showCultivar ? <th>Cultivar</th> : null}
            <th>Feed mL</th>
            <th>Feed pH</th>
            <th>Feed EC</th>
            <th>RO mL</th>
            <th>RO pH</th>
            <th>RO EC</th>
            <th>Tech</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const row = (
              <>
                <td>{formatDate(entry.date)}</td>
                <td>Z{entry.zone}</td>
                {showCultivar ? <td>{entry.cultivar || '—'}</td> : null}
                <td className={`num tone-${feedMlTone(entry.feed_ml, stageKey, targets)}`}>
                  {formatMl(entry.feed_ml)}
                </td>
                <td className={`num tone-${toneForTarget(entry.feed_ph, targets.binder.feedPh)}`}>
                  {formatPh(entry.feed_ph)}
                </td>
                <td className={`num tone-${toneForTarget(entry.feed_ec, targets.binder.feedEc)}`}>
                  {formatEc(entry.feed_ec)}
                </td>
                <td className={`num tone-${toneForTarget(entry.runoff_ml, targets.binder.runoffMl)}`}>
                  {formatMl(entry.runoff_ml)}
                </td>
                <td className={`num tone-${toneForTarget(entry.runoff_ph, targets.binder.roPh)}`}>
                  {formatPh(entry.runoff_ph)}
                </td>
                <td className={`num tone-${toneForTarget(entry.runoff_ec, targets.binder.runoffEc)}`}>
                  {formatEc(entry.runoff_ec)}
                </td>
                <td>
                  {entry.tech ? (
                    <span
                      className="tech-chip"
                      style={{
                        background: techColor(entry.tech),
                        color: chipInk(techColor(entry.tech)),
                      }}
                    >
                      {entry.tech}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="notes">{entry.notes || '—'}</td>
              </>
            )
            return (
              <tr
                key={entry.id}
                className={readOnly ? undefined : 'log-row-hit'}
                tabIndex={readOnly ? undefined : 0}
                onClick={readOnly ? undefined : () => onEditEntry(entry)}
                onKeyDown={
                  readOnly
                    ? undefined
                    : (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onEditEntry(entry)
                        }
                      }
                }
              >
                {row}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
