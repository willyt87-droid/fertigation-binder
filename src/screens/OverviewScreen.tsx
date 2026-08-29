import type { Cycle, Room } from '../types'
import { stageForCycle } from '../lib/bands'

type OverviewScreenProps = {
  rooms: Room[]
  cycles: Cycle[]
  onOpenRoom: (room: Room) => void
}

export function OverviewScreen({ rooms, cycles, onOpenRoom }: OverviewScreenProps) {
  const flower = rooms.filter((r) => r.type === 'flower')
  const momVeg = rooms.filter((r) => r.type === 'mom' || r.type === 'veg')

  return (
    <div className="app-main">
      <RoomGroup
        title="Flower"
        rooms={flower}
        empty="No flower rooms yet."
        cycles={cycles}
        onOpenRoom={onOpenRoom}
      />
      <RoomGroup
        title="Mom / Veg"
        rooms={momVeg}
        empty="No mom or veg rooms yet."
        cycles={cycles}
        onOpenRoom={onOpenRoom}
      />
    </div>
  )
}

type RoomGroupProps = {
  title: string
  rooms: Room[]
  empty: string
  cycles: Cycle[]
  onOpenRoom: (room: Room) => void
}

function RoomGroup({ title, rooms, empty, cycles, onOpenRoom }: RoomGroupProps) {
  return (
    <section className="group">
      <div className="group-title">{title}</div>
      <div className="room-grid">
        {rooms.length === 0 ? <div className="empty-slot">{empty}</div> : null}
        {rooms.map((room) => {
          const cycle = cycles.find((c) => c.room_id === room.id && c.status === 'in_progress')
          const stage = cycle ? stageForCycle(cycle.start_date) : null
          return (
            <button
              key={room.id}
              type="button"
              className={`room-card ${room.type}`}
              onClick={() => onOpenRoom(room)}
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
          )
        })}
      </div>
    </section>
  )
}
