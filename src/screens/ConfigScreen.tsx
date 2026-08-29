import { useState } from 'react'
import { makeClient, testConnection } from '../lib/api'
import { isBlockedProject, saveConfig, type StoredConfig } from '../lib/storage'
import { Droplet } from '../components/Droplet'
import { LegalLinks } from '../components/LegalLinks'

type ConfigScreenProps = {
  initial?: StoredConfig | null
  onReady: () => void
  onCancel?: () => void
}

export function ConfigScreen({ initial, onReady, onCancel }: ConfigScreenProps) {
  const [url, setUrl] = useState(initial?.url ?? '')
  const [anonKey, setAnonKey] = useState(initial?.anonKey ?? '')
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
    if (isBlockedProject(trimmedUrl)) {
      setError('That project is not allowed for this product.')
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
        `${message}. Use an empty product project with the SQL files in supabase/migrations/ applied, then paste that project's URL and anon key.`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-main plain">
      <div className="config-hero">
        <Droplet size={42} />
        <h1>Operator connection</h1>
      </div>
      <p className="lede">
        Advanced only. The public gate already uses the product project. Change this only if you are
        pointing a local or staging binder at a different empty project.
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
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        ) : null}
      </div>
      <LegalLinks />
    </div>
  )
}
