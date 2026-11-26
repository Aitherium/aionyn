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
      <div className="row between">
        <span className="dim small">Aggregated posts from this World&apos;s Relay channels.</span>
        <button className="ghost btn-sm" type="button" onClick={() => setTick(n => n + 1)}>Refresh</button>
      </div>
      {items === null && <p className="dim">Loading World feed…</p>}
      {items?.length === 0 && <div className="card dim">No posts in this World&apos;s channels yet.</div>}
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
    <section className="card stack-sm" aria-label="Live chat">
      <div className="row between wrap">
        <h2>Live Relay Chat</h2>
        <button className="ghost btn-sm" type="button" onClick={() => void pull()} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Refresh'}
        </button>
      </div>
      <nav className="row wrap" aria-label="Rooms">
        {channels.map(c => (
          <button key={c} type="button" className={c === room ? 'chip-btn active' : 'chip-btn'} aria-pressed={c === room} onClick={() => setRoom(c)}>
            {c}
          </button>
        ))}
      </nav>
      {!channels.length && <p className="dim">This world has no rooms you can read.</p>}
      {lines?.length === 0 && <p className="dim">No messages yet.</p>}
      <ol className="rows chat">
        {lines?.map(l => (
          <li key={l.id}>
            <a href={`#/u/${encodeURIComponent(l.author)}`}>@{l.author}</a>
            {' '}
            <span className="mono dim small">{ago(l.timestamp)}</span> {l.body}
          </li>
        ))}
      </ol>
      {room && (
        <form className="row" onSubmit={send}>
          <input aria-label="Say something" placeholder={`Message ${room}`} value={draft} onChange={e => setDraft(e.target.value)} />
          <button className="primary" type="submit" disabled={!draft.trim()}>Send</button>
        </form>
      )}
      {msg && <p className="err">{msg}</p>}
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
      <div className="card stack-sm">
        <p className="err" role="alert">{text}</p>
        {publicWorld?.inviteUrl && (
          <p><a className="link" href={publicWorld.inviteUrl} target="_blank" rel="noopener noreferrer">Join {publicWorld.name} on Discord ↗</a></p>
        )}
        <p><a href="#/worlds">← Back to Worlds</a></p>
      </div>
    )
  }
  if (!world) return <p className="dim">Loading World…</p>

  const pinned = world.settings.pinned || []
  const showOsint = osintOpen || !!world.settings.osint
  const bridged = publicWorld?.bridgedChannels?.length ? publicWorld.bridgedChannels : world.channels
  const wsUrl = publicWorld?.workspaceUrl || 'https://app.aitherium.com/'

  return (
    <div className="stack" aria-label={`World: ${world.name}`}>
      <header className="card stack-sm">
        <div className="row between wrap">
          <div>
            <h1>{world.name}</h1>
            <p className="mono dim small">{world.role} · {world.channels.length} room(s) · workspace {world.slug}</p>
          </div>
          <div className="row wrap">
            <a className="link" href={wsUrl} target="_blank" rel="noopener noreferrer">Open Workspace ↗</a>
            {publicWorld?.inviteUrl && (
              <a className="link" href={publicWorld.inviteUrl} target="_blank" rel="noopener noreferrer">Discord ↗</a>
            )}
          </div>
        </div>
        {(world.description || publicWorld?.description) && <p className="dim">{world.description || publicWorld?.description}</p>}

        <nav className="world-tabs" role="tablist" aria-label="World sections">
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
              className={tab === key ? 'world-tab active' : 'world-tab'}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'feed' && <WorldFeed client={client} channels={world.channels} slug={world.slug} />}
      {tab === 'chat' && <Chat client={client} channels={world.channels} />}
      {tab === 'forum' && <Forum client={client.world} slug={world.slug} refresh={tick} />}
      {tab === 'workspace' && (
        <div className="stack">
          <section className="card stack-sm" aria-label="Workspace and Discord bridge">
            <h2>Workspace &amp; Discord Bridge</h2>
            <p className="dim">
              {publicWorld?.guildName
                ? `Linked to Discord server "${publicWorld.guildName}". Bridged channels mirror directly into AitherRelay.`
                : 'Connected to your AitherOS Workspace. Link a Discord server in AitherOS Workspaces to mirror channels.'}
            </p>
            {bridged.length > 0 && (
              <div className="post-chips">
                {bridged.map(ch => <span key={ch} className="pill">{ch}</span>)}
              </div>
            )}
            <div className="row wrap">
              <a className="primary link" href={wsUrl} target="_blank" rel="noopener noreferrer">
                Open AitherOS Workspace ↗
              </a>
              {publicWorld?.inviteUrl && (
                <a className="link" href={publicWorld.inviteUrl} target="_blank" rel="noopener noreferrer">
                  Join Discord Server ↗
                </a>
              )}
            </div>
          </section>

          <section className="card" data-slot="world-pinned" aria-label="Pinned">
            <h2>Pinned Sites &amp; Agents</h2>
            {pinned.length === 0 && <p className="dim">No sites or agents pinned to this world yet.</p>}
            <ul className="rows">
              {pinned.map(p => (
                <li key={p.url}>
                  <span className="mono dim">{p.kind}</span>{' '}
                  <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a>
                </li>
              ))}
            </ul>
          </section>

          <div className="stack" data-slot="world-side">
            <Copilot world={world} client={client.world} me={me} />
            {showOsint
              ? <Osint client={client.world} world={world} onSaved={() => setTick(n => n + 1)} />
              : <button className="ghost" type="button" onClick={() => setOsintOpen(true)}>Open the OSINT panel</button>}
          </div>
        </div>
      )}
    </div>
  )
}
