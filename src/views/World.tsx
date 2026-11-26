// One World (`#/worlds/<slug>` or `#/w/<slug>`): Feed · Chat · Forum · Workspace & Discord.
// AGPL-3.0-only.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ago } from '../api/helpers'
import type { PublicWorld } from '../api/public'
import type { ChatLine, NetworkClient, WorldDetail } from '../api/types'
import { PostCard, type PostCardItem } from '../components/PostCard'
import { Copilot } from '../copilot/Copilot'
import { Composer } from './Composer'
import { Forum } from './Forum'
import { Osint } from './Osint'

const POLL_MS = 5000
type WorldTab = 'feed' | 'chat' | 'forum' | 'workspace'

function WorldFeed({ client, channels, slug }: { client: NetworkClient; channels: string[]; slug: string }) {
  const [items, setItems] = useState<PostCardItem[] | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    if (!channels.length) { setItems([]); return }
    setItems(null)
    Promise.all(channels.slice(0, 6).map(async ch => {
      try {
        const lines = await client.world.chat(ch)
        return lines.map<PostCardItem>(l => ({
          id: `${ch}:${l.id}`,
          author: l.author,
          body: l.body,
          timestamp: l.timestamp,
          channel: ch,
          source: 'relay',
          worldSlug: slug,
        }))
      } catch {
        return []
      }
    })).then(groups => {
      if (!live) return
      const flat = groups.flat().sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
      setItems(flat)
    })
    return () => { live = false }
  }, [client, channels, slug, tick])

  return (
    <div className="stack">
      <Composer client={client} rooms={channels} onPosted={() => setTick(n => n + 1)} />
      <div className="section-bar">
        <span>Relay Channels</span>
        <button className="linkish xs" type="button" onClick={() => setTick(n => n + 1)}>Refresh</button>
      </div>
      {items === null && <div className="empty-state">Loading World feed…</div>}
      {items?.length === 0 && <div className="empty-state">No posts in this World&apos;s channels yet.</div>}
      {items?.map(item => <PostCard key={item.id} item={item} />)}
    </div>
  )
}

function Chat({ client, channels }: { client: NetworkClient; channels: string[] }) {
  const [room, setRoom] = useState(channels[0] || '')
  const [lines, setLines] = useState<ChatLine[] | null>(null)
  const [draft, setDraft] = useState('')
  const [msg, setMsg] = useState('')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!room && channels.length) setRoom(channels[0])
  }, [channels, room])

  const pull = useCallback(async () => {
    if (!room) return
    setSyncing(true)
    try {
      setLines(await client.world.chat(room))
    } catch {
      setLines([])
    } finally {
      setSyncing(false)
    }
  }, [client, room])

  useEffect(() => {
    if (!room) return
    let live = true
    const run = () => {
      client.world.chat(room).then(l => { if (live) setLines(l) }).catch(() => { if (live) setLines([]) })
    }
    run()
    const t = setInterval(run, POLL_MS)
    return () => { live = false; clearInterval(t) }
  }, [client, room])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const r = await client.world.say(room, draft.trim())
    setMsg(r.ok ? '' : r.message)
    if (r.ok) { setDraft(''); void pull() }
  }

  return (
    <section className="stack" aria-label="Live chat">
      {channels.length > 0 && (
        <div className="tab-bar sub" role="tablist" aria-label="Rooms">
          {channels.map(c => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={c === room}
              className={c === room ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setRoom(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="section-bar">
        <span>Live Relay Chat</span>
        <button className="linkish xs" type="button" onClick={() => void pull()} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Refresh'}
        </button>
      </div>

      {!channels.length && <div className="empty-state">This world has no rooms you can read.</div>}
      {lines?.length === 0 && <div className="empty-state">No messages yet.</div>}

      {lines && lines.length > 0 && (
        <ol className="list-rows chat">
          {lines.map(l => (
            <li key={l.id} className="list-row">
              <a className="post-author-name" href={`#/u/${encodeURIComponent(l.author)}`}>@{l.author}</a>
              {' '}
              <span className="xs muted">{ago(l.timestamp)}</span>
              <p style={{ marginTop: 3 }}>{l.body}</p>
            </li>
          ))}
        </ol>
      )}

      {room && (
        <form className="pane-section row" onSubmit={send}>
          <input aria-label="Say something" placeholder={`Message ${room}`} value={draft} onChange={e => setDraft(e.target.value)} />
          <button className="primary btn-sm" type="submit" disabled={!draft.trim()}>Send</button>
        </form>
      )}
      {msg && <p className="notice-row err">{msg}</p>}
    </section>
  )
}

export function WorldView({
  client,
  slug,
  me,
  publicWorld,
}: {
  client: NetworkClient
  slug: string
  me: string
  publicWorld?: PublicWorld
}) {
  const [world, setWorld] = useState<WorldDetail | null>(null)
  const [err, setErr] = useState('')
  const [tick, setTick] = useState(0)
  const [tab, setTab] = useState<WorldTab>('feed')
  const [osintOpen, setOsintOpen] = useState(false)

  useEffect(() => {
    let live = true
    setErr('')
    client.world.open(slug).then(w => { if (live) setWorld(w) })
      .catch((e: unknown) => { if (live) setErr(e instanceof Error ? e.message : 'Could not open this world.') })
    return () => { live = false }
  }, [client, slug, tick])

  if (err) {
    const text = /not found/i.test(err)
      ? 'This world has no Relay space yet: its forum and rooms appear once it is set up.'
      : err
    return (
      <section className="stack">
        <header className="stream-header">
          <h1>{publicWorld?.name || slug}</h1>
          <a className="small dim" href="#/worlds">All worlds</a>
        </header>
        <div className="pane-section stack-sm">
          <p className="err" role="alert">{text}</p>
          {publicWorld?.inviteUrl && (
            <p><a className="link" href={publicWorld.inviteUrl} target="_blank" rel="noopener noreferrer">Join {publicWorld.name} on Discord ↗</a></p>
          )}
          <p><a href="#/worlds">← Back to Worlds</a></p>
        </div>
      </section>
    )
  }
  if (!world) return <div className="empty-state">Loading World…</div>

  const pinned = world.settings.pinned || []
  const showOsint = osintOpen || !!world.settings.osint
  const bridged = publicWorld?.bridgedChannels?.length ? publicWorld.bridgedChannels : world.channels
  const wsUrl = publicWorld?.workspaceUrl || 'https://app.aitherium.com/'

  return (
    <div className="stack" aria-label={`World: ${world.name}`}>
      <header className="stream-header">
        <h1>{world.name}</h1>
        <div className="row">
          <a className="small dim" href={wsUrl} target="_blank" rel="noopener noreferrer">Workspace ↗</a>
          {publicWorld?.inviteUrl && (
            <a className="small dim" href={publicWorld.inviteUrl} target="_blank" rel="noopener noreferrer">Discord ↗</a>
          )}
        </div>
      </header>

      <div className="pane-section stack-xs">
        <p className="mono xs muted">{world.role} · {world.channels.length} room(s) · {world.slug}</p>
        {(world.description || publicWorld?.description) && (
          <p className="dim small">{world.description || publicWorld?.description}</p>
        )}
      </div>

      <nav className="tab-bar sub" role="tablist" aria-label="World sections">
        {([
          ['feed', 'Feed'],
          ['chat', 'Chat'],
          ['forum', 'Forum'],
          ['workspace', 'Workspace & Discord'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'feed' && <WorldFeed client={client} channels={world.channels} slug={world.slug} />}
      {tab === 'chat' && <Chat client={client} channels={world.channels} />}
      {tab === 'forum' && <Forum client={client.world} slug={world.slug} refresh={tick} />}
      {tab === 'workspace' && (
        <div className="stack">
          <section className="pane-section stack-sm" aria-label="Workspace and Discord bridge">
            <h2>Workspace &amp; Discord Bridge</h2>
            <p className="dim small">
              {publicWorld?.guildName
                ? `Linked to Discord server "${publicWorld.guildName}". Bridged channels mirror directly into AitherRelay.`
                : 'Connected to your AitherOS Workspace. Link a Discord server in AitherOS Workspaces to mirror channels.'}
            </p>
            {bridged.length > 0 && (
              <p className="mono xs muted">{bridged.join(' · ')}</p>
            )}
            <div className="row wrap">
              <a className="primary link btn-sm" href={wsUrl} target="_blank" rel="noopener noreferrer">
                Open AitherOS Workspace ↗
              </a>
              {publicWorld?.inviteUrl && (
                <a className="link btn-sm" href={publicWorld.inviteUrl} target="_blank" rel="noopener noreferrer">
                  Join Discord Server ↗
                </a>
              )}
            </div>
          </section>

          <section className="pane-section" data-slot="world-pinned" aria-label="Pinned">
            <h2>Pinned Sites &amp; Agents</h2>
            {pinned.length === 0 ? (
              <p className="dim small">No sites or agents pinned to this world yet.</p>
            ) : (
              <ul className="rows">
                {pinned.map(p => (
                  <li key={p.url}>
                    <span className="mono xs muted">{p.kind}</span>{' '}
                    <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="stack" data-slot="world-side">
            <Copilot world={world} client={client.world} me={me} />
            {showOsint ? (
              <Osint client={client.world} world={world} onSaved={() => setTick(n => n + 1)} />
            ) : (
              <div className="pane-section">
                <button className="ghost btn-sm" type="button" onClick={() => setOsintOpen(true)}>
                  Open OSINT panel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
