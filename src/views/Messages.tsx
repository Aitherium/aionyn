// Direct messages (`#/messages`): live Relay DMs with polling, compose, and Discord mirror link.
// AGPL-3.0-only.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ago, cleanHandle } from '../api/helpers'
import type { DirectMessage, NetworkClient } from '../api/types'

const POLL_MS = 10000

export function MessagesView({
  client,
  initialTo = '',
  me = '',
  signIn,
}: {
  client: NetworkClient | null
  initialTo?: string
  me?: string
  signIn: () => void
}) {
  const [dms, setDms] = useState<DirectMessage[] | null>(null)
  const [err, setErr] = useState('')
  const [to, setTo] = useState(initialTo)
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (initialTo) setTo(initialTo)
  }, [initialTo])

  const load = useCallback(async () => {
    if (!client?.world.dms) { setDms([]); return }
    try {
      const rows = await client.world.dms()
      setDms(rows)
      setErr('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load messages.')
      setDms([])
    }
  }, [client])

  useEffect(() => {
    if (!client) return
    void load()
    const t = setInterval(() => { void load() }, POLL_MS)
    return () => clearInterval(t)
  }, [client, load])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!client) return
    const handle = cleanHandle(to)
    if (!handle || !text.trim()) return
    setBusy(true); setStatus('')
    const r = await client.world.message(handle, text.trim())
    setBusy(false)
    setStatus(r.message)
    if (r.ok) {
      setText('')
      void load()
    }
  }

  if (!client) {
    return (
      <section className="stack" aria-label="Messages">
        <div className="card stack-sm">
          <h2>Direct Messages</h2>
          <p className="dim">
            Direct messages run on AitherRelay and mirror to Discord when bridged, so conversations stay reachable across both.
          </p>
          <div>
            <button className="primary" type="button" onClick={signIn}>Sign in with Aitherium</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="stack" aria-label="Messages">
      <div className="card stack-sm">
        <div className="row between wrap">
          <h2>Direct Messages</h2>
          <div className="row">
            <button className="ghost btn-sm" type="button" onClick={() => void load()}>Refresh</button>
            <a className="link btn-sm" href="https://relay.aitherium.com/" target="_blank" rel="noopener noreferrer">
              Open Relay ↗
            </a>
          </div>
        </div>
        <p className="dim small">
          Live AitherRelay direct messages (auto-refreshes every 10s), mirrored with connected Discord accounts.
        </p>

        <form className="stack-sm" onSubmit={send} aria-label="Send a direct message">
          <div className="row wrap">
            <input
              aria-label="Recipient handle"
              placeholder="@handle"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>
          <textarea
            aria-label="Message body"
            rows={2}
            placeholder="Write a direct message…"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="row between wrap">
            <button className="primary" type="submit" disabled={busy || !cleanHandle(to) || !text.trim()}>
              {busy ? 'Sending…' : 'Send DM'}
            </button>
            {status && <span className="dim small" role="status">{status}</span>}
          </div>
        </form>
      </div>

      {err && <p className="err" role="alert">{err}</p>}

      <div className="card stack-sm">
        <h2>Recent DMs</h2>
        {dms === null && <p className="dim">Loading direct messages…</p>}
        {dms?.length === 0 && (
          <p className="dim small">No recent direct messages in this inbox yet. Send one above or open Relay.</p>
        )}
        <ul className="rows">
          {dms?.map(m => {
            const peer = m.from === me ? m.to : m.from
            return (
              <li key={m.id} className="stack-xs">
                <div className="row between wrap">
                  <span>
                    <a href={`#/u/${encodeURIComponent(m.from)}`}>@{m.from}</a>
                    <span className="dim"> → </span>
                    <a href={`#/u/${encodeURIComponent(m.to)}`}>@{m.to}</a>
                  </span>
                  <span className="mono dim small">
                    {ago(m.timestamp)}
                    {peer && (
                      <>
                        {' · '}
                        <button className="linkish" type="button" onClick={() => setTo(peer)}>Reply</button>
                      </>
                    )}
                  </span>
                </div>
                <p>{m.body}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
