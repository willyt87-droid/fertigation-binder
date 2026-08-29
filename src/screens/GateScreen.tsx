import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PinPad } from '../components/PinPad'
import { Sheet } from '../components/Sheet'
import { createSite } from '../lib/api'
import { hashPin, isPinShape } from '../lib/pin'
import { loadPinHash, savePinHash } from '../lib/storage'
import type { Site } from '../types'

type GateScreenProps = {
  client: SupabaseClient
  sites: Site[]
  onRefreshSites: () => Promise<void>
  onUnlock: (site: Site) => void
  onChangeConnection: () => void
}

export function GateScreen({
  client,
  sites,
  onRefreshSites,
  onUnlock,
  onChangeConnection,
}: GateScreenProps) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [unlocking, setUnlocking] = useState<Site | null>(null)
  const [unlockPin, setUnlockPin] = useState('')
  const [settingPin, setSettingPin] = useState(false)

  const pinPhase = pin.length < 4 ? 'pin' : 'confirm'

  async function submitCreate() {
    setError(null)
    if (!name.trim()) {
      setError('Name the site.')
      return
    }
    if (!isPinShape(pin) || pin !== confirm) {
      setError('Set a 4-digit PIN and confirm it.')
      return
    }
    setBusy(true)
    try {
      const site = await createSite(client, { name, location })
      savePinHash(site.id, await hashPin(pin))
      await onRefreshSites()
      onUnlock(site)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create site')
    } finally {
      setBusy(false)
    }
  }

  async function tryUnlock(site: Site, value: string) {
    if (!isPinShape(value)) return
    const stored = loadPinHash(site.id)
    if (!stored) {
      savePinHash(site.id, await hashPin(value))
      onUnlock(site)
      return
    }
    if (stored === (await hashPin(value))) {
      onUnlock(site)
      return
    }
    setError('Wrong PIN')
    setUnlockPin('')
  }

  function openSite(site: Site) {
    setError(null)
    setUnlockPin('')
    setUnlocking(site)
    setSettingPin(!loadPinHash(site.id))
  }

  async function copyJoin() {
    const text = 'Email to join the binder and start collections.'
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* no mailto — copy is best-effort */
    }
    setCopied(true)
  }

  return (
    <div className="app-main">
      <p className="kicker">Site gate</p>
      <h1 style={{ marginBottom: 8, fontSize: 26 }}>Choose a grow</h1>
      <p className="lede">
        Empty on first run. Create a site card with a name, location, and PIN. Session stays
        unlocked until you tap SITES.
      </p>

      <div className="stack" style={{ marginBottom: 16 }}>
        {sites.map((site) => (
          <button key={site.id} type="button" className="site-card" onClick={() => openSite(site)}>
            <h3>{site.name}</h3>
            <p>{site.location || 'No location'} · tap to unlock</p>
          </button>
        ))}
      </div>

      <div className="form-card stack">
        <p className="kicker">New site</p>
        <label className="field">
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Grow name"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <label className="field">
          <span>Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, room block, farm…"
          />
        </label>
        <div className="field">
          <span>{pinPhase === 'pin' ? 'Set a 4-digit PIN' : 'Confirm PIN'}</span>
          <PinPad
            value={pinPhase === 'pin' ? pin : confirm}
            onChange={pinPhase === 'pin' ? setPin : setConfirm}
          />
        </div>
        {error && !unlocking ? <div className="error">{error}</div> : null}
        <button type="button" className="btn btn-primary" onClick={submitCreate} disabled={busy}>
          {busy ? 'Creating…' : 'Create site'}
        </button>
      </div>

      <p style={{ marginTop: 18, textAlign: 'center' }}>
        <button type="button" className="linkish" onClick={() => setJoinOpen(true)}>
          Join the Binder
        </button>
        <span className="quiet"> · </span>
        <button type="button" className="linkish" onClick={onChangeConnection}>
          Change connection
        </button>
      </p>

      {joinOpen ? (
        <Sheet title="Join the Binder" onClose={() => setJoinOpen(false)}>
          <p className="lede">Email to join the binder and start collections.</p>
          <button type="button" className="btn btn-primary" onClick={copyJoin}>
            Email the Fertigation Binder
          </button>
          {copied ? (
            <p className="ok-note" style={{ marginTop: 12 }}>
              Copy saved. There is no mailto link in this app.
            </p>
          ) : null}
        </Sheet>
      ) : null}

      {unlocking ? (
        <Sheet
          title={settingPin ? `Set PIN · ${unlocking.name}` : `Unlock · ${unlocking.name}`}
          onClose={() => {
            setUnlocking(null)
            setUnlockPin('')
            setError(null)
          }}
        >
          <p className="lede">
            {settingPin
              ? 'This device has no PIN for this site yet. Set a 4-digit PIN to keep the session.'
              : 'Enter the device PIN. Session stays until you tap SITES.'}
          </p>
          <PinPad
            value={unlockPin}
            onChange={(next) => {
              setUnlockPin(next)
              void tryUnlock(unlocking, next)
            }}
          />
          {error ? (
            <div className="error" style={{ marginTop: 12 }}>
              {error}
            </div>
          ) : null}
        </Sheet>
      ) : null}
    </div>
  )
}
