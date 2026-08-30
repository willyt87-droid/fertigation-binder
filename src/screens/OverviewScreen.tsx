import { useState } from 'react'
import type { Cycle, EntryDraft, Room } from '../types'
import { stageForCycle } from '../lib/bands'
import { roomCanCollect } from '../lib/quickEntry'
import { QuickEntrySheet } from './QuickEntrySheet'

type OverviewScreenProps = {
  rooms: Room[]
  cycles: Cycle[]
  canWrite?: boolean
  defaultRoomId?: string | null
  onOpenRoom: (room: Room) => void
  onSaveQuickEntry?: (room: Room, draft: EntryDraft) => Promise<void>
  onRememberRoom?: (roomId: string) => void
}

type LogTarget = 'overview' | Room

export function OverviewScreen({
  rooms,
  cycles,
  canWrite = false,
  defaultRoomId,
  onOpenRoom,
  onSaveQuickEntry,
  onRememberRoom,
}: OverviewScreenProps) {
  const flower = rooms.filter((r) => r.type === 'flower')
  const momVeg = rooms.filter((r) => r.type === 'mom' || r.type === 'veg')
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null)

  return (
    <div className="app-main">
      {canWrite && onSaveQuickEntry ? (
        <button
          type="button"
          className="btn btn-primary quick-log-launch"
          onClick={() => setLogTarget('overview')}
        >
          Quick log
        </button>
      ) : null}
      <RoomGroup
        title="Flower"
        rooms={flower}
        empty="No flower rooms yet."
        cycles={cycles}
        canWrite={canWrite}
        onOpenRoom={onOpenRoom}
        onQuickLog={canWrite ? setLogTarget : undefined}
      />
      <RoomGroup
        title="Mom / Veg"
        rooms={momVeg}
        empty="No mom or veg rooms yet."
        cycles={cycles}
        canWrite={canWrite}
        onOpenRoom={onOpenRoom}
        onQuickLog={canWrite ? setLogTarget : undefined}
      />
      {logTarget && onSaveQuickEntry ? (
        <QuickEntrySheet
          rooms={rooms}
          cycles={cycles}
          defaultRoomId={logTarget === 'overview' ? defaultRoomId : logTarget.id}
          lockedRoom={logTarget === 'overview' ? undefined : logTarget}
          onClose={() => setLogTarget(null)}
          onSave={onSaveQuickEntry}
          onRoomChange={onRememberRoom}
        />
      ) : null}
    </div>
  )
}

type RoomGroupProps = {
  title: string
  rooms: Room[]
  empty: string
  cycles: Cycle[]
  canWrite: boolean
  onOpenRoom: (room: Room) => void
  onQuickLog?: (room: Room) => void
}

function RoomGroup({ title, rooms, empty, cycles, canWrite, onOpenRoom, onQuickLog }: RoomGroupProps) {
  return (
    <section className="group">
      <div className="group-title">{title}</div>
      <div className="room-grid">
        {rooms.length === 0 ? <div className="empty-slot">{empty}</div> : null}
        {rooms.map((room) => {
          const cycle = cycles.find((c) => c.room_id === room.id && c.status === 'in_progress')
          const stage = cycle ? stageForCycle(cycle.start_date) : null
          const loggable = canWrite && onQuickLog && roomCanCollect(room, cycles)
          return (
            <div key={room.id} className={`room-card ${room.type}`}>
              <button
                type="button"
                className="room-card-hit"
                onClick={() => onOpenRoom(room)}
                aria-label={`Open ${room.name} log`}
              >
                <div className="room-name">{room.name}</div>
                <div className="room-meta">
                  <span className="chip type">{room.type}</span>
                  {room.type === 'flower' && cycle && stage ? (
                    <>
                      <span>
                        Cycle {cycle.number} · Day {stage.day}
                      </span>
                      <span className={`chip ${stage.key}`}>{stage.label}</span>
                    </>
                  ) : room.type === 'flower' ? (
                    <span>No cycle</span>
                  ) : (
                    <span>{room.max_zones} zones</span>
                  )}
                </div>
              </button>
              {loggable ? (
                <button
                  type="button"
                  className="room-quick-log"
                  onClick={() => onQuickLog(room)}
                  aria-label={`Quick log ${room.name}`}
                >
                  Log
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
