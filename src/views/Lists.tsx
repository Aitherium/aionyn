// Signed-in social feed and connections directory. AGPL-3.0-only.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { cleanHandle } from '../api/helpers'
import { fetchPublicFeed, type PublicFeedItem } from '../api/public'
import type { NetworkClient, People, Post } from '../api/types'
import { PostCard, type PostCardItem } from '../components/PostCard'
import { Composer, type PendingPost } from './Composer'

function useLoad<T>(load: () => Promise<T>, deps: unknown[]): { data: T | null; err: string } {
  const [data, setData] = useState<T | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let live = true
    setErr('')   // keep the last answer on screen while a refresh is in flight
    load().then(d => { if (live) setData(d) })
      .catch((e: unknown) => { if (live) setErr(e instanceof Error ? e.message : 'Could not load.') })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, err }
}

type FeedScope = 'all' | 'rooms' | 'public'

/** One conversation key: the same Relay line seen through the member feed and the public feed. */
function sameLine(p: { channel: string; author: string; body: string }): string {
  return `${p.channel.replace(/^#/, '').toLowerCase()}|${p.author.replace(/^@/, '').toLowerCase()}|${p.body.trim().slice(0, 120)}`
}

export function FeedView({ client, apiBase, me = '', signIn }: {
  client: NetworkClient; apiBase?: string; me?: string; signIn?: () => void
}) {
  const [reload, setReload] = useState(0)
  const [pending, setPending] = useState<PostCardItem | null>(null)
  const [scope, setScope] = useState<FeedScope>('all')
  const { data, err } = useLoad<Post[]>(() => client.feed(), [client, reload])
  const [pubItems, setPubItems] = useState<PublicFeedItem[]>([])

  useEffect(() => {
    if (!apiBase) return
    let live = true
    fetchPublicFeed(apiBase).then(r => { if (live) setPubItems(r.data) })
    return () => { live = false }
  }, [apiBase, reload])

  // The optimistic row stays until the refreshed feed answers (or the post fails).
  useEffect(() => { setPending(null) }, [data])
  const posting = ({ room, text }: PendingPost) => setPending({
    id: `pending:${Date.now()}`, author: me || 'you', body: text, timestamp: new Date().toISOString(),
    channel: room, source: 'relay', pending: true,
  })
  const posted = (ok: boolean) => { if (ok) setReload(n => n + 1); else setPending(null) }
  const social = useMemo(() => ({ client, me, signIn }), [client, me, signIn])

  const rooms = useMemo(() => [...new Set((data || []).map(p => p.channel))], [data])

  const combined = useMemo<PostCardItem[]>(() => {
    const memberPosts: PostCardItem[] = (data || []).map(p => ({
      id: p.id,
      author: p.author,
      body: p.body,
      timestamp: p.timestamp,
      channel: p.channel,
      source: 'relay',
      ...(p.messageId ? { messageId: p.messageId } : {}),
      ...(typeof p.replyCount === 'number' ? { replies: p.replyCount } : {}),
    }))
    if (scope === 'rooms') return memberPosts
    if (scope === 'public') return pubItems
    const seen = new Set(memberPosts.flatMap(p => [p.id, sameLine(p)]))
    const merged = [...memberPosts]
    for (const p of pubItems) {
      if (!seen.has(p.id) && !seen.has(sameLine(p))) merged.push(p)
    }
    return merged.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
  }, [data, pubItems, scope])

  return (
    <section className="stack" aria-label="Feed">
      <header className="stream-header">
        <h1>Feed</h1>
        <div className="tab-bar" role="tablist" aria-label="Feed filter">
          {([
            ['all', 'All'],
            ['rooms', 'My rooms'],
            ['public', 'Public'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={scope === key}
              className={scope === key ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setScope(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="linkish xs" type="button" onClick={() => setReload(n => n + 1)}>
          Refresh
        </button>
      </header>

      <Composer client={client} rooms={rooms} onPosting={posting} onPosted={posted} />
      {pending && scope !== 'public' && <PostCard item={pending} />}

      {err && <p className="notice-row err" role="alert">{err}</p>}
      {!data && !err && <div className="empty-state">Loading your rooms…</div>}
      {data && combined.length === 0 && (
        <div className="empty-state">Nothing yet in the rooms you can read. Join a World or post above.</div>
      )}
      {combined.map(item => (
        <PostCard key={item.id} item={item} social={social} />
      ))}
    </section>
  )
}

export function PeopleView({ client, go }: { client: NetworkClient; go: (h: string) => void }) {
  const [tick, setTick] = useState(0)
  const { data, err } = useLoad<People>(() => client.people(), [client, tick])
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const open = (e: FormEvent) => { e.preventDefault(); const h = cleanHandle(draft); if (h) go(`#/u/${h}`) }
  const accept = async (username: string) => {
    const r = await client.connect(username)
    setNote(r.message)
    if (r.ok) setTick(n => n + 1)
  }

  return (
    <section className="stack" aria-label="People">
      <header className="stream-header">
        <h1>Connections</h1>
        <a className="small dim" href="#/spaces">Spaces</a>
      </header>

      <div className="pane-section">
        <form className="row" onSubmit={open}>
          <input aria-label="Find a member" placeholder="Jump to @handle" value={draft} onChange={e => setDraft(e.target.value)} />
          <button className="primary" type="submit" disabled={!cleanHandle(draft)}>Open Space</button>
        </form>
      </div>

      {note && <p className="notice-row ok" role="status">{note}</p>}
      {err && <p className="notice-row err">{err}</p>}

      {data && data.incoming.length > 0 && (
        <>
          <div className="section-bar">Asked to connect · {data.incoming.length}</div>
          <ul className="list-rows">
            {data.incoming.map(r => (
              <li key={r.id} className="list-row row between wrap">
                <span>
                  <a href={`#/u/${encodeURIComponent(r.from.username)}`}><strong>{r.from.displayName}</strong></a>
                  {r.message && <span className="dim"> — {r.message}</span>}
                </span>
                <button className="primary btn-sm" type="button" onClick={() => void accept(r.from.username)}>
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="section-bar">Connections · {data?.connections.length ?? 0}</div>
      {data?.connections.length === 0 ? (
        <div className="empty-state">
          No connections yet. Browse <a href="#/spaces">AitherSpaces</a> or open a profile to connect.
        </div>
      ) : (
        <ul className="list-rows">
          {data?.connections.map(c => (
            <li key={c.username} className="list-row row between wrap">
              <span>
                <a href={`#/u/${encodeURIComponent(c.username)}`}><strong>{c.displayName}</strong></a>
                {' '}
                <span className="mono muted">@{c.username}</span>
              </span>
              <a className="small dim" href={`#/messages?to=${encodeURIComponent(c.username)}`}>Message</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
