import { useState } from 'react'
import type { Room, RoomType, Site } from '../types'
import { PinPad } from '../components/PinPad'
import { RangeRow } from '../components/RangeRow'
import { createRoom, createSite } from '../lib/api'
import { hashPin, isPinShape } from '../lib/pin'
import { DEFAULT_TARGETS, type FacilityTargets } from '../lib/targets'
import type { SupabaseClient } from '@supabase/supabase-js'

type DraftRoom = { name: string; type: RoomType; maxZones: number }

type OnboardingWizardProps = {
  client: SupabaseClient
  onDone: (site: Site, rooms: Room[]) => void
  onCancel: () => void
}

export function OnboardingWizard({ client, onDone, onCancel }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [rooms, setRooms] = useState<DraftRoom[]>([])
  const [roomName, setRoomName] = useState('')
  const [roomType, setRoomType] = useState<RoomType>('flower')
  const [roomZones, setRoomZones] = useState(8)
  const [targets, setTargets] = useState<FacilityTargets>(() => structuredClone(DEFAULT_TARGETS))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pinPhase = pin.length < 4 ? 'pin' : 'confirm'

  function addDraftRoom() {
    if (!roomName.trim()) return
    setRooms((current) => [
      ...current,
      { name: roomName.trim(), type: roomType, maxZones: roomZones },
    ])
    setRoomName('')
  }

  async function finish() {
    setError(null)
    if (!name.trim()) {
      setError('Name the facility.')
      setStep(1)
      return
    }
    if (!isPinShape(pin) || pin !== confirm) {
      setError('Set and confirm a 4-digit floor PIN.')
      setStep(1)
      return
    }
    setBusy(true)
    try {
      const site = await createSite(client, {
        name,
        location,
        pinHash: await hashPin(pin),
        targets,
      })
      const created: Room[] = []
      for (const [index, room] of rooms.entries()) {
        created.push(
          await createRoom(client, {
            siteId: site.id,
            name: room.name,
            type: room.type,
            maxZones: room.maxZones,
            sortOrder: index + 1,
          }),
        )
      }
      onDone(site, created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save facility')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-main">
      <p className="kicker">Owner setup · {step} / 3</p>
      <h1 style={{ marginBottom: 8, fontSize: 24 }}>
        {step === 1 ? 'Facility' : step === 2 ? 'Rooms' : 'Targets'}
      </h1>
      {step === 1 ? (
        <div className="form-card stack">
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grow name" />
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
            <span>{pinPhase === 'pin' ? 'Floor PIN' : 'Confirm PIN'}</span>
            <PinPad
              value={pinPhase === 'pin' ? pin : confirm}
              onChange={pinPhase === 'pin' ? setPin : setConfirm}
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="stack">
          <p className="lede">Empty is valid. Add flower / mom / veg rooms now or later in settings.</p>
          {rooms.map((room, index) => (
            <div key={index} className="card">
              <b>{room.name}</b>
              <div className="quiet">
                {room.type} · {room.maxZones} zones
              </div>
              <button
                type="button"
                className="linkish"
                onClick={() => setRooms((current) => current.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <div className="form-card stack">
            <label className="field">
              <span>Room name</span>
              <input value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            </label>
            <div className="segmented">
              {(['flower', 'mom', 'veg'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={roomType === value ? 'on' : ''}
                  onClick={() => setRoomType(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="stepper">
              <button type="button" onClick={() => setRoomZones((n) => Math.max(1, n - 1))}>
                −
              </button>
              <b>{roomZones}</b>
              <button type="button" onClick={() => setRoomZones((n) => Math.min(48, n + 1))}>
                +
              </button>
            </div>
            <button type="button" className="btn btn-ghost" onClick={addDraftRoom}>
              Add room
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="stack">
          <p className="lede">
            Starting points only — edit for this facility. Overview and room pages read these
            numbers, never a hardcoded grow.
          </p>
          <div className="form-card stack">
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
              onChange={(runoffMl) =>
                setTargets({ ...targets, binder: { ...targets.binder, runoffMl } })
              }
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
          </div>
          <div className="form-card stack">
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
              hint="Typical 15–25"
              value={targets.substrate.drybackDayPct}
              onChange={(drybackDayPct) =>
                setTargets({ ...targets, substrate: { ...targets.substrate, drybackDayPct } })
              }
            />
            <RangeRow
              label="Dryback overnight %"
              value={targets.substrate.drybackOvernightPct}
              onChange={(drybackOvernightPct) =>
                setTargets({
                  ...targets,
                  substrate: { ...targets.substrate, drybackOvernightPct },
                })
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
          </div>
          <div className="form-card stack">
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
          </div>
        </div>
      ) : null}

      {error ? <div className="error" style={{ marginTop: 12 }}>{error}</div> : null}
      <div className="btn-row" style={{ marginTop: 14 }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => (step === 1 ? onCancel() : setStep((s) => s - 1))}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        {step < 3 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
            Next
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={finish} disabled={busy}>
            {busy ? 'Saving…' : 'Save facility'}
          </button>
        )}
      </div>
    </div>
  )
}
