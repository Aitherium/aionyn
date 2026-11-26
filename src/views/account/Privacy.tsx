// Account › Privacy & Data: visibility, consents, data export, import, recovery & deletion. AGPL-3.0-only.
// Deletion and recovery are never performed in the SPA: they hand off to the Aitherium IdP.
import { useEffect, useState } from 'react'
import { VISIBILITIES, type AccountApi, type Handoff, type Visibility } from '../../api/account'
import { ExtLink, Feedback, Loading, messageOf, useResource } from './shared'

function exportName(now = new Date()): string {
  return `aitherium-account-export-${now.toISOString().slice(0, 10).replace(/-/g, '')}.json`
}

export function PrivacyTab({ api, handoff }: { api: AccountApi; handoff: Handoff | null }) {
  const res = useResource(() => api.privacy())
  const [vis, setVis] = useState<Visibility | ''>('')
  const [busy, setBusy] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const d = res.data

  useEffect(() => { setVis(d?.space_visibility.value || '') }, [d])

  const patch = async (key: string, body: Parameters<AccountApi['savePrivacy']>[0], done: string) => {
    setBusy(key); setOk(''); setErr('')
    try {
      res.setData(await api.savePrivacy(body))
      setOk(done)
    } catch (e) {
      setErr(messageOf(e, 'Could not save.'))
    } finally {
      setBusy('')
    }
  }

  const download = async () => {
    setBusy('export'); setOk(''); setErr('')
    try {
      const blob = await api.exportData()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportName()
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setOk('Your export is downloading.')
    } catch (e) {
      setErr(messageOf(e, 'Could not prepare your export.'))
    } finally {
      setBusy('')
    }
  }

  const recovery = handoff?.account_recovery
  const deletion = d?.deletion.handoff_url || handoff?.delete_account
  const consents = Object.entries(d?.consents.items || {})

  return (
    <>
      <Feedback ok={ok} err={err || res.err} />
      {res.loading && !d && <Loading what="privacy settings" />}

      <div className="section-bar">Discoverability</div>
      {d && (
        <div className="form-row">
          <label htmlFor="acct-privacy-vis">Profile & Space</label>
          <div>
            {d.space_visibility.status === 'ok' ? (
              <div className="row">
                <select id="acct-privacy-vis" value={vis} onChange={e => { setVis(e.target.value as Visibility); setOk('') }}>
                  {!vis && <option value="">Not set</option>}
                  {VISIBILITIES.filter(([v]) => !d.space_visibility.options?.length || d.space_visibility.options.includes(v))
                    .map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
                <button className="primary btn-sm" type="button"
                  disabled={!vis || vis === d.space_visibility.value || busy === 'vis'}
                  onClick={() => vis && void patch('vis', { space_visibility: vis }, 'Visibility saved.')}>
                  {busy === 'vis' ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : <p className="small muted" style={{ paddingTop: 8 }}>Not available until you have a Space handle.</p>}
            <p className="hint">Public profiles appear in the Spaces directory; anything else is hidden from discovery.</p>
          </div>
        </div>
      )}

      {d && d.consents.status === 'ok' && consents.length > 0 && (
        <>
          <div className="section-bar">Consents</div>
          <ul className="list-rows">
            {consents.map(([key, c]) => (
              <li key={key} className="kv-row">
                <span className="kv-label">{key.replace(/_/g, ' ')}</span>
                <span className="kv-value dim small">{d.consents.purposes?.[key] || '—'}</span>
                <span className="kv-action">
                  <label className="check">
                    <input type="checkbox" checked={c.granted} disabled={!c.editable || busy === key}
                      onChange={e => void patch(key, { consents: { [key]: e.target.checked } }, 'Consent saved.')} />
                    {c.editable ? (c.granted ? 'On' : 'Off') : 'Required'}
                  </label>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="section-bar">Your data</div>
      <div className="kv-row">
        <span className="kv-label">Data export</span>
        <span className="kv-value dim small">A JSON copy of your account data, with secrets removed.</span>
        <span className="kv-action">
          <button className="ghost btn-sm" type="button" disabled={busy === 'export'} onClick={() => void download()}>
            {busy === 'export' ? 'Preparing…' : 'Download export'}
          </button>
        </span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Import</span>
        <span className="kv-value dim small">Bring a LinkedIn or other export in. It stays on this device.</span>
        <span className="kv-action"><a className="small dim" href="#/import">Open Import</a></span>
      </div>

      <div className="pane-section stack-xs">
        <p className="dim small">Account recovery and deletion happen on the Aitherium sign-in server, never in Aionyn.</p>
        <div className="row wrap" style={{ gap: 16 }}>
          <ExtLink href={recovery}>Account recovery</ExtLink>
          <ExtLink href={deletion}>Delete account</ExtLink>
        </div>
      </div>
    </>
  )
}
