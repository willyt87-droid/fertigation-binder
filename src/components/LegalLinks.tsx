import { goPath } from '../lib/admin'

type LegalLinksProps = {
  current?: 'privacy' | 'terms' | 'pricing' | null
}

export function LegalLinks({ current = null }: LegalLinksProps) {
  return (
    <nav className="legal-links" aria-label="Product and legal">
      <button
        type="button"
        className={`linkish${current === 'privacy' ? ' current' : ''}`}
        onClick={() => goPath('/privacy')}
      >
        Privacy
      </button>
      <span className="quiet"> · </span>
      <button
        type="button"
        className={`linkish${current === 'terms' ? ' current' : ''}`}
        onClick={() => goPath('/terms')}
      >
        Terms
      </button>
      <span className="quiet"> · </span>
      <button
        type="button"
        className={`linkish${current === 'pricing' ? ' current' : ''}`}
        onClick={() => goPath('/pricing')}
      >
        Pricing
      </button>
    </nav>
  )
}
