// Aionyn Vault & Service Catalog: one Aitherium identity, silent OIDC grants, instant revocation.
// AGPL-3.0-only.
import { useCallback, useEffect, useState } from 'react'
import { OPENAW_SSO_URL } from '../api/public'

export interface CatalogService {
  key: string
  name: string
  line: string
  url: string
  status: 'active' | 'inactive' | 'unavailable'
  price: string
  always: boolean
  action: '' | 'Activate' | 'Deactivate'
}

export interface CatalogBundle {
  key: string
  name: string
  line: string
  services: string[]
  price: string
  status: 'active' | 'inactive' | 'unavailable'
}

export interface CatalogResponse {
  services: CatalogService[]
  bundles: CatalogBundle[]
}

export const STATIC_CATALOG_OVERVIEW: ReadonlyArray<{
  key: string
  name: string
  line: string
  url: string
}> = [
  {
    key: 'aitherium',
    name: 'Aitherium account',
    line: 'The one account every service below uses — identity, directory, workspaces, and passkeys.',
    url: 'https://app.aitherium.com/',
  },
  {
    key: 'openaw',
    name: 'openAW',
    line: 'Open-source project hub, search, Deep Research, and installable apps via Aionyn OIDC SSO.',
    url: OPENAW_SSO_URL,
  },
  {
    key: 'wesyn',
    name: 'Wesyn',
    line: 'Your profile and communities on the open network.',
    url: 'https://wesyn.aitherium.com/',
  },
  {
    key: 'eusyra',
    name: 'Eusyra Studio',
    line: 'Make films, packs, stickers, and music with the studio.',
    url: 'https://eusyra.aitherium.com/creators',
  },
  {
    key: 'spaces',
    name: 'Aither Spaces',
    line: 'Your public page, shown on Aionyn and in Discord.',
    url: 'https://aitherium.com/spaces/',
  },
  {
    key: 'relay',
    name: 'Relay chat',
    line: 'Rooms and direct messages, mirrored with Discord.',
    url: 'https://app.aitherium.com/',
  },
  {
    key: 'workspace',
    name: 'AitherOS workspace',
    line: 'Your team, agents, and apps in one place.',
    url: 'https://app.aitherium.com/',
  },
]

interface VaultProps {
  idpBase: string
  token: string | null
  signIn: () => void
}

export function VaultView({ idpBase, token, signIn }: VaultProps) {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState('')
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!token) {
      setCatalog(null)
      return
    }
    setLoading(true)
    setErr('')
    try {
      const r = await fetch(`${idpBase}/v1/aionyn/catalog`, {
        method: 'GET',
        credentials: 'omit',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { detail?: string } | null
        throw new Error(body?.detail || `Identity answered HTTP ${r.status}`)
      }
      setCatalog((await r.json()) as CatalogResponse)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load service catalog.')
    } finally {
      setLoading(false)
    }
  }, [idpBase, token])

  useEffect(() => {
    void load()
  }, [load])

  const toggleService = async (svc: CatalogService) => {
    if (!token || !svc.action) return
    const verb = svc.action === 'Activate' ? 'activate' : 'deactivate'
    setBusyKey(svc.key)
    setErr('')
    setNotice('')
    try {
      const r = await fetch(`${idpBase}/v1/aionyn/services/${encodeURIComponent(svc.key)}/${verb}`, {
        method: 'POST',
        credentials: 'omit',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const body = (await r.json().catch(() => null)) as {
        status?: string
        sku?: string
        detail?: string
      } | null
      if (!r.ok) throw new Error(body?.detail || `Catalog ${verb} failed (HTTP ${r.status})`)
      if (body?.status === 'checkout_required') {
        setNotice(`${svc.name} requires checkout (${body.sku || svc.price}) before activation.`)
      } else {
        setNotice(`${svc.name} is now ${body?.status || (verb === 'activate' ? 'active' : 'inactive')}.`)
      }
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : `Could not ${verb} ${svc.name}.`)
    } finally {
      setBusyKey('')
    }
  }

  return (
    <section className="stack" aria-label="Vault and service catalog">
      <header className="stream-header">
        <h1>Aionyn vault</h1>
        {!token && (
          <button className="primary btn-sm" type="button" onClick={signIn}>
            Sign in
          </button>
        )}
      </header>

      <div className="pane-section">
        <p className="dim small">
          One Aitherium identity unlocks every ecosystem service with silent OIDC sign-in.
          Activate only what you want; deactivate any time to revoke tokens immediately.
        </p>
      </div>

      {err && <p className="notice-row err" role="alert">{err}</p>}
      {notice && <p className="notice-row ok" role="status">{notice}</p>}
      {loading && <div className="empty-state">Loading catalog from Aitherium Identity…</div>}

      {token && catalog ? (
        <>
          <div className="section-bar">Services</div>
          <ul className="list-rows">
            {catalog.services.map(svc => {
              const launchUrl = svc.key === 'openaw' && svc.status === 'active' ? OPENAW_SSO_URL : svc.url
              const launchLabel = svc.key === 'openaw' && svc.status === 'active' ? 'Open with SSO ↗' : 'Open ↗'
              return (
                <li key={svc.key} className="list-row stack-xs">
                  <div className="row between wrap">
                    <div className="row">
                      <strong className="thread-link">{svc.name}</strong>
                      <span className={svc.status === 'active' ? 'status-dot on' : 'status-dot'} aria-hidden="true" />
                      <span className="xs muted">{svc.status}</span>
                    </div>
                    <div className="row">
                      {launchUrl && (
                        <a className="small dim" href={launchUrl} rel="noopener noreferrer">{launchLabel}</a>
                      )}
                      {svc.action && (
                        <button
                          className={svc.action === 'Activate' ? 'primary btn-sm' : 'ghost btn-sm'}
                          type="button"
                          disabled={busyKey === svc.key}
                          onClick={() => void toggleService(svc)}
                        >
                          {busyKey === svc.key ? 'Working…' : svc.action}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="dim small">{svc.line}</p>
                </li>
              )
            })}
          </ul>

          {catalog.bundles.length > 0 && (
            <>
              <div className="section-bar">Bundles</div>
              <ul className="list-rows">
                {catalog.bundles.map(b => (
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
      ) : (
        <>
          <div className="section-bar">Ecosystem Services</div>
          <ul className="list-rows">
            {STATIC_CATALOG_OVERVIEW.map(svc => (
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
    </section>
  )
}
