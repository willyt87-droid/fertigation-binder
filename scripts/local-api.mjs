#!/usr/bin/env node
/**
 * Local Gotrue + PostgREST stub for owner vs platform-admin UI checks.
 * Do not point this at a live project. Start: node scripts/local-api.mjs
 */
import http from 'node:http'
import { createHash, randomUUID } from 'node:crypto'

const PORT = Number(process.env.PORT || 8787)
const SEEDED_ADMIN = 'willyt87@gmail.com'
const extraAdmins = String(process.env.PLATFORM_ADMIN_EMAILS || process.env.VITE_PLATFORM_ADMIN_EMAILS || '')
  .split(/[,;\s]+/)
  .map((part) => part.trim().toLowerCase())
  .filter(Boolean)
const admins = new Set([SEEDED_ADMIN, ...extraAdmins])

/** @type {Map<string, object>} */
const sites = new Map()
/** @type {Map<string, object>} */
const rooms = new Map()

function json(res, status, body, extra = {}) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': '*',
    ...extra,
  })
  res.end(payload)
}

function b64url(value) {
  return Buffer.from(value).toString('base64url')
}

function userIdFor(email) {
  const hex = createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function makeJwt(email) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({
      aud: 'authenticated',
      role: 'authenticated',
      email: email.toLowerCase(),
      sub: userIdFor(email),
      exp: now + 60 * 60 * 24,
      iat: now,
    }),
  )
  return `${header}.${payload}.mock`
}

function parseJwt(token) {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
  })
}

function bearer(req) {
  const header = String(req.headers.authorization || '')
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token || token === 'local') return null
  return parseJwt(token)
}

function isAdmin(email) {
  return Boolean(email) && admins.has(String(email).toLowerCase())
}

function sitePublic(site, authed) {
  const base = {
    id: site.id,
    name: site.name,
    location: site.location,
    targets: site.targets,
    aroya_facility_id: site.aroya_facility_id,
  }
  if (!authed) return base
  return {
    ...base,
    status: site.status,
    created_at: site.created_at,
    owner_email: site.owner_email,
    aroya_key_saved: site.aroya_key_saved,
  }
}

function queueRow(site) {
  const roomCount = [...rooms.values()].filter((room) => room.site_id === site.id).length
  return {
    id: site.id,
    name: site.name,
    location: site.location,
    status: site.status,
    created_at: site.created_at,
    owner_email: site.owner_email,
    aroya_key_saved: site.aroya_key_saved,
    room_count: roomCount,
    last_activity: null,
  }
}

function eqParam(url, column) {
  const value = url.searchParams.get(column)
  if (!value) return null
  return String(value).replace(/^eq\./, '')
}

function visibleSites(auth) {
  if (auth && isAdmin(auth.email)) return [...sites.values()]
  if (auth) return [...sites.values()].filter((site) => site.owner_id === auth.sub)
  return [...sites.values()].filter((site) => site.status === 'active')
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 204, {})
    return
  }
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)
  const path = url.pathname
  const auth = bearer(req)

  if (req.method === 'POST' && path === '/auth/v1/mock-session') {
    const body = await readBody(req)
    const email = String(body.email || 'owner@local.test').toLowerCase()
    const access = makeJwt(email)
    json(res, 200, {
      access_token: access,
      refresh_token: access,
      token_type: 'bearer',
      expires_in: 86400,
      user: { id: userIdFor(email), email, role: 'authenticated' },
    })
    return
  }

  if (req.method === 'GET' && path === '/auth/v1/user') {
    if (!auth) {
      json(res, 401, { message: 'No session' })
      return
    }
    json(res, 200, { id: auth.sub, email: auth.email, role: 'authenticated' })
    return
  }

  if (req.method === 'POST' && path === '/auth/v1/otp') {
    json(res, 200, { message: 'Mock OTP accepted. Use Continue on local mock.' })
    return
  }

  if (req.method === 'POST' && path === '/auth/v1/logout') {
    json(res, 204, {})
    return
  }

  if (req.method === 'POST' && path === '/rest/v1/rpc/is_platform_admin') {
    json(res, 200, isAdmin(auth?.email))
    return
  }

  if (req.method === 'POST' && path === '/rest/v1/rpc/check_floor_pin') {
    const body = await readBody(req)
    const site = sites.get(body.p_site_id)
    json(
      res,
      200,
      Boolean(site && site.status === 'active' && site.pin_hash && site.pin_hash === body.p_pin_hash),
    )
    return
  }

  if (req.method === 'POST' && path === '/rest/v1/rpc/admin_set_site_status') {
    if (!isAdmin(auth?.email)) {
      json(res, 403, { message: 'Not a platform admin' })
      return
    }
    const body = await readBody(req)
    const site = sites.get(body.p_site_id)
    if (site) site.status = body.p_status
    json(res, 204, {})
    return
  }

  if (req.method === 'POST' && path === '/rest/v1/rpc/admin_delete_site') {
    if (!isAdmin(auth?.email)) {
      json(res, 403, { message: 'Not a platform admin' })
      return
    }
    const body = await readBody(req)
    sites.delete(body.p_site_id)
    for (const [id, room] of rooms) {
      if (room.site_id === body.p_site_id) rooms.delete(id)
    }
    json(res, 204, {})
    return
  }

  if (path === '/rest/v1/platform_admins') {
    const email = eqParam(url, 'email')?.toLowerCase()
    const rows = email && isAdmin(email) && auth?.email === email ? [{ email }] : []
    json(res, 200, rows)
    return
  }

  if (path === '/rest/v1/admin_facility_queue') {
    if (!auth) {
      json(res, 401, { message: 'Sign in required' })
      return
    }
    const rows = visibleSites(auth).map(queueRow)
    rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    json(res, 200, rows)
    return
  }

  if (path === '/rest/v1/sites') {
    if (req.method === 'GET') {
      const rows = visibleSites(auth).map((site) => sitePublic(site, Boolean(auth)))
      json(res, 200, rows)
      return
    }
    if (req.method === 'POST') {
      if (!auth || isAdmin(auth.email)) {
        json(res, 401, { message: 'Owner sign-in required to create a facility.' })
        return
      }
      const body = await readBody(req)
      const row = {
        id: body.id || `site_${randomUUID()}`,
        name: body.name,
        location: body.location || '',
        targets: body.targets || {},
        aroya_facility_id: body.aroya_facility_id ?? null,
        owner_id: auth.sub,
        owner_email: auth.email,
        pin_hash: body.pin_hash,
        status: 'pending',
        created_at: new Date().toISOString(),
        aroya_key_saved: false,
      }
      sites.set(row.id, row)
      json(res, 201, sitePublic(row, true), {
        'Content-Type': 'application/vnd.pgrst.object+json',
      })
      return
    }
    if (req.method === 'PATCH' || req.method === 'DELETE') {
      json(res, 200, {})
      return
    }
  }

  if (path === '/rest/v1/rooms') {
    if (req.method === 'GET') {
      const filter = eqParam(url, 'site_id')
      const rows = [...rooms.values()].filter((room) => !filter || room.site_id === filter)
      json(res, 200, rows)
      return
    }
    if (req.method === 'POST') {
      const body = await readBody(req)
      const row = {
        id: body.id || `room_${randomUUID()}`,
        site_id: body.site_id,
        name: body.name,
        type: body.type,
        max_zones: body.max_zones,
        sort_order: body.sort_order,
        aroya_room_id: body.aroya_room_id ?? null,
      }
      rooms.set(row.id, row)
      json(res, 201, row, { 'Content-Type': 'application/vnd.pgrst.object+json' })
      return
    }
  }

  json(res, 404, { message: `No mock for ${req.method} ${path}` })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local binder API on http://127.0.0.1:${PORT}`)
})
