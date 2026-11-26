import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountApi } from '../../api/account'
import { maskedHint } from './Lockbox'
import { SecurityTab } from './Security'
import { WalletStrip, units } from './Wallet'
import { API, button, callsTo, click, mount, routeFetch, typeInto, type Reply } from './testUtil'

let cleanup: (() => void) | null = null
afterEach(() => { cleanup?.(); cleanup = null; vi.restoreAllMocks() })

const RAW = 'sk-live-THIS-IS-THE-RAW-SECRET-1234'
const BASE: Record<string, Reply> = {
  'GET /sessions': [200, { count: 0, sessions: [] }], 'GET /api-keys': [200, { count: 0, keys: [] }],
  'GET /security': [500, {}], 'GET /devices': [200, { status: 'none', count: 0, devices: [], revoke_supported: false, manage_url: '' }],
}

async function security(routes: Record<string, Reply>) {
  const f = routeFetch({ ...BASE, ...routes })
  const m = await mount(<SecurityTab api={new AccountApi({ apiBase: API, token: 't' }, f as unknown as typeof fetch)} handoff={null} />)
  cleanup = m.unmount
  return { f, ...m }
}

describe('Account › Security › Personal Lockbox', () => {
  it('lists secret names with masked hints only, and notes what it powers', async () => {
    const { container } = await security({ 'GET /lockbox': [200, { count: 1, secrets: [
      { name: 'OPENAI_API_KEY', type: 'api_key', hint: '1234', updated_at: '2026-11-25T00:00:00Z' }] }] })
    const box = container.querySelector('section[aria-label="Personal Lockbox"]')!
    expect(box.textContent).toContain('OPENAI_API_KEY')
    expect(box.textContent).toContain('••••1234')
    expect(box.textContent).toContain('World Studio Pro')
    expect(box.textContent).toContain('write-only')
    expect(button(container, 'Delete')).toBeTruthy()
  })

  it('stores a secret write-only: the raw value is sent once and never shown again', async () => {
    let stored: unknown = null
    let list = { count: 0, secrets: [] as unknown[] }
    const { f, container } = await security({
      'GET /lockbox': () => [200, list],
      'PUT /lockbox/ANTHROPIC_API_KEY': init => {
        stored = JSON.parse(String(init.body))
        list = { count: 1, secrets: [{ name: 'ANTHROPIC_API_KEY', type: 'api_key', hint: 'sk-…1234', updated_at: '2026-11-26T00:00:00Z' }] }
        return [200, { name: 'ANTHROPIC_API_KEY', type: 'api_key', hint: 'sk-…1234', stored: true }]
      },
    })
    const value = container.querySelector('input[aria-label="Secret value"]') as HTMLInputElement
    expect(value.type).toBe('password')
    typeInto(container.querySelector('input[aria-label="Secret name"]'), 'anthropic-api-key')
    typeInto(value, RAW)
    await click(button(container, 'Add secret'))
    expect(callsTo(f, 'PUT', '/lockbox/ANTHROPIC_API_KEY')).toHaveLength(1)
    expect(stored).toEqual({ value: RAW, type: 'api_key' })
    expect(container.textContent).toContain('ANTHROPIC_API_KEY stored')
    expect(container.textContent).toContain('sk-…1234')
    expect(container.innerHTML).not.toContain(RAW)
    expect(container.innerHTML).not.toContain('RAW-SECRET')
    expect((container.querySelector('input[aria-label="Secret value"]') as HTMLInputElement).value).toBe('')
  })

  it('rejects a non env-style name without calling the server', async () => {
    const { f, container } = await security({ 'GET /lockbox': [200, { count: 0, secrets: [] }] })
    typeInto(container.querySelector('input[aria-label="Secret name"]'), '9')
    typeInto(container.querySelector('input[aria-label="Secret value"]'), 'x')
    await click(button(container, 'Add secret'))
    expect(f.mock.calls.some(([, i]) => (i as RequestInit | undefined)?.method === 'PUT')).toBe(false)
    expect(container.textContent).toContain('env-style name')
  })

  it('deletes a secret', async () => {
    const { f, container } = await security({
      'GET /lockbox': [200, { count: 1, secrets: [{ name: 'GEMINI_API_KEY', hint: null }] }],
      'DELETE /lockbox/GEMINI_API_KEY': [200, { deleted: true }],
    })
    expect(container.textContent).toContain('••••••••')
    await click(button(container, 'Delete'))
    expect(callsTo(f, 'DELETE', '/lockbox/GEMINI_API_KEY')).toHaveLength(1)
    expect(container.textContent).toContain('GEMINI_API_KEY deleted.')
  })

  it('a backend without the Lockbox reads as quietly unavailable, with no form', async () => {
    const { container } = await security({})
    const box = container.querySelector('section[aria-label="Personal Lockbox"]')!
    expect(box.textContent).toContain('not available yet')
    expect(box.querySelector('[role="alert"]')).toBeNull()
    expect(box.querySelector('form')).toBeNull()
  })

  it('masks hints that are not already masked', () => {
    expect(maskedHint({ name: 'A', hint: 'abcdef' })).toBe('••••cdef')
    expect(maskedHint({ name: 'A', hint: 'sk-…wxyz' })).toBe('sk-…wxyz')
    expect(maskedHint({ name: 'A' })).toBe('••••••••')
  })
})

async function wallet(reply: Reply) {
  const f = routeFetch({ 'GET /wallet': reply })
  const m = await mount(<WalletStrip api={new AccountApi({ apiBase: API, token: 't' }, f as unknown as typeof fetch)} />)
  cleanup = m.unmount
  return m.container
}

describe('Account › Billing › Wallet & credits', () => {
  it('shows balances in tabular monospace, per source', async () => {
    const c = await wallet([200, {
      available: true,
      credits: { status: 'ok', balance: 1250000, unit: 'tokens' },
      community: { status: 'ok', earned_total: 4200, pending_settlement: 300 },
      platform_credits: { status: 'unavailable', balance: null, transferable: false, cash_value: false },
    }])
    const vals = Array.from(c.querySelectorAll('[data-testid="wallet-value"]')).map(v => v.textContent)
    expect(vals).toEqual(['1,250,000', '4,200', '—'])
    expect(c.querySelector('.wallet-value')?.className).toBe('wallet-value')
    expect(c.textContent).toContain('tokens balance')
    expect(c.textContent).toContain('300 pending')
    expect(c.textContent).toContain('Unavailable right now')
  })

  it('zero everywhere is a quiet empty state, not an error', async () => {
    const c = await wallet([200, {
      available: true,
      credits: { status: 'none', balance: 0, unit: 'tokens' },
      community: { status: 'none', earned_total: 0, pending_settlement: 0 },
      platform_credits: { status: 'none', balance: 0 },
    }])
    expect(Array.from(c.querySelectorAll('[data-testid="wallet-value"]')).map(v => v.textContent)).toEqual(['0', '0', '0'])
    expect(c.textContent).toContain('No balance yet')
    expect(c.querySelector('[role="alert"]')).toBeNull()
  })

  it('an unavailable wallet never shows numbers', async () => {
    const c = await wallet([200, { available: false }])
    expect(c.querySelector('[data-testid="wallet-value"]')).toBeNull()
    expect(c.textContent).toContain('not available right now')
  })

  it('formats whole units', () => {
    expect(units(1234567)).toBe('1,234,567')
    expect(units(null)).toBe('—')
    expect(units(Number.NaN)).toBe('—')
  })
})
