// Top-level Forums (`#/forums`): unified World forums + public openAW updates & RFCs.
// AGPL-3.0-only.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ago } from '../api/helpers'
import { OPENAW_SSO_URL, fetchPublicFeed, type PublicFeedItem } from '../api/public'
import type { ForumBoard, ForumPost, ForumThread, NetworkClient, World } from '../api/types'
import { Markdown } from '../components/Markdown'

interface UnifiedThread extends ForumThread {
  worldSlug: string
  worldName: string
  boardName: string
}

export function ForumsView({
  client,
  apiBase,
  signIn,
}: {
  client: NetworkClient | null
  apiBase: string
  signIn: () => void
}) {
  const [worlds, setWorlds] = useState<World[]>([])
  const [boardsByWorld, setBoardsByWorld] = useState<Record<string, ForumBoard[]>>({})
  const [threads, setThreads] = useState<UnifiedThread[]>([])
  const [publicItems, setPublicItems] = useState<PublicFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState<{ slug: string; worldName: string; thread: ForumThread; posts: ForumPost[] } | null>(null)
  const [reply, setReply] = useState('')
  const [targetWorld, setTargetWorld] = useState('')
  const [targetBoard, setTargetBoard] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [msg, setMsg] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    setLoading(true)
    const loadPublic = fetchPublicFeed(apiBase).then(r => {
      if (!live) return
      setPublicItems(r.data.filter(i => i.source === 'forum' || i.source === 'openaw'))
    })

    const loadMember = async () => {
      if (!client) {
        if (live) { setWorlds([]); setBoardsByWorld({}); setThreads([]) }
        return
      }
      try {
        const ws = await client.worlds()
        if (!live) return
        setWorlds(ws)
        const bMap: Record<string, ForumBoard[]> = {}
        const all: UnifiedThread[] = []
        await Promise.all(ws.slice(0, 6).map(async w => {
          try {
            const bs = await client.world.boards(w.slug)
            bMap[w.slug] = bs
            await Promise.all(bs.slice(0, 4).map(async b => {
              try {
                const ts = await client.world.threads(w.slug, b.id)
                for (const t of ts) {
                  all.push({ ...t, worldSlug: w.slug, worldName: w.name, boardName: b.name })
                }
              } catch { /* board unreadable */ }
            }))
          } catch { /* workspace without forum yet */ }
        }))
        if (!live) return
        all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
        setBoardsByWorld(bMap)
        setThreads(all)
        const firstSlug = Object.keys(bMap).find(s => bMap[s].length > 0) || ''
        if (firstSlug && !targetWorld) {
          setTargetWorld(firstSlug)
          setTargetBoard(bMap[firstSlug][0]?.id || '')
        }
      } catch {
        if (live) setThreads([])
      }
    }

    Promise.all([loadPublic, loadMember()]).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, apiBase, tick])

  const openThread = async (slug: string, worldName: string, threadId: string) => {
    if (!client) return
    try {
      const res = await client.world.thread(slug, threadId)
      setOpen({ slug, worldName, ...res })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not open thread.')
    }
  }

  const startThread = async (e: FormEvent) => {
    e.preventDefault()
    if (!client || !targetWorld || !targetBoard) return
    const r = await client.world.startThread(targetWorld, targetBoard, title.trim(), body.trim())
    setMsg(r.message)
    if (r.ok) {
      setTitle(''); setBody(''); setTick(n => n + 1)
      if (r.id) {
        const w = worlds.find(x => x.slug === targetWorld)
        void openThread(targetWorld, w?.name || targetWorld, r.id)
      }
    }
  }

  const sendReply = async (e: FormEvent) => {
    e.preventDefault()
    if (!client || !open) return
    const r = await client.world.reply(open.slug, open.thread.id, reply.trim())
    setMsg(r.message)
    if (r.ok) {
      setReply('')
      void openThread(open.slug, open.worldName, open.thread.id)
      setTick(n => n + 1)
    }
  }

  const visibleThreads = useMemo(() => {
    if (filter === 'all') return threads
    if (filter === 'openaw') return []
    return threads.filter(t => t.worldSlug === filter)
  }, [threads, filter])

  const visiblePublic = useMemo(() => {
    if (filter === 'all') return publicItems
    if (filter === 'openaw') return publicItems.filter(i => i.source === 'openaw')
    return publicItems.filter(i => i.worldSlug === filter)
  }, [publicItems, filter])

  const targetBoards = boardsByWorld[targetWorld] || []

  return (
    <section className="stack" aria-label="Forums">
      <div className="card stack-sm">
        <div className="row between wrap">
          <h2>Forums &amp; RFCs</h2>
          <button className="ghost btn-sm" type="button" onClick={() => setTick(n => n + 1)}>Refresh</button>
        </div>
        <p className="dim">
          Unified discussions across every World forum you belong to, alongside public openAW updates and RFCs.
        </p>
        <div className="filter-pills" role="group" aria-label="Filter forums">
          <button type="button" className={filter === 'all' ? 'chip-btn active' : 'chip-btn'} onClick={() => setFilter('all')}>
            All
          </button>
          <button type="button" className={filter === 'openaw' ? 'chip-btn active' : 'chip-btn'} onClick={() => setFilter('openaw')}>
            openAW Updates &amp; RFCs
          </button>
          {worlds.map(w => (
            <button
              key={w.slug}
              type="button"
              className={filter === w.slug ? 'chip-btn active' : 'chip-btn'}
              onClick={() => setFilter(w.slug)}
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>

      {!client && (
        <div className="card notice-banner row between wrap">
          <span className="dim small">Sign in with Aitherium to browse your World forums, start threads, and post replies.</span>
          <button className="primary btn-sm" type="button" onClick={signIn}>Sign in</button>
        </div>
      )}

      {msg && <p className="ok" role="status">{msg}</p>}

      {open ? (
        <article className="card stack-sm" aria-label={`Thread: ${open.thread.title}`}>
          <div className="row between wrap">
            <button className="linkish" type="button" onClick={() => setOpen(null)}>← Back to all forums</button>
            <a className="mono small" href={`#/worlds/${encodeURIComponent(open.slug)}`}>{open.worldName}</a>
          </div>
          <h3>{open.thread.title}</h3>
          <ol className="rows">
            {open.posts.map(p => (
              <li key={p.id} className="stack-xs">
                <div>
                  <a href={`#/u/${encodeURIComponent(p.author)}`}>@{p.author}</a>
                  {p.agent && <span className="pill accent">agent</span>}
                  <span className="mono dim small"> · {ago(p.createdAt)}</span>
                </div>
                <Markdown text={p.body} />
              </li>
            ))}
          </ol>
          {client && !open.thread.locked && (
            <form className="stack-sm" onSubmit={sendReply}>
              <textarea
                aria-label="Reply text"
                rows={3}
                placeholder="Write a reply…"
                value={reply}
                onChange={e => setReply(e.target.value)}
              />
              <div className="row">
                <button className="primary" type="submit" disabled={!reply.trim()}>Post reply</button>
              </div>
            </form>
          )}
        </article>
      ) : (
        <>
          {client && Object.keys(boardsByWorld).some(k => boardsByWorld[k].length > 0) && (
            <form className="card stack-sm" onSubmit={startThread} aria-label="Start a forum thread">
              <h2>Start a thread</h2>
              <div className="row wrap">
                <select
                  aria-label="Target world"
                  value={targetWorld}
                  onChange={e => {
                    const slug = e.target.value
                    setTargetWorld(slug)
                    setTargetBoard(boardsByWorld[slug]?.[0]?.id || '')
                  }}
                >
                  {worlds.filter(w => (boardsByWorld[w.slug]?.length || 0) > 0).map(w => (
                    <option key={w.slug} value={w.slug}>{w.name}</option>
                  ))}
                </select>
                <select aria-label="Target board" value={targetBoard} onChange={e => setTargetBoard(e.target.value)}>
                  {targetBoards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <input
                aria-label="Thread title"
                placeholder="Thread title"
                maxLength={200}
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <textarea
                aria-label="Thread body"
                rows={3}
                placeholder="Write your proposal, RFC, or discussion…"
                value={body}
                onChange={e => setBody(e.target.value)}
              />
              <div>
                <button className="primary" type="submit" disabled={!title.trim() || !body.trim() || !targetBoard}>
                  Post thread
                </button>
              </div>
            </form>
          )}

          {loading && <div className="card dim">Loading World forums &amp; public RFCs…</div>}

          {visibleThreads.length > 0 && (
            <div className="card stack-sm">
              <h2>Your World Threads · {visibleThreads.length}</h2>
              <ul className="rows">
                {visibleThreads.map(t => (
                  <li key={`${t.worldSlug}:${t.id}`} className="stack-xs">
                    <div className="row between wrap">
                      <button
                        className="linkish thread-link"
                        type="button"
                        onClick={() => void openThread(t.worldSlug, t.worldName, t.id)}
                      >
                        {t.pinned ? '[pinned] ' : ''}{t.title}
                      </button>
                      <span className="pill">{t.worldName} · {t.boardName}</span>
                    </div>
                    <p className="mono dim small">
                      @{t.author} · {t.replies} repl{t.replies === 1 ? 'y' : 'ies'} · {ago(t.updatedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card stack-sm">
            <div className="row between wrap">
              <h2>Public Forums &amp; openAW RFCs</h2>
              <a className="mono small" href={OPENAW_SSO_URL} target="_blank" rel="noopener noreferrer">
                Open openAW ↗
              </a>
            </div>
            {visiblePublic.length === 0 ? (
              <p className="dim small">
                {loading
                  ? 'Checking public forum & openAW feeds…'
                  : 'No public forum threads or openAW RFC updates published in this filter yet.'}
              </p>
            ) : (
              <ul className="rows">
                {visiblePublic.map(item => (
                  <li key={item.id} className="stack-xs">
                    <div className="row between wrap">
                      <strong>{item.title || item.body.slice(0, 90)}</strong>
                      <span className="pill accent">{item.source === 'openaw' ? 'openAW' : item.channel}</span>
                    </div>
                    {item.title && <p className="dim small clamp">{item.body}</p>}
                    <p className="mono dim small">
                      @{item.author}
                      {item.timestamp ? ` · ${ago(item.timestamp)}` : ''}
                      {item.url && (
                        <>
                          {' · '}
                          <a href={item.url} target="_blank" rel="noopener noreferrer">Read on source ↗</a>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
