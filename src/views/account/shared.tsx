// Shared Account hub pieces: a loader hook, feedback rows, and IdP handoff links. AGPL-3.0-only.
import { useCallback, useEffect, useRef, useState } from 'react'
import { safeHttps, type Handoff } from '../../api/account'

export function messageOf(e: unknown, fallback = 'Something went wrong.'): string {
  return e instanceof Error && e.message ? e.message : fallback
}

/** Load once on mount; `reload` refetches, `setData` applies a fresher server answer. */
export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const ref = useRef(load)
  ref.current = load
  const alive = useRef(true)
  const reload = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const d = await ref.current()
      if (alive.current) setData(d)
    } catch (e) {
      if (alive.current) setErr(messageOf(e))
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    alive.current = true
    void reload()
    return () => { alive.current = false }
  }, [reload])
  return { data, setData, err, loading, reload }
}

/** One quiet success line and/or one error line, never a wall. */
export function Feedback({ ok, err }: { ok?: string; err?: string }) {
  return (
    <>
      {err && <p className="notice-row err" role="alert">{err}</p>}
      {ok && <p className="notice-row ok" role="status">{ok}</p>}
    </>
  )
}

export function Loading({ what }: { what: string }) {
  return <div className="empty-state">Loading {what}…</div>
}

/** A quiet external link to a first-party page; renders nothing for a non-https URL. */
export function ExtLink({ href, children, className = 'small dim' }: {
  href: unknown; children: string; className?: string
}) {
  const url = safeHttps(href)
  if (!url) return null
  return <a className={className} href={url} target="_blank" rel="noopener noreferrer">{children} ↗</a>
}

/** The credential ceremonies that only ever happen on the Aitherium IdP. */
export const IDP_LINKS: ReadonlyArray<readonly [keyof Handoff & string, string]> = [
  ['password_change', 'Change password'],
  ['passkeys', 'Passkeys'],
  ['two_factor', 'Two-factor'],
  ['account_recovery', 'Account recovery'],
]

export function IdpLinks({ handoff, keys = IDP_LINKS }: {
  handoff: Handoff | null; keys?: ReadonlyArray<readonly [string, string]>
}) {
  if (!handoff) return null
  const shown = keys.filter(([k]) => safeHttps(handoff[k]))
  if (!shown.length) return null
  return (
    <div className="row wrap" style={{ gap: 16 }}>
      {shown.map(([k, label]) => <ExtLink key={k} href={handoff[k]}>{label}</ExtLink>)}
    </div>
  )
}
