import type { SupabaseClient, User } from '@supabase/supabase-js'

const SEEDED_ADMIN_EMAIL = 'willyt87@gmail.com'

function splitEmails(value: string) {
  return value
    .split(/[,;\s]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
}

export function adminEmailAllowlist() {
  const fromEnv = splitEmails(String(import.meta.env.VITE_PLATFORM_ADMIN_EMAILS ?? ''))
  return [...new Set([SEEDED_ADMIN_EMAIL, ...fromEnv])]
}

export function isAllowlistedAdminEmail(email: string | undefined | null) {
  if (!email) return false
  return adminEmailAllowlist().includes(email.trim().toLowerCase())
}

export async function isPlatformAdmin(
  client: SupabaseClient,
  user: User | null | undefined,
): Promise<boolean> {
  if (!user) return false
  const { data, error } = await client.rpc('is_platform_admin')
  if (!error) return data === true
  const { data: row, error: tableError } = await client
    .from('platform_admins')
    .select('email')
    .eq('email', user.email?.trim().toLowerCase() ?? '')
    .maybeSingle()
  if (!tableError) return Boolean(row)
  return isAllowlistedAdminEmail(user.email)
}

export function isAdminPath(pathname = window.location.pathname) {
  return pathname.replace(/\/+$/, '') === '/admin'
}

export function goPath(path: string) {
  if (window.location.pathname === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function viewAsOwnerSiteId(hash = window.location.hash.replace(/^#/, '')) {
  if (!hash.startsWith('view=')) return null
  try {
    const id = decodeURIComponent(hash.slice(5)).trim()
    return id || null
  } catch {
    return null
  }
}

export function goViewAsOwner(siteId: string) {
  const next = `/admin#view=${encodeURIComponent(siteId)}`
  window.history.pushState({}, '', next)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function leaveViewAsOwner() {
  window.history.pushState({}, '', '/admin')
  window.dispatchEvent(new PopStateEvent('popstate'))
}
