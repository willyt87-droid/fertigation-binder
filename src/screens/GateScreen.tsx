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
  onOwnerSignup?: () => void
  onOwnerAuth?: () => void
  onSignOut?: () => void
}

export function GateScreen({
  client,
  sites,
  owner,
  onUnlock,
  onAddFacility,
  onSettings,
  onOwnerSignup,
  onOwnerAuth,
  onSignOut,
}: GateScreenProps) {
  const [error, setError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState<Site | null>(null)
  const [unlockPin, setUnlockPin] = useState('')

  function closeUnlock() {
    setUnlocking(null)
    setUnlockPin('')
    setError(null)
  }

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

  return (
    <div className="app-main">
      <p className="kicker">Site gate</p>
      <h1 style={{ marginBottom: 8, fontSize: 26 }}>Choose a grow</h1>
      <p className="lede">
        New facility owners start here. Floor techs unlock a card below with the facility PIN.
        Session stays until you tap SITES.
      </p>

      {!owner && onOwnerSignup ? (
        <div className="stack" style={{ marginBottom: 18 }}>
          <button type="button" className="btn btn-primary" onClick={onOwnerSignup}>
            Start owner signup
          </button>
          <p className="quiet" style={{ margin: 0 }}>
            Owner signup is the path for a new facility. Floor unlock stays on the cards.
          </p>
        </div>
      ) : null}

      <div className="stack" style={{ marginBottom: 16 }}>
        {sites.length === 0 ? (
          <div className="empty-slot">
            {owner
              ? 'No facilities yet. Add one to start collections.'
              : 'No floor cards yet. Start owner signup to add a facility.'}
          </div>
        ) : null}
        {sites.map((site) => (
          <div key={site.id} className="site-card" style={{ display: 'grid', gap: 10 }}>
            <button
              type="button"
              className="site-card"
              style={{ padding: 0, border: 0, boxShadow: 'none' }}
              onClick={() => {
                setError(null)
                setUnlockPin('')
                setUnlocking(site)
              }}
            >
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
        {owner ? (
          <button type="button" className="linkish" onClick={onSignOut}>
            Owner sign out
          </button>
        ) : (
          <button type="button" className="linkish" onClick={onOwnerAuth}>
            Owner sign-in
          </button>
        )}
      </p>
      <LegalLinks />

      {unlocking ? (
        <Sheet title={`Unlock · ${unlocking.name}`} onClose={closeUnlock}>
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
          <button type="button" className="btn btn-ghost" style={{ marginTop: 14 }} onClick={closeUnlock}>
            Cancel
          </button>
        </Sheet>
      ) : null}
    </div>
  )
}
