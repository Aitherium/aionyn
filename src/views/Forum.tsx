// A world's forum: Relay's workspace forum, read and written as the member. AGPL-3.0-only.
import { useEffect, useState, type FormEvent } from 'react'
import { ago } from '../api/helpers'
import type { ForumBoard, ForumPost, ForumThread, WorldClient } from '../api/types'

export function Forum({ client, slug, refresh }: { client: WorldClient; slug: string; refresh: number }) {
  const [boards, setBoards] = useState<ForumBoard[]>([])
  const [board, setBoard] = useState('')
  const [threads, setThreads] = useState<ForumThread[] | null>(null)
  const [open, setOpen] = useState<{ thread: ForumThread; posts: ForumPost[] } | null>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<ForumThread[] | null>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [reply, setReply] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    client.boards(slug).then(b => { setBoards(b); setBoard(cur => cur || b[0]?.id || '') })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'The forum did not answer.'))
  }, [client, slug, tick, refresh])
  useEffect(() => {
    if (!board) return
    setThreads(null)
    client.threads(slug, board).then(setThreads).catch(() => setThreads([]))
  }, [client, slug, board, tick, refresh])

  const openThread = (id: string) => client.thread(slug, id).then(setOpen)
    .catch((e: unknown) => setMsg(e instanceof Error ? e.message : 'Could not open the thread.'))
  const search = (e: FormEvent) => { e.preventDefault(); if (q.trim()) client.search(slug, q.trim()).then(setHits) }
  const start = async (e: FormEvent) => {
    e.preventDefault()
    const r = await client.startThread(slug, board, title.trim(), text.trim())
    setMsg(r.message)
    if (r.ok) { setTitle(''); setText(''); setTick(n => n + 1); if (r.id) openThread(r.id) }
  }
  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!open) return
    const r = await client.reply(slug, open.thread.id, reply.trim())
    setMsg(r.message)
    if (r.ok) { setReply(''); openThread(open.thread.id); setTick(n => n + 1) }
  }
  useEffect(() => { if (open && refresh) openThread(open.thread.id) }, [refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const row = (t: ForumThread) => (
    <li key={t.id} className="list-row stack-xs">
      <button className="linkish thread-link" type="button" onClick={() => openThread(t.id)}>
        {t.pinned ? '[pinned] ' : ''}{t.title}
      </button>
      <span className="xs muted tnum">@{t.author} · {t.replies} repl{t.replies === 1 ? 'y' : 'ies'} · {ago(t.updatedAt)}</span>
    </li>
  )

  return (
    <section className="stack" aria-label="Forum">
      {err && <p className="notice-row err">{err}</p>}
      {boards.length > 0 && (
        <nav className="tab-bar sub" aria-label="Boards">
          {boards.map(b => (
            <button
              key={b.id}
              type="button"
              className={b.id === board ? 'tab-btn active' : 'tab-btn'}
              aria-pressed={b.id === board}
              onClick={() => { setBoard(b.id); setOpen(null); setHits(null) }}
            >
              {b.name} ({b.threadCount})
            </button>
          ))}
        </nav>
      )}

      <div className="pane-section">
        <form className="row" onSubmit={search}>
          <input aria-label="Search threads" placeholder="Search threads" value={q} onChange={e => setQ(e.target.value)} />
          <button className="ghost btn-sm" type="submit" disabled={!q.trim()}>Search</button>
        </form>
      </div>

      {hits && (
        <>
          <div className="section-bar">{hits.length} match{hits.length === 1 ? '' : 'es'} for &ldquo;{q}&rdquo;</div>
          <ul className="list-rows">{hits.map(row)}</ul>
        </>
      )}

      {open ? (
        <article className="stack" aria-label={`Thread: ${open.thread.title}`}>
          <div className="pane-section stack-xs">
            <button className="linkish small" type="button" onClick={() => setOpen(null)}>← All threads</button>
            <h3>{open.thread.title}</h3>
          </div>
          <ol className="list-rows">
            {open.posts.map(p => (
              <li key={p.id} className="list-row stack-xs">
                <div className="xs muted">
                  <a className="post-author-name" href={`#/u/${p.author}`}>@{p.author}</a>
                  {p.agent ? ' · agent' : ''}
                  <span> · {ago(p.createdAt)}</span>
                </div>
                <p>{p.body}</p>
              </li>
            ))}
          </ol>
          {!open.thread.locked && (
            <form className="pane-section stack-sm" onSubmit={send}>
              <textarea aria-label="Your reply" rows={3} value={reply} onChange={e => setReply(e.target.value)} />
              <div><button className="primary btn-sm" type="submit" disabled={!reply.trim()}>Post reply</button></div>
            </form>
          )}
        </article>
      ) : (
        <>
          {threads === null && <div className="empty-state">Loading…</div>}
          {threads?.length === 0 && <div className="empty-state">No threads on this board yet.</div>}
          {threads && threads.length > 0 && <ul className="list-rows">{threads.map(row)}</ul>}
          {board && (
            <form className="pane-section stack-sm" onSubmit={start} aria-label="Open a thread">
              <h2>Open a thread</h2>
              <input aria-label="Thread title" placeholder="Title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} />
              <textarea aria-label="Thread text" rows={3} placeholder="What do you want to say?" value={text} onChange={e => setText(e.target.value)} />
              <div><button className="primary btn-sm" type="submit" disabled={!title.trim() || !text.trim()}>Open thread</button></div>
            </form>
          )}
        </>
      )}
      {msg && <p className="notice-row dim" role="status">{msg}</p>}
    </section>
  )
}
