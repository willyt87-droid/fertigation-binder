import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Droplet } from '../components/Droplet'

type OwnerAuthScreenProps = {
  client: SupabaseClient
  mockAuth?: boolean
  mockOrigin?: string
  onSignedIn: () => void
}

export function OwnerAuthScreen({ client, mockAuth, mockOrigin, onSignedIn }: OwnerAuthScreenProps) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendLink() {
    setError(null)
    if (!email.trim() || !email.includes('@')) {
      setError('Enter an owner email.')
      return
    }
    setBusy(true)
    try {
      const { error: otpError } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      })
      if (otpError) throw otpError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send link')
    } finally {
      setBusy(false)
    }
  }

  async function continueMock() {
    setBusy(true)
    setError(null)
    try {
      const origin = mockOrigin ?? 'http://127.0.0.1:8787'
      const res = await fetch(`${origin}/auth/v1/mock-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: 'local' },
        body: JSON.stringify({ email: email.trim() || 'owner@local.test' }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || 'Mock session failed')
      const { error: sessionError } = await client.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      })
      if (sessionError) throw sessionError
      onSignedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mock sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-main plain">
      <p className="kicker">Owner setup · 1 / 4</p>
      <div className="config-hero">
        <Droplet size={42} />
        <h1>Owner sign-in</h1>
      </div>
      <p className="lede">
        Email a magic link to set up facilities, rooms, and targets. Floor techs do not need an
        account — they unlock the tablet with the facility PIN.
      </p>
      <div className="form-card stack">
        <label className="field">
          <span>Owner email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@grow.example"
            autoComplete="email"
          />
        </label>
        {sent ? (
          <div className="ok-note">Link sent. Open it on this device to finish owner sign-in.</div>
        ) : null}
        {error ? <div className="error">{error}</div> : null}
        <button type="button" className="btn btn-primary" onClick={sendLink} disabled={busy}>
          {busy ? 'Sending…' : 'Email magic link'}
        </button>
        {mockAuth ? (
          <button type="button" className="btn btn-ghost" onClick={continueMock} disabled={busy}>
            Continue on local mock
          </button>
        ) : null}
      </div>
    </div>
  )
}
