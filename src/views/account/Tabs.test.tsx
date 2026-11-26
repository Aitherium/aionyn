import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountView } from '../Account'
import { portalReturnUrl, BillingTab } from './Billing'
import { AccountApi } from '../../api/account'
import { API, HANDOFF, button, callsTo, click, mount, routeFetch, typeInto } from './testUtil'

let cleanup: (() => void) | null = null
afterEach(() => { cleanup?.(); cleanup = null; vi.restoreAllMocks() })

async function render(tab: string, f: ReturnType<typeof routeFetch>) {
  const m = await mount(
    <AccountView tab={tab} token="tok" viewer={{ username: 'ada', displayName: 'Ada' }} apiBase={API}
      signIn={vi.fn()} go={vi.fn()} fetchImpl={f as unknown as typeof fetch} />,
  )
  cleanup = m.unmount
  return m
}

const SESSIONS = {
  count: 2, note: 'Revoking sessions here never signs this Aionyn tab out.',
  sessions: [
    { id: 'aaaaaaaaaaaaaaaa', created_at: '2026-11-01T00:00:00Z', last_active: '2026-11-25T00:00:00Z', is_current: true },
    { id: 'bbbbbbbbbbbbbbbb', created_at: '2026-10-01T00:00:00Z', last_active: '2026-11-20T00:00:00Z', is_current: false },
  ],
}
const KEYS = { count: 1, keys: [{ id: 'k1', name: 'laptop', prefix: 'ak_live_ab', scopes: ['read'], created_at: '2026-11-01T00:00:00Z', expires_at: '2027-01-30T00:00:00Z', last_used: null, is_active: true }] }
const SECURITY = {
  mfa: { status: 'ok', two_factor_enabled: true, totp_enabled: true, secure_methods_only: false, methods: [{ type: 'totp', name: 'Authenticator' }] },
  passkeys: { status: 'ok', available: true, count: 1, credentials: [{ device_name: 'MacBook' }] },
  linked_accounts: { status: 'ok', providers: [{ provider: 'github', linked_at: null, primary: false }] },
  chat_accounts: { status: 'ok', accounts: [] },
  external: { github: { linked: true }, discord: { linked: false }, openaw: { status: 'active', sso_url: 'https://www.openaw.org/auth/aitherium/start' } },
  handoff: { password_change: HANDOFF.urls.password_change, passkeys: HANDOFF.urls.passkeys, two_factor: HANDOFF.urls.two_factor, discord_link: HANDOFF.urls.discord_link },
}
const DEVICES = { status: 'linked', count: 1, devices: [{ name: 'node-1', kind: 'awnode', last_seen: '2026-11-25T00:00:00Z', healthy: true }], revoke_supported: false, manage_url: 'https://aitherium.com/workspace/settings?tab=devices' }

function securityRoutes(extra: Record<string, Parameters<typeof routeFetch>[0][string]> = {}) {
  return routeFetch({
    'GET /handoff': [200, HANDOFF], 'GET /sessions': [200, SESSIONS], 'GET /api-keys': [200, KEYS],
    'GET /security': [200, SECURITY], 'GET /devices': [200, DEVICES],
    'GET /lockbox': [200, { available: true, count: 0, secrets: [] }], ...extra,
  })
}

describe('Account › Security', () => {
  it('lists sessions, devices, keys, MFA/passkeys and linked accounts', async () => {
    const { container } = await render('security', securityRoutes())
    const t = container.textContent || ''
    expect(t).toContain('This browser')
    expect(t).toContain('bbbbbbbb…')
    expect(t).toContain('ak_live_ab…')
    expect(t).toContain('1 registered')
    expect(t).toContain('MacBook')
    expect(t).toContain('node-1')
    expect(t).toMatch(/GitHub\s*Linked/)
    expect(container.innerHTML).toContain(HANDOFF.urls.discord_link)
    expect(container.innerHTML).toContain(HANDOFF.urls.password_change)
    // Passwords are never handled here; the only masked input is the write-only Lockbox value.
    expect(container.querySelectorAll('input[type="password"]')).toHaveLength(1)
    expect(container.querySelector('input[type="password"]')?.getAttribute('aria-label')).toBe('Secret value')
  })

  it('revokes one session and all other sessions', async () => {
    const f = securityRoutes({
      'DELETE /sessions/bbbbbbbbbbbbbbbb': [200, { revoked: 1 }],
      'POST /sessions/revoke-others': [200, { revoked: 1 }],
    })
    const { container } = await render('security', f)
    await click(button(container, 'Revoke'))
    expect(callsTo(f, 'DELETE', '/sessions/bbbbbbbbbbbbbbbb')).toHaveLength(1)
    expect(container.textContent).toContain('Session revoked.')
    await click(button(container, 'Revoke other sessions'))
    expect(callsTo(f, 'POST', '/sessions/revoke-others')).toHaveLength(1)
    expect(container.textContent).toContain('Revoked 1 other session.')
  })

  it('creates a key, shows the raw secret once with Copy + warning, then revokes it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const created = { id: 'k2', name: 'ci', prefix: 'ak_live_cd', scopes: ['read'], created_at: '2026-11-25T00:00:00Z', is_active: true }
    let body: unknown = null
    const f = securityRoutes({
      'POST /api-keys': init => {
        body = JSON.parse(String(init.body))
        return [201, { key: { ...created, expires_at: null }, api_key: 'ak_live_cd_SECRET', warning: 'Save this key now. It will not be shown again.', keys: [...KEYS.keys, created] }]
      },
      'DELETE /api-keys/k2': [200, { revoked: true, keys: KEYS.keys }],
    })
    const { container } = await render('security', f)
    typeInto(container.querySelector('input[aria-label="Key name"]'), 'ci')
    typeInto(container.querySelector('select[aria-label="Expires in"]'), '30')
    await click(button(container, 'Create key'))
    expect(body).toEqual({ name: 'ci', scopes: ['read'], expires_in_days: 30 })
    expect(container.querySelector('[data-testid="new-api-key"]')?.textContent).toBe('ak_live_cd_SECRET')
    expect(container.textContent).toContain('It will not be shown again.')
    await click(button(container, 'Copy'))
    expect(writeText).toHaveBeenCalledWith('ak_live_cd_SECRET')
    expect(button(container, 'Copied')).toBeTruthy()
    await click(button(container, 'Done'))
    expect(container.textContent).not.toContain('ak_live_cd_SECRET')
    const revokeCi = Array.from(container.querySelectorAll('li.kv-row')).find(li => li.textContent?.includes('ak_live_cd'))
    await click(revokeCi?.querySelector('button'))
    expect(callsTo(f, 'DELETE', '/api-keys/k2')).toHaveLength(1)
    expect(container.textContent).toContain('Revoked ci.')
  })

  it('one failing section degrades alone', async () => {
    const f = securityRoutes({ 'GET /sessions': [503, { detail: { message: 'Aitherium Identity is unavailable; try again.' } }] })
    const { container } = await render('security', f)
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1)
    expect(container.textContent).toContain('ak_live_ab…')
    expect(container.textContent).toContain('node-1')
  })
})

const BILLING = {
  plan: { status: 'ok', tier: 'pro', is_paid: true, is_preview: false },
  subscriptions: { status: 'ok', stripe_available: true, items: [{ subscription_id: 'sub_1', status: 'active', plan: 'Pro', amount_cents: 1200, currency: 'usd', interval: 'month', current_period_end: 1767225600, cancel_at_period_end: false }] },
  packs: { status: 'ok', items: [{ listing_id: 'eusyra-stickers', status: 'active', created_at: '2026-11-01T00:00:00Z', pack_type: 'sticker' }] },
  entitlements: { status: 'ok', products: { canvas: true, image_generation: false } },
  invoices: { status: 'ok', has_more: false, items: [{ id: 'in_1', number: 'A-0001', date: 1764000000, amount_paid: 1200, currency: 'usd', status: 'paid', hosted_invoice_url: 'https://invoice.stripe.com/i/x' }] },
  portal: { status: 'ok', available: true, handoff_url: HANDOFF.urls.billing },
}

describe('Account › Billing & Packs', () => {
  it('shows plan, subscription, packs, order history and shop link', async () => {
    const { container } = await render('billing', routeFetch({ 'GET /billing': [200, BILLING] }))
    const t = container.textContent || ''
    expect(t).toContain('Pro')
    expect(t).toContain('12.00 USD / month')
    expect(t).toContain('eusyra-stickers')
    expect(t).toContain('A-0001')
    expect(t).toContain('Canvas')
    expect(container.querySelector('table[aria-label="Order history"]')).not.toBeNull()
    expect(container.innerHTML).toContain('https://shop.aitherium.com/packs')
    expect(container.innerHTML).toContain('https://invoice.stripe.com/i/x')
  })

  it('Manage billing opens the Stripe portal, or the handoff when unavailable', async () => {
    const open = vi.fn()
    let portal = { available: true, reason: null, url: 'https://billing.stripe.com/p/session/abc', handoff_url: HANDOFF.urls.billing }
    const f = routeFetch({ 'GET /billing': [200, BILLING], 'POST /billing/portal': () => [200, portal] })
    const m = await mount(<BillingTab api={new AccountApi({ apiBase: API, token: 't' }, f as unknown as typeof fetch)} open={open} />)
    cleanup = m.unmount
    await click(button(m.container, 'Manage billing ↗'))
    expect(open).toHaveBeenCalledWith('https://billing.stripe.com/p/session/abc')
    expect(JSON.parse(String(callsTo(f, 'POST', '/billing/portal')[0][1]!.body))).toEqual({ return_url: 'https://aionyn.aitherium.com/#/account/billing' })
    portal = { available: false, reason: null, url: null as unknown as string, handoff_url: HANDOFF.urls.billing }
    await click(button(m.container, 'Manage billing ↗'))
    expect(open).toHaveBeenLastCalledWith(HANDOFF.urls.billing)
  })

  it('portal return URLs stay on Aionyn', () => {
    expect(portalReturnUrl('https://aionyn.com')).toBe('https://aionyn.com/#/account/billing')
    expect(portalReturnUrl('http://localhost:5173')).toBe('https://aionyn.aitherium.com/#/account/billing')
  })

  it('a billing failure shows one error row and keeps the actions', async () => {
    const { container } = await render('billing', routeFetch({ 'GET /billing': [500, {}], 'GET /wallet': [200, { available: false }] }))
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1)
    expect(button(container, 'Manage billing ↗')).toBeTruthy()
  })
})

const PRIVACY = {
  space_visibility: { status: 'ok', value: 'public', options: ['public', 'friends_only', 'workspace', 'private'] },
  consents: { status: 'ok', purposes: { essential: 'Required to run the service', analytics: 'Usage analytics' },
    items: { essential: { granted: true, recorded_at: null, editable: false }, analytics: { granted: false, recorded_at: null, editable: true } } },
  data_export: { available: true, method: 'GET', path: '/api/aionyn/account/export' },
  deletion: { self_service_in_spa: false, handoff_url: HANDOFF.urls.delete_account },
}

describe('Account › Privacy & Data', () => {
  it('saves visibility and consents, exports data, and links recovery/deletion to the IdP', async () => {
    const bodies: unknown[] = []
    const f = routeFetch({
      'GET /handoff': [200, HANDOFF],
      'GET /privacy': [200, PRIVACY],
      'PATCH /privacy': init => { bodies.push(JSON.parse(String(init.body))); return [200, PRIVACY] },
      'GET /export': [200, { schema: 'aionyn.account.export/1', data: {} }],
    })
    const createObjectURL = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { container } = await render('privacy', f)
    typeInto(container.querySelector('#acct-privacy-vis'), 'private')
    await click(button(container, 'Save'))
    expect(bodies[0]).toEqual({ space_visibility: 'private' })
    expect(container.textContent).toContain('Visibility saved.')
    const boxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    expect(boxes[0].disabled).toBe(true)
    await click(boxes[1])
    expect(bodies[1]).toEqual({ consents: { analytics: true } })
    await click(button(container, 'Download export'))
    expect(callsTo(f, 'GET', '/export')).toHaveLength(1)
    expect(createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()
    expect(container.textContent).toContain('Your export is downloading.')
    expect(container.querySelector('a[href="#/import"]')).not.toBeNull()
    expect(container.innerHTML).toContain(HANDOFF.urls.account_recovery)
    expect(container.innerHTML).toContain(HANDOFF.urls.delete_account)
  })
})
