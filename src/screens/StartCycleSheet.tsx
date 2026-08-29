import { useState } from 'react'
import { todayISO } from '../lib/format'
import { Sheet } from '../components/Sheet'

type StartCycleSheetProps = {
  roomName: string
  onClose: () => void
  onStart: (startDate: string) => Promise<void>
}

export function StartCycleSheet({ roomName, onClose, onStart }: StartCycleSheetProps) {
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onStart(date)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start cycle')
      setBusy(false)
    }
  }

  return (
    <Sheet title="Start cycle" onClose={onClose}>
      <p className="lede">
        Start a flower cycle in {roomName}. Stage is Early (days 1–21), Mid Bulk (22–42), then Late
        (43+).
      </p>
      <div className="stack">
        <label className="field">
          <span>Start date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy}>
            {busy ? 'Starting…' : 'Confirm start'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
