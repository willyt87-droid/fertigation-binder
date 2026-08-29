import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import {
  createRoom,
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
import { AddRoomSheet } from './screens/AddRoomSheet'
import { ConfigScreen } from './screens/ConfigScreen'
import { EntryForm } from './screens/EntryForm'
import { GateScreen } from './screens/GateScreen'
import { OverviewScreen } from './screens/OverviewScreen'
import { RoomScreen } from './screens/RoomScreen'
import { StartCycleSheet } from './screens/StartCycleSheet'
import type { Cycle, Entry, EntryDraft, Room, Site } from './types'

export default function App() {
  const [config, setConfig] = useState(() => loadConfig())
  const client = useMemo(
    () => (config ? makeClient(config.url, config.anonKey) : null),
    [config],
  )
  const [sites, setSites] = useState<Site[]>([])
  const [sessionSite, setSessionSite] = useState<Site | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [bootError, setBootError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [addingRoom, setAddingRoom] = useState(false)
  const [startingCycle, setStartingCycle] = useState(false)
  const [entryEditor, setEntryEditor] = useState<Entry | 'new' | null>(null)

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

  const loadSiteData = useCallback(
    async (site: Site, db: SupabaseClient) => {
      const nextRooms = await listRooms(db, site.id)
      const nextCycles = await listCycles(
        db,
        nextRooms.map((room) => room.id),
      )
      setRooms(nextRooms)
      setCycles(nextCycles)
      return { nextRooms, nextCycles }
    },
    [],
  )

  const loadRoomEntries = useCallback(
    async (room: Room, roomCycles: Cycle[], db: SupabaseClient) => {
      const cycle = roomCycles.find((c) => c.room_id === room.id && c.status === 'in_progress')
      if (room.type === 'flower' && !cycle) {
        setEntries([])
        return
      }
      const since = room.type === 'flower' && cycle ? cycle.start_date : undefined
      setEntries(await listEntries(db, room.id, since))
    },
    [],
  )

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
    setAddingRoom(false)
    setStartingCycle(false)
    setEntryEditor(null)
  }

  async function unlock(site: Site) {
    if (!client) return
    saveSessionSiteId(site.id)
    setSessionSite(site)
    setSelectedRoomId(null)
    await loadSiteData(site, client)
  }

  async function handleAddRoom(input: { name: string; type: Room['type']; maxZones: number }) {
    if (!client || !sessionSite) return
    const sortOrder = rooms.reduce((max, room) => Math.max(max, room.sort_order), 0) + 1
    await createRoom(client, {
      siteId: sessionSite.id,
      name: input.name,
      type: input.type,
      maxZones: input.maxZones,
      sortOrder,
    })
    await loadSiteData(sessionSite, client)
    setAddingRoom(false)
  }

  async function handleStartCycle(startDate: string) {
    if (!client || !selectedRoom) return
    const cycle = await startCycle(client, { roomId: selectedRoom.id, startDate })
    const nextCycles = await listCycles(
      client,
      rooms.map((room) => room.id),
    )
    setCycles(nextCycles.length > 0 ? nextCycles : [cycle])
    setStartingCycle(false)
    await loadRoomEntries(selectedRoom, nextCycles.length > 0 ? nextCycles : [cycle], client)
  }

  async function handleSaveEntry(draft: EntryDraft, id?: string) {
    if (!client || !selectedRoom) return
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
            onRefreshSites={async () => {
              await refreshSites()
            }}
            onUnlock={unlock}
            onChangeConnection={changeConnection}
          />
        )}
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
          onAddRoom={() => setAddingRoom(true)}
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
      {addingRoom ? (
        <AddRoomSheet onClose={() => setAddingRoom(false)} onCreate={handleAddRoom} />
      ) : null}
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
