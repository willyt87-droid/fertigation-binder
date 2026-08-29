import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Cycle, Entry, EntryDraft, Room, Site, SiteStatus } from '../types'
import { asNumber, newId, parseNumber } from './format'
import { DEFAULT_TARGETS, mergeTargets, type FacilityTargets } from './targets'

export type ContactRequest = {
  id: string
  created_at: string
  name: string
  facility: string
  email: string
  message: string
  reason: 'question' | 'house_quote'
}

export type AdminFacility = {
  id: string
  name: string
  location: string
  status: SiteStatus
  created_at: string | null
  owner_email: string | null
  aroya_key_saved: boolean
  room_count: number
  last_activity: string | null
}

let active: { url: string; anonKey: string; client: SupabaseClient } | null = null

export function makeClient(url: string, anonKey: string): SupabaseClient {
  if (active && active.url === url && active.anonKey === anonKey) return active.client
  const client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  active = { url, anonKey, client }
  return client
}

export async function testConnection(client: SupabaseClient) {
  const { error } = await client.from('sites').select('id').limit(1)
  if (error) throw error
}

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  if (data === null) throw new Error('No data returned')
  return data
}

const SITE_OWNER_COLUMNS =
  'id,name,location,targets,aroya_facility_id,status,created_at,owner_email,aroya_key_saved' as const

function mapSite(row: Record<string, unknown>): Site {
  const status = row.status
  return {
    id: String(row.id),
    name: String(row.name),
    location: String(row.location ?? ''),
    targets: mergeTargets(row.targets),
    aroya_facility_id: (row.aroya_facility_id as string | null) ?? null,
    status: status === 'active' || status === 'paused' || status === 'pending' ? status : 'active',
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    owner_email: typeof row.owner_email === 'string' ? row.owner_email : null,
    aroya_key_saved: row.aroya_key_saved === true,
  }
}

function mapAdminFacility(row: Record<string, unknown>): AdminFacility {
  const site = mapSite(row)
  return {
    id: site.id,
    name: site.name,
    location: site.location,
    status: site.status,
    created_at: site.created_at,
    owner_email: site.owner_email,
    aroya_key_saved: site.aroya_key_saved,
    room_count: asNumber(row.room_count) ?? 0,
    last_activity: typeof row.last_activity === 'string' ? row.last_activity : null,
  }
}

function mapRoom(row: Record<string, unknown>): Room {
  return {
    id: String(row.id),
    site_id: String(row.site_id),
    name: String(row.name),
    type: row.type as Room['type'],
    max_zones: asNumber(row.max_zones) ?? 8,
    sort_order: asNumber(row.sort_order) ?? 0,
    aroya_room_id: (row.aroya_room_id as string | null) ?? null,
  }
}

export async function listSites(client: SupabaseClient): Promise<Site[]> {
  const { data: sessionData } = await client.auth.getSession()
  // Anon is granted only id,name,location,targets,aroya_facility_id. Selecting
  // status (or any other column) returns permission denied for table sites.
  // RLS already hides non-active rows from anon; mapSite treats missing status as active.
  const query = sessionData.session
    ? client.from('sites').select(SITE_OWNER_COLUMNS)
    : client.from('sites').select('id,name,location,targets,aroya_facility_id')
  const { data, error } = await query.order('name')
  return requireData(data, error).map((row) => mapSite(row as Record<string, unknown>))
}

export async function createSite(
  client: SupabaseClient,
  input: {
    name: string
    location: string
    pinHash: string
    targets: FacilityTargets
  },
): Promise<Site> {
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw new Error(userError.message)
  const user = userData.user
  if (!user) throw new Error('Owner sign-in required to create a facility.')
  const row = {
    id: newId('site'),
    name: input.name.trim(),
    location: input.location.trim(),
    owner_id: user.id,
    owner_email: user.email ?? null,
    pin_hash: input.pinHash,
    targets: input.targets,
    status: 'pending',
    aroya_key_saved: false,
  }
  const { data, error } = await client
    .from('sites')
    .insert(row)
    .select(SITE_OWNER_COLUMNS)
    .single()
  return mapSite(requireData(data, error) as Record<string, unknown>)
}

export async function updateSite(
  client: SupabaseClient,
  siteId: string,
  patch: Partial<{
    name: string
    location: string
    pin_hash: string
    targets: FacilityTargets
    aroya_facility_id: string | null
    aroya_key_saved: boolean
  }>,
): Promise<Site> {
  const { data, error } = await client
    .from('sites')
    .update(patch)
    .eq('id', siteId)
    .select(SITE_OWNER_COLUMNS)
    .single()
  return mapSite(requireData(data, error) as Record<string, unknown>)
}

export async function listAdminFacilities(client: SupabaseClient): Promise<AdminFacility[]> {
  const { data, error } = await client
    .from('admin_facility_queue')
    .select(
      'id,name,location,status,created_at,owner_email,aroya_key_saved,room_count,last_activity',
    )
    .order('created_at', { ascending: false })
  if (!error) {
    return requireData(data, error).map((row) => mapAdminFacility(row as Record<string, unknown>))
  }
  const sites = await listSites(client)
  return sites.map((site) => ({
    id: site.id,
    name: site.name,
    location: site.location,
    status: site.status,
    created_at: site.created_at,
    owner_email: site.owner_email,
    aroya_key_saved: site.aroya_key_saved,
    room_count: 0,
    last_activity: null,
  }))
}

export async function adminSetSiteStatus(
  client: SupabaseClient,
  siteId: string,
  status: SiteStatus,
): Promise<void> {
  const { error } = await client.rpc('admin_set_site_status', {
    p_site_id: siteId,
    p_status: status,
  })
  if (error) throw new Error(error.message)
}

export async function listContactRequests(client: SupabaseClient): Promise<ContactRequest[]> {
  const { data, error } = await client
    .from('contact_requests')
    .select('id,created_at,name,facility,email,message,reason')
    .order('created_at', { ascending: false })
  return requireData(data, error).map((row) => {
    const rec = row as Record<string, unknown>
    return {
      id: String(rec.id),
      created_at: String(rec.created_at),
      name: String(rec.name ?? ''),
      facility: String(rec.facility ?? ''),
      email: String(rec.email ?? ''),
      message: String(rec.message ?? ''),
      reason: rec.reason === 'house_quote' ? 'house_quote' : 'question',
    }
  })
}

export async function adminDeleteSite(client: SupabaseClient, siteId: string): Promise<void> {
  const { error } = await client.rpc('admin_delete_site', { p_site_id: siteId })
  if (error) throw new Error(error.message)
}

export async function checkFloorPin(client: SupabaseClient, siteId: string, pinHash: string) {
  const { data, error } = await client.rpc('check_floor_pin', {
    p_site_id: siteId,
    p_pin_hash: pinHash,
  })
  if (error) throw new Error(error.message)
  return data === true
}

export async function listRooms(client: SupabaseClient, siteId: string): Promise<Room[]> {
  const { data, error } = await client
    .from('rooms')
    .select('id,site_id,name,type,max_zones,sort_order,aroya_room_id')
    .eq('site_id', siteId)
    .order('sort_order')
  return requireData(data, error).map((row) => mapRoom(row as Record<string, unknown>))
}

export async function createRoom(
  client: SupabaseClient,
  input: {
    siteId: string
    name: string
    type: Room['type']
    maxZones: number
    sortOrder: number
    aroyaRoomId?: string | null
  },
): Promise<Room> {
  const row = {
    id: newId('room'),
    site_id: input.siteId,
    name: input.name.trim(),
    type: input.type,
    max_zones: input.maxZones,
    sort_order: input.sortOrder,
    aroya_room_id: input.aroyaRoomId ?? null,
  }
  const { data, error } = await client
    .from('rooms')
    .insert(row)
    .select('id,site_id,name,type,max_zones,sort_order,aroya_room_id')
    .single()
  return mapRoom(requireData(data, error) as Record<string, unknown>)
}

export async function updateRoom(
  client: SupabaseClient,
  roomId: string,
  patch: Partial<{
    name: string
    type: Room['type']
    max_zones: number
    sort_order: number
    aroya_room_id: string | null
  }>,
): Promise<void> {
  const { error } = await client.from('rooms').update(patch).eq('id', roomId)
  if (error) throw new Error(error.message)
}

export async function deleteRoom(client: SupabaseClient, roomId: string): Promise<void> {
  const { error } = await client.from('rooms').delete().eq('id', roomId)
  if (error) throw new Error(error.message)
}

export async function listCycles(client: SupabaseClient, roomIds: string[]): Promise<Cycle[]> {
  if (roomIds.length === 0) return []
  const { data, error } = await client
    .from('cycles')
    .select('id,room_id,number,start_date,status')
    .in('room_id', roomIds)
    .order('number', { ascending: false })
  return requireData(data, error) as Cycle[]
}

export async function startCycle(
  client: SupabaseClient,
  input: { roomId: string; startDate: string },
): Promise<Cycle> {
  const existing = await listCycles(client, [input.roomId])
  const inProgress = existing.filter((c) => c.status === 'in_progress')
  if (inProgress.length > 0) {
    const { error: completeError } = await client
      .from('cycles')
      .update({ status: 'completed' })
      .eq('room_id', input.roomId)
      .eq('status', 'in_progress')
    if (completeError) throw new Error(completeError.message)
  }
  const nextNumber = existing.reduce((max, c) => Math.max(max, c.number), 0) + 1
  const { data, error } = await client
    .from('cycles')
    .insert({
      room_id: input.roomId,
      number: nextNumber,
      start_date: input.startDate,
      status: 'in_progress',
    })
    .select('id,room_id,number,start_date,status')
    .single()
  return requireData(data, error) as Cycle
}

export async function listEntries(
  client: SupabaseClient,
  roomId: string,
  sinceDate?: string,
): Promise<Entry[]> {
  let query = client
    .from('entries')
    .select(
      'id,room_id,date,zone,cultivar,feed_ml,feed_ec,feed_ph,runoff_ml,runoff_ec,runoff_ph,notes,created_at,tech',
    )
    .eq('room_id', roomId)
    .order('date', { ascending: false })
    .order('zone', { ascending: true })
  if (sinceDate) query = query.gte('date', sinceDate)
  const { data, error } = await query
  const rows = requireData(data, error)
  return rows.map(mapEntry)
}

export async function saveEntry(
  client: SupabaseClient,
  input: { id?: string; roomId: string; draft: EntryDraft },
): Promise<Entry> {
  const row = {
    room_id: input.roomId,
    date: input.draft.date,
    zone: Number(input.draft.zone),
    cultivar: input.draft.cultivar.trim() || null,
    feed_ml: parseNumber(input.draft.feed_ml),
    feed_ph: parseNumber(input.draft.feed_ph),
    feed_ec: parseNumber(input.draft.feed_ec),
    runoff_ml: parseNumber(input.draft.runoff_ml),
    runoff_ph: parseNumber(input.draft.runoff_ph),
    runoff_ec: parseNumber(input.draft.runoff_ec),
    tech: input.draft.tech.trim().toUpperCase() || null,
    notes: input.draft.notes.trim() || null,
  }
  const query = input.id
    ? client.from('entries').update(row).eq('id', input.id)
    : client.from('entries').insert(row)
  const { data, error } = await query
    .select(
      'id,room_id,date,zone,cultivar,feed_ml,feed_ec,feed_ph,runoff_ml,runoff_ec,runoff_ph,notes,created_at,tech',
    )
    .single()
  return mapEntry(requireData(data, error))
}

function mapEntry(row: Record<string, unknown>): Entry {
  return {
    id: String(row.id),
    room_id: String(row.room_id),
    date: String(row.date),
    zone: asNumber(row.zone) ?? 1,
    cultivar: (row.cultivar as string | null) ?? null,
    feed_ml: asNumber(row.feed_ml),
    feed_ec: asNumber(row.feed_ec),
    feed_ph: asNumber(row.feed_ph),
    runoff_ml: asNumber(row.runoff_ml),
    runoff_ec: asNumber(row.runoff_ec),
    runoff_ph: asNumber(row.runoff_ph),
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    tech: (row.tech as string | null) ?? null,
  }
}

export { DEFAULT_TARGETS }
