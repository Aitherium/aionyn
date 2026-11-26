// Account › Security: sessions, devices, personal API keys, Lockbox, MFA/passkeys, linked accounts. AGPL-3.0-only.
// Passwords and passkey enrolment are never handled here: those link out to the Aitherium IdP.
import { useState } from 'react'
import { shortDate, type AccountApi, type ApiKeyCreated, type ApiKeyRow, type Handoff } from '../../api/account'
import { Lockbox } from './Lockbox'
import { ExtLink, Feedback, IdpLinks, Loading, messageOf, useResource } from './shared'

export function SecurityTab({ api, handoff }: { api: AccountApi; handoff: Handoff | null }) {
  return (
    <>
      <Sessions api={api} />
      <ApiKeys api={api} />
      <Lockbox api={api} />
      <SignInMethods api={api} handoff={handoff} />
      <Devices api={api} />
    </>
  )
}

function Sessions({ api }: { api: AccountApi }) {
  const res = useResource(() => api.sessions())
  const [busy, setBusy] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const others = (res.data?.sessions || []).filter(s => !s.is_current).length

  const run = async (id: string, act: () => Promise<{ revoked: number }>, done: (n: number) => string) => {
    setBusy(id); setOk(''); setErr('')
    try {
      const r = await act()
      setOk(done(r.revoked ?? 0))
      await res.reload()
    } catch (e) {
      setErr(messageOf(e, 'Could not revoke.'))
    } finally {
      setBusy('')
    }
  }

  return (
    <section aria-label="Active sessions">
      <div className="section-bar">
        <span>Active sessions{res.data ? <span className="tnum"> · {res.data.count}</span> : null}</span>
        {others > 0 && (
          <button className="linkish xs" type="button" disabled={busy === 'others'}
            onClick={() => void run('others', () => api.revokeOtherSessions(), n => `Revoked ${n} other session${n === 1 ? '' : 's'}.`)}>
            {busy === 'others' ? 'Revoking…' : 'Revoke other sessions'}
          </button>
        )}
      </div>
      <Feedback ok={ok} err={err || res.err} />
      {res.loading && !res.data && <Loading what="sessions" />}
      {res.data && res.data.sessions.length === 0 && <div className="empty-state">No browser sessions are signed in.</div>}
      <ul className="list-rows">
        {(res.data?.sessions || []).map(s => (
          <li key={s.id} className="kv-row">
            <span className="kv-label">{s.is_current ? 'This browser' : 'Browser session'}</span>
            <span className="kv-value">
              <span className="tnum-mono">{s.id.slice(0, 8)}…</span>
              <span className="kv-sub tnum">Signed in {shortDate(s.created_at)} · active {shortDate(s.last_active)}</span>
            </span>
            <span className="kv-action">
              {s.is_current ? <span className="xs muted">Current</span> : (
                <button className="ghost btn-sm" type="button" disabled={busy === s.id}
                  onClick={() => void run(s.id, () => api.revokeSession(s.id), () => 'Session revoked.')}>
                  {busy === s.id ? 'Revoking…' : 'Revoke'}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {res.data?.note && <p className="pane-section fine" style={{ marginTop: 0 }}>{res.data.note}</p>}
    </section>
  )
}

const EXPIRY = [30, 90, 365] as const

function ApiKeys({ api }: { api: AccountApi }) {
  const res = useResource(() => api.apiKeys())
  const [name, setName] = useState('')
  const [days, setDays] = useState<number>(90)
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const active = (res.data?.keys || []).filter((k: ApiKeyRow) => k.is_active !== false && !k.revoked_at)

  const create = async () => {
    if (!name.trim()) { setErr('Name the key first.'); return }
    setBusy('create'); setOk(''); setErr(''); setCopied(false)
    try {
      const r = await api.createApiKey(name.trim(), days)
      setCreated(r)
      setName('')
      if (r.keys?.length) res.setData({ count: r.keys.length, keys: r.keys })
      else await res.reload()
    } catch (e) {
      setErr(messageOf(e, 'Could not create the key.'))
    } finally {
      setBusy('')
    }
  }
  const revoke = async (k: ApiKeyRow) => {
    setBusy(k.id); setOk(''); setErr('')
    try {
      const r = await api.revokeApiKey(k.id)
      setOk(`Revoked ${k.name || 'key'}.`)
      if (created?.key.id === k.id) setCreated(null)
      if (r.keys?.length) res.setData({ count: r.keys.length, keys: r.keys })
      else await res.reload()
    } catch (e) {
      setErr(messageOf(e, 'Could not revoke the key.'))
    } finally {
      setBusy('')
    }
  }
  const copy = async () => {
    if (!created) return
    try { await navigator.clipboard.writeText(created.api_key); setCopied(true) } catch { setErr('Could not copy. Select the key and copy it manually.') }
  }

  return (
    <section aria-label="Personal API keys">
      <div className="section-bar"><span>Personal API keys{res.data ? <span className="tnum"> · {active.length}</span> : null}</span></div>
      {created && created.api_key && (
        <div className="secret-row" role="status">
          <strong className="small">{created.key.name} — copy this key now</strong>
          <code className="secret-value" data-testid="new-api-key">{created.api_key}</code>
          <p className="small err">{created.warning || 'Save this key now. It will not be shown again.'}</p>
          <div className="row">
            <button className="primary btn-sm" type="button" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button>
            <button className="ghost btn-sm" type="button" onClick={() => setCreated(null)}>Done</button>
          </div>
        </div>
      )}
      <Feedback ok={ok} err={err || res.err} />
      {res.loading && !res.data && <Loading what="API keys" />}
      {res.data && active.length === 0 && <div className="empty-state">No personal API keys yet.</div>}
      <ul className="list-rows">
        {active.map(k => (
          <li key={k.id} className="kv-row">
            <span className="kv-label">{k.name || 'Unnamed key'}</span>
            <span className="kv-value">
              <span className="tnum-mono">{k.prefix ? `${k.prefix}…` : k.id.slice(0, 10)}</span>
              {k.scopes?.length ? <span className="xs muted"> · {k.scopes.join(', ')}</span> : null}
              <span className="kv-sub tnum">
                Created {shortDate(k.created_at)} · expires {shortDate(k.expires_at)} · last used {shortDate(k.last_used)}
              </span>
            </span>
            <span className="kv-action">
              <button className="ghost btn-sm" type="button" disabled={busy === k.id} onClick={() => void revoke(k)}>
                {busy === k.id ? 'Revoking…' : 'Revoke'}
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form className="form-actions" onSubmit={e => { e.preventDefault(); void create() }} aria-label="Create API key">
        <input aria-label="Key name" placeholder="Key name, e.g. laptop CLI" value={name} maxLength={80}
          onChange={e => setName(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
        <select aria-label="Expires in" value={days} onChange={e => setDays(Number(e.target.value))}>
          {EXPIRY.map(d => <option key={d} value={d}>{d} days</option>)}
        </select>
        <button className="primary btn-sm" type="submit" disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create key'}</button>
      </form>
    </section>
  )
}

function onOff(v: boolean) {
  return <><span className={v ? 'status-dot inline on' : 'status-dot inline'} aria-hidden="true" />{v ? 'On' : 'Off'}</>
}

function SignInMethods({ api, handoff }: { api: AccountApi; handoff: Handoff | null }) {
  const res = useResource(() => api.security())
  const s = res.data
  const links = { ...(handoff || {}), ...(s?.handoff || {}) }
  const linkedRow = (label: string, linked: boolean | null, manage?: string, manageLabel = 'Link') => (
    <li className="kv-row" key={label}>
      <span className="kv-label">{label}</span>
      <span className="kv-value">{linked === null ? <span className="muted">Unavailable</span> : linked ? 'Linked' : <span className="muted">Not linked</span>}</span>
      <span className="kv-action">{!linked && <ExtLink href={manage}>{manageLabel}</ExtLink>}</span>
    </li>
  )
  return (
    <section aria-label="Sign-in methods">
      <div className="section-bar">Passkeys, two-factor & linked accounts</div>
      {res.loading && !s && <Loading what="sign-in methods" />}
      <Feedback err={res.err} />
      {s && (
        <ul className="list-rows">
          <li className="kv-row">
            <span className="kv-label">Two-factor</span>
            <span className="kv-value">{s.mfa.status === 'ok' ? onOff(s.mfa.two_factor_enabled) : <span className="muted">Unavailable</span>}
              {s.mfa.methods.length > 0 && <span className="kv-sub">{s.mfa.methods.map(m => m.name || m.type).join(' · ')}</span>}
            </span>
            <span className="kv-action"><ExtLink href={links.two_factor}>Manage</ExtLink></span>
          </li>
          <li className="kv-row">
            <span className="kv-label">Passkeys</span>
            <span className="kv-value">{s.passkeys.status === 'ok'
              ? <span className="tnum">{s.passkeys.count} registered</span> : <span className="muted">Unavailable</span>}
              {s.passkeys.credentials.length > 0 && (
                <span className="kv-sub">{s.passkeys.credentials.map(c => c.device_name || 'Passkey').join(' · ')}</span>
              )}
            </span>
            <span className="kv-action"><ExtLink href={links.passkeys}>Manage</ExtLink></span>
          </li>
          {linkedRow('GitHub', s.linked_accounts.status === 'ok' ? s.external.github.linked : null, links.linked_accounts)}
          {linkedRow('Discord', s.external.discord.linked, links.discord_link || links.linked_accounts)}
          <li className="kv-row">
            <span className="kv-label">openAW</span>
            <span className="kv-value">{s.external.openaw.status && s.external.openaw.status !== 'unavailable'
              ? s.external.openaw.status : <span className="muted">Unavailable</span>}</span>
            <span className="kv-action"><ExtLink href={s.external.openaw.sso_url}>Open with SSO</ExtLink></span>
          </li>
        </ul>
      )}
      <div className="pane-section stack-xs">
        <p className="dim small">Passwords, passkeys and recovery are changed on the Aitherium sign-in server, never in Aionyn.</p>
        <IdpLinks handoff={links} />
      </div>
    </section>
  )
}

function Devices({ api }: { api: AccountApi }) {
  const res = useResource(() => api.devices())
  const d = res.data
  return (
    <section aria-label="Connected devices">
      <div className="section-bar">
        <span>Connected devices{d && d.status === 'linked' ? <span className="tnum"> · {d.count}</span> : null}</span>
        {d && <ExtLink href={d.manage_url} className="xs">Manage</ExtLink>}
      </div>
      {res.loading && !d && <Loading what="devices" />}
      <Feedback err={res.err} />
      {d && d.status === 'none' && <div className="empty-state">No devices are linked to your account.</div>}
      {d && (d.status === 'unknown' || d.status === 'unavailable') && (
        <div className="empty-state">Your device list is not available right now.</div>
      )}
      <ul className="list-rows">
        {(d?.devices || []).map((x, i) => (
          <li key={`${x.name}-${i}`} className="kv-row">
            <span className="kv-label">{x.kind || 'Device'}</span>
            <span className="kv-value">{x.name || 'Unnamed device'}<span className="kv-sub tnum">Last seen {shortDate(x.last_seen)}</span></span>
            <span className="kv-action">
              {x.healthy !== null && x.healthy !== undefined && (
                <span className="xs muted"><span className={x.healthy ? 'status-dot inline on' : 'status-dot inline'} aria-hidden="true" />{x.healthy ? 'healthy' : 'offline'}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
