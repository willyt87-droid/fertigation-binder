import { LegalLinks } from '../components/LegalLinks'

export function PrivacyPage() {
  return (
    <div className="app-main plain legal-page">
      <p className="kicker">The Fertigation Binder</p>
      <h1>Privacy policy</h1>
      <p className="lede">
        This policy describes how The Fertigation Binder, operated by WT, handles information in
        this progressive web app. We do not sell grower data.
      </p>

      <section className="legal-section">
        <h2>Who operates this product</h2>
        <p>
          The Fertigation Binder is a greenhouse-tablet PWA hosted on Netlify. WT is the platform
          operator. Facility owners subscribe per facility. Floor techs do not create accounts.
        </p>
        <p>
          Questions or data requests:{' '}
          <a href="mailto:willyt87@gmail.com">willyt87@gmail.com</a>.
        </p>
      </section>

      <section className="legal-section">
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Fertigation logs</strong> — collection date, zone, cultivar, feed and runoff
            mL / pH / EC, tech initials, and notes you enter on the floor tablet.
          </li>
          <li>
            <strong>Facility and room config</strong> — facility name and location, rooms, flower
            cycles, floor PIN hash, and the target bands an owner sets for that grow.
          </li>
          <li>
            <strong>Owner and operator email</strong> — used only to send a magic-link sign-in.
            Floor unlock uses a 4-digit PIN, not an email account.
          </li>
          <li>
            <strong>Optional AROYA key</strong> — if an owner pastes an AROYA API key in facility
            settings, it is stored in that browser’s localStorage. v1 does not send the key to
            AROYA or to The Fertigation Binder.
          </li>
          <li>
            <strong>Connection settings</strong> — the Supabase project URL and anon key you paste
            on first run stay in localStorage on that device. They are never committed to this
            repository.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>Where it lives</h2>
        <p>
          Binder data lives in the empty Supabase project the owner connects — not in a shared
          Ravena pilot database. Magic-link delivery uses that project’s Email auth. The PWA
          itself is served from Netlify (static files plus the usual CDN request logs).
        </p>
        <p>
          The floor PIN is stored as a SHA-256 hash on the facility record. We do not keep the
          PIN in plaintext.
        </p>
      </section>

      <section className="legal-section">
        <h2>What we do not do</h2>
        <ul>
          <li>We do not sell grower data, fertigation logs, or facility lists.</li>
          <li>We do not use grower logs for advertising or third-party marketing.</li>
          <li>We do not require an Apple App Store binary; this product is the Netlify-hosted PWA.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>Who can see a facility</h2>
        <p>
          Owners see the facilities they create. Floor techs with the PIN can log on an active
          facility. The platform operator (WT) can review pending facilities for approval and
          pause or remove a grow. WT does not impersonate the owner on the floor path.
        </p>
      </section>

      <section className="legal-section">
        <h2>Retention and requests</h2>
        <p>
          Logs stay in the connected project until an owner or the operator removes the facility.
          To ask what we hold or to request deletion, email{' '}
          <a href="mailto:willyt87@gmail.com">willyt87@gmail.com</a> from the address on the
          account.
        </p>
        <p className="quiet">Last updated 29 August 2026.</p>
      </section>

      <LegalLinks current="privacy" />
    </div>
  )
}
