// A member's profile: Space blocks, earned standing, proved identity, AitherNet node, connections.
// AGPL-3.0-only.
import { useEffect, useState } from 'react'
import { profileAction } from '../api/helpers'
import { loadImport } from './Import'
import type { NetworkClient, Profile as P, ProfileResult } from '../api/types'
import { Copilot, PROFILE_PLACE } from '../copilot/Copilot'
import { VerifiedIcon } from '../components/Icons'

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

  if (!res) return <div className="empty-state">Loading…</div>
  // A gate other than ok shows ONE line and nothing else about the member.
  if (res.gate !== 'ok') return <p className="gate" role="status">{GATE_TEXT[res.gate]}</p>
  const p = res.profile
  const action = profileAction(p.relationship)
  const spacePublicUrl = `https://aitherium.com/spaces/${encodeURIComponent(p.username)}`

  const act = async () => {
    if (action.kind === 'connect' || action.kind === 'accept') {
      const r = await client.connect(p.username)
      setNote(r.message)
    } else if (action.kind === 'message') go(`#/messages?to=${encodeURIComponent(p.username)}`)
    else if (action.kind === 'edit' && client.mode === 'sample') setNote('This is a sample profile. Sign in to edit yours.')
    // Your own profile edits inline in the Account hub, never bouncing out to another app.
    else if (action.kind === 'edit') go('#/account/profile')
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
      <header className="stream-header">
        <h1>{p.displayName}</h1>
        <a className="small dim" href={spacePublicUrl} target="_blank" rel="noopener noreferrer">
          Full Space ↗
        </a>
      </header>

      <div className="profile-head">
        <div className="profile-head-top">
          <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
            <div className="avatar" aria-hidden="true">
              {p.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="stack-xs">
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="profile-title">{p.displayName}</span>
                {p.github?.verified && <VerifiedIcon />}
              </div>
              <p className="mono xs muted">
                @{p.username}
                {p.aithernetNode ? ` · AitherNet ${p.aithernetNode.status}` : ''}
              </p>
              {p.headline && <p className="small">{p.headline}</p>}
            </div>
          </div>

          <div className="row wrap">
            <button className="primary btn-sm" type="button" onClick={act} disabled={action.kind === 'pending' || action.kind === 'signin'}>
              {action.label}
            </button>
            <button className="ghost btn-sm" onClick={copyLink} type="button">{copied ? 'Copied!' : 'Copy link'}</button>
          </div>
        </div>
        {p.bio && <p className="dim small">{p.bio}</p>}
      </div>

      {note && <p className="notice-row dim" role="status">{note}</p>}

      <Standing p={p} />

      {p.aithernetNode && (
        <section className="pane-section stack-xs" aria-label="AitherNet node status">
          <h2>AitherNet Node</h2>
          <div className="pulse-line">
            <span className={p.aithernetNode.status === 'online' ? 'status-dot on' : 'status-dot'} aria-hidden="true" />
            <strong>{p.aithernetNode.label || `@${p.username} node`}</strong>
            <span className="xs muted">· {p.aithernetNode.status}</span>
          </div>
          {p.aithernetNode.models && p.aithernetNode.models.length > 0 && (
            <p className="mono xs muted">{p.aithernetNode.models.join(' · ')}</p>
          )}
        </section>
      )}

      {p.blocks && p.blocks.length > 0 && (
        <section className="pane-section" aria-label="Space blocks">
          <h2>AitherSpace Blocks</h2>
          {p.blocks.map((b, idx) => (
            <div key={`${b.type}-${idx}`} className="space-block">
              <h3>{b.title || b.type}</h3>
              {b.text && <p className="small">{b.text}</p>}
              {b.items && b.items.length > 0 && (
                <ul className="rows">
                  {b.items.map((it, j) => (
                    <li key={j} className="small">
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
        <section className="pane-section">
          <h2>Work</h2>
          <ul className="rows">
            {p.work.map(w => (
              <li key={w.title + w.org} className="small">
                <strong>{w.title}</strong> · {w.org}
                <span className="mono xs muted"> · {w.from}–{w.to || 'now'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.endorsements.length > 0 && (
        <section className="pane-section">
          <h2>Endorsed for</h2>
          <ul className="rows">
            {p.endorsements.map(e => (
              <li key={e.from.username + e.skill} className="small">
                <strong>{e.skill}</strong>: &ldquo;{e.body}&rdquo;{' '}
                <a className="muted" href={`#/u/${e.from.username}`}>— {e.from.displayName}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pane-section">
        <h2>Connections · {p.connections.count}</h2>
        <ul className="inline-list">
          {p.connections.people.map(c => (
            <li key={c.username}><a href={`#/u/${c.username}`}>{c.displayName}</a></li>
          ))}
        </ul>
      </section>

      {client.mode === 'live' && (
        <Copilot world={{ ...PROFILE_PLACE, name: `@${p.username}'s profile` }} client={client.world} me={me} />
      )}
    </article>
  )
}

function Standing({ p }: { p: P }) {
  const c = p.community
  return (
    <section className="stack" aria-label="Earned standing">
      <div className="section-bar">Earned Standing</div>
      {!c.available ? (
        <div className="pane-section">
          <p className="dim small">No community standing linked to this account yet.</p>
          <p className="fine">Earned in communities. Nobody types their own reputation.</p>
        </div>
      ) : (
        <>
          <dl className="stat-strip">
            <div><dt>Reputation</dt><dd>{c.reputation ?? 0}</dd></div>
            <div><dt>Level</dt><dd>{c.level ?? 1}</dd></div>
            <div><dt>XP</dt><dd>{c.xp ?? 0}</dd></div>
            <div><dt>Shipped</dt><dd>{c.shippedCount ?? 0}</dd></div>
          </dl>
          <div className="pane-section stack-xs">
            {c.badges.length > 0 && <p className="mono xs muted">{c.badges.join(' · ')}</p>}
            <p className="fine" style={{ marginTop: 0 }}>Earned in communities. Nobody types their own reputation.</p>
          </div>
        </>
      )}
    </section>
  )
}

function Engineering({ p }: { p: P }) {
  if (!p.github && p.certs.length === 0) return null
  return (
    <section className="pane-section" aria-label="Engineering">
      <h2>Engineering</h2>
      <ul className="rows">
        {p.github && (
          <li className="small">
            GitHub <a href={p.github.url} rel="noopener noreferrer">{p.github.login}</a>
            {p.github.verified && <span className="xs muted"> · proved by sign-in</span>}
            {p.github.mergedPrs !== undefined && <span className="mono xs muted"> · {p.github.mergedPrs} merged PRs</span>}
          </li>
        )}
        {p.certs.map(c => (
          <li key={c.name} className="small">
            {c.name} · {c.issuer} <span className="xs muted">· {c.provenance}</span>
          </li>
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
    <section className="pane-section stack-xs" aria-label="Imported, claimed">
      <h2>From your import · claimed</h2>
      <ul className="rows">
        {imp.positions.slice(0, 5).map((w, i) => (
          <li key={i} className="small">
            <strong>{w.title}</strong> · {w.company}
            <span className="mono xs muted"> · {w.from}{w.to ? `–${w.to}` : '–now'}</span>
          </li>
        ))}
      </ul>
      {imp.skills.length > 0 && <p className="xs muted">{imp.skills.slice(0, 15).join(' · ')}</p>}
      <p className="fine">Kept on this device only. <a href="#/import">Manage</a></p>
    </section>
  )
}
