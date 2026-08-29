import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Room, RoomType, Site } from '../types'
import { PinPad } from '../components/PinPad'
import { RangeRow } from '../components/RangeRow'
import { Sheet } from '../components/Sheet'
import {
  createRoom,
  deleteRoom,
  listRooms,
  updateRoom,
  updateSite,
} from '../lib/api'
import { loadAroyaKey, saveAroyaKey, aroyaStatus } from '../lib/aroyaSettings'
import { hashPin, isPinShape } from '../lib/pin'
import { formatRange, rangeHasValues, type FacilityTargets } from '../lib/targets'

type FacilitySettingsProps = {
  client: SupabaseClient
  site: Site
  rooms: Room[]
  onClose: () => void
  onChange: (site: Site, rooms: Room[]) => void
}

export function FacilitySettings({ client, site, rooms, onClose, onChange }: FacilitySettingsProps) {
  const [name, setName] = useState(site.name)
  const [location, setLocation] = useState(site.location)
  const [targets, setTargets] = useState<FacilityTargets>(() => structuredClone(site.targets))
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [climateOpen, setClimateOpen] = useState(false)
  const [aroyaKey, setAroyaKey] = useState(loadAroyaKey)
  const [aroyaFacilityId, setAroyaFacilityId] = useState(site.aroya_facility_id ?? '')
  const [roomDraft, setRoomDraft] = useState({ name: '', type: 'flower' as RoomType, maxZones: 8 })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const status = aroyaStatus(aroyaKey)

  async function refreshRooms() {
    return listRooms(client, site.id)
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      if (pin && (!isPinShape(pin) || pin !== confirm)) {
        throw new Error('New floor PIN must be 4 digits, entered twice.')
      }
      saveAroyaKey(aroyaKey)
      const patch: Parameters<typeof updateSite>[2] = {
        name,
        location,
        targets,
        aroya_facility_id: aroyaFacilityId.trim() || null,
      }
      if (isPinShape(pin) && pin === confirm) {
        patch.pin_hash = await hashPin(pin)
      }
      const next = await updateSite(client, site.id, patch)
      onChange(next, rooms)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function addRoom() {
    if (!roomDraft.name.trim()) return
    const sortOrder = rooms.reduce((max, room) => Math.max(max, room.sort_order), 0) + 1
    await createRoom(client, {
      siteId: site.id,
      name: roomDraft.name,
      type: roomDraft.type,
      maxZones: roomDraft.maxZones,
      sortOrder,
    })
    const next = await refreshRooms()
    onChange(site, next)
    setRoomDraft({ name: '', type: 'flower', maxZones: 8 })
  }

  async function move(room: Room, dir: -1 | 1) {
    const ordered = [...rooms].sort((a, b) => a.sort_order - b.sort_order)
    const index = ordered.findIndex((r) => r.id === room.id)
    const swap = ordered[index + dir]
    if (!swap) return
    await updateRoom(client, room.id, { sort_order: swap.sort_order })
    await updateRoom(client, swap.id, { sort_order: room.sort_order })
    onChange(site, await refreshRooms())
  }

  const pinPhase = pin.length < 4 ? 'pin' : 'confirm'

  return (
    <Sheet title="Facility settings" onClose={onClose}>
      <div className="stack">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Location</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>

        <p className="kicker">Rooms</p>
        {rooms.map((room) => (
          <div key={room.id} className="card" style={{ padding: 12 }}>
            <div className="entry-top">
              <div>
                <b>{room.name}</b>
                <div className="quiet">
                  {room.type} · {room.max_zones} zones
                </div>
              </div>
              <div className="btn-row" style={{ gridTemplateColumns: 'auto auto auto', width: 'auto' }}>
                <button type="button" className="btn btn-ghost" onClick={() => void move(room, -1)}>
                  ↑
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void move(room, 1)}>
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={async () => {
                    await deleteRoom(client, room.id)
                    onChange(site, await refreshRooms())
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <label className="field" style={{ marginTop: 8 }}>
              <span>AROYA room id</span>
              <input
                value={room.aroya_room_id ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  void updateRoom(client, room.id, { aroya_room_id: value || null }).then(async () => {
                    onChange(site, await refreshRooms())
                  })
                }}
                placeholder="optional"
              />
            </label>
          </div>
        ))}
        <div className="form-card stack">
          <input
            value={roomDraft.name}
            onChange={(e) => setRoomDraft({ ...roomDraft, name: e.target.value })}
            placeholder="New room name"
          />
          <div className="segmented">
            {(['flower', 'mom', 'veg'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={roomDraft.type === value ? 'on' : ''}
                onClick={() => setRoomDraft({ ...roomDraft, type: value })}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="stepper">
            <button
              type="button"
              onClick={() => setRoomDraft({ ...roomDraft, maxZones: Math.max(1, roomDraft.maxZones - 1) })}
            >
              −
            </button>
            <b>{roomDraft.maxZones}</b>
            <button
              type="button"
              onClick={() => setRoomDraft({ ...roomDraft, maxZones: Math.min(48, roomDraft.maxZones + 1) })}
            >
              +
            </button>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => void addRoom()}>
            Add room
          </button>
        </div>

        <p className="kicker">Floor PIN</p>
        <p className="quiet">Leave blank to keep the current PIN. New PIN is stored as a hash.</p>
        <PinPad
          value={pinPhase === 'pin' ? pin : confirm}
          onChange={pinPhase === 'pin' ? setPin : setConfirm}
        />

        <p className="kicker">Binder logging</p>
        <RangeRow
          label="Feed pH"
          value={targets.binder.feedPh}
          onChange={(feedPh) => setTargets({ ...targets, binder: { ...targets.binder, feedPh } })}
        />
        <RangeRow
          label="RO pH"
          value={targets.binder.roPh}
          onChange={(roPh) => setTargets({ ...targets, binder: { ...targets.binder, roPh } })}
        />
        <RangeRow
          label="Feed mL early"
          value={targets.binder.feedMl.early}
          onChange={(early) =>
            setTargets({
              ...targets,
              binder: { ...targets.binder, feedMl: { ...targets.binder.feedMl, early } },
            })
          }
        />
        <RangeRow
          label="Feed mL mid"
          value={targets.binder.feedMl.mid}
          onChange={(mid) =>
            setTargets({
              ...targets,
              binder: { ...targets.binder, feedMl: { ...targets.binder.feedMl, mid } },
            })
          }
        />
        <RangeRow
          label="Feed mL late"
          value={targets.binder.feedMl.late}
          onChange={(late) =>
            setTargets({
              ...targets,
              binder: { ...targets.binder, feedMl: { ...targets.binder.feedMl, late } },
            })
          }
        />
        <RangeRow
          label="Feed EC"
          value={targets.binder.feedEc}
          onChange={(feedEc) => setTargets({ ...targets, binder: { ...targets.binder, feedEc } })}
        />
        <RangeRow
          label="Runoff mL"
          value={targets.binder.runoffMl}
          onChange={(runoffMl) => setTargets({ ...targets, binder: { ...targets.binder, runoffMl } })}
        />
        <RangeRow
          label="Runoff pH"
          value={targets.binder.runoffPh}
          onChange={(runoffPh) =>
            setTargets({ ...targets, binder: { ...targets.binder, runoffPh } })
          }
        />
        <RangeRow
          label="Runoff EC"
          value={targets.binder.runoffEc}
          onChange={(runoffEc) =>
            setTargets({ ...targets, binder: { ...targets.binder, runoffEc } })
          }
        />
        <RangeRow
          label="RO %"
          value={targets.binder.roPct}
          onChange={(roPct) => setTargets({ ...targets, binder: { ...targets.binder, roPct } })}
        />

        <p className="kicker">Substrate / root zone</p>
        <RangeRow
          label="VWC %"
          value={targets.substrate.vwcPct}
          onChange={(vwcPct) =>
            setTargets({ ...targets, substrate: { ...targets.substrate, vwcPct } })
          }
        />
        <RangeRow
          label="Field capacity %"
          hint="Typical coco 45–65"
          value={targets.substrate.fieldCapacityPct}
          onChange={(fieldCapacityPct) =>
            setTargets({ ...targets, substrate: { ...targets.substrate, fieldCapacityPct } })
          }
        />
        <RangeRow
          label="Dryback day %"
          value={targets.substrate.drybackDayPct}
          onChange={(drybackDayPct) =>
            setTargets({ ...targets, substrate: { ...targets.substrate, drybackDayPct } })
          }
        />
        <RangeRow
          label="Dryback overnight %"
          value={targets.substrate.drybackOvernightPct}
          onChange={(drybackOvernightPct) =>
            setTargets({ ...targets, substrate: { ...targets.substrate, drybackOvernightPct } })
          }
        />
        <RangeRow
          label="Substrate EC"
          value={targets.substrate.substrateEc}
          onChange={(substrateEc) =>
            setTargets({ ...targets, substrate: { ...targets.substrate, substrateEc } })
          }
        />
        <RangeRow
          label="Substrate temp"
          value={targets.substrate.substrateTemp}
          onChange={(substrateTemp) =>
            setTargets({ ...targets, substrate: { ...targets.substrate, substrateTemp } })
          }
        />

        <p className="kicker">Irrigation</p>
        <RangeRow
          label="Shot size mL"
          value={targets.irrigation.shotSizeMl}
          onChange={(shotSizeMl) =>
            setTargets({ ...targets, irrigation: { ...targets.irrigation, shotSizeMl } })
          }
        />
        <RangeRow
          label="Shot size % media"
          value={targets.irrigation.shotSizePctMedia}
          onChange={(shotSizePctMedia) =>
            setTargets({ ...targets, irrigation: { ...targets.irrigation, shotSizePctMedia } })
          }
        />
        <RangeRow
          label="Shot EC"
          value={targets.irrigation.shotEc}
          onChange={(shotEc) =>
            setTargets({ ...targets, irrigation: { ...targets.irrigation, shotEc } })
          }
        />
        <RangeRow
          label="Rest / frequency"
          value={targets.irrigation.restPeriod}
          onChange={(restPeriod) =>
            setTargets({ ...targets, irrigation: { ...targets.irrigation, restPeriod } })
          }
        />

        <button type="button" className="btn btn-ghost" onClick={() => setClimateOpen((o) => !o)}>
          Climate {climateOpen ? '▾' : '▸'}
        </button>
        {climateOpen ? (
          <>
            <RangeRow
              label="VPD"
              value={targets.climate.vpd}
              onChange={(vpd) => setTargets({ ...targets, climate: { ...targets.climate, vpd } })}
            />
            <RangeRow
              label="RH"
              value={targets.climate.rh}
              onChange={(rh) => setTargets({ ...targets, climate: { ...targets.climate, rh } })}
            />
            <RangeRow
              label="Light"
              value={targets.climate.light}
              onChange={(light) =>
                setTargets({ ...targets, climate: { ...targets.climate, light } })
              }
            />
            <RangeRow
              label="CO2"
              value={targets.climate.co2}
              onChange={(co2) => setTargets({ ...targets, climate: { ...targets.climate, co2 } })}
            />
            <RangeRow
              label="Air temp"
              value={targets.climate.airTemp}
              onChange={(airTemp) =>
                setTargets({ ...targets, climate: { ...targets.climate, airTemp } })
              }
            />
          </>
        ) : null}

        <p className="kicker">Integrations</p>
        <p className="quiet">
          Key from AROYA support. We only read. Live pull comes in a later release.
        </p>
        <label className="field">
          <span>AROYA API key</span>
          <input
            type="password"
            value={aroyaKey}
            onChange={(e) => setAroyaKey(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>AROYA facility id</span>
          <input
            value={aroyaFacilityId}
            onChange={(e) => setAroyaFacilityId(e.target.value)}
            placeholder="map this facility"
          />
        </label>
        <div className={status === 'key_saved' ? 'ok-note' : 'quiet'}>
          {status === 'key_saved' ? 'Key saved (not pulling yet)' : 'Not connected'}
        </div>
        {rangeHasValues(targets.substrate.fieldCapacityPct) ? (
          <div className="quiet">FC chip preview: {formatRange(targets.substrate.fieldCapacityPct, '%')}</div>
        ) : null}

        {error ? <div className="error">{error}</div> : null}
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
