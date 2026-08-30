import { useState } from 'react'
import type { Cycle, EntryDraft, Room } from '../types'
import { todayISO } from '../lib/format'
import { loadLastTech, saveLastTech } from '../lib/storage'
import { collectibleRooms, cycleStartForRoom, pickQuickRoom, validateQuickDraft } from '../lib/quickEntry'
import { Sheet } from '../components/Sheet'

type QuickEntrySheetProps = {
  rooms: Room[]
  cycles: Cycle[]
  defaultRoomId?: string | null
  lockedRoom?: Room
  onClose: () => void
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

export function QuickEntrySheet({
  rooms,
  cycles,
  defaultRoomId,
  lockedRoom,
  onClose,
  onSave,
  onRoomChange,
}: QuickEntrySheetProps) {
  const ready = lockedRoom ? [lockedRoom] : collectibleRooms(rooms, cycles)
  const initial = lockedRoom ?? pickQuickRoom(rooms, cycles, defaultRoomId)
  const [roomId, setRoomId] = useState(initial?.id ?? '')
  const room = lockedRoom ?? ready.find((item) => item.id === roomId) ?? initial
  const singleZone = (room?.max_zones ?? 1) <= 1
  const [draft, setDraft] = useState<EntryDraft>(() => blank(1))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function patch<K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    if (!room) {
      setError('Pick a room with an active cycle.')
      return
    }
    const nextDraft = singleZone ? { ...draft, zone: 1 } : draft
    const message = validateQuickDraft(nextDraft, room, cycleStartForRoom(room, cycles))
    if (message) {
      setError(message)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSave(room, nextDraft)
      saveLastTech(nextDraft.tech)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save entry')
    } finally {
      setBusy(false)
    }
  }

  const title = room ? `Log · ${room.name}` : 'Quick log'

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="quick-entry-fields">
        <div className="quick-entry-grid">
          {lockedRoom ? null : (
            <label className="field">
              <span>Room</span>
              <select
                value={room?.id ?? ''}
                onChange={(event) => {
                  const nextId = event.target.value
                  setRoomId(nextId)
                  onRoomChange?.(nextId)
                  const next = ready.find((item) => item.id === nextId)
                  if (next) patch('zone', next.max_zones <= 1 ? 1 : Math.min(draft.zone, next.max_zones))
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
          {singleZone ? null : (
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
          )}
          <label className="field">
            <span>Tech initials</span>
            <input
              value={draft.tech}
              onChange={(event) => patch('tech', event.target.value.slice(0, 4))}
              name="tech-initials"
              autoCapitalize="characters"
              autoComplete="off"
              aria-required="true"
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
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy || !room}>
          {busy ? 'Saving…' : 'Save collection'}
        </button>
        <button type="button" className="btn btn-ghost thumb-cancel" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </Sheet>
  )
}
