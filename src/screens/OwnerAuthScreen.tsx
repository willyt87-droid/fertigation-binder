import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Droplet } from '../components/Droplet'

type OwnerAuthScreenProps = {
  client: SupabaseClient
  mockAuth?: boolean
  mockOrigin?: string
  mode?: 'owner' | 'admin'
  onSignedIn: () => void
}

export function OwnerAuthScreen({
  client,
  mockAuth,
  mockOrigin,
  mode = 'owner',
  onSignedIn,
}: OwnerAuthScreenProps) {
  const admin = mode === 'admin'
  const [email, setEmail] = useState(admin ? 'willyt87@gmail.com' : '')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendLink() {
    setError(null)
    if (!email.trim() || !email.includes('@')) {
      setError(admin ? 'Enter the allowlisted operator email.' : 'Enter an owner email.')
      return
    }
    setBusy(true)
    try {
      const { error: otpError } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}${admin ? '/admin' : '/'}` },
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
        body: JSON.stringify({
          email: email.trim() || (admin ? 'willyt87@gmail.com' : 'owner@local.test'),
        }),
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
      <p className="kicker">{admin ? 'Platform admin' : 'Owner setup · 1 / 4'}</p>
      <div className="config-hero">
        <Droplet size={42} />
        <h1>{admin ? 'Operator sign-in' : 'Owner sign-in'}</h1>
      </div>
      <p className="lede">
        {admin
          ? 'Magic link for the product operator. Allowlisted emails land on /admin. You will not create a facility.'
          : 'Email a magic link to set up facilities, rooms, and targets. Floor techs do not need an account — they unlock the tablet with the facility PIN.'}
      </p>
      <div className="form-card stack">
        <label className="field">
          <span>{admin ? 'Admin email' : 'Owner email'}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={admin ? 'willyt87@gmail.com' : 'you@grow.example'}
            autoComplete="email"
          />
        </label>
        {sent ? (
          <div className="ok-note">Link sent. Open it on this device to finish sign-in.</div>
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
