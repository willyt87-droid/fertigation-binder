import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { goPath, isAdminPath, isPlatformAdmin } from './lib/admin'
import { binderLoadErrorCopy } from './lib/authErrors'
import {
  listCycles,
  listEntries,
  listRooms,
  listSites,
  makeClient,
  saveEntry,
  startCycle,
} from './lib/api'
import {
  clearSession,
  loadConfig,
  loadSessionSiteId,
  saveSessionSiteId,
} from './lib/storage'
import { AdminDashboard } from './screens/AdminDashboard'
import { ConfigScreen } from './screens/ConfigScreen'
import { EntryForm } from './screens/EntryForm'
import { FacilitySettings } from './screens/FacilitySettings'
import { GateScreen } from './screens/GateScreen'
import { OnboardingWizard } from './screens/OnboardingWizard'
import { OwnerAuthScreen } from './screens/OwnerAuthScreen'
import { OverviewScreen } from './screens/OverviewScreen'
import { RoomScreen } from './screens/RoomScreen'
import { StartCycleSheet } from './screens/StartCycleSheet'
import type { Cycle, Entry, EntryDraft, Room, Site } from './types'

type Screen = 'gate' | 'owner-auth' | 'wizard'
type AuthIntent = 'signup' | 'signin'

function currentHash() {
  return window.location.hash.replace(/^#/, '')
}

function clearAppHash() {
  if (!window.location.hash) return
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`)
}

export default function App() {
  const [config, setConfig] = useState(() => loadConfig())
  const client = useMemo(
    () => (config ? makeClient(config.url, config.anonKey) : null),
    [config],
  )
  const mockAuth = Boolean(config?.url.includes('127.0.0.1') || config?.url.includes('localhost'))
  const [owner, setOwner] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPath, setAdminPath] = useState(() => isAdminPath())
  const [sites, setSites] = useState<Site[]>([])
  const [sessionSite, setSessionSite] = useState<Site | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [bootError, setBootError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [reconnect, setReconnect] = useState(() => currentHash() === 'reconnect')
  const [authIntent, setAuthIntent] = useState<AuthIntent>(() =>
    currentHash() === 'signup' ? 'signup' : 'signin',
  )
  const [screen, setScreen] = useState<Screen>(() =>
    currentHash() === 'signup' ? 'owner-auth' : 'gate',
  )
  const [startingCycle, setStartingCycle] = useState(false)
  const [entryEditor, setEntryEditor] = useState<Entry | 'new' | null>(null)
  const [settingsSite, setSettingsSite] = useState<Site | null>(null)

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId)
  const selectedCycle = selectedRoom
    ? cycles.find((cycle) => cycle.room_id === selectedRoom.id && cycle.status === 'in_progress')
    : undefined

  const refreshSites = useCallback(async (active?: SupabaseClient) => {
    const db = active ?? client
    if (!db) return []
    const next = await listSites(db)
    setSites(next)
    return next
  }, [client])

  const loadSiteData = useCallback(async (site: Site, db: SupabaseClient) => {
    const nextRooms = await listRooms(db, site.id)
    const nextCycles = await listCycles(
      db,
      nextRooms.map((room) => room.id),
    )
    setRooms(nextRooms)
    setCycles(nextCycles)
    return { nextRooms, nextCycles }
  }, [])

  const loadRoomEntries = useCallback(async (room: Room, roomCycles: Cycle[], db: SupabaseClient) => {
    const cycle = roomCycles.find((c) => c.room_id === room.id && c.status === 'in_progress')
    if (room.type === 'flower' && !cycle) {
      setEntries([])
      return
    }
    const since = room.type === 'flower' && cycle ? cycle.start_date : undefined
    setEntries(await listEntries(db, room.id, since))
  }, [])

  const applyUser = useCallback(async (user: User | null, db: SupabaseClient) => {
    setOwner(user)
    const admin = user ? await isPlatformAdmin(db, user) : false
    setIsAdmin(admin)
    if (admin) {
      goPath('/admin')
      setAdminPath(true)
      setScreen('gate')
      setSessionSite(null)
    }
    return admin
  }, [])

  useEffect(() => {
    const onPop = () => setAdminPath(isAdminPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const onHash = () => {
      const hash = currentHash()
      if (hash === 'signup') {
        setAuthIntent('signup')
        setScreen('owner-auth')
        setReconnect(false)
        return
      }
      if (hash === 'reconnect') {
        setReconnect(true)
        setScreen('gate')
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!client) return
    let cancelled = false
    client.auth.getSession().then(({ data }) => {
      if (!cancelled) void applyUser(data.session?.user ?? null, client)
    })
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) void applyUser(session?.user ?? null, client)
    })
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [applyUser, client])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!client) {
        setReady(true)
        return
      }
      try {
        const { data } = await client.auth.getSession()
        const admin = await applyUser(data.session?.user ?? null, client)
        if (cancelled) return
        if (admin) {
          setReady(true)
          return
        }
        const nextSites = await refreshSites(client)
        if (cancelled) return
        const sessionId = loadSessionSiteId()
        const restored = nextSites.find((site) => site.id === sessionId)
        if (restored && restored.status === 'active') {
          setSessionSite(restored)
          await loadSiteData(restored, client)
        }
      } catch (err) {
        if (!cancelled) setBootError(binderLoadErrorCopy(err))
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [applyUser, client, loadSiteData, refreshSites])

  function goSites() {
    clearSession()
    setSessionSite(null)
    setSelectedRoomId(null)
    setEntries([])
    setRooms([])
    setCycles([])
    setStartingCycle(false)
    setEntryEditor(null)
    setSettingsSite(null)
    setReconnect(false)
    setScreen('gate')
    if (isAdmin) {
      goPath('/admin')
      setAdminPath(true)
    } else {
      goPath('/app')
      setAdminPath(false)
    }
    clearAppHash()
  }

  function openOwnerSignIn() {
    setAuthIntent('signin')
    setScreen('owner-auth')
    clearAppHash()
  }

  function openReconnect() {
    setReconnect(true)
    window.history.replaceState({}, '', `${window.location.pathname}#reconnect`)
  }

  async function unlock(site: Site) {
    if (!client) return
    if (site.status !== 'active') return
    saveSessionSiteId(site.id)
    setSessionSite(site)
    setSelectedRoomId(null)
    await loadSiteData(site, client)
  }

  async function handleStartCycle(startDate: string) {
    if (!client || !selectedRoom) return
    const cycle = await startCycle(client, { roomId: selectedRoom.id, startDate })
    const nextCycles = await listCycles(
      client,
      rooms.map((room) => room.id),
    )
    const resolved = nextCycles.length > 0 ? nextCycles : [cycle]
    setCycles(resolved)
    setStartingCycle(false)
    await loadRoomEntries(selectedRoom, resolved, client)
  }

  async function handleSaveEntry(draft: EntryDraft, id?: string) {
    if (!client || !selectedRoom || !sessionSite) return
    if (selectedRoom.type === 'flower' && selectedCycle && draft.date < selectedCycle.start_date) {
      throw new Error(`Date must be on or after cycle start (${selectedCycle.start_date}).`)
    }
    await saveEntry(client, { id, roomId: selectedRoom.id, draft })
    setEntryEditor(null)
    await loadRoomEntries(selectedRoom, cycles, client)
  }

  function finishReconnect() {
    setReconnect(false)
    setBootError(null)
    setReady(false)
    setConfig(loadConfig())
    goPath('/app')
    clearAppHash()
  }

  async function finishOwnerSignIn() {
    if (!client) return
    const { data } = await client.auth.getSession()
    const admin = await applyUser(data.session?.user ?? null, client)
    if (admin) return
    const next = await refreshSites()
    setScreen(next.length === 0 ? 'wizard' : 'gate')
    goPath('/app')
    setAdminPath(false)
    clearAppHash()
  }

  async function signOut() {
    if (!client) return
    await client.auth.signOut()
    setOwner(null)
    setIsAdmin(false)
    setScreen('gate')
    goPath(adminPath ? '/admin' : '/app')
  }

  if (!ready) {
    return (
      <div className="app-shell">
        <Header showSites={false} />
        <div className="app-main loading-pane" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p className="lede">Loading binder…</p>
          <div className="skeleton-stack" aria-hidden="true">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card short" />
          </div>
        </div>
      </div>
    )
  }

  if (reconnect || !config || !client) {
    return (
      <div className="app-shell">
        <Header showSites={false} />
        <ConfigScreen
          initial={config}
          onReady={finishReconnect}
          onCancel={config ? () => {
            setReconnect(false)
            goPath(adminPath ? '/admin' : '/app')
            clearAppHash()
          } : undefined}
        />
      </div>
    )
  }

  if (isAdmin) {
    return (
      <div className="app-shell admin-shell">
        <Header admin onSites={() => void signOut()} />
        <AdminDashboard
          client={client}
          adminEmail={owner?.email ?? ''}
          onSignOut={() => void signOut()}
          onChangeConnection={openReconnect}
        />
      </div>
    )
  }

  if (adminPath) {
    if (!owner) {
      return (
        <div className="app-shell admin-shell">
          <Header admin showSites={false} />
          <OwnerAuthScreen
            client={client}
            mockAuth={mockAuth}
            mockOrigin={config.url}
            mode="admin"
            onSignedIn={() => void finishOwnerSignIn()}
          />
        </div>
      )
    }
    return (
      <div className="app-shell admin-shell">
        <Header admin onSites={() => { goPath('/app'); setAdminPath(false) }} />
        <div className="app-main plain">
          <p className="kicker">Platform admin</p>
          <h1 style={{ marginBottom: 8, fontSize: 24 }}>Not an operator</h1>
          <p className="lede">
            {owner.email} is signed in as a facility owner, not a platform admin. Owner setup stays
            on the home screen.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              goPath('/app')
              setAdminPath(false)
              setScreen('gate')
            }}
          >
            Back to owner setup
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'owner-auth') {
    return (
      <div className="app-shell">
        <Header onSites={goSites} />
        <OwnerAuthScreen
          client={client}
          mockAuth={mockAuth}
          mockOrigin={config.url}
          mode={authIntent === 'signup' ? 'signup' : 'signin'}
          onSignedIn={() => void finishOwnerSignIn()}
        />
      </div>
    )
  }

  if (screen === 'wizard') {
    return (
      <div className="app-shell">
        <Header onSites={goSites} />
        <OnboardingWizard
          client={client}
          onCancel={() => setScreen('gate')}
          onDone={async (site) => {
            await refreshSites()
            setScreen('gate')
            setSettingsSite(null)
            void site
          }}
        />
      </div>
    )
  }

  if (!sessionSite) {
    return (
      <div className="app-shell">
        <Header onSites={goSites} />
        {bootError ? (
          <div className="app-main">
            <div className="error">{bootError}</div>
            <p style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setReady(false)
                  setBootError(null)
                  setConfig(loadConfig())
                }}
              >
                Try again
              </button>
            </p>
          </div>
        ) : (
          <GateScreen
            client={client}
            sites={sites}
            owner={Boolean(owner)}
            onUnlock={unlock}
            onAddFacility={() => setScreen('wizard')}
            onSettings={async (site) => {
              setSettingsSite(site)
              setRooms(await listRooms(client, site.id))
            }}
            onOwnerAuth={openOwnerSignIn}
            onSignOut={() => void signOut()}
          />
        )}
        {settingsSite && owner ? (
          <FacilitySettings
            client={client}
            site={settingsSite}
            rooms={rooms.filter((room) => room.site_id === settingsSite.id)}
            onClose={() => setSettingsSite(null)}
            onChange={(site, nextRooms) => {
              setSettingsSite(site)
              setSites((current) => current.map((s) => (s.id === site.id ? site : s)))
              setRooms(nextRooms)
            }}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Header siteName={sessionSite.name} onSites={goSites} />
      {selectedRoom ? (
        <RoomScreen
          room={selectedRoom}
          cycle={selectedCycle}
          entries={entries}
          targets={sessionSite.targets}
          onStartCycle={() => setStartingCycle(true)}
          onAddEntry={() => setEntryEditor('new')}
          onEditEntry={(entry) => setEntryEditor(entry)}
        />
      ) : (
        <OverviewScreen
          rooms={rooms}
          cycles={cycles}
          onOpenRoom={async (room) => {
            setSelectedRoomId(room.id)
            await loadRoomEntries(room, cycles, client)
          }}
        />
      )}
      <Footer
        active={!selectedRoom}
        onOverview={() => {
          setSelectedRoomId(null)
          setEntryEditor(null)
          setStartingCycle(false)
        }}
      />
      {startingCycle && selectedRoom ? (
        <StartCycleSheet
          roomName={selectedRoom.name}
          onClose={() => setStartingCycle(false)}
          onStart={handleStartCycle}
        />
      ) : null}
      {entryEditor && selectedRoom ? (
        <EntryForm
          room={selectedRoom}
          entry={entryEditor === 'new' ? undefined : entryEditor}
          onClose={() => setEntryEditor(null)}
          onSave={handleSaveEntry}
        />
      ) : null}
    </div>
  )
}
