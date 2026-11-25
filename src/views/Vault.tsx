// Aionyn Vault & Service Catalog: one Aitherium identity, silent OIDC grants, instant revocation.
// AGPL-3.0-only.
import { useCallback, useEffect, useState } from 'react'

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
    line: 'Open-source project hub, search, Deep Research, and installable apps.',
    url: 'https://www.openaw.org/',
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
    line: 'Your public page, shown on Wesyn and in Discord.',
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
      <div className="card">
        <h2>Aionyn vault &amp; service catalog</h2>
        <p>
          One Aitherium identity unlocks every Aitherium ecosystem service with silent OIDC sign-in.
          Activate only what you want; deactivate any time to revoke every token minted for that service immediately.
        </p>
        {!token && (
          <p style={{ marginTop: 12 }}>
            <button className="primary" onClick={signIn}>Sign in with Aitherium</button>
            <span className="dim" style={{ marginLeft: 10 }}>to view live activation status and toggle grants.</span>
          </p>
        )}
      </div>

      {err && <p className="err" role="alert">{err}</p>}
      {notice && <p className="ok" role="status">{notice}</p>}
      {loading && <p className="dim">Loading catalog from Aitherium Identity…</p>}

      {token && catalog ? (
        <>
          <h2>Services</h2>
          <ul className="grid">
            {catalog.services.map(svc => (
              <li key={svc.key} className="card stack">
                <div>
                  <strong>{svc.name}</strong>
                  <span className={`tag${svc.status === 'active' ? ' ok' : ''}`}>{svc.status}</span>
                </div>
                <p className="dim">{svc.line}</p>
                <div className="row wrap">
                  {svc.url && (
                    <a className="link" href={svc.url} rel="noopener noreferrer">Open</a>
                  )}
                  {svc.action && (
                    <button
                      className={svc.action === 'Activate' ? 'primary' : 'ghost'}
                      disabled={busyKey === svc.key}
                      onClick={() => void toggleService(svc)}
                    >
                      {busyKey === svc.key ? 'Working…' : svc.action}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {catalog.bundles.length > 0 && (
            <>
              <h2>Bundles</h2>
              <p className="dim">
                Bundles activate multiple services in one hardware-signed step using an enrolled Aither device key.
              </p>
              <ul className="grid">
                {catalog.bundles.map(b => (
                  <li key={b.key} className="card stack">
                    <div>
                      <strong>{b.name}</strong>
                      <span className={`tag${b.status === 'active' ? ' ok' : ''}`}>{b.status}</span>
                    </div>
                    <p className="dim">{b.line}</p>
                    <p className="fine">Includes: {b.services.join(', ')}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <>
          <h2>Ecosystem services (sign in to activate)</h2>
          <ul className="grid">
            {STATIC_CATALOG_OVERVIEW.map(svc => (
              <li key={svc.key} className="card stack">
                <div>
                  <strong>{svc.name}</strong>
                  <span className="tag">sign in</span>
                </div>
                <p className="dim">{svc.line}</p>
                <div className="row wrap">
                  <a className="link" href={svc.url} rel="noopener noreferrer">Visit</a>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
