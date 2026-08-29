export type RoomType = 'flower' | 'mom' | 'veg'
export type CycleStatus = 'in_progress' | 'completed'
export type StageKey = 'early' | 'mid' | 'late'

export type Site = {
  id: string
  name: string
  location: string
}

export type Room = {
  id: string
  site_id: string
  name: string
  type: RoomType
  max_zones: number
  sort_order: number
}

export type Cycle = {
  id: string
  room_id: string
  number: number
  start_date: string
  status: CycleStatus
}

export type Entry = {
  id: string
  room_id: string
  date: string
  zone: number
  cultivar: string | null
  feed_ml: number | null
  feed_ec: number | null
  feed_ph: number | null
  runoff_ml: number | null
  runoff_ec: number | null
  runoff_ph: number | null
  notes: string | null
  created_at: string
  tech: string | null
}

export type EntryDraft = {
  date: string
  zone: number
  cultivar: string
  feed_ml: string
  feed_ph: string
  feed_ec: string
  runoff_ml: string
  runoff_ph: string
  runoff_ec: string
  tech: string
  notes: string
}

export type Stage = {
  key: StageKey
  label: string
  day: number
}

export type BandTone = 'ok' | 'high' | 'low' | 'none'
