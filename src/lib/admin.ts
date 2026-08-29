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

export function adminViewSiteId(search = window.location.search) {
  return new URLSearchParams(search).get('view')
}

export function isDemoGrow(facility: { id: string; name: string }) {
  return facility.id === 'athena-demo' || /^athena\s+demo$/i.test(facility.name.trim())
}

export function facilityStatusLabel(status: string) {
  if (status === 'active') return 'Approved'
  if (status === 'paused') return 'Paused'
  return 'Pending'
}

export function sortAdminFacilities<T extends { id: string; name: string; created_at: string | null }>(
  list: T[],
) {
  return [...list].sort((a, b) => {
    const aDemo = isDemoGrow(a)
    const bDemo = isDemoGrow(b)
    if (aDemo !== bDemo) return aDemo ? -1 : 1
    return String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
  })
}

export function goPath(path: string) {
  const next = new URL(path, window.location.origin)
  const target = `${next.pathname}${next.search}`
  const current = `${window.location.pathname}${window.location.search}`
  if (current === target) return
  window.history.pushState({}, '', target)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function goAdmin(viewSiteId?: string | null) {
  goPath(viewSiteId ? `/admin?view=${encodeURIComponent(viewSiteId)}` : '/admin')
}
