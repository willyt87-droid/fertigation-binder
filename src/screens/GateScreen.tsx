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
    if (site.status !== 'active') return
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
        Floor techs: tap an approved grow, then enter the PIN. Owner sign-in is a second path — not
        on this pad. Session stays until you tap SITES.
      </p>

      <div className="stack" style={{ marginBottom: 16 }}>
        {sites.length === 0 ? (
          <div className="empty-slot">
            {owner
              ? 'No facilities yet. Add one to start collections.'
              : 'No approved grows on this tablet yet.'}
          </div>
        ) : null}
        {sites.map((site) => {
          const unlockable = site.status === 'active'
          return (
            <div key={site.id} className="site-card" style={{ display: 'grid', gap: 10 }}>
              {unlockable ? (
                <button
                  type="button"
                  className="site-card site-card-hit"
                  onClick={() => {
                    setError(null)
                    setUnlockPin('')
                    setUnlocking(site)
                  }}
                >
                  <h3>{site.name}</h3>
                  <p>{site.location || 'No location'} · tap to unlock floor</p>
                </button>
              ) : (
                <div className="site-card-hit">
                  <h3>{site.name}</h3>
                  <p>{site.location || 'No location'}</p>
                  <span className={`chip status-${site.status}`} style={{ marginTop: 8 }}>
                    {site.status === 'paused' ? 'Paused' : 'Pending'}
                  </span>
                  <p className="quiet" style={{ marginTop: 8 }}>
                    {site.status === 'paused'
                      ? 'Paused — floor PIN locked. Not unlockable.'
                      : 'Pending — waiting for operator approval. Floor is not unlocked.'}
                  </p>
                </div>
              )}
              {owner && onSettings ? (
                <button type="button" className="btn btn-ghost" onClick={() => onSettings(site)}>
                  Settings
                </button>
              ) : null}
            </div>
          )
        })}
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
          <button type="button" className="btn btn-ghost thumb-cancel" onClick={closeUnlock}>
            Cancel
          </button>
        </Sheet>
      ) : null}
    </div>
  )
}
