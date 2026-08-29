import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Sheet } from '../components/Sheet'
import {
  adminDeleteSite,
  adminSetSiteStatus,
  listAdminFacilities,
  listContactRequests,
  listRooms,
  type AdminFacility,
  type ContactRequest,
} from '../lib/api'
import { formatTimestamp } from '../lib/format'
import type { Room, SiteStatus } from '../types'

type AdminDashboardProps = {
  client: SupabaseClient
  adminEmail: string
  onSignOut: () => void
  onChangeConnection?: () => void
}

export function AdminDashboard({
  client,
  adminEmail,
  onSignOut,
  onChangeConnection,
}: AdminDashboardProps) {
  const [queue, setQueue] = useState<AdminFacility[]>([])
  const [asks, setAsks] = useState<ContactRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [open, setOpen] = useState<AdminFacility | null>(null)
  const [openRooms, setOpenRooms] = useState<Room[]>([])
  const [confirmKick, setConfirmKick] = useState<AdminFacility | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      setQueue(await listAdminFacilities(client))
      try {
        setAsks(await listContactRequests(client))
      } catch {
        setAsks([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load newcomers')
    }
  }, [client])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function setStatus(facility: AdminFacility, status: SiteStatus) {
    setBusyId(facility.id)
    setError(null)
    try {
      await adminSetSiteStatus(client, facility.id, status)
      await refresh()
      setOpen((current) => (current?.id === facility.id ? { ...current, status } : current))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status')
    } finally {
      setBusyId(null)
    }
  }

  async function openFacility(facility: AdminFacility) {
    setError(null)
    setOpen(facility)
    try {
      setOpenRooms(await listRooms(client, facility.id))
    } catch (err) {
      setOpenRooms([])
      setError(err instanceof Error ? err.message : 'Could not load rooms')
    }
  }

  async function kick(facility: AdminFacility) {
    setBusyId(facility.id)
    setError(null)
    try {
      await adminDeleteSite(client, facility.id)
      setConfirmKick(null)
      setOpen(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove facility')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="app-main plain admin-main">
      <p className="kicker">Platform admin</p>
      <div className="admin-hero">
        <h1>Newcomers</h1>
        <p className="lede">
          {adminEmail} · operator console. Approve facilities before floor PIN unlock. You are not a
          facility owner — no onboarding here.
        </p>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <h2 className="group-title">Asks</h2>
      {asks.length === 0 ? (
        <div className="empty-slot">No public questions or House quotes yet.</div>
      ) : (
        <div className="stack" style={{ marginBottom: 22 }}>
          {asks.map((ask) => (
            <article key={ask.id} className="admin-card">
              <div className="admin-card-top">
                <div>
                  <h3>{ask.name}</h3>
                  <p className="quiet">{ask.facility || 'No facility named'}</p>
                </div>
                <span className="chip type">
                  {ask.reason === 'house_quote' ? 'House quote' : 'Question'}
                </span>
              </div>
              <dl className="admin-meta">
                <div>
                  <dt>Email</dt>
                  <dd>{ask.email}</dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>{formatTimestamp(ask.created_at)}</dd>
                </div>
              </dl>
              <p style={{ margin: 0 }}>{ask.message}</p>
            </article>
          ))}
        </div>
      )}

      <h2 className="group-title">Facilities</h2>
      {queue.length === 0 ? (
        <div className="empty-slot">
          No facilities yet. Owners sign up with a magic link; their grows appear here for approval.
        </div>
      ) : (
        <div className="stack">
          {queue.map((facility) => (
            <article key={facility.id} className="admin-card">
              <div className="admin-card-top">
                <div>
                  <h3>{facility.name}</h3>
                  <p className="quiet">{facility.location || 'No location'}</p>
                </div>
                <span className={`chip status-${facility.status}`}>{facility.status}</span>
              </div>
              <dl className="admin-meta">
                <div>
                  <dt>Owner</dt>
                  <dd>{facility.owner_email || '—'}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatTimestamp(facility.created_at)}</dd>
                </div>
                <div>
                  <dt>Rooms</dt>
                  <dd>{facility.room_count}</dd>
                </div>
              </dl>
              <div className="admin-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busyId === facility.id || facility.status === 'active'}
                  onClick={() => void setStatus(facility, 'active')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyId === facility.id || facility.status === 'paused'}
                  onClick={() => void setStatus(facility, 'paused')}
                >
                  Pause
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyId === facility.id}
                  onClick={() => void openFacility(facility)}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busyId === facility.id}
                  onClick={() => setConfirmKick(facility)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <p style={{ marginTop: 18, textAlign: 'center' }}>
        <button type="button" className="linkish" onClick={() => void refresh()}>
          Refresh queue
        </button>
        <span className="quiet"> · </span>
        <button type="button" className="linkish" onClick={onSignOut}>
          Sign out
        </button>
        {onChangeConnection ? (
          <>
            <span className="quiet"> · </span>
            <button type="button" className="linkish" onClick={onChangeConnection}>
              Change connection
            </button>
          </>
        ) : null}
      </p>

      {open ? (
        <Sheet
          title={`Facility · ${open.name}`}
          onClose={() => {
            setOpen(null)
            setOpenRooms([])
          }}
        >
          <p className="lede">Read-only. Status changes happen on the queue — no owner impersonation.</p>
          <div className="stack">
            <div className="card">
              <div className="quiet">Owner</div>
              <b>{open.owner_email || '—'}</b>
              <div className="quiet" style={{ marginTop: 8 }}>
                {open.location || 'No location'} · {formatTimestamp(open.created_at)}
              </div>
              <div style={{ marginTop: 10 }}>
                <span className={`chip status-${open.status}`}>{open.status}</span>
              </div>
            </div>
            <div className="card">
              <p className="kicker">AROYA</p>
              <p className={open.aroya_key_saved ? 'ok-note' : 'quiet'} style={{ margin: 0 }}>
                {open.aroya_key_saved ? 'Key saved (value not shown)' : 'No key saved'}
              </p>
            </div>
            <div className="card">
              <p className="kicker">Last activity</p>
              <p style={{ margin: 0 }}>{formatTimestamp(open.last_activity)}</p>
            </div>
            <p className="kicker">Rooms</p>
            {openRooms.length === 0 ? (
              <div className="empty-slot">No rooms yet.</div>
            ) : (
              openRooms.map((room) => (
                <div key={room.id} className="card">
                  <b>{room.name}</b>
                  <div className="quiet">
                    {room.type} · {room.max_zones} zones
                  </div>
                </div>
              ))
            )}
          </div>
        </Sheet>
      ) : null}

      {confirmKick ? (
        <Sheet title="Remove facility" onClose={() => setConfirmKick(null)}>
          <p className="lede">
            Kick {confirmKick.name}? Rooms, cycles, and entries for this grow are deleted. The owner
            is not signed in as you.
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmKick(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busyId === confirmKick.id}
              onClick={() => void kick(confirmKick)}
            >
              Remove
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}
