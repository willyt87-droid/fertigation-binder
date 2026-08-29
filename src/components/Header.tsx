import { useEffect, useState } from 'react'
import { clockLabel } from '../lib/format'
import { Droplet } from './Droplet'

type HeaderProps = {
  siteName?: string
  showSites?: boolean
  onSites?: () => void
}

export function Header({ siteName, showSites = true, onSites }: HeaderProps) {
  const [clock, setClock] = useState(() => clockLabel())

  useEffect(() => {
    const tick = () => setClock(clockLabel())
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <header className="app-header">
      <div className="brand">
        <Droplet />
        <div className="brand-copy">
          <div className="brand-title">The Fertigation Binder</div>
          {siteName ? <div className="brand-site">{siteName}</div> : null}
        </div>
      </div>
      {showSites ? (
        <button type="button" className="sites-btn" onClick={onSites}>
          SITES
        </button>
      ) : (
        <span />
      )}
      <div className="clock" aria-label="Local time">
        {clock}
      </div>
    </header>
  )
}
