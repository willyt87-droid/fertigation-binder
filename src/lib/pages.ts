export type PublicPage = 'privacy' | 'terms' | 'pricing'

const PUBLIC_PAGES = new Set<string>(['privacy', 'terms', 'pricing'])

export function publicPageFromPath(pathname = window.location.pathname): PublicPage | null {
  const clean = pathname.replace(/\/+$/, '') || '/'
  const slug = clean.replace(/^\//, '')
  return PUBLIC_PAGES.has(slug) ? (slug as PublicPage) : null
}
