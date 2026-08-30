import { useState } from 'react'
import type { Cycle, EntryDraft, Room } from '../types'
import { todayISO } from '../lib/format'
import { loadLastTech, saveLastTech } from '../lib/storage'
import { collectibleRooms, cycleStartForRoom, pickQuickRoom, validateQuickDraft } from '../lib/quickEntry'

type QuickEntryFormProps = {
  rooms: Room[]
  cycles: Cycle[]
  defaultRoomId?: string | null
  lockedRoom?: Room
  onSave: (room: Room, draft: EntryDraft) => Promise<void>
  onRoomChange?: (roomId: string) => void
}

function blank(zone = 1): EntryDraft {
  return {
    date: todayISO(),
    zone,
    cultivar: '',
    feed_ml: '',
    feed_ph: '',
    feed_ec: '',
    runoff_ml: '',
    runoff_ph: '',
    runoff_ec: '',
    tech: loadLastTech() ?? '',
    notes: '',
  }
}

export function QuickEntryForm({
  rooms,
  cycles,
  defaultRoomId,
  lockedRoom,
  onSave,
  onRoomChange,
}: QuickEntryFormProps) {
  const ready = lockedRoom ? [lockedRoom] : collectibleRooms(rooms, cycles)
  const room = lockedRoom ?? pickQuickRoom(rooms, cycles, defaultRoomId)
  const [draft, setDraft] = useState<EntryDraft>(() => blank())
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function patch<K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    if (!room) {
      setError('Pick a room with an active cycle.')
      return
    }
    const message = validateQuickDraft(draft, room, cycleStartForRoom(room, cycles))
    if (message) {
      setError(message)
      setOk(null)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSave(room, draft)
      saveLastTech(draft.tech)
      setOk(`Saved · ${room.name}`)
      setDraft((current) => ({
        ...blank(current.zone),
        date: current.date,
        zone: current.zone,
        tech: current.tech,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save entry')
      setOk(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="quick-entry-fields">
      <div className="quick-entry-grid">
        {lockedRoom ? null : (
          <label className="field">
            <span>Room</span>
            <select
              value={room?.id ?? ''}
              onChange={(event) => {
                const nextId = event.target.value
                onRoomChange?.(nextId)
                setOk(null)
                const next = ready.find((item) => item.id === nextId)
                if (next) patch('zone', Math.min(draft.zone, next.max_zones))
              }}
            >
              {ready.length === 0 ? <option value="">No rooms</option> : null}
              {ready.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>Date</span>
          <input type="date" value={draft.date} onChange={(event) => patch('date', event.target.value)} />
        </label>
        <div className="field">
          <span>Zone</span>
          <div className="stepper">
            <button
              type="button"
              onClick={() => patch('zone', Math.max(1, draft.zone - 1))}
              aria-label="Decrease zone"
            >
              −
            </button>
            <b>{draft.zone}</b>
            <button
              type="button"
              onClick={() => patch('zone', Math.min(room?.max_zones ?? draft.zone, draft.zone + 1))}
              aria-label="Increase zone"
            >
              +
            </button>
          </div>
        </div>
        <label className="field">
          <span>Initials</span>
          <input
            value={draft.tech}
            onChange={(event) => patch('tech', event.target.value.slice(0, 4))}
            placeholder="WT"
            name="tech-initials"
            autoCapitalize="characters"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Feed mL</span>
          <input inputMode="numeric" value={draft.feed_ml} onChange={(event) => patch('feed_ml', event.target.value)} />
        </label>
        <label className="field">
          <span>RO mL</span>
          <input
            inputMode="numeric"
            value={draft.runoff_ml}
            onChange={(event) => patch('runoff_ml', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Feed pH</span>
          <input inputMode="decimal" value={draft.feed_ph} onChange={(event) => patch('feed_ph', event.target.value)} />
        </label>
        <label className="field">
          <span>RO pH</span>
          <input
            inputMode="decimal"
            value={draft.runoff_ph}
            onChange={(event) => patch('runoff_ph', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Feed EC</span>
          <input inputMode="decimal" value={draft.feed_ec} onChange={(event) => patch('feed_ec', event.target.value)} />
        </label>
        <label className="field">
          <span>RO EC</span>
          <input
            inputMode="decimal"
            value={draft.runoff_ec}
            onChange={(event) => patch('runoff_ec', event.target.value)}
          />
        </label>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {ok ? <div className="ok-note">{ok}</div> : null}
      <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy || !room}>
        {busy ? 'Saving…' : 'Save collection'}
      </button>
    </div>
  )
}
