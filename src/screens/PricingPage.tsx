import { Droplet } from '../components/Droplet'
import { LegalLinks } from '../components/LegalLinks'

type PricingPageProps = {
  onStartSignup: () => void
}

export function PricingPage({ onStartSignup }: PricingPageProps) {
  return (
    <div className="app-main plain legal-page">
      <p className="kicker">One plan · per facility</p>
      <div className="config-hero">
        <Droplet size={42} />
        <h1>Pricing</h1>
      </div>
      <p className="lede">
        WT operates The Fertigation Binder. Owners subscribe per facility — not per room, not per
        tech. Floor PIN logging is included. Checkout is not in this PWA yet; the button starts
        the existing owner sign-up.
      </p>

      <article className="price-card">
        <p className="kicker">v1 facility plan</p>
        <div className="price-row">
          <span className="price-amount">$49</span>
          <span className="price-period">/facility/month</span>
        </div>
        <p className="quiet">
          Current v1 list price. The operator can change this later. 14-day trial on each new
          facility.
        </p>
        <ul className="price-features">
          <li>14-day trial before the monthly facility fee</li>
          <li>Owner magic-link sign-in and facility setup</li>
          <li>Floor PIN unlock for tablet logging (included)</li>
          <li>Flower cycles plus feed and runoff collections</li>
          <li>Per-facility target bands</li>
          <li>Optional AROYA key saved locally — live integration comes later</li>
        </ul>
        <button type="button" className="btn btn-primary" onClick={onStartSignup}>
          Start owner signup
        </button>
        <p className="quiet" style={{ marginTop: 10 }}>
          Opens the owner magic-link screen. No card form and no Stripe in this release.
        </p>
      </article>

      <section className="legal-section">
        <h2>How it works</h2>
        <p>
          One subscription covers one facility: rooms, PIN, and logs for that grow. Add another
          facility when you add another site. WT approves new facilities before the floor PIN
          unlocks.
        </p>
        <p>
          Questions:{' '}
          <a href="mailto:willyt87@gmail.com">willyt87@gmail.com</a>.
        </p>
      </section>

      <LegalLinks current="pricing" />
    </div>
  )
}
