type LegalLinksProps = {
  current?: 'privacy' | 'terms' | 'pricing' | null
}

export function LegalLinks({ current = null }: LegalLinksProps) {
  return (
    <nav className="legal-links" aria-label="Product and legal">
      <a className={`linkish${current === 'privacy' ? ' current' : ''}`} href="/privacy">
        Privacy
      </a>
      <span className="quiet"> · </span>
      <a className={`linkish${current === 'terms' ? ' current' : ''}`} href="/terms">
        Terms
      </a>
      <span className="quiet"> · </span>
      <a className={`linkish${current === 'pricing' ? ' current' : ''}`} href="/pricing">
        Pricing
      </a>
    </nav>
  )
}
