// Worlds directory (`#/worlds`): signed-in Worlds + public Worlds & Discord servers.
// AGPL-3.0-only.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { FALLBACK_CONNECTED_WORLDS, type PublicWorld } from '../api/public'
import type { NetworkClient, World } from '../api/types'
import { worldSlug } from '../api/worlds-live'

export function WorldsView({
  client,
  go,
  publicWorlds = [],
  signIn,
}: {
  client: NetworkClient | null
  go: (h: string) => void
  publicWorlds?: PublicWorld[]
  signIn: () => void
}) {
  const [data, setData] = useState<World[] | null>(null)
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!client) { setData(null); setErr(''); return }
    let live = true
    setData(null); setErr('')
    client.worlds().then(d => { if (live) setData(d) })
      .catch((e: unknown) => { if (live) setErr(e instanceof Error ? e.message : 'Could not load.') })
    return () => { live = false }
  }, [client])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!client || !name.trim() || busy) return
    setBusy(true); setMsg('')
    const r = await client.world.create(name, worldSlug(name))
    setBusy(false)
    if (r.ok && r.slug) go(`#/worlds/${encodeURIComponent(r.slug)}`)
    else setMsg(r.message)
  }

  const pubList = publicWorlds.length > 0 ? publicWorlds : FALLBACK_CONNECTED_WORLDS
  const pubBySlug = useMemo(() => new Map(pubList.map(w => [w.slug, w])), [pubList])

  return (
    <section className="stack" aria-label="Worlds">
      <header className="stream-header">
        <h1>Worlds</h1>
        <a className="small dim" href="https://app.aitherium.com/" target="_blank" rel="noopener noreferrer">
          Workspaces ↗
        </a>
      </header>

      {client?.mode === 'live' ? (
        <div className="pane-section stack-sm">
          <p className="dim small">
            Each World combines an AitherOS Workspace, AitherRelay rooms &amp; forums, and its bridged Discord server.
          </p>
          <form className="row wrap" onSubmit={create} aria-label="Create a world">
            <input
              aria-label="World name"
              placeholder="Name a new world"
              maxLength={64}
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <button className="primary btn-sm" type="submit" disabled={!worldSlug(name) || worldSlug(name).length < 2 || busy}>
              {busy ? 'Creating…' : 'Create world'}
            </button>
          </form>
        </div>
      ) : (
        <div className="signin-strip">
          <span>Sign in with Aitherium to open or create Worlds and join Relay rooms.</span>
          <button className="primary btn-sm" type="button" onClick={signIn}>Sign in</button>
        </div>
      )}

      {msg && <p className="notice-row err" role="alert">{msg}</p>}
      {err && <p className="notice-row err">{err}</p>}

      {client?.mode === 'live' && (
        <section className="stack" aria-label="Your worlds">
          <div className="section-bar">Your Worlds</div>
          {data === null && !err && <div className="empty-state">Loading your worlds…</div>}
          {data?.length === 0 && (
            <div className="empty-state">
              You are not a member of any World yet. Create one above or join a public World below.
            </div>
          )}
          <ul className="list-rows">
            {data?.map(w => {
              const pub = pubBySlug.get(w.slug)
              const invite = w.discordInvite || pub?.inviteUrl
              const bridged = w.bridgedChannels?.length ? w.bridgedChannels : pub?.bridgedChannels || []
              const wsUrl = w.workspaceUrl || pub?.workspaceUrl || 'https://app.aitherium.com/'
              return (
                <li key={w.slug} className="list-row stack-xs">
                  <div className="row between wrap">
                    <a className="thread-link" href={`#/worlds/${encodeURIComponent(w.slug)}`}>{w.name}</a>
                    <span className="xs muted tnum">
                      {w.role}{w.members !== undefined ? ` · ${w.members} members` : ''}
                    </span>
                  </div>
                  {bridged.length > 0 && (
                    <p className="mono xs muted">{bridged.slice(0, 5).join(' · ')}</p>
                  )}
                  <div className="post-foot">
                    <a href={`#/worlds/${encodeURIComponent(w.slug)}`}>Open World</a>
                    <a href={wsUrl} target="_blank" rel="noopener noreferrer">Workspace ↗</a>
                    {invite && <a href={invite} target="_blank" rel="noopener noreferrer">Discord ↗</a>}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="stack" aria-label="Public Worlds and Discord servers">
        <div className="section-bar">Public Worlds &amp; Discord</div>
        <ul className="list-rows">
          {pubList.map(w => (
            <li key={w.slug} className="list-row stack-xs">
              <div className="row between wrap">
                <a className="thread-link" href={`#/worlds/${encodeURIComponent(w.slug)}`}>{w.name}</a>
                <span className="xs muted tnum">
                  {[
                    typeof w.members === 'number' ? `${w.members} members` : '',
                    w.guildName || '',
                  ].filter(Boolean).join(' · ')}
                </span>
              </div>
              {w.description && <p className="dim small">{w.description}</p>}
              {w.bridgedChannels.length > 0 && (
                <p className="mono xs muted">{w.bridgedChannels.slice(0, 5).join(' · ')}</p>
              )}
              <div className="post-foot">
                {w.inviteUrl && (
                  <a href={w.inviteUrl} target="_blank" rel="noopener noreferrer">Discord ↗</a>
                )}
                <a href={w.workspaceUrl} target="_blank" rel="noopener noreferrer">Workspace ↗</a>
                <a href={`#/worlds/${encodeURIComponent(w.slug)}`}>Open World</a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
