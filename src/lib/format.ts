export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

export function todayISO() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${m}/${d}`
}

export function formatTimestamp(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

export function parseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function formatMl(value: number | null) {
  if (value === null) return '—'
  return String(Math.round(value))
}

export function formatPh(value: number | null) {
  if (value === null) return '—'
  return value.toFixed(1)
}

export function formatEc(value: number | null) {
  if (value === null) return '—'
  return value.toFixed(2)
}

export function formatRoPct(feedMl: number | null, runoffMl: number | null) {
  if (feedMl === null || runoffMl === null || feedMl === 0) return null
  return (runoffMl / feedMl) * 100
}

export function formatPct(value: number | null) {
  if (value === null) return '—'
  return `${value.toFixed(0)}%`
}

export function clockLabel(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
