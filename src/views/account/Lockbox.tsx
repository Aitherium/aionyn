// Account › Security › Personal Lockbox: the member's own BYO provider keys, write-only.
// Lists names + masked hints from the server; a value is sent once and never shown again.
// AGPL-3.0-only.
import { useState, type FormEvent } from 'react'
import { SECRET_NAME, shortDate, type AccountApi, type LockboxSecret } from '../../api/account'
import { Feedback, Loading, messageOf, useResource } from './shared'

const PRESETS = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY'] as const

/** A hint from the server, or a fixed mask: never anything derived from a typed value. */
export function maskedHint(s: LockboxSecret): string {
  const h = (s.hint || '').trim()
  return h ? (h.includes('•') || h.includes('…') || h.includes('*') ? h : `••••${h.slice(-4)}`) : '••••••••'
}

export function Lockbox({ api }: { api: AccountApi }) {
  const res = useResource(() => api.lockbox())
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const unavailable = res.data?.available === false
  const secrets = res.data?.secrets || []

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim().toUpperCase()
    if (!SECRET_NAME.test(n)) { setErr('Use an env-style name, e.g. OPENAI_API_KEY.'); return }
    if (!value) { setErr('Paste the key value.'); return }
    const v = value
    setValue('')                 // the raw value leaves component state before the request returns
    setBusy('save'); setOk(''); setErr('')
    try {
      const r = await api.putSecret(n, v)
      setName('')
      setOk(`${r.name || n} stored. Its value is write-only and will not be shown again.`)
      await res.reload()
    } catch (e2) {
      setErr(messageOf(e2, 'Could not store the secret.'))
    } finally {
      setBusy('')
    }
  }
  const remove = async (n: string) => {
    setBusy(n); setOk(''); setErr('')
    try {
      await api.deleteSecret(n)
      setOk(`${n} deleted.`)
      res.setData(d => d ? { ...d, count: Math.max(0, (d.count ?? 1) - 1), secrets: (d.secrets || []).filter(s => s.name !== n) } : d)
      await res.reload()
    } catch (e2) {
      setErr(messageOf(e2, 'Could not delete the secret.'))
    } finally {
      setBusy('')
    }
  }

  return (
    <section aria-label="Personal Lockbox">
      <div className="section-bar">
        <span>Personal Lockbox · BYO API keys{res.data && !unavailable ? <span className="tnum"> · {secrets.length}</span> : null}</span>
      </div>
      <p className="lockbox-note">
        Your own provider keys for World Studio Pro and your personal agents. Values are encrypted,
        scoped to your account, and write-only: Aionyn never displays a stored value.
      </p>
      <Feedback ok={ok} err={err || res.err} />
      {res.loading && !res.data && <Loading what="your Lockbox" />}
      {unavailable && (
        <div className="empty-state">{res.data?.reason || 'The Lockbox is not available right now.'}</div>
      )}
      {res.data && !unavailable && secrets.length === 0 && <div className="empty-state">No secrets stored yet.</div>}
      <ul className="list-rows">
        {secrets.map(s => (
          <li key={s.name} className="kv-row">
            <span className="kv-label tnum-mono">{s.name}</span>
            <span className="kv-value">
              <span className="tnum-mono" aria-label={`${s.name} hint`}>{maskedHint(s)}</span>
              <span className="kv-sub tnum">{s.type ? `${s.type} · ` : ''}updated {shortDate(s.updated_at)}</span>
            </span>
            <span className="kv-action">
              <button className="ghost btn-sm" type="button" disabled={busy === s.name} onClick={() => void remove(s.name)}>
                {busy === s.name ? 'Deleting…' : 'Delete'}
              </button>
            </span>
          </li>
        ))}
      </ul>
      {!unavailable && (
        <form className="lockbox-form" onSubmit={save} aria-label="Add secret" autoComplete="off">
          <input aria-label="Secret name" placeholder="OPENAI_API_KEY" list="lockbox-presets" value={name}
            maxLength={64} spellCheck={false} autoCapitalize="characters"
            onChange={e => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))} />
          <datalist id="lockbox-presets">{PRESETS.map(p => <option key={p} value={p} />)}</datalist>
          <input aria-label="Secret value" type="password" placeholder="Paste key (write-only)" value={value}
            autoComplete="new-password" spellCheck={false} onChange={e => setValue(e.target.value)} />
          <button className="primary btn-sm" type="submit" disabled={busy === 'save' || !name || !value}>
            {busy === 'save' ? 'Storing…' : 'Add secret'}
          </button>
        </form>
      )}
    </section>
  )
}
