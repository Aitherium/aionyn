// Write a post to a room with live markdown preview and optional LinkedIn cross-post. AGPL-3.0-only.
import { useEffect, useState } from 'react'
import type { NetworkClient, ShareStatus } from '../api/types'
import { Markdown } from '../components/Markdown'

export function Composer({ client, rooms, onPosted }: {
  client: NetworkClient; rooms: string[]; onPosted?: () => void
}) {
  const [room, setRoom] = useState('')
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [alsoShare, setAlsoShare] = useState(false)   // opt-in, never on by default
  const [share, setShare] = useState<ShareStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => { client.shareStatus().then(setShare).catch(() => setShare(null)) }, [client])
  useEffect(() => { if (!room && rooms.length) setRoom(rooms[0]) }, [rooms, room])

  const canShare = !!share?.connected && (share?.postsLeftToday ?? 0) > 0
  const submit = async () => {
    setBusy(true); setNote('')
    try {
      const r = await client.post(room, text.trim())
      let msg = r.message
      if (r.ok && alsoShare && canShare) {
        const s = await client.shareToLinkedIn(text.trim(), 'https://aionyn.aitherium.com/')
        msg += ' ' + s.message
        setShare(await client.shareStatus())
      }
      setNote(msg)
      if (r.ok) { setText(''); setMode('write'); onPosted?.() }
    } finally { setBusy(false) }
  }
  const connect = async () => {
    const r = await client.shareConnectUrl()
    if (r.ok && r.url) window.open(r.url, '_blank', 'noopener')
    else setNote(r.message || share?.reason || 'Not available.')
  }

  return (
    <div className="card stack-sm" aria-label="Write a post">
      <div className="row between wrap">
        <h2>Compose post</h2>
        <div className="filter-pills" role="tablist" aria-label="Composer mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'write'}
            className={mode === 'write' ? 'chip-btn active' : 'chip-btn'}
            onClick={() => setMode('write')}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'preview'}
            className={mode === 'preview' ? 'chip-btn active' : 'chip-btn'}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          aria-label="Post text"
          rows={3}
          value={text}
          maxLength={3000}
          onChange={e => setText(e.target.value)}
          placeholder="Share what you shipped, learned, or need. Supports **markdown**, `code`, and links."
        />
      ) : (
        <div className="composer-preview" aria-label="Markdown preview">
          {text.trim() ? <Markdown text={text} /> : <p className="dim small">Nothing to preview yet.</p>}
        </div>
      )}

      <div className="row wrap">
        <select aria-label="Room" value={room} onChange={e => setRoom(e.target.value)}>
          {rooms.length === 0 && <option value="">No writable rooms loaded</option>}
          {rooms.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={alsoShare}
            disabled={!canShare}
            onChange={e => setAlsoShare(e.target.checked)}
          />
          Also share to LinkedIn
          {share?.connected
            ? <span className="mono dim"> · {share.postsLeftToday} of {share.postsPerDay} left today</span>
            : <button className="linkish" type="button" onClick={connect}>connect</button>}
        </label>
        <span className="mono dim small">{text.length}/3000</span>
        <button className="primary" type="button" disabled={busy || !text.trim() || !room} onClick={submit}>
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
      {!share?.connected && share?.reason && <p className="fine">{share.reason}</p>}
      {note && <p className="dim" role="status">{note}</p>}
    </div>
  )
}
