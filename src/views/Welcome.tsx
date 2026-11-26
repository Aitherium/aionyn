// The signed-out public stream: calm editorial hairline feed, never sample people. AGPL-3.0-only.
import { useEffect, useState } from 'react'
import {
  FALLBACK_CONNECTED_WORLDS,
  fetchPublicFeed,
  type PublicFeedItem,
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
}: {
  signIn: () => void
  apiBase?: string
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

  return (
    <section className="stack" aria-label="Public social stream">
      <header className="stream-header">
        <h1>Feed</h1>
        <div className="tab-bar" role="tablist" aria-label="Filter public stream">
          {([
            ['all', 'All'],
            ['relay', 'Relay'],
            ['forum', 'Forums'],
            ['openaw', 'openAW'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={filter === key ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="signin-strip">
        <span>Sign in with Aitherium to post, join Worlds, and message.</span>
        <button className="primary btn-sm" type="button" onClick={signIn}>
          Sign in
        </button>
      </div>

      {loading && <div className="empty-state">Loading public stream…</div>}
      {!loading && degradedNote && (
        <div className="notice-row">
          <strong>Public discovery syncing.</strong> {degradedNote} Sign in to read your member rooms directly.
        </div>
      )}
      {!loading && !degradedNote && filtered.length === 0 && (
        <div className="empty-state">
          No public posts in this view right now. Sign in with Aitherium to post or view your member rooms.
        </div>
      )}
      {filtered.map(item => (
        <PostCard key={item.id} item={item} />
      ))}
    </section>
  )
}
