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
      <header className="stream-header">
        <h1>Forums &amp; RFCs</h1>
        <button className="linkish xs" type="button" onClick={() => setTick(n => n + 1)}>
          Refresh
        </button>
      </header>

      <div className="tab-bar sub" role="tablist" aria-label="Filter forums">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={filter === 'all' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'openaw'}
          className={filter === 'openaw' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setFilter('openaw')}
        >
          openAW
        </button>
        {worlds.map(w => (
          <button
            key={w.slug}
            type="button"
            role="tab"
            aria-selected={filter === w.slug}
            className={filter === w.slug ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setFilter(w.slug)}
          >
            {w.name}
          </button>
        ))}
      </div>

      {!client && (
        <div className="signin-strip">
          <span>Sign in with Aitherium to browse your World forums, start threads, and reply.</span>
          <button className="primary btn-sm" type="button" onClick={signIn}>Sign in</button>
        </div>
      )}

      {msg && <p className="notice-row ok" role="status">{msg}</p>}

      {open ? (
        <article className="stack" aria-label={`Thread: ${open.thread.title}`}>
          <div className="pane-section stack-sm">
            <div className="row between wrap">
              <button className="linkish small" type="button" onClick={() => setOpen(null)}>← Back to forums</button>
              <a className="mono xs muted" href={`#/worlds/${encodeURIComponent(open.slug)}`}>{open.worldName}</a>
            </div>
            <h3>{open.thread.title}</h3>
          </div>
          <ol className="list-rows">
            {open.posts.map(p => (
              <li key={p.id} className="list-row stack-xs">
                <div className="small muted">
                  <a className="post-author-name" href={`#/u/${encodeURIComponent(p.author)}`}>@{p.author}</a>
                  {p.agent && <span> · agent</span>}
                  <span> · {ago(p.createdAt)}</span>
                </div>
                <Markdown text={p.body} />
              </li>
            ))}
          </ol>
          {client && !open.thread.locked && (
            <form className="pane-section stack-sm" onSubmit={sendReply}>
              <textarea
                aria-label="Reply text"
                rows={3}
                placeholder="Write a reply…"
                value={reply}
                onChange={e => setReply(e.target.value)}
              />
              <div>
                <button className="primary btn-sm" type="submit" disabled={!reply.trim()}>Post reply</button>
              </div>
            </form>
          )}
        </article>
      ) : (
        <>
          {client && Object.keys(boardsByWorld).some(k => boardsByWorld[k].length > 0) && (
            <form className="pane-section stack-sm" onSubmit={startThread} aria-label="Start a forum thread">
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
                <button className="primary btn-sm" type="submit" disabled={!title.trim() || !body.trim() || !targetBoard}>
                  Post thread
                </button>
              </div>
            </form>
          )}

          {loading && <div className="empty-state">Loading World forums &amp; public RFCs…</div>}

          {visibleThreads.length > 0 && (
            <>
              <div className="section-bar">Your World Threads · {visibleThreads.length}</div>
              <ul className="list-rows">
                {visibleThreads.map(t => (
                  <li key={`${t.worldSlug}:${t.id}`} className="list-row stack-xs">
                    <button
                      className="linkish thread-link"
                      type="button"
                      onClick={() => void openThread(t.worldSlug, t.worldName, t.id)}
                    >
                      {t.pinned ? '[pinned] ' : ''}{t.title}
                    </button>
                    <p className="xs muted tnum">
                      @{t.author} · {t.replies} repl{t.replies === 1 ? 'y' : 'ies'} · {ago(t.updatedAt)} · {t.worldName} · {t.boardName}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="section-bar">
            <span>Public Forums &amp; openAW RFCs</span>
            <a className="muted" href={OPENAW_SSO_URL} target="_blank" rel="noopener noreferrer">openAW ↗</a>
          </div>
          {visiblePublic.length === 0 ? (
            <div className="empty-state">
              {loading
                ? 'Checking public forum & openAW feeds…'
                : 'No public forum threads or openAW updates in this filter yet.'}
            </div>
          ) : (
            <ul className="list-rows">
              {visiblePublic.map(item => (
                <li key={item.id} className="list-row stack-xs">
                  <strong className="thread-link">{item.title || item.body.slice(0, 90)}</strong>
                  {item.title && <p className="dim small clamp">{item.body}</p>}
                  <p className="xs muted">
                    @{item.author}
                    {item.timestamp ? ` · ${ago(item.timestamp)}` : ''}
                    {` · ${item.source === 'openaw' ? 'openAW' : item.channel}`}
                    {item.url && (
                      <>
                        {' · '}
                        <a href={item.url} target="_blank" rel="noopener noreferrer">Read source ↗</a>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
