// Test helpers for the Account hub views: mount, flush, type, and a route-table fetch. AGPL-3.0-only.
import { act } from 'react'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { vi } from 'vitest'

export const API = 'https://api.example.test'
export const P = `${API}/api/aionyn/account`

export async function mount(el: ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => { root.render(el) })
  await flush()
  return {
    container,
    rerender: async (next: ReactElement) => { await act(async () => { root.render(next) }); await flush() },
    unmount: () => { act(() => { root.unmount() }); container.remove() },
  }
}

export async function flush(times = 3) {
  for (let i = 0; i < times; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) })
}

export function typeInto(el: Element | null, value: string) {
  if (!el) throw new Error('no element to type into')
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
    : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
  act(() => { el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })) })
}

export async function click(el: Element | null | undefined) {
  if (!el) throw new Error('no element to click')
  await act(async () => { (el as HTMLElement).click() })
  await flush()
}

export function button(container: HTMLElement, text: string | RegExp): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find(b =>
    typeof text === 'string' ? b.textContent?.trim() === text : text.test(b.textContent || '')) as HTMLButtonElement | undefined
}

export type Reply = [number, unknown] | ((init: RequestInit) => [number, unknown])

/** `routes['GET /profile']` answers `GET {P}/profile`; anything unrouted is a 404. */
export function routeFetch(routes: Record<string, Reply>) {
  return vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url)
    const method = (init?.method || 'GET').toUpperCase()
    const path = u.startsWith(P) ? u.slice(P.length) : u
    const r = routes[`${method} ${path}`]
    const [status, body] = r === undefined ? [404, { detail: 'unrouted' }] : typeof r === 'function' ? r(init || {}) : r
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  })
}

export function callsTo(f: ReturnType<typeof routeFetch>, method: string, path: string) {
  return f.mock.calls.filter(([u, i]) => String(u) === P + path && ((i as RequestInit | undefined)?.method || 'GET') === method)
}

export const HANDOFF = {
  urls: {
    password_change: 'https://aitherium.com/workspace/settings?tab=security',
    passkeys: 'https://aitherium.com/workspace/settings?tab=passkeys',
    two_factor: 'https://aitherium.com/workspace/settings?tab=2fa',
    account_recovery: 'https://aitherium.com/account-recovery',
    delete_account: 'https://aitherium.com/workspace/settings?tab=data',
    linked_accounts: 'https://aitherium.com/workspace/settings?tab=accounts',
    discord_link: 'https://aitherium.com/link/discord',
    billing: 'https://aitherium.com/workspace/settings?tab=billing',
  },
}

export const PROFILE = {
  profile: {
    username: 'ada', display_name: 'Ada L', avatar_url: '', headline: 'Shipping', headline_emoji: '',
    bio: 'Hello', links: { website: '', github_username: 'ada', linkedin_url: '', twitter_handle: '' },
    visibility: 'public', space_exists: true, space_url: 'https://aitherium.com/spaces/ada',
  },
  sources: { identity: 'ok', space: 'ok' },
}

export const SPACE = {
  username: 'ada', exists: true, visibility: 'public', updated_at: '2026-11-20T00:00:00Z',
  space_url: 'https://aitherium.com/spaces/ada',
  config: { version: 1, mood: { text: 'Shipping' }, blocks: [
    { id: 'b1', type: 'bio', config: {} },
    { id: 'b2', type: 'top8', config: { title: 'Top friends' } },
  ] },
}
