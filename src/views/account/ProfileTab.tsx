// Account › Profile & Space: edit how you appear, inline, with clear saved/error feedback. AGPL-3.0-only.
import { useEffect, useState, type FormEvent } from 'react'
import {
  LINK_FIELDS, VISIBILITIES, shortDate,
  type AccountApi, type AccountProfile, type LinkField, type ProfilePatch, type SpaceBlock, type Visibility,
} from '../../api/account'
import { ExtLink, Feedback, Loading, messageOf, useResource } from './shared'

interface Draft {
  display_name: string; headline_emoji: string; headline: string; bio: string
  visibility: Visibility | ''; links: Record<LinkField, string>
}

const BIO_MAX = 500

function draftOf(p: AccountProfile): Draft {
  const links = {} as Record<LinkField, string>
  for (const [k] of LINK_FIELDS) links[k] = p.links?.[k] || ''
  return {
    display_name: p.display_name || '', headline_emoji: p.headline_emoji || '', headline: p.headline || '',
    bio: p.bio || '', visibility: p.visibility || '', links,
  }
}

/** Only what changed is sent; an untouched form sends nothing. */
export function diffProfile(before: Draft, after: Draft): ProfilePatch {
  const patch: ProfilePatch = {}
  if (after.display_name.trim() !== before.display_name.trim()) patch.display_name = after.display_name.trim()
  if (after.headline !== before.headline) patch.headline = after.headline.trim()
  if (after.headline_emoji !== before.headline_emoji) patch.headline_emoji = after.headline_emoji.trim()
  if (after.bio !== before.bio) patch.bio = after.bio.trim()
  if (after.visibility && after.visibility !== before.visibility) patch.visibility = after.visibility
  const links: Partial<Record<LinkField, string>> = {}
  for (const [k] of LINK_FIELDS) if (after.links[k] !== before.links[k]) links[k] = after.links[k].trim()
  if (Object.keys(links).length) patch.links = links
  return patch
}

function blockTitle(b: SpaceBlock): string {
  const t = b.config && typeof b.config.title === 'string' ? b.config.title : ''
  return t || b.type.replace(/_/g, ' ')
}

export function ProfileTab({ api }: { api: AccountApi }) {
  const prof = useResource(() => api.profile())
  const [base, setBase] = useState<Draft | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (prof.data?.profile) { const d = draftOf(prof.data.profile); setBase(d); setDraft(d) }
  }, [prof.data])

  if (prof.loading && !prof.data) return <Loading what="your profile" />
  if (!prof.data || !draft || !base) {
    return (
      <>
        <Feedback err={prof.err || 'Could not load your profile.'} />
        <div className="form-actions"><button className="ghost btn-sm" type="button" onClick={() => void prof.reload()}>Retry</button></div>
      </>
    )
  }
  const p = prof.data.profile
  const patch = diffProfile(base, draft)
  const dirty = Object.keys(patch).length > 0
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDraft({ ...draft, [k]: v }); setOk('') }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!dirty) return
    if (patch.display_name !== undefined && !patch.display_name) { setErr('Display name cannot be blank.'); return }
    setSaving(true); setOk(''); setErr('')
    try {
      prof.setData(await api.saveProfile(patch))
      setOk('Profile saved.')
    } catch (ex) {
      setErr(messageOf(ex, 'Could not save your profile.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="kv-row">
        <span className="kv-label">Handle</span>
        <span className="kv-value mono">@{p.username || '—'}</span>
        <span className="kv-action">
          {p.username && <a className="small dim" href={`#/u/${encodeURIComponent(p.username)}`}>View profile</a>}
          {p.space_exists && <ExtLink href={p.space_url}>Public Space</ExtLink>}
        </span>
      </div>
      {prof.data.sources?.space === 'unavailable' && (
        <p className="notice-row dim" role="status">Your Space is unreachable right now; headline and visibility may be out of date.</p>
      )}
      <form onSubmit={e => void save(e)} aria-label="Edit profile">
        <div className="section-bar">Profile</div>
        <div className="form-row">
          <label htmlFor="acct-name">Display name</label>
          <input id="acct-name" value={draft.display_name} maxLength={100} onChange={e => set('display_name', e.target.value)} />
        </div>
        <div className="form-row">
          <label htmlFor="acct-headline">Headline</label>
          <div className="row">
            <input aria-label="Headline emoji" value={draft.headline_emoji} maxLength={16} style={{ flex: '0 0 64px' }}
              onChange={e => set('headline_emoji', e.target.value)} placeholder="✦" />
            <input id="acct-headline" value={draft.headline} maxLength={200} onChange={e => set('headline', e.target.value)}
              placeholder="What you are working on" />
          </div>
        </div>
        <div className="form-row">
          <label htmlFor="acct-bio">Bio</label>
          <div>
            <textarea id="acct-bio" rows={4} value={draft.bio} maxLength={BIO_MAX} onChange={e => set('bio', e.target.value)} />
            <p className="hint tnum">{draft.bio.length}/{BIO_MAX} · plain text</p>
          </div>
        </div>
        <div className="form-row">
          <label htmlFor="acct-vis">Visibility</label>
          <div>
            <select id="acct-vis" value={draft.visibility} onChange={e => set('visibility', e.target.value as Visibility)}>
              {!draft.visibility && <option value="">Not set</option>}
              {VISIBILITIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <p className="hint">Who can open your profile and Space. Enforced by the server.</p>
          </div>
        </div>
        <div className="section-bar">Links</div>
        {LINK_FIELDS.map(([k, label]) => (
          <div className="form-row" key={k}>
            <label htmlFor={`acct-link-${k}`}>{label}</label>
            <input id={`acct-link-${k}`} value={draft.links[k]} maxLength={500}
              onChange={e => set('links', { ...draft.links, [k]: e.target.value })} />
          </div>
        ))}
        <Feedback ok={ok} err={err} />
        <div className="form-actions">
          {dirty && <button className="ghost btn-sm" type="button" onClick={() => { setDraft(base); setErr('') }}>Discard</button>}
          <button className="primary btn-sm" type="submit" disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </div>
      </form>
      <SpaceBlocks api={api} />
    </>
  )
}

/** The Space's blocks: reorder or remove, saved through the Space's own validation. */
function SpaceBlocks({ api }: { api: AccountApi }) {
  const space = useResource(() => api.space())
  const [blocks, setBlocks] = useState<SpaceBlock[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const saved = Array.isArray(space.data?.config?.blocks) ? space.data!.config!.blocks! : []

  useEffect(() => { setBlocks(null) }, [space.data])

  const list = blocks ?? saved
  const dirty = blocks !== null
  const move = (i: number, by: number) => {
    const next = [...list]; const [b] = next.splice(i, 1); next.splice(i + by, 0, b); setBlocks(next); setOk('')
  }
  const remove = (i: number) => { setBlocks(list.filter((_, j) => j !== i)); setOk('') }
  const save = async () => {
    if (!space.data) return
    setSaving(true); setOk(''); setErr('')
    try {
      space.setData(await api.saveSpace({ ...(space.data.config || {}), blocks: list }))
      setOk('Space saved.')
    } catch (e) {
      setErr(messageOf(e, 'Could not save your Space.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-label="Space blocks">
      <div className="section-bar">
        Space blocks
        {space.data?.updated_at && <span className="tnum-mono">updated {shortDate(space.data.updated_at)}</span>}
      </div>
      {space.loading && !space.data && <Loading what="your Space" />}
      {space.err && <Feedback err={space.err} />}
      {space.data && !space.data.exists && (
        <div className="empty-state">You have no Space page yet. Saving a headline or visibility above creates it.</div>
      )}
      {space.data?.exists && list.length === 0 && <div className="empty-state">Your Space has no blocks.</div>}
      <ul className="list-rows">
        {list.map((b, i) => (
          <li key={b.id || `${b.type}-${i}`} className="kv-row">
            <span className="kv-label mono">{b.type}</span>
            <span className="kv-value">{blockTitle(b)}</span>
            <span className="kv-action">
              <button className="linkish xs" type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${blockTitle(b)} up`}>Up</button>
              <button className="linkish xs" type="button" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${blockTitle(b)} down`}>Down</button>
              <button className="linkish xs" type="button" onClick={() => remove(i)} aria-label={`Remove ${blockTitle(b)}`}>Remove</button>
            </span>
          </li>
        ))}
      </ul>
      <Feedback ok={ok} err={err} />
      {dirty && (
        <div className="form-actions">
          <button className="ghost btn-sm" type="button" onClick={() => setBlocks(null)}>Discard</button>
          <button className="primary btn-sm" type="button" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save Space'}
          </button>
        </div>
      )}
    </section>
  )
}
