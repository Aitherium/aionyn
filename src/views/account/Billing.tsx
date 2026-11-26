// Account › Billing & Packs: plan, subscriptions, owned packs, order history, billing portal. AGPL-3.0-only.
import { useState } from 'react'
import { SHOP_PACKS_URL, money, safeHttps, shortDate, type AccountApi } from '../../api/account'
import { ExtLink, Feedback, Loading, messageOf, useResource } from './shared'
import { WalletStrip } from './Wallet'

const PORTAL_RETURN_ORIGINS = ['https://aionyn.aitherium.com', 'https://aionyn.com', 'https://www.aionyn.com']

/** Where Stripe sends the member back: this site when it is an allowlisted origin. */
export function portalReturnUrl(origin: string = window.location.origin): string {
  const o = PORTAL_RETURN_ORIGINS.includes(origin) ? origin : PORTAL_RETURN_ORIGINS[0]
  return `${o}/#/account/billing`
}

function titleCase(s: string): string {
  return s ? s.slice(0, 1).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s
}

export function BillingTab({ api, open = (u: string) => window.location.assign(u) }: {
  api: AccountApi; open?: (url: string) => void
}) {
  const res = useResource(() => api.billing())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const b = res.data

  const manage = async () => {
    setBusy(true); setErr(''); setNote('')
    try {
      const r = await api.billingPortal(portalReturnUrl())
      const url = safeHttps(r.url)
      if (r.available && url) { open(url); return }
      const fallback = safeHttps(r.handoff_url)
      if (fallback) open(fallback)
      else setNote('No billing account yet. It is created with your first purchase.')
    } catch (e) {
      setErr(messageOf(e, 'Could not open the billing portal.'))
    } finally {
      setBusy(false)
    }
  }

  const actions = (
    <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
      <button className="primary btn-sm" type="button" disabled={busy} onClick={() => void manage()}>
        {busy ? 'Opening…' : 'Manage billing ↗'}
      </button>
      <a className="link btn-sm" href={SHOP_PACKS_URL} target="_blank" rel="noopener noreferrer">Browse packs ↗</a>
    </div>
  )

  if (res.loading && !b) return <><Loading what="billing" />{actions}</>
  if (!b) {
    return (
      <>
        <Feedback err={res.err || 'Could not load billing.'} />
        {actions}
        <WalletStrip api={api} />
      </>
    )
  }
  const subs = b.subscriptions.items
  const packs = b.packs.items
  const invoices = b.invoices.items
  const comps = Object.entries(b.entitlements.products || {}).filter(([, v]) => v).map(([k]) => k)

  return (
    <>
      <div className="section-bar">Plan</div>
      <div className="kv-row">
        <span className="kv-label">Current plan</span>
        <span className="kv-value">
          {b.plan.status === 'ok' ? <strong>{titleCase(b.plan.tier || 'free')}</strong> : <span className="muted">Unavailable</span>}
          {b.plan.status === 'ok' && (
            <span className="kv-sub">{b.plan.is_paid ? 'Paid plan' : 'Free plan'}{b.plan.is_preview ? ' · preview' : ''}</span>
          )}
        </span>
        <span className="kv-action" />
      </div>
      {subs.map((s, i) => (
        <div className="kv-row" key={s.subscription_id || i}>
          <span className="kv-label">Subscription</span>
          <span className="kv-value">
            {s.plan || s.listing_id || 'Subscription'}
            <span className="kv-sub tnum">
              {money(s.amount_cents, s.currency)}{s.interval ? ` / ${s.interval}` : ''}
              {' · '}{s.cancel_at_period_end ? 'ends' : 'renews'} {shortDate(s.current_period_end)}
            </span>
          </span>
          <span className="kv-action"><span className="xs muted">{s.status || '—'}</span></span>
        </div>
      ))}
      {b.subscriptions.status === 'ok' && subs.length === 0 && (
        <div className="kv-row"><span className="kv-label">Subscriptions</span><span className="kv-value muted">None active</span><span /></div>
      )}
      {actions}
      <Feedback ok={note} err={err} />
      <WalletStrip api={api} />

      <div className="section-bar"><span>Packs & entitlements{packs.length ? <span className="tnum"> · {packs.length}</span> : null}</span></div>
      {b.packs.status !== 'ok' && <div className="empty-state">Your packs are not available right now.</div>}
      {b.packs.status === 'ok' && packs.length === 0 && comps.length === 0 && (
        <div className="empty-state">No packs yet. <a href={SHOP_PACKS_URL} target="_blank" rel="noopener noreferrer">Browse packs ↗</a></div>
      )}
      {packs.length > 0 && (
        <div className="table-scroll">
          <table className="data-table" aria-label="Owned packs">
            <thead><tr><th>Pack</th><th>Type</th><th>Since</th><th>Status</th></tr></thead>
            <tbody>
              {packs.map((p, i) => (
                <tr key={`${p.listing_id}-${i}`}>
                  <td><span className="mono">{p.listing_id || '—'}</span>{p.version ? <span className="xs muted"> v{p.version}</span> : null}</td>
                  <td className="dim">{p.pack_type || p.source || '—'}</td>
                  <td className="mono">{shortDate(p.created_at)}</td>
                  <td className="dim">{p.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {comps.length > 0 && (
        <div className="kv-row">
          <span className="kv-label">Included</span>
          <span className="kv-value">{comps.map(titleCase).join(' · ')}</span>
          <span />
        </div>
      )}

      <div className="section-bar"><span>Order history{invoices.length ? <span className="tnum"> · {invoices.length}{b.invoices.has_more ? '+' : ''}</span> : null}</span></div>
      {b.invoices.status !== 'ok' && <div className="empty-state">Order history is not available right now.</div>}
      {b.invoices.status === 'ok' && invoices.length === 0 && <div className="empty-state">No orders yet.</div>}
      {invoices.length > 0 && (
        <div className="table-scroll">
          <table className="data-table" aria-label="Order history">
            <thead><tr><th>Date</th><th>Order</th><th>Status</th><th className="num">Amount</th><th /></tr></thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id || i}>
                  <td className="mono">{shortDate(inv.date)}</td>
                  <td><span className="mono">{inv.number || '—'}</span>{inv.plan ? <span className="xs muted"> · {inv.plan}</span> : null}</td>
                  <td className="dim">{inv.status || '—'}</td>
                  <td className="num mono">{money(inv.amount_paid ?? inv.amount_due, inv.currency)}</td>
                  <td className="num"><ExtLink href={inv.hosted_invoice_url || inv.invoice_pdf} className="xs dim">Receipt</ExtLink></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
