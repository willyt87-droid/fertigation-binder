import { LegalLinks } from '../components/LegalLinks'
import { goPath } from '../lib/admin'

export function TermsPage() {
  return (
    <div className="app-main plain legal-page">
      <p className="kicker">The Fertigation Binder</p>
      <h1>Terms of use</h1>
      <p className="lede">
        These terms cover the Fertigation Binder progressive web app. The operator is The
        Fertigation Binder (WT). Contact:{' '}
        <a href="mailto:willyt87@gmail.com">willyt87@gmail.com</a>.
      </p>

      <section className="legal-section">
        <h2>The product</h2>
        <p>
          The Fertigation Binder is a greenhouse-tablet PWA hosted on Netlify. Owners subscribe
          per facility. Floor techs unlock a facility with a PIN and record fertigation
          collections. There is no Apple App Store binary in this product.
        </p>
        <p>
          v1 includes owner onboarding, facility cards, floor PIN logging, flower cycles, and
          feed/runoff collections. Service, Cubes, Archive, live AROYA pulls, and native iOS are
          not part of this release.
        </p>
      </section>

      <section className="legal-section">
        <h2>Accounts and access</h2>
        <ul>
          <li>
            <strong>Platform operator (WT)</strong> — signs in at /admin. Approves, pauses, or
            removes facilities. Does not run owner onboarding.
          </li>
          <li>
            <strong>Owners</strong> — sign in with a magic-link email, create facilities, set
            rooms, target bands, and the floor PIN.
          </li>
          <li>
            <strong>Floor</strong> — no account. Unlock works only while the facility is active.
            Keep the PIN on the grow; do not share it off the floor.
          </li>
        </ul>
        <p>
          You are responsible for who you give the PIN to and for the accuracy of logs entered
          under that PIN.
        </p>
      </section>

      <section className="legal-section">
        <h2>Subscription</h2>
        <p>
          Billing is per facility, monthly, after a 14-day trial. The v1 list price is shown on{' '}
          <button type="button" className="linkish" onClick={() => goPath('/pricing')}>
            Pricing
          </button>
          . Checkout is not collected inside this PWA yet — starting a trial uses the existing
          owner sign-up. The operator may change the published rate later.
        </p>
      </section>

      <section className="legal-section">
        <h2>Your data</h2>
        <p>
          Fertigation logs and facility/room config belong to the grow that created them. An
          optional AROYA key stays in the browser. We do not sell grower data. Use a new
          Supabase project for this product; do not point the app at another operation’s live
          database.
        </p>
      </section>

      <section className="legal-section">
        <h2>Acceptable use</h2>
        <p>
          Use the binder for your own facilities. Do not attempt to access another grow’s
          project, probe the operator dashboard without an allowlisted email, or use the product
          to store anything other than fertigation operations data.
        </p>
      </section>

      <section className="legal-section">
        <h2>No agronomic warranty</h2>
        <p>
          The binder records collections and compares them to bands you configure. It is not
          agronomic advice and does not guarantee crop outcome. Target chips and typical ranges
          are tools, not a prescription.
        </p>
        <p>
          The software is provided as-is. To the extent allowed by law, The Fertigation Binder
          and WT are not liable for lost crop, lost profits, or data loss beyond the fees paid
          for the affected facilities in the prior three months.
        </p>
      </section>

      <section className="legal-section">
        <h2>Changes</h2>
        <p>
          We may update these terms as the product grows (billing, AROYA pull, extra roles).
          Continued use after a posted change means you accept the new terms. For questions:{' '}
          <a href="mailto:willyt87@gmail.com">willyt87@gmail.com</a>.
        </p>
        <p className="quiet">Last updated 29 August 2026.</p>
      </section>

      <LegalLinks current="terms" />
    </div>
  )
}
