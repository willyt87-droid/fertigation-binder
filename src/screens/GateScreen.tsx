import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LegalLinks } from '../components/LegalLinks'
import { PinPad } from '../components/PinPad'
import { Sheet } from '../components/Sheet'
import { checkFloorPin } from '../lib/api'
import { hashPin, isPinShape } from '../lib/pin'
import type { Site } from '../types'

type GateScreenProps = {
  client: SupabaseClient
  sites: Site[]
  owner: boolean
  onUnlock: (site: Site) => void
  onAddFacility?: () => void
  onSettings?: (site: Site) => void
  onOwnerAuth?: () => void
  onSignOut?: () => void
  onChangeConnection: () => void
}

export function GateScreen({
  client,
  sites,
  owner,
  onUnlock,
  onAddFacility,
  onSettings,
  onOwnerAuth,
  onSignOut,
  onChangeConnection,
}: GateScreenProps) {
  const [error, setError] = useState<string | null>(null)
  const [joinOpen, setJoinOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [unlocking, setUnlocking] = useState<Site | null>(null)
  const [unlockPin, setUnlockPin] = useState('')

  async function tryUnlock(site: Site, value: string) {
    if (!isPinShape(value)) return
    try {
      const ok = await checkFloorPin(client, site.id, await hashPin(value))
      if (!ok) {
        setError('Wrong PIN')
        setUnlockPin('')
        return
      }
      onUnlock(site)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlock')
      setUnlockPin('')
    }
  }

  async function copyJoin() {
    const text = 'Email to join the binder and start collections.'
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* no mailto */
    }
    setCopied(true)
  }

  return (
    <div className="app-main">
      <p className="kicker">Site gate</p>
      <h1 style={{ marginBottom: 8, fontSize: 26 }}>Choose a grow</h1>
      <p className="lede">
        Floor techs unlock with the facility PIN. Owners sign in to add facilities, rooms, and
        targets. Session stays until you tap SITES.
      </p>

      <div className="stack" style={{ marginBottom: 16 }}>
        {sites.length === 0 ? (
          <div className="empty-slot">
            {owner
              ? 'No facilities yet. Add one to start collections.'
              : 'No facilities yet. Owner sign-in is required to set up this binder.'}
          </div>
        ) : null}
        {sites.map((site) => (
          <div key={site.id} className="site-card" style={{ display: 'grid', gap: 10 }}>
            <button type="button" className="site-card" style={{ padding: 0, border: 0, boxShadow: 'none' }} onClick={() => {
              setError(null)
              setUnlockPin('')
              setUnlocking(site)
            }}>
              <h3>{site.name}</h3>
              <p>
                {site.location || 'No location'}
                {site.status === 'active'
                  ? ' · tap to unlock floor'
                  : site.status === 'paused'
                    ? ' · paused — floor PIN locked'
                    : ' · pending approval — floor PIN locked'}
              </p>
              {site.status !== 'active' ? (
                <span className={`chip status-${site.status}`} style={{ marginTop: 8 }}>
                  {site.status}
                </span>
              ) : null}
            </button>
            {owner && onSettings ? (
              <button type="button" className="btn btn-ghost" onClick={() => onSettings(site)}>
                Settings
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {owner && onAddFacility ? (
        <button type="button" className="add-room" onClick={onAddFacility}>
          + Add facility
        </button>
      ) : null}

      <p style={{ marginTop: 18, textAlign: 'center' }}>
        <button type="button" className="linkish" onClick={() => setJoinOpen(true)}>
          Join the Binder
        </button>
        <span className="quiet"> · </span>
        {owner ? (
          <button type="button" className="linkish" onClick={onSignOut}>
            Owner sign out
          </button>
        ) : (
          <button type="button" className="linkish" onClick={onOwnerAuth}>
            Owner sign-in
          </button>
        )}
        <span className="quiet"> · </span>
        <button type="button" className="linkish" onClick={onChangeConnection}>
          Change connection
        </button>
      </p>
      <LegalLinks />

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
          title={`Unlock · ${unlocking.name}`}
          onClose={() => {
            setUnlocking(null)
            setUnlockPin('')
            setError(null)
          }}
        >
          {unlocking.status !== 'active' ? (
            <p className="lede">
              Floor unlock works only after a platform admin sets this facility to active. Owners can
              still finish setup in Settings.
            </p>
          ) : (
            <>
              <p className="lede">Enter the floor PIN. Logging only — no facility settings on this path.</p>
              <PinPad
                value={unlockPin}
                onChange={(next) => {
                  setUnlockPin(next)
                  void tryUnlock(unlocking, next)
                }}
              />
            </>
          )}
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
