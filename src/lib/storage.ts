const PREFIX = 'fertigation-binder'

export type StoredConfig = {
  url: string
  anonKey: string
}

export function loadConfig(): StoredConfig | null {
  const url = localStorage.getItem(`${PREFIX}:url`)
  const anonKey = localStorage.getItem(`${PREFIX}:anonKey`)
  if (!url || !anonKey) return null
  return { url, anonKey }
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
