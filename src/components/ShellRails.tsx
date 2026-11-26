// Left & Right rails of the 3-column Aionyn social shell. AGPL-3.0-only.
import type { AitherNetPulse, PublicWorld } from '../api/public'
import { FALLBACK_CONNECTED_WORLDS, OPENAW_SSO_URL } from '../api/public'
import type { Viewer } from '../api/types'
import { avatarTone } from './PostCard'

export const PRIMARY_NAV = [
  ['#/', 'Feed', '/'],
  ['#/forums', 'Forums', '/forums'],
  ['#/worlds', 'Worlds', '/worlds'],
  ['#/spaces', 'Spaces', '/spaces'],
  ['#/messages', 'Messages', '/messages'],
  ['#/network', 'AitherNet', '/network'],
  ['#/vault', 'Vault', '/vault'],
] as const

export const ECOSYSTEM_LINKS = [
  { name: 'openAW', desc: '1-click Aionyn SSO hub & Deep Research', href: OPENAW_SSO_URL, badge: 'SSO' },
  { name: 'AitherSpaces', desc: 'Public identity & creator pages', href: 'https://aitherium.com/spaces/', badge: '' },
  { name: 'AitherOS Workspaces', desc: 'Teams, agents & Discord bridges', href: 'https://app.aitherium.com/', badge: '' },
  { name: 'Eusyra Studio', desc: 'Films, packs, stickers & music', href: 'https://eusyra.aitherium.com/creators', badge: '' },
  { name: 'Aitherium Shop', desc: 'Creator packs & ecosystem store', href: 'https://shop.aitherium.com/packs', badge: '' },
] as const

export function LeftRail({
  route,
  viewer,
  signedIn,
  signIn,
  signOut,
}: {
  route: string
  viewer: Viewer | null
  signedIn: boolean
  signIn: () => void
  signOut: () => void
}) {
  const activeFor = (match: string) => {
    if (match === '/') return route === '/'
    if (match === '/worlds') return route === '/worlds' || route.startsWith('/worlds/') || route.startsWith('/w/')
    if (match === '/spaces') return route === '/spaces' || route.startsWith('/u/')
    return route === match
  }

  return (
    <aside className="left-rail" aria-label="Primary navigation">
      <div className="rail-sticky">
        <a className="brand-lockup" href="#/">
          <img className="brand-logo" src="/logo.svg" alt="" width={34} height={34} />
          <span className="brand-text">
            aionyn<span className="beta">beta</span>
          </span>
        </a>

        <nav className="rail-nav" aria-label="Sections">
          {PRIMARY_NAV.map(([href, label, match]) => (
            <a key={href} href={href} className="nav-item" aria-current={activeFor(match) ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </nav>

        <div className="rail-cta stack-sm">
          <a className="openaw-btn" href={OPENAW_SSO_URL} target="_blank" rel="noopener noreferrer">
            <span>openAW</span>
            <span className="pill accent">1-click SSO ↗</span>
          </a>

          {signedIn ? (
            <div className="profile-pill">
              <a
                className="profile-pill-link"
                href={viewer ? `#/u/${encodeURIComponent(viewer.username)}` : '#/spaces'}
                aria-current={viewer && route === `/u/${viewer.username}` ? 'page' : undefined}
              >
                <span
                  className="avatar-xs"
                  style={{ background: avatarTone(viewer?.username || 'me') }}
                  aria-hidden
                >
                  {(viewer?.displayName || viewer?.username || 'A').slice(0, 1).toUpperCase()}
                </span>
                <span className="profile-pill-meta">
                  <strong>{viewer?.displayName || 'Signed in'}</strong>
                  <span className="mono dim">{viewer ? `@${viewer.username}` : 'loading…'}</span>
                </span>
              </a>
              <button className="ghost btn-sm" type="button" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : (
            <button className="primary full-w" type="button" onClick={signIn}>
              Sign in with Aitherium
            </button>
          )}
        </div>

        <div className="rail-util mono dim">
          <a href="#/people" aria-current={route === '/people' ? 'page' : undefined}>Connections</a>
          <span> · </span>
          <a href="#/import" aria-current={route === '/import' ? 'page' : undefined}>Import</a>
        </div>
      </div>
    </aside>
  )
}

export function RightRail({
  pulse,
  pulseLoading,
  worlds,
  worldsLoading,
}: {
  pulse: AitherNetPulse | null
  pulseLoading: boolean
  worlds: PublicWorld[]
  worldsLoading: boolean
}) {
  const shownWorlds = worlds.length > 0 ? worlds : FALLBACK_CONNECTED_WORLDS
  const status = pulse?.status || 'unavailable'
  const statusClass = status === 'online' || status === 'healthy' ? 'ok' : status === 'degraded' ? 'warn' : ''

  return (
    <aside className="right-rail" aria-label="Network pulse and ecosystem">
      <div className="rail-sticky stack">
        <section className="card rail-card" aria-label="AitherNet Live Pulse">
          <div className="card-head">
            <h2>AitherNet Live Pulse</h2>
            <span className={`pill ${statusClass}`}>
              {pulseLoading ? 'checking…' : status}
            </span>
          </div>
          {pulse && (pulse.onlineNodes !== null || pulse.totalProviders !== null) ? (
            <dl className="mini-stats">
              <div>
                <dt>nodes</dt>
                <dd>{pulse.onlineNodes ?? '—'}</dd>
              </div>
              <div>
                <dt>providers</dt>
                <dd>{pulse.totalProviders ?? '—'}</dd>
              </div>
              <div>
                <dt>models</dt>
                <dd>{pulse.servedModels.length}</dd>
              </div>
            </dl>
          ) : (
            <p className="dim small">
              {pulseLoading
                ? 'Reading live mesh telemetry…'
                : pulse?.note || 'AitherNet pulse is currently offline or syncing.'}
            </p>
          )}
          {pulse && pulse.servedModels.length > 0 && (
            <ul className="chips compact">
              {pulse.servedModels.slice(0, 5).map(m => (
                <li key={m} className="mono">{m}</li>
              ))}
            </ul>
          )}
          <p className="rail-card-foot">
            <a href="#/network">View AitherNet &amp; join as a node →</a>
          </p>
        </section>

        <section className="card rail-card" aria-label="Active Worlds and Discord Servers">
          <div className="card-head">
            <h2>Worlds &amp; Discord</h2>
            <a className="mono small" href="#/worlds">all</a>
          </div>
          {worldsLoading && worlds.length === 0 && <p className="dim small">Syncing public worlds…</p>}
          <ul className="rows compact">
            {shownWorlds.slice(0, 4).map(w => (
              <li key={w.slug} className="stack-xs">
                <div className="row between">
                  <a href={`#/worlds/${encodeURIComponent(w.slug)}`}><strong>{w.name}</strong></a>
                  {typeof w.members === 'number' && <span className="mono dim small">{w.members}</span>}
                </div>
                <div className="post-chips">
                  {w.guildName && <span className="pill discord">{w.guildName}</span>}
                  {w.bridgedChannels.slice(0, 2).map(ch => (
                    <span key={ch} className="pill">{ch}</span>
                  ))}
                </div>
                <div className="row wrap small">
                  {w.inviteUrl && (
                    <a href={w.inviteUrl} target="_blank" rel="noopener noreferrer">Discord invite ↗</a>
                  )}
                  <a className="dim" href={w.workspaceUrl} target="_blank" rel="noopener noreferrer">Workspace ↗</a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card rail-card" aria-label="Aitherium Ecosystem">
          <h2>Aitherium Ecosystem</h2>
          <ul className="rows compact">
            {ECOSYSTEM_LINKS.map(item => (
              <li key={item.href}>
                <a className="eco-link" href={item.href} target="_blank" rel="noopener noreferrer">
                  <span className="row between">
                    <strong>{item.name}</strong>
                    {item.badge && <span className="pill accent">{item.badge}</span>}
                  </span>
                  <span className="dim small">{item.desc}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  )
}
