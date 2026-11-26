// Left & Right rails of the 3-column editorial monochrome Aionyn shell. AGPL-3.0-only.
import type { AitherNetPulse, PublicWorld } from '../api/public'
import { FALLBACK_CONNECTED_WORLDS, OPENAW_SSO_URL } from '../api/public'
import type { Viewer } from '../api/types'
import { BrandMark, MoonIcon, NavIcon, SunIcon } from './Icons'

export type ThemeMode = 'dark' | 'light'

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
  { name: 'openAW', note: 'SSO ↗', href: OPENAW_SSO_URL },
  { name: 'Eusyra', note: '↗', href: 'https://eusyra.aitherium.com/creators' },
  { name: 'Spaces', note: '↗', href: 'https://aitherium.com/spaces/' },
  { name: 'Shop', note: '↗', href: 'https://shop.aitherium.com/packs' },
  { name: 'GitHub', note: '↗', href: 'https://github.com/Aitherium/aionyn' },
] as const

export function LeftRail({
  route,
  viewer,
  signedIn,
  theme,
  onToggleTheme,
  signIn,
  signOut,
}: {
  route: string
  viewer: Viewer | null
  signedIn: boolean
  theme: ThemeMode
  onToggleTheme: () => void
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
      <div className="left-rail-top">
        <a className="brand-lockup" href="#/">
          <BrandMark size={18} className="brand-mark" />
          <span className="brand-text">Aionyn</span>
        </a>

        <nav className="rail-nav" aria-label="Sections">
          {PRIMARY_NAV.map(([href, label, match]) => (
            <a key={href} href={href} className="nav-item" aria-current={activeFor(match) ? 'page' : undefined}>
              <NavIcon name={match} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </div>

      <div className="left-rail-foot">
        {signedIn ? (
          <div className="account-row">
            <a
              className="account-link"
              href={viewer ? `#/u/${encodeURIComponent(viewer.username)}` : '#/spaces'}
              aria-current={viewer && route === `/u/${viewer.username}` ? 'page' : undefined}
            >
              <span className="avatar-xs" aria-hidden="true">
                {(viewer?.displayName || viewer?.username || 'A').slice(0, 1).toUpperCase()}
              </span>
              <span className="account-meta">
                <strong>{viewer?.displayName || 'Signed in'}</strong>
                <span className="mono">{viewer ? `@${viewer.username}` : 'loading…'}</span>
              </span>
            </a>
            <button className="linkish xs" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        ) : (
          <button className="primary full-w" type="button" onClick={signIn}>
            Sign in
          </button>
        )}

        <div className="rail-util-bar">
          <div className="rail-util-links">
            <a href="#/people" aria-current={route === '/people' ? 'page' : undefined}>Connections</a>
            <span>·</span>
            <a href="#/import" aria-current={route === '/import' ? 'page' : undefined}>Import</a>
          </div>
          <button
            className="theme-btn"
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </aside>
  )
}

function formatPulseSummary(pulse: AitherNetPulse | null, loading: boolean): string {
  if (loading && !pulse) return 'Checking mesh…'
  if (!pulse) return 'Offline'
  const parts: string[] = []
  if (pulse.onlineNodes !== null && pulse.onlineNodes !== undefined) {
    parts.push(`${pulse.onlineNodes} nodes`)
  }
  if (pulse.gpuNodes !== null && pulse.gpuNodes !== undefined) {
    parts.push(`${pulse.gpuNodes} GPUs`)
  } else if (pulse.totalProviders !== null && pulse.totalProviders !== undefined) {
    parts.push(`${pulse.totalProviders} providers`)
  }
  if (pulse.servedModels.length > 0) {
    parts.push(`${pulse.servedModels.length} model${pulse.servedModels.length === 1 ? '' : 's'}`)
  }
  if (parts.length > 0) return parts.join(' · ')
  return pulse.status === 'online' || pulse.status === 'healthy' ? 'Online' : pulse.status
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
  const online = pulse?.status === 'online' || pulse?.status === 'healthy'

  return (
    <aside className="right-rail" aria-label="Network pulse and ecosystem">
      <section className="rail-section" aria-label="AitherNet Live Pulse">
        <div className="rail-head">
          <h2 className="rail-heading">AitherNet</h2>
          <a href="#/network">Mesh →</a>
        </div>
        <div className="pulse-line">
          <span className={online ? 'status-dot on' : 'status-dot'} aria-hidden="true" />
          <span>{formatPulseSummary(pulse, pulseLoading)}</span>
        </div>
        {pulse && pulse.servedModels.length > 0 && (
          <p className="pulse-models">{pulse.servedModels.slice(0, 6).join(' · ')}</p>
        )}
      </section>

      <section className="rail-section" aria-label="Active Worlds and Discord Servers">
        <div className="rail-head">
          <h2 className="rail-heading">Worlds</h2>
          <a href="#/worlds">All</a>
        </div>
        {worldsLoading && worlds.length === 0 && <p className="muted xs">Syncing worlds…</p>}
        <ul className="rail-world-list">
          {shownWorlds.slice(0, 4).map(w => (
            <li key={w.slug}>
              <div className="rail-world-top">
                <a className="rail-world-name" href={`#/worlds/${encodeURIComponent(w.slug)}`}>{w.name}</a>
                {w.inviteUrl ? (
                  <a className="rail-world-ext" href={w.inviteUrl} target="_blank" rel="noopener noreferrer">
                    Discord ↗
                  </a>
                ) : (
                  <a className="rail-world-ext" href={w.workspaceUrl} target="_blank" rel="noopener noreferrer">
                    Workspace ↗
                  </a>
                )}
              </div>
              {w.description && <p className="rail-world-desc">{w.description}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="rail-section" aria-label="Aitherium Ecosystem">
        <div className="rail-head">
          <h2 className="rail-heading">Ecosystem</h2>
        </div>
        <ul className="rail-eco-list">
          {ECOSYSTEM_LINKS.map(item => (
            <li key={item.href}>
              <a className="rail-eco-link" href={item.href} target="_blank" rel="noopener noreferrer">
                <strong>{item.name}</strong>
                <span>{item.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
