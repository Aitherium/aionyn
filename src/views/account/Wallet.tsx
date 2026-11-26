// Account › Billing › Wallet & Credits: the member's own Aitherium balances, read-only.
// Each source degrades on its own; nothing is ever estimated or faked. AGPL-3.0-only.
import type { AccountApi, WalletResponse, WalletStatus } from '../../api/account'
import { Feedback, Loading, useResource } from './shared'

/** `1234567` → `1,234,567`; null → `—`. Integers only: balances are whole units. */
export function units(n: number | null | undefined): string {
  return typeof n === 'number' && Number.isFinite(n) ? Math.trunc(n).toLocaleString('en-US') : '—'
}

interface Cell { label: string; value: string; sub: string; muted: boolean }

function cell(label: string, status: WalletStatus | undefined, n: number | null | undefined, sub: string): Cell {
  if (!status || status === 'unavailable') return { label, value: '—', sub: 'Unavailable right now', muted: true }
  return { label, value: units(status === 'none' ? 0 : n), sub, muted: status === 'none' || !n }
}

export function walletCells(w: WalletResponse): Cell[] {
  const c = w.credits
  const com = w.community
  const pc = w.platform_credits
  const pending = com?.status === 'ok' && com.pending_settlement ? ` · ${units(com.pending_settlement)} pending` : ''
  return [
    cell('Aitherium credits', c?.status, c?.balance, c?.unit ? `${c.unit} balance` : 'Balance'),
    cell('Compute earnings', com?.status, com?.earned_total, `AitherNet node earnings${pending}`),
    cell('Platform points', pc?.status, pc?.balance, 'Non-cash, non-transferable'),
  ]
}

export function WalletStrip({ api }: { api: AccountApi }) {
  const res = useResource(() => api.wallet())
  const w = res.data
  const cells = w ? walletCells(w) : []
  const empty = w && w.available && cells.every(x => x.value === '0')

  return (
    <section aria-label="Wallet and credits">
      <div className="section-bar">Wallet &amp; credits</div>
      {res.loading && !w && <Loading what="wallet" />}
      <Feedback err={res.err} />
      {w && !w.available && <div className="empty-state">Your wallet is not available right now.</div>}
      {w && w.available && (
        <div className="wallet-strip">
          {cells.map(x => (
            <div key={x.label}>
              <span className="wallet-label">{x.label}</span>
              <span className={x.muted ? 'wallet-value is-muted' : 'wallet-value'} data-testid="wallet-value">{x.value}</span>
              <span className="wallet-sub">{x.sub}</span>
            </div>
          ))}
        </div>
      )}
      {empty && (
        <p className="lockbox-note">No balance yet. Credits arrive with packs and plans; earnings arrive when your AitherNet node serves work.</p>
      )}
    </section>
  )
}
