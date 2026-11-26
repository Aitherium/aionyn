// A member's profile: Space blocks, earned standing, proved identity, AitherNet node, connections.
// AGPL-3.0-only.
import { useEffect, useState } from 'react'
import { profileAction } from '../api/helpers'
import { loadImport } from './Import'
import type { NetworkClient, Profile as P, ProfileResult } from '../api/types'
import { Copilot, PROFILE_PLACE } from '../copilot/Copilot'
import { avatarTone } from '../components/PostCard'

const GATE_TEXT: Record<string, string> = {
  private: 'This profile is private.',
  none: 'No member by that name.',
  removed: 'This profile was removed.',
  error: 'Could not load this profile.',
}

export function ProfileView({ client, username, go, me = '' }: {
  client: NetworkClient; username: string; go: (hash: string) => void; me?: string
}) {
  const [res, setRes] = useState<ProfileResult | null>(null)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let live = true
    setRes(null); setNote('')
    client.profile(username).then(r => { if (live) setRes(r) })
      .catch(() => { if (live) setRes({ gate: 'error' }) })
    return () => { live = false }
  }, [client, username])

  if (!res) return <p className="dim">Loading…</p>
  // A gate other than ok shows ONE line and nothing else about the member.
  if (res.gate !== 'ok') return <p className="gate" role="status">{GATE_TEXT[res.gate]}</p>
  const p = res.profile
  const action = profileAction(p.relationship)
  const spacePublicUrl = `https://aitherium.com/spaces/${encodeURIComponent(p.username)}`
  const spaceEditUrl = `https://app.aitherium.com/spaces/${encodeURIComponent(p.username)}`

  const act = async () => {
    if (action.kind === 'connect' || action.kind === 'accept') {
      const r = await client.connect(p.username)
      setNote(r.message)
    } else if (action.kind === 'message') go(`#/messages?to=${encodeURIComponent(p.username)}`)
    else if (action.kind === 'edit' && client.mode === 'sample') setNote('This is a sample profile. Sign in to edit yours.')
    else if (action.kind === 'edit') window.open(spaceEditUrl, '_blank', 'noopener')
  }
  const copyLink = async () => {
    const url = `https://aionyn.aitherium.com/#/u/${encodeURIComponent(p.username)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setNote('Could not copy link.')
    }
  }
  return (
    <article className="stack" aria-label={`Profile of ${p.displayName}`}>
      <header className="card hero">
        <div className="avatar" style={{ background: avatarTone(p.username) }} aria-hidden>
          {p.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="grow">
          <div className="row wrap">
            <h1>{p.displayName}</h1>
            {p.github?.verified && <span className="pill ok">verified</span>}
            {p.aithernetNode && <span className="pill accent">AitherNet · {p.aithernetNode.status}</span>}
          </div>
          <p className="mono dim">@{p.username}</p>
          {p.headline && <p>{p.headline}</p>}
        </div>
        <div className="row wrap">
          <button className="primary" onClick={act} disabled={action.kind === 'pending' || action.kind === 'signin'}>
            {action.label}
          </button>
          <button className="link" onClick={copyLink} type="button">{copied ? 'Copied!' : 'Copy link'}</button>
          <a className="link" href={spacePublicUrl} target="_blank" rel="noopener noreferrer">
            Full Space ↗
          </a>
        </div>
      </header>
      {note && <p className="dim" role="status">{note}</p>}
      {p.bio && <section className="card"><h2>About</h2><p>{p.bio}</p></section>}
      <Standing p={p} />
      {p.aithernetNode && (
        <section className="card" aria-label="AitherNet node status">
          <h2>AitherNet Node</h2>
          <p>
            <strong>{p.aithernetNode.label || `@${p.username} node`}</strong>
            <span className="tag ok">{p.aithernetNode.status}</span>
          </p>
          {p.aithernetNode.models && p.aithernetNode.models.length > 0 && (
            <ul className="chips" style={{ marginTop: 8 }}>
              {p.aithernetNode.models.map(m => <li key={m} className="mono">{m}</li>)}
            </ul>
          )}
        </section>
      )}
      {p.blocks && p.blocks.length > 0 && (
        <section className="card stack-sm" aria-label="Space blocks">
          <h2>AitherSpace Blocks</h2>
          {p.blocks.map((b, idx) => (
            <div key={`${b.type}-${idx}`} className="space-block">
              <h3 className="mono small dim">{b.title || b.type}</h3>
              {b.text && <p>{b.text}</p>}
              {b.items && b.items.length > 0 && (
                <ul className="rows">
                  {b.items.map((it, j) => (
                    <li key={j}>
                      {it.url
                        ? <a href={it.url} target="_blank" rel="noopener noreferrer">{it.label} ↗</a>
                        : <strong>{it.label}</strong>}
                      {it.detail && <span className="dim"> — {it.detail}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}
      <Engineering p={p} />
      {p.relationship === 'self' && <Imported />}
      {p.work.length > 0 && (
        <section className="card"><h2>Work</h2>
          <ul className="rows">{p.work.map(w => (
            <li key={w.title + w.org}><b>{w.title}</b> · {w.org}<span className="mono dim"> {w.from}–{w.to || 'now'}</span></li>
          ))}</ul>
        </section>
      )}
      {p.endorsements.length > 0 && (
        <section className="card"><h2>Endorsed for</h2>
          <ul className="rows">{p.endorsements.map(e => (
            <li key={e.from.username + e.skill}><b>{e.skill}</b>: “{e.body}” <a href={`#/u/${e.from.username}`}>{e.from.displayName}</a></li>
          ))}</ul>
        </section>
      )}
      <section className="card"><h2>Connections · {p.connections.count}</h2>
        <ul className="chips">{p.connections.people.map(c => (
          <li key={c.username}><a href={`#/u/${c.username}`}>{c.displayName}</a></li>
        ))}</ul>
      </section>
      {client.mode === 'live' && <Copilot world={{ ...PROFILE_PLACE, name: `@${p.username}'s profile` }} client={client.world} me={me} />}
    </article>
  )
}

function Standing({ p }: { p: P }) {
  const c = p.community
  return (
    <section className="card" aria-label="Earned standing">
      <h2>Earned standing</h2>
      {!c.available
        ? <p className="dim">No community standing linked to this account yet.</p>
        : (
          <>
            <dl className="stats">
              <div><dt>reputation</dt><dd>{c.reputation ?? 0}</dd></div>
              <div><dt>level</dt><dd>{c.level ?? 1}</dd></div>
              <div><dt>xp</dt><dd>{c.xp ?? 0}</dd></div>
              <div><dt>shipped</dt><dd>{c.shippedCount ?? 0}</dd></div>
            </dl>
            {c.badges.length > 0 && <ul className="chips">{c.badges.map(b => <li key={b}>{b}</li>)}</ul>}
          </>
        )}
      <p className="fine">Earned in communities. Nobody types their own reputation.</p>
    </section>
  )
}

function Engineering({ p }: { p: P }) {
  if (!p.github && p.certs.length === 0) return null
  return (
    <section className="card" aria-label="Engineering">
      <h2>Engineering</h2>
      <ul className="rows">
        {p.github && (
          <li>
            GitHub <a href={p.github.url} rel="noopener noreferrer">{p.github.login}</a>
            {p.github.verified && <span className="tag ok">proved by sign-in</span>}
            {p.github.mergedPrs !== undefined && <span className="mono dim"> · {p.github.mergedPrs} merged PRs</span>}
          </li>
        )}
        {p.certs.map(c => (
          <li key={c.name}>{c.name} · {c.issuer} <span className={`tag ${c.provenance === 'claimed' ? '' : 'ok'}`}>{c.provenance}</span></li>
        ))}
      </ul>
    </section>
  )
}

/** The member's own import, kept on this device only, shown as CLAIMED (not earned). */
function Imported() {
  const imp = loadImport()
  if (!imp || (!imp.positions.length && !imp.skills.length)) return null
  return (
    <section className="card" aria-label="Imported, claimed">
      <h2>From your import <span className="tag">claimed</span></h2>
      <ul className="rows">{imp.positions.slice(0, 5).map((w, i) => (
        <li key={i}><b>{w.title}</b> · {w.company}<span className="mono dim"> {w.from}{w.to ? `–${w.to}` : '–now'}</span></li>
      ))}</ul>
      {imp.skills.length > 0 && <ul className="chips">{imp.skills.slice(0, 15).map(s => <li key={s}>{s}</li>)}</ul>}
      <p className="fine">Kept on this device only. <a href="#/import">Manage</a></p>
    </section>
  )
}
