// Account › Services: the member's Aitherium service grants, activate / deactivate. AGPL-3.0-only.
import { useState } from 'react'
import type { AccountApi, CatalogService } from '../../api/account'
import { OPENAW_SSO_URL } from '../../api/public'
import type { Viewer } from '../../api/types'
import { ECOSYSTEM_SERVICES } from './Overview'
import { Feedback, Loading, messageOf, useResource } from './shared'

export function ServicesTab({ api, viewer }: { api: AccountApi; viewer: Viewer | null }) {
  const { data, err, loading, reload } = useResource(() => api.services())
  const [busy, setBusy] = useState('')
  const [ok, setOk] = useState('')
  const [actErr, setActErr] = useState('')

  const toggle = async (svc: CatalogService) => {
    if (!svc.action) return
    const verb = svc.action === 'Activate' ? 'activate' : 'deactivate'
    setBusy(svc.key); setOk(''); setActErr('')
    try {
      const r = await api.setService(svc.key, verb)
      setOk(r.status === 'checkout_required'
        ? `${svc.name} requires checkout (${r.sku || svc.price}) before activation.`
        : `${svc.name} is now ${r.status || (verb === 'activate' ? 'active' : 'inactive')}.`)
      await reload()
    } catch (e) {
      setActErr(messageOf(e, `Could not ${verb} ${svc.name}.`))
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <div className="kv-row">
        <span className="kv-label">Aitherium account</span>
        <span className="kv-value">
          {viewer ? <><strong>{viewer.displayName}</strong> <span className="mono muted">@{viewer.username}</span></> : 'Signed in'}
        </span>
        <span className="kv-action">
          {viewer && <a className="small dim" href={`#/u/${encodeURIComponent(viewer.username)}`}>View profile</a>}
        </span>
      </div>
      <div className="pane-section">
        <p className="dim small">
          One Aitherium identity unlocks every ecosystem service with silent sign-in.
          Activate only what you want; deactivating revokes that service&apos;s tokens immediately.
        </p>
      </div>
      <Feedback ok={ok} err={actErr || err} />
      {loading && !data && <Loading what="your services" />}
      {data ? (
        <>
          <div className="section-bar">Services</div>
          <ul className="list-rows">
            {data.services.map(svc => {
              const sso = svc.key === 'openaw' && svc.status === 'active'
              const href = sso ? OPENAW_SSO_URL : svc.url
              return (
                <li key={svc.key} className="list-row stack-xs">
                  <div className="row between wrap">
                    <div className="row">
                      <strong className="thread-link">{svc.name}</strong>
                      <span className={svc.status === 'active' ? 'status-dot on' : 'status-dot'} aria-hidden="true" />
                      <span className="xs muted">{svc.status}</span>
                    </div>
                    <div className="row">
                      {href && <a className="small dim" href={href} rel="noopener noreferrer">{sso ? 'Open with SSO ↗' : 'Open ↗'}</a>}
                      {svc.action && (
                        <button
                          className={svc.action === 'Activate' ? 'primary btn-sm' : 'ghost btn-sm'}
                          type="button"
                          disabled={busy === svc.key}
                          onClick={() => void toggle(svc)}
                        >
                          {busy === svc.key ? 'Working…' : svc.action}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="dim small">{svc.line}</p>
                </li>
              )
            })}
          </ul>
          {data.bundles.length > 0 && (
            <>
              <div className="section-bar">Bundles</div>
              <ul className="list-rows">
                {data.bundles.map(b => (
                  <li key={b.key} className="list-row stack-xs">
                    <div className="row">
                      <strong className="thread-link">{b.name}</strong>
                      <span className={b.status === 'active' ? 'status-dot on' : 'status-dot'} aria-hidden="true" />
                      <span className="xs muted">{b.status}</span>
                    </div>
                    <p className="dim small">{b.line}</p>
                    <p className="xs muted">Includes: {b.services.join(' · ')}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : !loading && (
        <>
          <div className="section-bar">
            Ecosystem services
            <button className="linkish xs" type="button" onClick={() => void reload()}>Retry</button>
          </div>
          <ul className="list-rows">
            {ECOSYSTEM_SERVICES.map(svc => (
              <li key={svc.key} className="list-row stack-xs">
                <div className="row between wrap">
                  <strong className="thread-link">{svc.name}</strong>
                  <a className="small dim" href={svc.url} rel="noopener noreferrer">Visit ↗</a>
                </div>
                <p className="dim small">{svc.line}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
