import { useState } from 'react'
import type { RoomType } from '../types'
import { Sheet } from '../components/Sheet'

type AddRoomSheetProps = {
  onClose: () => void
  onCreate: (input: { name: string; type: RoomType; maxZones: number }) => Promise<void>
}

export function AddRoomSheet({ onClose, onCreate }: AddRoomSheetProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<RoomType>('flower')
  const [maxZones, setMaxZones] = useState(8)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!name.trim()) {
      setError('Name the room.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onCreate({ name, type, maxZones })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add room')
      setBusy(false)
    }
  }

  return (
    <Sheet title="Add room" onClose={onClose}>
      <div className="stack">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name" />
        </label>
        <div className="field">
          <span>Type</span>
          <div className="segmented">
            {(['flower', 'mom', 'veg'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={type === value ? 'on' : ''}
                onClick={() => setType(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Max zones</span>
          <div className="stepper">
            <button type="button" onClick={() => setMaxZones((n) => Math.max(1, n - 1))}>
              −
            </button>
            <b>{maxZones}</b>
            <button type="button" onClick={() => setMaxZones((n) => Math.min(48, n + 1))}>
              +
            </button>
          </div>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Add room'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
