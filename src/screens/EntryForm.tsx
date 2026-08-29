import { useState } from 'react'
import type { Entry, EntryDraft, Room } from '../types'
import { todayISO } from '../lib/format'
import { Sheet } from '../components/Sheet'

type EntryFormProps = {
  room: Room
  entry?: Entry
  onClose: () => void
  onSave: (draft: EntryDraft, id?: string) => Promise<void>
}

function fromEntry(entry: Entry): EntryDraft {
  return {
    date: entry.date,
    zone: entry.zone,
    cultivar: entry.cultivar ?? '',
    feed_ml: entry.feed_ml?.toString() ?? '',
    feed_ph: entry.feed_ph?.toString() ?? '',
    feed_ec: entry.feed_ec?.toString() ?? '',
    runoff_ml: entry.runoff_ml?.toString() ?? '',
    runoff_ph: entry.runoff_ph?.toString() ?? '',
    runoff_ec: entry.runoff_ec?.toString() ?? '',
    tech: entry.tech ?? '',
    notes: entry.notes ?? '',
  }
}

function blank(): EntryDraft {
  return {
    date: todayISO(),
    zone: 1,
    cultivar: '',
    feed_ml: '',
    feed_ph: '',
    feed_ec: '',
    runoff_ml: '',
    runoff_ph: '',
    runoff_ec: '',
    tech: '',
    notes: '',
  }
}

export function EntryForm({ room, entry, onClose, onSave }: EntryFormProps) {
  const [draft, setDraft] = useState<EntryDraft>(() => (entry ? fromEntry(entry) : blank()))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function patch<K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    if (!draft.date) {
      setError('Pick a date.')
      return
    }
    if (draft.zone < 1 || draft.zone > room.max_zones) {
      setError(`Zone must be 1–${room.max_zones}.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSave(draft, entry?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save entry')
      setBusy(false)
    }
  }

  return (
    <Sheet title={entry ? 'Edit entry' : 'Add entry'} onClose={onClose}>
      <div className="stack">
        <label className="field">
          <span>Date</span>
          <input type="date" value={draft.date} onChange={(e) => patch('date', e.target.value)} />
        </label>
        <div className="field">
          <span>Zone</span>
          <div className="stepper">
            <button type="button" onClick={() => patch('zone', Math.max(1, draft.zone - 1))}>
              −
            </button>
            <b>{draft.zone}</b>
            <button
              type="button"
              onClick={() => patch('zone', Math.min(room.max_zones, draft.zone + 1))}
            >
              +
            </button>
          </div>
        </div>
        <label className="field">
          <span>Cultivar</span>
          <input value={draft.cultivar} onChange={(e) => patch('cultivar', e.target.value)} />
        </label>
        <div className="two-col">
          <label className="field">
            <span>Feed mL</span>
            <input inputMode="numeric" value={draft.feed_ml} onChange={(e) => patch('feed_ml', e.target.value)} />
          </label>
          <label className="field">
            <span>RO mL</span>
            <input inputMode="numeric" value={draft.runoff_ml} onChange={(e) => patch('runoff_ml', e.target.value)} />
          </label>
          <label className="field">
            <span>Feed pH</span>
            <input inputMode="decimal" value={draft.feed_ph} onChange={(e) => patch('feed_ph', e.target.value)} />
          </label>
          <label className="field">
            <span>RO pH</span>
            <input inputMode="decimal" value={draft.runoff_ph} onChange={(e) => patch('runoff_ph', e.target.value)} />
          </label>
          <label className="field">
            <span>Feed EC</span>
            <input inputMode="decimal" value={draft.feed_ec} onChange={(e) => patch('feed_ec', e.target.value)} />
          </label>
          <label className="field">
            <span>RO EC</span>
            <input inputMode="decimal" value={draft.runoff_ec} onChange={(e) => patch('runoff_ec', e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Tech initials</span>
          <input
            value={draft.tech}
            onChange={(e) => patch('tech', e.target.value.slice(0, 4))}
            placeholder="WT"
            name="tech-initials"
            autoCapitalize="characters"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea value={draft.notes} onChange={(e) => patch('notes', e.target.value)} />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
