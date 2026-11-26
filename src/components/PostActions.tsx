// A post's quiet footer: read more, reply in its Relay thread, copy link, open source.
// Every affordance is backed by a real call or a real URL; nothing here is decorative.
// AGPL-3.0-only.
import { useEffect, useState, type FormEvent } from 'react'
import { ago } from '../api/helpers'
import type { NetworkClient, ThreadReply } from '../api/types'
import type { PostCardItem } from './PostCard'

export interface PostSocial {
  /** The signed-in member's client; null/undefined when signed out. */
  client?: NetworkClient | null
  /** The signed-in member's handle (for the optimistic reply row). */
  me?: string
  /** Shown as "Sign in to reply" when signed out. */
  signIn?: () => void
}

/** A link worth copying: a real per-item page, not a site's front door. */
export function permalinkOf(url?: string): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return ''
    return u.pathname.replace(/\/+$/, '') || u.search || u.hash.length > 2 ? u.toString() : ''
  } catch {
    return ''
  }
}

export function PostActions({ item, social, readMore }: {
  item: PostCardItem
  social?: PostSocial
  readMore?: { expanded: boolean; toggle: () => void }
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState('')
  const client = social?.client || null
  const canReply = Boolean(client?.replyTo && item.messageId && item.source === 'relay' && item.channel)
  const signInToReply = !client && Boolean(social?.signIn) && item.source === 'relay'
  const link = permalinkOf(item.url)
  const replies = typeof item.replies === 'number' ? item.replies : undefined
  const replyLabel = `Reply${replies ? ` · ${replies}` : ''}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied('Link copied')
    } catch {
      setCopied('Could not copy')
    }
    window.setTimeout(() => setCopied(''), 2000)
  }

  const anything = readMore || canReply || signInToReply || link || item.worldSlug || item.source === 'forum' || item.url
  if (!anything) return null

  return (
    <>
      <footer className="post-foot">
        {readMore && (
          <button className="linkish" type="button" onClick={readMore.toggle}>
            {readMore.expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        {canReply && (
          <button className="linkish" type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}>
            {open ? 'Hide replies' : replyLabel}
          </button>
        )}
        {signInToReply && (
          <button className="linkish" type="button" onClick={social?.signIn}>Sign in to reply</button>
        )}
        {item.worldSlug && <a href={`#/worlds/${encodeURIComponent(item.worldSlug)}`}>Open world</a>}
        {item.source === 'forum' && (
          <a href="#/forums">
            {replies !== undefined ? `${replies} repl${replies === 1 ? 'y' : 'ies'} · ` : ''}
            View in Forums
          </a>
        )}
        {link && (
          <button className="linkish" type="button" onClick={() => void copy()}>Copy link</button>
        )}
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer">Source ↗</a>
        )}
        {copied && <span role="status">{copied}</span>}
      </footer>
      {open && canReply && client && (
        <ReplyThread client={client} room={item.channel} messageId={item.messageId as string} me={social?.me} />
      )}
    </>
  )
}

interface Row extends ThreadReply { pending?: boolean }

export function ReplyThread({ client, room, messageId, me }: {
  client: NetworkClient; room: string; messageId: string; me?: string
}) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  const load = async () => {
    if (!client.threadReplies) { setRows([]); return }
    try { setRows(await client.threadReplies(room, messageId)) } catch { setRows([]) }
  }
  useEffect(() => { void load() }, [client, room, messageId]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body || !client.replyTo) return
    setBusy(true); setErr(''); setNote('')
    const tempId = `pending-${Date.now()}`
    setRows(r => [...(r || []), { id: tempId, author: me || 'you', body, timestamp: new Date().toISOString(), pending: true }])
    setText('')
    try {
      const r = await client.replyTo(room, messageId, body)
      if (r.ok) { setNote(r.message || 'Replied.'); await load() } else throw new Error(r.message)
    } catch (e2) {
      setRows(rs => (rs || []).filter(x => x.id !== tempId))
      setText(body)
      setErr(e2 instanceof Error && e2.message ? e2.message : 'Could not send the reply.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="reply-thread" aria-label="Replies">
      {rows === null && <p className="reply-note">Loading replies…</p>}
      {rows && rows.length > 0 && (
        <ol className="reply-list">
          {rows.map(r => (
            <li key={r.id} className={r.pending ? 'reply-row is-pending' : 'reply-row'}>
              <span className="reply-meta">
                <a className="post-author-name" href={`#/u/${encodeURIComponent(r.author)}`}>@{r.author}</a>
                {' · '}{r.pending ? 'sending…' : ago(r.timestamp)}
              </span>
              <span className="reply-body">{r.body}</span>
            </li>
          ))}
        </ol>
      )}
      <form className="reply-form" onSubmit={send} aria-label="Write a reply">
        <textarea aria-label="Reply text" rows={2} maxLength={2000} placeholder="Write a reply…"
          value={text} onChange={e => setText(e.target.value)} />
        <button className="primary btn-sm" type="submit" disabled={busy || !text.trim()}>
          {busy ? 'Sending…' : 'Reply'}
        </button>
      </form>
      {err && <p className="reply-note err" role="alert">{err}</p>}
      {note && !err && <p className="reply-note" role="status">{note}</p>}
    </div>
  )
}
