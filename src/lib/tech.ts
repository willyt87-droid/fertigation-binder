const PALETTE = ['#22c573', '#4dd2ff', '#9b84ff', '#ffe66d', '#ff9a3d', '#ff4d6d', '#e5a00d', '#60a5fa']

export function techColor(initials: string) {
  const key = initials.trim().toUpperCase()
  if (!key) return PALETTE[0]
  let hash = 0
  for (const ch of key) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export function chipInk(bg: string) {
  return bg === '#ffe66d' || bg === '#ff9a3d' || bg === '#e5a00d' ? '#14210c' : '#06120e'
}
