// The signed-out home & public stream: real things only, never sample people. AGPL-3.0-only.
import { useEffect, useState } from 'react'
import {
  FALLBACK_CONNECTED_WORLDS,
  OPENAW_SSO_URL,
  fetchPublicFeed,
  type PublicFeedItem,
  type PublicWorld,
} from '../api/public'
import { PostCard } from '../components/PostCard'

export interface World { name: string; summary: string; discord: string }

export const CONNECTED_WORLDS: World[] = FALLBACK_CONNECTED_WORLDS.map(w => ({
  name: w.name,
  summary: w.description,
  discord: w.inviteUrl || 'https://discord.gg/zSvECrMjE',
}))

type SourceFilter = 'all' | 'relay' | 'forum' | 'openaw'

export function WelcomeView({
  signIn,
  apiBase,
  publicWorlds = [],
}: {
  signIn: () => void
  apiBase?: string
  publicWorlds?: PublicWorld[]
}) {
  const [items, setItems] = useState<PublicFeedItem[]>([])
  const [loading, setLoading] = useState(Boolean(apiBase))
  const [degradedNote, setDegradedNote] = useState('')
  const [filter, setFilter] = useState<SourceFilter>('all')

  useEffect(() => {
    if (!apiBase) return
    let live = true
    setLoading(true)
    fetchPublicFeed(apiBase)
      .then(res => {
        if (!live) return
        setItems(res.data)
        setDegradedNote(res.degraded ? res.note || 'Some upstream sources are syncing.' : '')
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => { live = false }
  }, [apiBase])

  const filtered = filter === 'all' ? items : items.filter(i => i.source === filter)
  const worlds = publicWorlds.length > 0 ? publicWorlds : FALLBACK_CONNECTED_WORLDS

  return (
    <section className="stack" aria-label="Welcome and public stream">
      <div className="card hero-banner stack-sm">
        <div className="row between wrap">
          <span className="pill accent">Aitherium Open Social Network</span>
          <span className="mono dim small">Earned reputation · Zero fake profiles</span>
        </div>
        <h1>One Aitherium identity across Spaces, Worlds, Forums, Discord &amp; AitherNet.</h1>
        <p className="dim">
          Aionyn connects your public AitherSpace, Relay channels, World forums, Discord bridges, and
          free OIDC service vault. Private rooms and personal standing stay strictly gated until you sign in.
        </p>
        <div className="row wrap">
          <button className="primary" type="button" onClick={signIn}>Sign in with Aitherium</button>
          <a className="link" href={OPENAW_SSO_URL} target="_blank" rel="noopener noreferrer">Launch openAW (SSO) ↗</a>
          <a className="link" href="#/vault">Service vault</a>
          <a className="link" href="#/spaces">Explore Spaces</a>
        </div>
      </div>

      <section className="stack" aria-label="Public social stream">
        <div className="row between wrap">
          <h2 className="section-heading">Public Stream</h2>
          <div className="filter-pills" role="group" aria-label="Filter public stream">
            {(['all', 'relay', 'forum', 'openaw'] as const).map(f => (
              <button
                key={f}
                type="button"
                className={filter === f ? 'chip-btn active' : 'chip-btn'}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'openaw' ? 'openAW' : f === 'forum' ? 'Forums' : 'Relay'}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="card dim">Loading public Relay rooms, forum highlights, and openAW updates…</div>}
        {!loading && degradedNote && (
          <div className="card notice-banner">
            <strong>Public discovery syncing</strong>
            <p className="dim small">{degradedNote} Sign in with Aitherium to read your member rooms directly.</p>
          </div>
        )}
        {!loading && !degradedNote && filtered.length === 0 && (
          <div className="card dim">
            No public posts in this view right now. Sign in with Aitherium to post or view your member rooms.
          </div>
        )}
        {filtered.map(item => (
          <PostCard key={item.id} item={item} />
        ))}
      </section>

      <section className="stack" aria-label="Connected worlds">
        <div className="row between wrap">
          <h2 className="section-heading">Connected Worlds</h2>
          <a className="mono small" href="#/worlds">Browse all worlds →</a>
        </div>
        <p className="dim">
          Each World links an AitherOS Workspace, AitherRelay rooms &amp; forums, and a bridged Discord server.
        </p>
        <ul className="grid">
          {worlds.map(w => (
            <li key={w.slug} className="card stack-sm">
              <div className="row between">
                <h2><a href={`#/worlds/${encodeURIComponent(w.slug)}`}>{w.name}</a></h2>
                {typeof w.members === 'number' && <span className="pill">{w.members} members</span>}
              </div>
              <p className="dim">{w.description || 'Connected Aitherium World and Discord community.'}</p>
              {w.bridgedChannels.length > 0 && (
                <div className="post-chips">
                  {w.bridgedChannels.slice(0, 4).map(ch => <span key={ch} className="pill">{ch}</span>)}
                </div>
              )}
              <div className="row wrap">
                {w.inviteUrl && (
                  <a className="link" href={w.inviteUrl} target="_blank" rel="noopener noreferrer">Join on Discord</a>
                )}
                <a className="link" href={`#/worlds/${encodeURIComponent(w.slug)}`}>Open World</a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
