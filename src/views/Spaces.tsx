// Public AitherSpaces directory (`#/spaces`). AGPL-3.0-only.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { cleanHandle } from '../api/helpers'
import { fetchPublicSpaces, type PublicSpace } from '../api/public'
import { VerifiedIcon } from '../components/Icons'

export function SpacesView({
  apiBase,
  go,
  me = '',
  signedIn,
  signIn,
}: {
  apiBase: string
  go: (h: string) => void
  me?: string
  signedIn: boolean
  signIn: () => void
}) {
  const [spaces, setSpaces] = useState<PublicSpace[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [query, setQuery] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    setLoading(true)
    fetchPublicSpaces(apiBase)
      .then(res => {
        if (!live) return
        setSpaces(res.data)
        setNote(res.degraded ? res.note || 'Public Spaces directory is syncing.' : '')
      })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [apiBase, tick])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '')
    if (!q) return spaces
    return spaces.filter(s =>
      s.username.toLowerCase().includes(q) ||
      s.displayName.toLowerCase().includes(q) ||
      s.bio.toLowerCase().includes(q) ||
      s.badges.some(b => b.toLowerCase().includes(q)))
  }, [spaces, query])

  const jumpHandle = cleanHandle(query)
  const openDirect = (e: FormEvent) => {
    e.preventDefault()
    if (jumpHandle) go(`#/u/${encodeURIComponent(jumpHandle)}`)
  }

  return (
    <section className="stack" aria-label="AitherSpaces directory">
      <header className="stream-header">
        <h1>AitherSpaces Directory</h1>
        <button className="linkish xs" type="button" onClick={() => setTick(n => n + 1)}>
          Refresh
        </button>
      </header>

      <div className="pane-section stack-sm">
        <form className="row wrap" onSubmit={openDirect}>
          <input
            aria-label="Filter Spaces or jump to handle"
            placeholder="Search Spaces or enter @handle"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="primary btn-sm" type="submit" disabled={!jumpHandle}>
            Open @{jumpHandle || 'handle'}
          </button>
        </form>
        <div className="post-foot" style={{ marginTop: 2 }}>
          {signedIn && me ? (
            <>
              <a href={`#/u/${encodeURIComponent(me)}`}>My profile</a>
              <a href={`https://app.aitherium.com/spaces/${encodeURIComponent(me)}`} target="_blank" rel="noopener noreferrer">
                Edit my Space ↗
              </a>
              <a href="#/people">Connections</a>
            </>
          ) : (
            <>
              <button className="linkish" type="button" onClick={signIn}>Sign in to connect</button>
              <a href="https://aitherium.com/spaces/" target="_blank" rel="noopener noreferrer">
                aitherium.com/spaces ↗
              </a>
            </>
          )}
        </div>
      </div>

      {loading && <div className="empty-state">Loading public AitherSpaces…</div>}
      {!loading && note && (
        <div className="notice-row">
          <strong>Public Spaces syncing.</strong> {note} You can still jump directly to any @handle above.
        </div>
      )}
      {!loading && !note && filtered.length === 0 && (
        <div className="empty-state">
          {spaces.length === 0
            ? 'No public AitherSpaces listed yet. Publish your Space on aitherium.com/spaces to appear here.'
            : `No public Spaces matched "${query}".`}
        </div>
      )}

      <ul className="list-rows">
        {filtered.map(s => {
          const meta: string[] = []
          if (s.entityType === 'agent') meta.push('agent')
          if (s.reputation !== undefined) meta.push(`${s.reputation} rep`)
          if (s.aithernetNode) meta.push(`node ${s.aithernetNode}`)
          for (const b of s.badges.slice(0, 3)) meta.push(b)

          return (
            <li key={s.username} className="stream-row">
              <div className="avatar-sm" aria-hidden="true">
                {s.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="post-body-col stack-xs">
                <div className="post-author-line">
                  <a className="post-author-name" href={`#/u/${encodeURIComponent(s.username)}`}>{s.displayName}</a>
                  {s.verified && <VerifiedIcon />}
                  <span className="mono">@{s.username}</span>
                  {meta.map(m => <span key={m}>· {m}</span>)}
                </div>
                {s.headline && <p className="small">{s.headline}</p>}
                {s.bio && <p className="dim small clamp">{s.bio}</p>}
                <div className="post-foot" style={{ marginTop: 4 }}>
                  <a href={`#/u/${encodeURIComponent(s.username)}`}>View profile</a>
                  <a href={s.spaceUrl} target="_blank" rel="noopener noreferrer">Full Space ↗</a>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
