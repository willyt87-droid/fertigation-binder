import { useState } from 'react'
import { makeClient, testConnection } from '../lib/api'
import { saveConfig } from '../lib/storage'
import { Droplet } from '../components/Droplet'

type ConfigScreenProps = {
  onReady: () => void
}

export function ConfigScreen({ onReady }: ConfigScreenProps) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setError(null)
    const trimmedUrl = url.trim().replace(/\/$/, '')
    const trimmedKey = anonKey.trim()
    if (!trimmedUrl || !trimmedKey) {
      setError('Paste both the project URL and the anon key.')
      return
    }
    setBusy(true)
    try {
      const client = makeClient(trimmedUrl, trimmedKey)
      await testConnection(client)
      saveConfig({ url: trimmedUrl, anonKey: trimmedKey })
      onReady()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not connect'
      setError(
        `${message}. Create an empty Supabase project, run supabase/migrations/20260829143600_init.sql, then paste that project's URL and anon key. Do not use a live pilot database.`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-main plain">
      <div className="config-hero">
        <Droplet size={42} />
        <h1>Connect this binder</h1>
      </div>
      <p className="lede">
        First run starts empty. Paste the URL and anon key for a new Supabase project. Nothing is
        pre-filled. This app is a product clone — it must not use a live pilot project.
      </p>
      <div className="form-card stack">
        <label className="field">
          <span>Supabase URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxx.supabase.co"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Anon key</span>
          <input
            type="password"
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="Paste anon public key"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Checking…' : 'Save and continue'}
        </button>
      </div>
    </div>
  )
}
