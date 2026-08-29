import { useEffect, useState } from 'react'
import { clockLabel } from '../lib/format'
import { Droplet } from './Droplet'

type HeaderProps = {
  siteName?: string
  showSites?: boolean
  onSites?: () => void
  admin?: boolean
  support?: boolean
}

export function Header({
  siteName,
  showSites = true,
  onSites,
  admin = false,
  support = false,
}: HeaderProps) {
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
          {support && siteName ? (
            <div className="brand-site">Support · {siteName}</div>
          ) : admin ? (
            <div className="brand-site">Admin</div>
          ) : siteName ? (
            <div className="brand-site">{siteName}</div>
          ) : null}
        </div>
      </div>
      {showSites ? (
        <button type="button" className={admin ? 'sites-btn admin-chrome' : 'sites-btn'} onClick={onSites}>
          {support ? 'ADMIN' : admin ? 'OUT' : 'SITES'}
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
