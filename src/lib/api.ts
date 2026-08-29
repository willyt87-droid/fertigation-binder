import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Cycle, Entry, EntryDraft, Room, Site } from '../types'
import { asNumber, newId, parseNumber } from './format'

export function makeClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
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

export async function listSites(client: SupabaseClient): Promise<Site[]> {
  const { data, error } = await client.from('sites').select('id,name,location').order('name')
  return requireData(data, error) as Site[]
}

export async function createSite(
  client: SupabaseClient,
  input: { name: string; location: string },
): Promise<Site> {
  const row = { id: newId('site'), name: input.name.trim(), location: input.location.trim() }
  const { data, error } = await client.from('sites').insert(row).select('id,name,location').single()
  return requireData(data, error) as Site
}

export async function listRooms(client: SupabaseClient, siteId: string): Promise<Room[]> {
  const { data, error } = await client
    .from('rooms')
    .select('id,site_id,name,type,max_zones,sort_order')
    .eq('site_id', siteId)
    .order('sort_order')
  return requireData(data, error) as Room[]
}

export async function createRoom(
  client: SupabaseClient,
  input: { siteId: string; name: string; type: Room['type']; maxZones: number; sortOrder: number },
): Promise<Room> {
  const row = {
    id: newId('room'),
    site_id: input.siteId,
    name: input.name.trim(),
    type: input.type,
    max_zones: input.maxZones,
    sort_order: input.sortOrder,
  }
  const { data, error } = await client
    .from('rooms')
    .insert(row)
    .select('id,site_id,name,type,max_zones,sort_order')
    .single()
  return requireData(data, error) as Room
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
