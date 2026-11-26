import { describe, expect, it, vi } from 'vitest'
import {
  ACCOUNT_PREFIX, AccountApi, AccountError, errorMessage, fetchHandoff, money, safeHttps, shortDate,
} from './account'

const BASE = 'https://api.example.test'

function mockFetch(status = 200, body: unknown = {}) {
  return vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(
    body === undefined ? '' : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } },
  ))
}

function lastCall(f: ReturnType<typeof mockFetch>) {
  const [url, init] = f.mock.calls[f.mock.calls.length - 1]
  return { url: String(url), init: init as RequestInit, headers: (init as RequestInit).headers as Record<string, string> }
}

describe('AccountApi', () => {
  it('sends the bearer, omits cookies, and never sends a user id', async () => {
    const f = mockFetch(200, { services: [], bundles: [] })
    const api = new AccountApi({ apiBase: `${BASE}/`, token: 'tok-1' }, f as unknown as typeof fetch)
    await api.services()
    const c = lastCall(f)
    expect(c.url).toBe(`${BASE}${ACCOUNT_PREFIX}/services`)
    expect(c.init.method).toBe('GET')
    expect(c.init.credentials).toBe('omit')
    expect(c.headers.Authorization).toBe('Bearer tok-1')
    expect(c.init.body).toBeUndefined()
    expect(JSON.stringify(c)).not.toMatch(/user_id|X-User-ID/)
  })

  it('maps every method to the verified facade route and verb', async () => {
    const f = mockFetch(200, { ok: true })
    const api = new AccountApi({ apiBase: BASE, token: 't' }, f as unknown as typeof fetch)
    const cases: Array<[() => Promise<unknown>, string, string, unknown?]> = [
      [() => api.setService('openaw', 'activate'), 'POST', '/services/openaw/activate'],
      [() => api.setService('eusyra', 'deactivate'), 'POST', '/services/eusyra/deactivate'],
      [() => api.profile(), 'GET', '/profile'],
      [() => api.saveProfile({ display_name: 'Ada' }), 'PATCH', '/profile', { display_name: 'Ada' }],
      [() => api.space(), 'GET', '/space'],
      [() => api.saveSpace({ blocks: [] }), 'PUT', '/space', { config: { blocks: [] } }],
      [() => api.sessions(), 'GET', '/sessions'],
      [() => api.revokeSession('0123456789abcdef'), 'DELETE', '/sessions/0123456789abcdef'],
      [() => api.revokeOtherSessions(), 'POST', '/sessions/revoke-others'],
      [() => api.devices(), 'GET', '/devices'],
      [() => api.apiKeys(), 'GET', '/api-keys'],
      [() => api.createApiKey('cli', 30), 'POST', '/api-keys', { name: 'cli', scopes: ['read'], expires_in_days: 30 }],
      [() => api.revokeApiKey('key/1'), 'DELETE', '/api-keys/key%2F1'],
      [() => api.security(), 'GET', '/security'],
      [() => api.billing(), 'GET', '/billing'],
      [() => api.billingPortal('https://aionyn.aitherium.com/#/account/billing'), 'POST', '/billing/portal',
        { return_url: 'https://aionyn.aitherium.com/#/account/billing' }],
      [() => api.privacy(), 'GET', '/privacy'],
      [() => api.savePrivacy({ space_visibility: 'private' }), 'PATCH', '/privacy', { space_visibility: 'private' }],
    ]
    for (const [run, method, path, body] of cases) {
      await run()
      const c = lastCall(f)
      expect(c.url).toBe(`${BASE}${ACCOUNT_PREFIX}${path}`)
      expect(c.init.method).toBe(method)
      if (body === undefined) expect(c.init.body).toBeUndefined()
      else {
        expect(JSON.parse(String(c.init.body))).toEqual(body)
        expect(c.headers['Content-Type']).toBe('application/json')
      }
    }
  })

  it('exports data as a downloadable JSON blob', async () => {
    const f = mockFetch(200, { schema: 'aionyn.account.export/1', data: { a: 1 } })
    const blob = await new AccountApi({ apiBase: BASE, token: 't' }, f as unknown as typeof fetch).exportData()
    expect(blob.type).toBe('application/json')
    expect(lastCall(f).url).toBe(`${BASE}${ACCOUNT_PREFIX}/export`)
  })

  it('raises AccountError with the server message ({detail:{message}} and {detail:string})', async () => {
    const api401 = new AccountApi({ apiBase: BASE, token: 't' }, mockFetch(401, {
      detail: { error: 'unauthorized', message: 'Sign in with Aitherium to manage your account.' },
    }) as unknown as typeof fetch)
    await expect(api401.profile()).rejects.toMatchObject({
      name: 'AccountError', status: 401, message: 'Sign in with Aitherium to manage your account.',
    })
    const api422 = new AccountApi({ apiBase: BASE, token: 't' }, mockFetch(422, { detail: 'display_name cannot be blank' }) as unknown as typeof fetch)
    await expect(api422.saveProfile({ display_name: '' })).rejects.toThrow('display_name cannot be blank')
  })

  it('maps bodiless failures and network errors to calm sentences', async () => {
    const f500 = vi.fn(async () => new Response('oops', { status: 503 }))
    await expect(new AccountApi({ apiBase: BASE, token: 't' }, f500 as unknown as typeof fetch).billing())
      .rejects.toThrow('Aitherium is unavailable right now')
    const down = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    const err = await new AccountApi({ apiBase: BASE, token: 't' }, down as unknown as typeof fetch).sessions().catch(e => e)
    expect(err).toBeInstanceOf(AccountError)
    expect(err.status).toBe(0)
    expect(err.message).toMatch(/Could not reach Aitherium/)
  })
})

describe('account helpers', () => {
  it('errorMessage covers known statuses', () => {
    expect(errorMessage(null, 401)).toMatch(/sign-in expired/)
    expect(errorMessage({}, 403)).toMatch(/not allowed/)
    expect(errorMessage({}, 404)).toMatch(/no longer exists/)
    expect(errorMessage({}, 429)).toMatch(/Too many/)
    expect(errorMessage({}, 418)).toBe('The server answered 418.')
    expect(errorMessage({ detail: '  ' }, 400)).toBe('The server answered 400.')
  })

  it('fetchHandoff reads public IdP URLs and fails quietly', async () => {
    const ok = mockFetch(200, { urls: { password_change: 'https://aitherium.com/workspace/settings?tab=security' } })
    const h = await fetchHandoff(BASE, ok as unknown as typeof fetch)
    expect(h?.password_change).toContain('tab=security')
    const [, init] = ok.mock.calls[0]
    expect((init as RequestInit).credentials).toBe('omit')
    expect(String(ok.mock.calls[0][0])).toBe(`${BASE}${ACCOUNT_PREFIX}/handoff`)
    expect(await fetchHandoff(BASE, mockFetch(500, {}) as unknown as typeof fetch)).toBeNull()
    expect(await fetchHandoff(BASE, vi.fn(async () => { throw new Error('x') }) as unknown as typeof fetch)).toBeNull()
  })

  it('safeHttps only lets https through', () => {
    expect(safeHttps('https://billing.stripe.com/p/session/x')).toBe('https://billing.stripe.com/p/session/x')
    expect(safeHttps('javascript:alert(1)')).toBeUndefined()
    expect(safeHttps('http://insecure.test')).toBeUndefined()
    expect(safeHttps(42)).toBeUndefined()
  })

  it('shortDate and money render tabular values', () => {
    expect(shortDate('2026-11-25T10:00:00Z')).toBe('2026-11-25')
    expect(shortDate(1764064800)).toBe('2025-11-25')
    expect(shortDate(null)).toBe('—')
    expect(shortDate('not a date')).toBe('—')
    expect(money(1299, 'usd')).toBe('12.99 USD')
    expect(money(undefined, 'usd')).toBe('—')
  })
})
