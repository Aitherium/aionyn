// The 3-column editorial Aionyn social shell: navigation, public discovery, sign-in, hash routes.
// AGPL-3.0-only.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LiveClient } from './api/live'
import {
  OPENAW_SSO_URL,
  fetchAitherNetPulse,
  fetchPublicWorlds,
  type AitherNetPulse,
  type PublicWorld,
} from './api/public'
import type { NetworkClient, Viewer } from './api/types'
import { DEFAULT_OIDC, authorizeUrl, handleCallback, readToken, signOut } from './auth/oidc'
import { LeftRail, RightRail, type ThemeMode } from './components/ShellRails'
import { ForumsView } from './views/Forums'
import { ImportView } from './views/Import'
import { JobsView } from './views/Jobs'
import { FeedView, PeopleView } from './views/Lists'
import { MessagesView } from './views/Messages'
import { NetworkView } from './views/Network'
import { ProfileView } from './views/Profile'
import { SpacesView } from './views/Spaces'
import { VaultView } from './views/Vault'
import { WelcomeView } from './views/Welcome'
import { WorldView } from './views/World'
import { WorldsView } from './views/Worlds'

const THEME_KEY = 'aionyn.theme'

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {}
export const API_BASE = env.VITE_WESYN_API_BASE ?? 'https://api.aitherium.com'
const OIDC = {
  ...DEFAULT_OIDC,
  clientId: env.VITE_WESYN_OIDC_CLIENT || DEFAULT_OIDC.clientId,
  redirectUri: env.VITE_WESYN_OIDC_REDIRECT || DEFAULT_OIDC.redirectUri,
}
const OIDC_API = { ...OIDC, issuer: env.VITE_WESYN_OIDC_API || OIDC.issuer }
const USERINFO = `${OIDC_API.issuer}/oidc/userinfo`

/** The pre-2026-11-15 route: `#/planets` is now `#/worlds`. */
export function legacyRoute(hash: string): string | null {
  return hash === '#/planets' ? '#/worlds' : null
}

/** The sibling domains across the Aitherium ecosystem (live doors only). */
export const FAMILY_SITES: ReadonlyArray<readonly [string, string]> = [
  ['aitherium.com', 'https://aitherium.com/'],
  ['aitherium.org', 'https://aitherium.org/'],
  ['openaw.org', OPENAW_SSO_URL],
  ['wesyn.org', 'https://wesyn.org/'],
  ['eusyra studio', 'https://eusyra.aitherium.com/creators'],
  ['shop', 'https://shop.aitherium.com/packs'],
  ['awpack', 'https://aitherium.github.io/awpack/'],
]

function readStoredTheme(): ThemeMode {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function useHash(): [string, (h: string) => void] {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const on = () => {
      const h = window.location.hash || '#/'
      const moved = legacyRoute(h)
      if (moved) { window.history.replaceState(null, '', moved); setHash(moved) } else setHash(h)
    }
    on()
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return [hash, (h: string) => { window.location.hash = h }]
}

export default function App() {
  const [hash, go] = useHash()
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme)
  const [token, setToken] = useState<string | null>(() => readToken(sessionStorage))
  const [viewer, setViewer] = useState<Viewer | null>(null)
  const [authErr, setAuthErr] = useState('')
  const [pulse, setPulse] = useState<AitherNetPulse | null>(null)
  const [pulseLoading, setPulseLoading] = useState(true)
  const [publicWorlds, setPublicWorlds] = useState<PublicWorld[]>([])
  const [worldsLoading, setWorldsLoading] = useState(true)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore storage restrictions */ }
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  useEffect(() => {
    const search = window.location.search
    if (!search) return
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    handleCallback(OIDC_API, sessionStorage, search).then(r => {
      if (r.kind === 'none') return
      window.history.replaceState(null, '', window.location.pathname + (r.kind === 'ok' ? r.returnTo : '#/'))
      if (r.kind === 'ok') { setToken(r.token); window.dispatchEvent(new HashChangeEvent('hashchange')) }
      else setAuthErr(r.message)
    })
  }, [])

  // Signed out = no client. Aionyn never shows sample people (owner, 2026-11-14).
  const client: NetworkClient | null = useMemo(
    () => (token ? new LiveClient({ apiBase: API_BASE, userinfoUrl: USERINFO, token }) : null),
    [token],
  )
  useEffect(() => {
    if (!client) { setViewer(null); return }
    let live = true
    client.viewer().then(v => {
      if (!live) return
      if (!v) { signOut(sessionStorage); setToken(null); setAuthErr('Your sign-in expired.') }
      setViewer(v)
    }).catch(() => { if (live) setViewer(null) })
    return () => { live = false }
  }, [client])

  const loadPulse = useCallback(() => {
    setPulseLoading(true)
    fetchAitherNetPulse(API_BASE)
      .then(r => setPulse(r.data))
      .finally(() => setPulseLoading(false))
  }, [])

  useEffect(() => {
    loadPulse()
    let live = true
    setWorldsLoading(true)
    fetchPublicWorlds(API_BASE)
      .then(r => { if (live) setPublicWorlds(r.data) })
      .finally(() => { if (live) setWorldsLoading(false) })
    return () => { live = false }
  }, [loadPulse])

  const signIn = async () => { window.location.href = await authorizeUrl(OIDC, sessionStorage, hash) }
  const leave = () => { signOut(sessionStorage); setToken(null); setAuthErr('') }

  const rawRoute = hash.replace(/^#/, '') || '/'
  const [route, queryStr] = rawRoute.split('?')
  const params = new URLSearchParams(queryStr || '')
  const user = route.startsWith('/u/') ? decodeURIComponent(route.slice(3)) : ''
  const world = route.startsWith('/worlds/')
    ? decodeURIComponent(route.slice(8))
    : route.startsWith('/w/')
      ? decodeURIComponent(route.slice(3))
      : ''
  const matchedPublicWorld = world ? publicWorlds.find(w => w.slug === world) : undefined

  const renderCenter = () => {
    if (route === '/vault') return <VaultView idpBase={OIDC_API.issuer} token={token} signIn={signIn} />
    if (route === '/network') return <NetworkView pulse={pulse} loading={pulseLoading} onRefresh={loadPulse} />
    if (route === '/forums') return <ForumsView client={client} apiBase={API_BASE} signIn={signIn} />
    if (route === '/spaces') {
      return <SpacesView apiBase={API_BASE} go={go} me={viewer?.username || ''} signedIn={Boolean(client)} signIn={signIn} />
    }
    if (route === '/worlds') {
      return <WorldsView client={client} go={go} publicWorlds={publicWorlds} signIn={signIn} />
    }
    if (route === '/messages') {
      return <MessagesView client={client} initialTo={params.get('to') || ''} me={viewer?.username || ''} signIn={signIn} />
    }
    if (route === '/import') return <ImportView />

    if (world) {
      if (!client) {
        return (
          <section className="stack" aria-label="Sign in required for World">
            <header className="stream-header">
              <h1>{matchedPublicWorld?.name || world}</h1>
              <a className="small dim" href="#/worlds">All worlds</a>
            </header>
            <div className="pane-section stack-sm">
              <p className="dim">Sign in with Aitherium to open this World&apos;s Relay rooms, live chat, and forum.</p>
              <div className="row wrap">
                <button className="primary" type="button" onClick={signIn}>Sign in with Aitherium</button>
                {matchedPublicWorld?.inviteUrl && (
                  <a className="link" href={matchedPublicWorld.inviteUrl} target="_blank" rel="noopener noreferrer">
                    Join on Discord ↗
                  </a>
                )}
              </div>
            </div>
          </section>
        )
      }
      return <WorldView client={client} slug={world} me={viewer?.username || ''} publicWorld={matchedPublicWorld} />
    }

    if (user) {
      if (!client) {
        return (
          <section className="stack" aria-label="Sign in to view full profile">
            <header className="stream-header">
              <h1>@{user}</h1>
              <a className="small dim" href="#/spaces">Spaces</a>
            </header>
            <div className="pane-section stack-sm">
              <p className="dim">
                Sign in with Aitherium to view @{user}&apos;s standing, Space blocks, and connection status.
              </p>
              <div className="row wrap">
                <button className="primary" type="button" onClick={signIn}>Sign in with Aitherium</button>
                <a
                  className="link"
                  href={`https://aitherium.com/spaces/${encodeURIComponent(user)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open public Space on aitherium.com ↗
                </a>
              </div>
            </div>
          </section>
        )
      }
      return <ProfileView client={client} username={user} go={go} me={viewer?.username || ''} />
    }

    if (route === '/people') {
      return client
        ? <PeopleView client={client} go={go} />
        : (
          <section className="stack" aria-label="Connections">
            <header className="stream-header"><h1>Connections</h1></header>
            <div className="pane-section stack-sm">
              <p className="dim">Sign in with Aitherium to view your connections and requests, or browse public <a href="#/spaces">AitherSpaces</a>.</p>
              <div><button className="primary" type="button" onClick={signIn}>Sign in with Aitherium</button></div>
            </div>
          </section>
        )
    }

    if (route === '/jobs') {
      return client
        ? <JobsView client={client} />
        : (
          <section className="stack" aria-label="Jobs">
            <header className="stream-header"><h1>Jobs</h1></header>
            <div className="pane-section stack-sm">
              <p className="dim">Sign in with Aitherium to see jobs posted in your Worlds. Paid work in Occupy SaaS runs on its Discord bounty board.</p>
              <div><button className="primary" type="button" onClick={signIn}>Sign in with Aitherium</button></div>
            </div>
          </section>
        )
    }

    if (route === '/') {
      return client
        ? <FeedView client={client} apiBase={API_BASE} />
        : <WelcomeView signIn={signIn} apiBase={API_BASE} />
    }

    return (
      <div className="pane-section">
        <p className="err" role="alert">No such page. <a href="#/">Back to the feed</a></p>
      </div>
    )
  }

  return (
    <div className="app-frame">
      <div className="shell-grid">
        <LeftRail
          route={route}
          viewer={viewer}
          signedIn={Boolean(client)}
          theme={theme}
          onToggleTheme={toggleTheme}
          signIn={signIn}
          signOut={leave}
        />
        <main className="center-col">
          {authErr && <p className="notice-row err" role="alert">{authErr}</p>}
          {renderCenter()}
          <footer className="foot">
            Powered by <a href="https://aitherium.com/" rel="noopener noreferrer">Aitherium</a> · Open source (AGPL-3.0) ·{' '}
            <a href="https://github.com/Aitherium/aionyn" rel="noopener noreferrer">github.com/Aitherium/aionyn</a>
            <span className="family">
              {' · '}
              {FAMILY_SITES.map(([name, href], index) => (
                <span key={href}>
                  {index > 0 ? ' · ' : null}
                  <a href={href} rel="noopener noreferrer">{name}</a>
                </span>
              ))}
            </span>
          </footer>
        </main>
        <RightRail pulse={pulse} pulseLoading={pulseLoading} worlds={publicWorlds} worldsLoading={worldsLoading} />
      </div>
    </div>
  )
}
