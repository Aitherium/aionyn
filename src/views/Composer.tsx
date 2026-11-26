// Inline hairline composer: one quiet textarea, a room selector, optional markdown preview
// and opt-in LinkedIn cross-post. Posts through `client.post(...)`. AGPL-3.0-only.
import { useEffect, useState, type FormEvent } from 'react'
import type { NetworkClient, ShareStatus } from '../api/types'
import { Markdown } from '../components/Markdown'

export interface PendingPost { room: string; text: string }

export function Composer({ client, rooms, onPosting, onPosted }: {
  client: NetworkClient
  rooms: string[]
  /** Called before the request leaves: the feed shows an optimistic row. */
  onPosting?: (p: PendingPost) => void
  /** Called with the outcome: refresh on success, drop the optimistic row on failure. */
  onPosted?: (ok: boolean) => void
}) {
  const [room, setRoom] = useState('')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(false)
  const [alsoShare, setAlsoShare] = useState(false)   // opt-in, never on by default
  const [share, setShare] = useState<ShareStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => { client.shareStatus().then(setShare).catch(() => setShare(null)) }, [client])
  useEffect(() => { if (!room && rooms.length) setRoom(rooms[0]) }, [rooms, room])

  const canShare = !!share?.connected && (share?.postsLeftToday ?? 0) > 0
  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const body = text.trim()
    if (!body || !room || busy) return
    setBusy(true); setNote(''); setErr('')
    onPosting?.({ room, text: body })
    try {
      const r = await client.post(room, body)
      if (!r.ok) { setErr(r.message); onPosted?.(false); return }
      let msg = r.message
      if (alsoShare && canShare) {
        const s = await client.shareToLinkedIn(body, 'https://aionyn.aitherium.com/')
        msg += ' ' + s.message
        setShare(await client.shareStatus().catch(() => share))
      }
      setNote(msg)
      setText(''); setPreview(false)
      onPosted?.(true)
    } catch (e2) {
      setErr(e2 instanceof Error && e2.message ? e2.message : 'Could not post.')
      onPosted?.(false)
    } finally {
      setBusy(false)
    }
  }
  const connect = async () => {
    const r = await client.shareConnectUrl()
    if (r.ok && r.url) window.open(r.url, '_blank', 'noopener')
    else setNote(r.message || share?.reason || 'Not available.')
  }

  return (
    <form className="composer-pane" aria-label="Write a post" onSubmit={submit}>
      {preview ? (
        <div className="composer-preview" aria-label="Markdown preview">
          {text.trim() ? <Markdown text={text} /> : <p className="muted small">Nothing to preview yet.</p>}
        </div>
      ) : (
        <textarea
          aria-label="Post text"
          className="composer-input"
          rows={2}
          value={text}
          maxLength={3000}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit() }}
          placeholder="Share an update with your rooms…"
        />
      )}

      <div className="composer-bar">
        <div className="composer-opts">
          <label className="composer-room">
            <span className="muted">to</span>
            <select aria-label="Room" value={room} onChange={e => setRoom(e.target.value)}>
              {rooms.length === 0 && <option value="">No writable rooms</option>}
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={alsoShare} disabled={!canShare} onChange={e => setAlsoShare(e.target.checked)} />
            <span>LinkedIn</span>
            {share?.connected
              ? <span className="mono muted tnum">({share.postsLeftToday}/{share.postsPerDay})</span>
              : <button className="linkish xs" type="button" onClick={connect}>connect</button>}
          </label>
        </div>
        <div className="composer-opts">
          <button className="linkish xs" type="button" aria-pressed={preview} onClick={() => setPreview(v => !v)}>
            {preview ? 'Edit' : 'Preview'}
          </button>
          <span className="mono muted xs tnum">{text.length}/3000</span>
          <button className="primary btn-sm" type="submit" disabled={busy || !text.trim() || !room}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
      {err && <p className="small err" role="alert">{err}</p>}
      {note && !err && <p className="dim small" role="status">{note}</p>}
    </form>
  )
}
