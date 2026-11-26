// "Import from LinkedIn": the member's own data-export ZIP, read in this tab. AGPL-3.0-only.
import { useState } from 'react'
import { importExport, type ImportedProfile } from '../import/exportZip'

export const IMPORT_KEY = 'aionyn.import.v1'
// Read once from the pre-rename key so an import kept before 2026-11-15 is not lost.
const OLD_KEY = 'wesyn.import.v1'

export function loadImport(): ImportedProfile | null {
  try {
    const v = localStorage.getItem(IMPORT_KEY) ?? localStorage.getItem(OLD_KEY)
    return v ? JSON.parse(v) as ImportedProfile : null
  }
  catch { return null }
}

const INVITE = 'I am on Aionyn, the open network where reputation is earned: https://aionyn.aitherium.com/'

export function ImportView() {
  const [data, setData] = useState<ImportedProfile | null>(null)
  const [saved, setSaved] = useState<ImportedProfile | null>(() => loadImport())
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')

  const pick = async (f: File | undefined) => {
    setErr(''); setNote(''); setData(null)
    if (!f) return
    try {
      const p = await importExport(f)
      if (!p.files.length) { setErr('No profile files found. Use the ZIP from your data export.'); return }
      setData(p)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not read that file.') }
  }
  const keep = () => {
    if (!data) return
    try { localStorage.setItem(IMPORT_KEY, JSON.stringify({ ...data, contacts: data.contacts.slice(0, 500) })) }
    catch { setErr('This browser would not store it.'); return }
    setSaved(loadImport()); setNote('Kept on this device. It shows on your profile as claimed, not earned.')
  }
  const forget = () => { try { localStorage.removeItem(IMPORT_KEY); localStorage.removeItem(OLD_KEY) } catch { /* nothing stored */ } setSaved(null); setNote('Forgotten.') }
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(INVITE); setNote('Invite text copied. Send it yourself; Aionyn contacts nobody.') }
    catch { setNote(INVITE) }
  }
  const shown = data || saved

  return (
    <section className="stack" aria-label="Import from LinkedIn">
      <header className="stream-header"><h1>Import from LinkedIn</h1></header>
      <div className="pane-section stack-sm">
        <p className="dim small">
          Use the ZIP from LinkedIn&apos;s &ldquo;Get a copy of your data&rdquo; (Settings, Data privacy). Aionyn reads
          positions, skills, education and connections <strong>in this browser</strong>. Nothing is uploaded.
        </p>
        <p className="fine" style={{ marginTop: 0 }}>Imported facts are shown as <em>claimed</em>. Standing on Aionyn is earned in communities.</p>
        <div className="row">
          <input aria-label="Data export ZIP" type="file" accept=".zip,application/zip" onChange={e => pick(e.target.files?.[0])} />
        </div>
      </div>

      {err && <p className="notice-row err" role="alert">{err}</p>}
      {note && <p className="notice-row dim" role="status">{note}</p>}

      {shown && (
        <>
          <section className="pane-section" aria-label="Imported positions">
            <h2>Positions · {shown.positions.length}</h2>
            <ul className="rows">
              {shown.positions.slice(0, 20).map((p, i) => (
                <li key={i} className="small">
                  <strong>{p.title}</strong> · {p.company}
                  <span className="mono xs muted"> · {p.from}{p.to ? `–${p.to}` : '–now'}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="pane-section">
            <h2>Skills · {shown.skills.length}</h2>
            <p className="xs muted">{shown.skills.slice(0, 40).join(' · ')}</p>
          </section>
          <section className="pane-section">
            <h2>Education · {shown.education.length}</h2>
            <ul className="rows">
              {shown.education.map((e, i) => (
                <li key={i} className="small"><strong>{e.school}</strong>{e.degree ? ` · ${e.degree}` : ''}</li>
              ))}
            </ul>
          </section>
          <section className="pane-section stack-sm" aria-label="Invite suggestions">
            <h2>People you know · {shown.contacts.length}</h2>
            <p className="dim small">Invite suggestions only. Aionyn never messages them for you.</p>
            <ul className="rows">
              {shown.contacts.slice(0, 10).map((c, i) => (
                <li key={i} className="small">{c.name}{c.company ? <span className="dim"> · {c.company}</span> : null}</li>
              ))}
            </ul>
            <div><button className="ghost btn-sm" type="button" onClick={copyInvite}>Copy invite text</button></div>
          </section>
          <div className="pane-section row">
            {data && <button className="primary btn-sm" type="button" onClick={keep}>Keep on this device</button>}
            {saved && <button className="ghost btn-sm" type="button" onClick={forget}>Forget my import</button>}
          </div>
        </>
      )}
    </section>
  )
}
