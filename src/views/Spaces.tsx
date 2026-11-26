// Public AitherSpaces directory (`#/spaces`). AGPL-3.0-only.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { cleanHandle } from '../api/helpers'
import { fetchPublicSpaces, type PublicSpace } from '../api/public'
import { avatarTone } from '../components/PostCard'

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
      <div className="card stack-sm">
        <div className="row between wrap">
          <h2>AitherSpaces Directory</h2>
          <button className="ghost btn-sm" type="button" onClick={() => setTick(n => n + 1)}>Refresh</button>
        </div>
        <p className="dim">
          Public member Spaces with verified GitHub proof, earned standing, and AitherNet status.
          Private Spaces never appear here.
        </p>
        <form className="row wrap" onSubmit={openDirect}>
          <input
            aria-label="Filter Spaces or jump to handle"
            placeholder="Search Spaces or enter @handle"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="primary" type="submit" disabled={!jumpHandle}>
            Open @{jumpHandle || 'handle'}
          </button>
        </form>
        <div className="row wrap small">
          {signedIn && me ? (
            <>
              <a className="link" href={`#/u/${encodeURIComponent(me)}`}>My profile</a>
              <a
                className="link"
                href={`https://app.aitherium.com/spaces/${encodeURIComponent(me)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Edit my Space ↗
              </a>
              <a className="link" href="#/people">My connections</a>
            </>
          ) : (
            <>
              <button className="ghost btn-sm" type="button" onClick={signIn}>Sign in to connect</button>
              <a className="link" href="https://aitherium.com/spaces/" target="_blank" rel="noopener noreferrer">
                Explore aitherium.com/spaces ↗
              </a>
            </>
          )}
        </div>
      </div>

      {loading && <div className="card dim">Loading public AitherSpaces…</div>}
      {!loading && note && (
        <div className="card notice-banner">
          <strong>Public Spaces directory syncing</strong>
          <p className="dim small">{note} You can still jump directly to any @handle above.</p>
        </div>
      )}
      {!loading && !note && filtered.length === 0 && (
        <div className="card dim">
          {spaces.length === 0
            ? 'No public AitherSpaces listed yet. Publish your Space on aitherium.com/spaces to appear here.'
            : `No public Spaces matched "${query}".`}
        </div>
      )}

      <ul className="grid">
        {filtered.map(s => (
          <li key={s.username} className="card stack-sm">
            <div className="row">
              <div className="avatar-sm" style={{ background: avatarTone(s.username) }} aria-hidden>
                {s.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="grow">
                <div className="row wrap">
                  <a href={`#/u/${encodeURIComponent(s.username)}`}><strong>{s.displayName}</strong></a>
                  {s.verified && <span className="pill ok">verified</span>}
                  {s.entityType === 'agent' && <span className="pill accent">agent</span>}
                </div>
                <p className="mono dim small">@{s.username}</p>
              </div>
            </div>
            {s.headline && <p className="small">{s.headline}</p>}
            {s.bio && <p className="dim small clamp">{s.bio}</p>}
            {(s.badges.length > 0 || s.aithernetNode || s.reputation !== undefined) && (
              <div className="post-chips">
                {s.reputation !== undefined && <span className="pill accent">{s.reputation} rep</span>}
                {s.aithernetNode && <span className="pill ok">Node: {s.aithernetNode}</span>}
                {s.badges.slice(0, 3).map(b => <span key={b} className="pill">{b}</span>)}
              </div>
            )}
            <div className="row wrap small">
              <a className="link" href={`#/u/${encodeURIComponent(s.username)}`}>View profile</a>
              <a className="dim" href={s.spaceUrl} target="_blank" rel="noopener noreferrer">Full Space ↗</a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
