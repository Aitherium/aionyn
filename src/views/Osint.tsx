// A world's OSINT panel: ShadowBroker news and telemetry for its region or topic.
// AGPL-3.0-only.
import { useEffect, useState, type FormEvent } from 'react'
import { ago } from '../api/helpers'
import type { OsintItem, OsintResult, WorldClient, WorldDetail } from '../api/types'

/** Equirectangular: lng -180..180 -> 0..W, lat 90..-90 -> 0..H. */
export function project(lat: number, lng: number, w = 360, h = 180): [number, number] {
  return [((lng + 180) / 360) * w, ((90 - lat) / 180) * h]
}

function Map({ items }: { items: OsintItem[] }) {
  const pts = items.filter(i => i.lat !== undefined && i.lng !== undefined)
  return (
    <svg className="osint-map" viewBox="0 0 360 180" role="img" aria-label={`${pts.length} positions on a world map`}>
      <rect x="0" y="0" width="360" height="180" className="sea" />
      {[30, 60, 90, 120, 150].map(y => <line key={y} x1="0" x2="360" y1={y} y2={y} className="grid" />)}
      {[60, 120, 180, 240, 300].map(x => <line key={x} y1="0" y2="180" x1={x} x2={x} className="grid" />)}
      {pts.map((p, i) => { const [x, y] = project(p.lat!, p.lng!); return <circle key={i} cx={x} cy={y} r="2.2" className="dot"><title>{p.title}</title></circle> })}
    </svg>
  )
}

export function Osint({ client, world, onSaved }: { client: WorldClient; world: WorldDetail; onSaved: () => void }) {
  const topic = world.settings.osint?.query || ''
  const [q, setQ] = useState(topic)
  const [news, setNews] = useState<OsintResult | null>(null)
  const [tele, setTele] = useState<OsintResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const admin = world.role === 'owner' || world.role === 'admin'

  const run = async (query: string) => {
    if (query.trim().length < 2) return
    setBusy(true)
    const [n, t] = await Promise.all([client.osint('news', query), client.osint('telemetry', query)])
    setNews(n); setTele(t); setBusy(false)
  }
  useEffect(() => { if (topic) run(topic) }, [topic]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: FormEvent) => { e.preventDefault(); run(q) }
  const save = async () => {
    const r = await client.saveSettings(world.slug, { ...world.settings, osint: { query: q.trim(), label: q.trim() } })
    setMsg(r.message)
    if (r.ok) onSaved()
  }
  const meta = news || tele
  return (
    <section className="pane-section stack-sm" aria-label="OSINT">
      <h2>OSINT {topic && <span className="mono muted">· {world.settings.osint?.label || topic}</span>}</h2>
      <p className="dim small">News and telemetry from the public ShadowBroker board for this world&apos;s region or topic. Read-only; leads to verify, not facts.</p>
      <form className="row wrap" onSubmit={submit}>
        <input aria-label="Region or topic" placeholder="A region or topic, e.g. Baltic Sea" maxLength={120} value={q} onChange={e => setQ(e.target.value)} />
        <button className="primary btn-sm" type="submit" disabled={q.trim().length < 2 || busy}>{busy ? 'Asking…' : 'Look up'}</button>
        {admin && <button className="ghost btn-sm" type="button" onClick={save} disabled={q.trim().length < 2}>Set world topic</button>}
      </form>
      {msg && <p className="dim xs" role="status">{msg}</p>}
      {news?.error && <p className={/503|unavailable/i.test(news.error) ? 'dim small' : 'err small'}>News: {news.error}</p>}
      {tele?.error && <p className={/503|unavailable/i.test(tele.error) ? 'dim small' : 'err small'}>Telemetry: {tele.error}</p>}
      {tele && !tele.error && tele.items.some(i => i.lat !== undefined) && <Map items={tele.items} />}
      {tele && !tele.error && <p className="mono xs muted">{tele.items.length} telemetry row(s) for &ldquo;{tele.query}&rdquo;</p>}
      {news && !news.error && (
        <ul className="rows" aria-label="OSINT news">
          {news.items.length === 0 && <li className="dim small">No news rows on the board for &ldquo;{news.query}&rdquo; right now.</li>}
          {news.items.map((i, k) => (
            <li key={k} className="small">
              {i.link ? <a href={i.link} target="_blank" rel="noopener noreferrer">{i.title}</a> : i.title}
              <span className="mono xs muted"> · {i.source}{i.time ? ` · ${ago(i.time)}` : ''}</span>
              {i.summary && <p className="dim xs clamp">{i.summary}</p>}
            </li>
          ))}
        </ul>
      )}
      {meta && !meta.error && (
        <p className="mono xs muted">
          {meta.notice} Data: <a href={meta.board} target="_blank" rel="noopener">{meta.board.replace(/^https:\/\//, '')}</a>
          {' · '}software <a href={meta.software} target="_blank" rel="noopener">ShadowBroker</a> ({meta.license}).
        </p>
      )}
    </section>
  )
}
