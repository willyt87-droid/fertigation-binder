const KEY = 'fertigation-binder:aroya:key'

export function loadAroyaKey(): string {
  return localStorage.getItem(KEY) ?? ''
}

export function saveAroyaKey(value: string) {
  const trimmed = value.trim()
  if (!trimmed) localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, trimmed)
}

export function aroyaStatus(apiKey: string | null) {
  return apiKey && apiKey.trim() ? 'key_saved' : 'not_connected'
}
