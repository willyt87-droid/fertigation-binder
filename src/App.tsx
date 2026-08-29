import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
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
  clearConfig,
  clearSession,
  loadConfig,
  loadSessionSiteId,
  saveSessionSiteId,
} from './lib/storage'
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

export default function App() {
  const [config, setConfig] = useState(() => loadConfig())
  const client = useMemo(
    () => (config ? makeClient(config.url, config.anonKey) : null),
    [config],
  )
  const mockAuth = Boolean(config?.url.includes('127.0.0.1') || config?.url.includes('localhost'))
  const [owner, setOwner] = useState<User | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [sessionSite, setSessionSite] = useState<Site | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [bootError, setBootError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [screen, setScreen] = useState<Screen>('gate')
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

  useEffect(() => {
    if (!client) return
    let cancelled = false
    client.auth.getSession().then(({ data }) => {
      if (!cancelled) setOwner(data.session?.user ?? null)
    })
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setOwner(session?.user ?? null)
    })
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [client])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!client) {
        setReady(true)
        return
      }
      try {
        const nextSites = await refreshSites(client)
        if (cancelled) return
        const sessionId = loadSessionSiteId()
        const restored = nextSites.find((site) => site.id === sessionId)
        if (restored) {
          setSessionSite(restored)
          await loadSiteData(restored, client)
        }
      } catch (err) {
        if (!cancelled) setBootError(err instanceof Error ? err.message : 'Could not load sites')
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [client, loadSiteData, refreshSites])

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
    setScreen('gate')
  }

  async function unlock(site: Site) {
    if (!client) return
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

  function changeConnection() {
    clearConfig()
    goSites()
    setConfig(null)
    setSites([])
    setOwner(null)
    setBootError(null)
  }

  if (!ready) {
    return (
      <div className="app-shell">
        <Header showSites={false} />
        <div className="app-main">
          <p className="lede">Loading binder…</p>
        </div>
      </div>
    )
  }

  if (!config || !client) {
    return (
      <div className="app-shell">
        <Header showSites={false} />
        <ConfigScreen
          onReady={() => {
            setConfig(loadConfig())
            setReady(false)
          }}
        />
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
          onSignedIn={() => {
            setScreen(sites.length === 0 ? 'wizard' : 'gate')
          }}
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
              <button type="button" className="linkish" onClick={changeConnection}>
                Change connection
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
            onOwnerAuth={() => setScreen('owner-auth')}
            onSignOut={() => {
              void client.auth.signOut()
              setOwner(null)
            }}
            onChangeConnection={changeConnection}
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
