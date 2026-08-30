const PREFIX = 'fertigation-binder'

export type StoredConfig = {
  url: string
  anonKey: string
}

/** Public Binder product project. Operators may override via #reconnect or VITE_SUPABASE_*. */
const PRODUCT_URL = 'https://ghdzorxmblpbnulijvnb.supabase.co'
const PRODUCT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZHpvcnhtYmxwYm51bGlqdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDUyMTMsImV4cCI6MjEwMzU4MTIxM30.52w2oTs_PphfHdilDlk1IJIINGTFXv4QWBHBhJXlnfU'

const BLOCKED_PROJECT_REFS = ['rbgzpwfozpuddtzlqkte']

export function projectRefFromUrl(url: string) {
  try {
    const host = new URL(url.trim()).hostname
    return host.replace(/\.supabase\.co$/i, '').toLowerCase()
  } catch {
    return ''
  }
}

export function isBlockedProject(url: string) {
  const ref = projectRefFromUrl(url)
  return Boolean(ref) && BLOCKED_PROJECT_REFS.includes(ref)
}

export function productConfig(): StoredConfig {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? PRODUCT_URL).trim().replace(/\/$/, '')
  const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? PRODUCT_ANON_KEY).trim()
  return { url, anonKey }
}

export function loadStoredConfig(): StoredConfig | null {
  const url = localStorage.getItem(`${PREFIX}:url`)
  const anonKey = localStorage.getItem(`${PREFIX}:anonKey`)
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function loadConfig(): StoredConfig | null {
  const stored = loadStoredConfig()
  if (stored && !isBlockedProject(stored.url)) return stored
  const product = productConfig()
  if (!product.url || !product.anonKey || isBlockedProject(product.url)) return stored
  return product
}

export function saveConfig(config: StoredConfig) {
  localStorage.setItem(`${PREFIX}:url`, config.url.trim())
  localStorage.setItem(`${PREFIX}:anonKey`, config.anonKey.trim())
}

export function clearConfig() {
  localStorage.removeItem(`${PREFIX}:url`)
  localStorage.removeItem(`${PREFIX}:anonKey`)
}

const SESSION_KEY = `${PREFIX}:sessionSiteId`

export function loadSessionSiteId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function saveSessionSiteId(siteId: string) {
  localStorage.setItem(SESSION_KEY, siteId)
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function loadLastRoomId(siteId: string) {
  return localStorage.getItem(`${PREFIX}:lastRoom:${siteId}`)
}

export function saveLastRoomId(siteId: string, roomId: string) {
  localStorage.setItem(`${PREFIX}:lastRoom:${siteId}`, roomId)
}

const LAST_TECH_KEY = `${PREFIX}:lastTech`

export function loadLastTech() {
  return localStorage.getItem(LAST_TECH_KEY)
}

export function saveLastTech(tech: string) {
  const value = tech.trim().toUpperCase()
  if (!value) return
  localStorage.setItem(LAST_TECH_KEY, value)
}
