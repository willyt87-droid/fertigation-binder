import type { Cycle, EntryDraft, Room } from '../types'
import { parseNumber } from './format'

export function roomCanCollect(room: Room, cycles: Cycle[]) {
  if (room.type !== 'flower') return true
  return cycles.some((cycle) => cycle.room_id === room.id && cycle.status === 'in_progress')
}

export function collectibleRooms(rooms: Room[], cycles: Cycle[]) {
  return rooms.filter((room) => roomCanCollect(room, cycles))
}

export function pickQuickRoom(rooms: Room[], cycles: Cycle[], preferredId?: string | null) {
  const ready = collectibleRooms(rooms, cycles)
  if (preferredId) {
    const preferred = ready.find((room) => room.id === preferredId)
    if (preferred) return preferred
  }
  return ready[0] ?? null
}

export function cycleStartForRoom(room: Room, cycles: Cycle[]) {
  return cycles.find((cycle) => cycle.room_id === room.id && cycle.status === 'in_progress')?.start_date
}

export function validateQuickDraft(draft: EntryDraft, room: Room, cycleStart?: string): string | null {
  if (!draft.date) return 'Pick a date.'
  if (cycleStart && draft.date < cycleStart) {
    return `Date must be on or after cycle start (${cycleStart}).`
  }
  if (draft.zone < 1 || draft.zone > room.max_zones) {
    return `Zone must be 1–${room.max_zones}.`
  }
  if (!draft.feed_ml.trim() || parseNumber(draft.feed_ml) == null) return 'Enter feed mL.'
  if (!draft.runoff_ml.trim() || parseNumber(draft.runoff_ml) == null) return 'Enter runoff mL.'
  if (!draft.feed_ph.trim() || parseNumber(draft.feed_ph) == null) return 'Enter feed pH.'
  if (!draft.runoff_ph.trim() || parseNumber(draft.runoff_ph) == null) return 'Enter runoff pH.'
  if (!draft.feed_ec.trim() || parseNumber(draft.feed_ec) == null) return 'Enter feed EC.'
  if (!draft.runoff_ec.trim() || parseNumber(draft.runoff_ec) == null) return 'Enter runoff EC.'
  if (!draft.tech.trim()) return 'Enter tech initials.'
  return null
}
