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
      <div className="card stack-sm">
        <h2>Worlds, Workspaces &amp; Discord</h2>
        <p className="dim">
          A World combines an AitherOS Workspace, AitherRelay rooms &amp; forums, and its bridged Discord server.
        </p>
        {client?.mode === 'live' ? (
          <form className="row wrap" onSubmit={create} aria-label="Create a world">
            <input
              aria-label="World name"
              placeholder="Name a new world"
              maxLength={64}
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <button className="primary" type="submit" disabled={!worldSlug(name) || worldSlug(name).length < 2 || busy}>
              {busy ? 'Creating…' : 'Create a world'}
            </button>
          </form>
        ) : (
          <div className="row wrap">
            <button className="primary" type="button" onClick={signIn}>Sign in to open or create Worlds</button>
            <a className="link" href="https://app.aitherium.com/" target="_blank" rel="noopener noreferrer">
              Open AitherOS Workspaces ↗
            </a>
          </div>
        )}
      </div>

      {msg && <p className="err" role="alert">{msg}</p>}
      {err && <p className="err">{err}</p>}

      {client?.mode === 'live' && (
        <section className="stack-sm" aria-label="Your worlds">
          <h2 className="section-heading">Your Worlds</h2>
          {data === null && !err && <p className="dim">Loading your worlds…</p>}
          {data?.length === 0 && (
            <div className="card dim">
              You are not a member of any World yet. Create one above or join a connected Discord community below.
            </div>
          )}
          <ul className="grid">
            {data?.map(w => {
              const pub = pubBySlug.get(w.slug)
              const invite = w.discordInvite || pub?.inviteUrl
              const bridged = w.bridgedChannels?.length ? w.bridgedChannels : pub?.bridgedChannels || []
              const wsUrl = w.workspaceUrl || pub?.workspaceUrl || 'https://app.aitherium.com/'
              return (
                <li key={w.slug} className="card stack-sm">
                  <div className="row between">
                    <h2><a href={`#/worlds/${encodeURIComponent(w.slug)}`}>{w.name}</a></h2>
                    <span className="pill accent">{w.role}</span>
                  </div>
                  <p className="mono dim small">
                    {w.members !== undefined ? `${w.members} members` : 'Relay workspace'}
                    {w.discord.length ? ` · Discord: ${w.discord.join(', ')}` : ''}
                  </p>
                  {bridged.length > 0 && (
                    <div className="post-chips">
                      {bridged.slice(0, 4).map(ch => <span key={ch} className="pill">{ch}</span>)}
                    </div>
                  )}
                  <div className="row wrap small">
                    <a className="link" href={`#/worlds/${encodeURIComponent(w.slug)}`}>Open World</a>
                    <a className="dim" href={wsUrl} target="_blank" rel="noopener noreferrer">Workspace ↗</a>
                    {invite && <a className="dim" href={invite} target="_blank" rel="noopener noreferrer">Discord ↗</a>}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="stack-sm" aria-label="Public Worlds and Discord servers">
        <h2 className="section-heading">Public Worlds &amp; Discord Servers</h2>
        <ul className="grid">
          {pubList.map(w => (
            <li key={w.slug} className="card stack-sm">
              <div className="row between">
                <h2><a href={`#/worlds/${encodeURIComponent(w.slug)}`}>{w.name}</a></h2>
                {typeof w.members === 'number' && <span className="pill">{w.members} members</span>}
              </div>
              {w.description && <p className="dim small">{w.description}</p>}
              <div className="post-chips">
                {w.guildName && <span className="pill discord">{w.guildName}</span>}
                {w.bridgedChannels.slice(0, 4).map(ch => <span key={ch} className="pill">{ch}</span>)}
              </div>
              <div className="row wrap small">
                {w.inviteUrl && (
                  <a className="link" href={w.inviteUrl} target="_blank" rel="noopener noreferrer">Join Discord ↗</a>
                )}
                <a className="link" href={w.workspaceUrl} target="_blank" rel="noopener noreferrer">Workspace ↗</a>
                {client && <a className="dim" href={`#/worlds/${encodeURIComponent(w.slug)}`}>Open</a>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
