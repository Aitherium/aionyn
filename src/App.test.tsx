import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import App, { legacyRoute } from './App'

const origFetch = globalThis.fetch

async function renderAt(hash: string) {
  window.location.hash = hash
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => { root.render(<App />) })
  for (let i = 0; i < 3; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) })
  return {
    container,
    unmount: () => {
      act(() => { root.unmount() })
      document.body.removeChild(container)
    },
  }
}

describe('App routing & 3-column shell', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = ''
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ status: 'degraded', items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = origFetch
  })

  it('shows "No such page" for an unknown hash', async () => {
    const { container, unmount } = await renderAt('#/no-such-page')
    expect(container.textContent).toContain('No such page')
    expect(container.querySelector('a[href="#/"]')).not.toBeNull()
    unmount()
  })

  it('the old #/planets route moves to #/worlds', async () => {
    expect(legacyRoute('#/planets')).toBe('#/worlds')
    expect(legacyRoute('#/worlds')).toBeNull()
    expect(legacyRoute('#/vault')).toBe('#/account')
    expect(legacyRoute('#/vault/security')).toBe('#/account/security')
    expect(legacyRoute('#/vaults')).toBeNull()
    const { container, unmount } = await renderAt('#/planets')
    expect(window.location.hash).toBe('#/worlds')
    expect(container.querySelector('a[href="#/worlds"]')).not.toBeNull()
    unmount()
  })

  it('signed out, renders the editorial 3-column shell, Occupy SaaS, openAW SSO, zero hero/pills, and never sample people', async () => {
    const { container, unmount } = await renderAt('#/')
    expect(container.textContent).toContain('Occupy SaaS')
    expect(container.textContent).not.toContain('(sample)')
    expect(container.textContent).not.toContain('/wesyn join')
    expect(container.textContent).not.toMatch(/planet/i)
    expect(container.textContent).toContain('Powered by Aitherium')
    expect(container.textContent).toContain('AitherNet')
    expect(container.innerHTML).not.toContain('https://eusyra.com/')
    expect(container.innerHTML).toContain('https://eusyra.aitherium.com/creators')
    expect(container.innerHTML).toContain('https://shop.aitherium.com/packs')
    expect(container.innerHTML).toContain('https://www.openaw.org/auth/aitherium/start')
    // Editorial monochrome shell guarantees: zero hero banner, zero pill soup, zero card boxes.
    expect(container.querySelector('.hero-banner')).toBeNull()
    expect(container.querySelector('.pill')).toBeNull()
    expect(container.querySelector('.mini-stats')).toBeNull()
    // Primary nav includes all 7 Phase 1 pillars and excludes fake Jobs.
    for (const href of ['#/', '#/forums', '#/worlds', '#/spaces', '#/messages', '#/network', '#/account']) {
      expect(container.querySelector(`nav.rail-nav a[href="${href}"]`)).not.toBeNull()
    }
    expect(container.querySelector('nav.rail-nav a[href="#/jobs"]')).toBeNull()
    // Theme toggle defaults to dark and switches cleanly to light.
    expect(document.documentElement.dataset.theme).toBe('dark')
    const themeBtn = container.querySelector<HTMLButtonElement>('button.theme-btn')
    expect(themeBtn).not.toBeNull()
    await act(async () => { themeBtn!.click() })
    expect(document.documentElement.dataset.theme).toBe('light')
    unmount()
  })

  it('#/vault is an alias for the #/account hub (signed out: sign-in strip + overview, no error wall)', async () => {
    const { container, unmount } = await renderAt('#/vault')
    expect(window.location.hash).toBe('#/account')
    expect(container.querySelector('nav.rail-nav a[href="#/account"]')?.getAttribute('aria-current')).toBe('page')
    expect(container.querySelector('nav.rail-nav a[href="#/vault"]')).toBeNull()
    expect(container.querySelector('.stream-header h1')?.textContent).toBe('Account')
    expect(container.querySelectorAll('.signin-strip')).toHaveLength(1)
    expect(container.textContent).toContain('openAW')
    expect(container.textContent).toContain('Eusyra Studio')
    expect(container.innerHTML).toContain('https://www.openaw.org/auth/aitherium/start')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    unmount()
  })

  it('renders #/account sub-routes with the active underline tab', async () => {
    for (const [hash, label, text] of [
      ['#/account/profile', 'Profile & Space', 'Space links'],
      ['#/account/security', 'Security', 'Active sessions'],
      ['#/account/billing', 'Billing & Packs', 'Order history'],
      ['#/account/privacy', 'Privacy & Data', 'Data export'],
    ]) {
      const { container, unmount } = await renderAt(hash)
      expect(container.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe(label)
      expect(container.textContent).toContain(text)
      expect(container.querySelector('nav.rail-nav a[href="#/account"]')?.getAttribute('aria-current')).toBe('page')
      unmount()
    }
  })

  it('renders top-level #/forums, #/spaces, and #/network views cleanly when signed out', async () => {
    const forums = await renderAt('#/forums')
    expect(forums.container.textContent).toContain('Forums & RFCs')
    forums.unmount()

    const spaces = await renderAt('#/spaces')
    expect(spaces.container.textContent).toContain('AitherSpaces Directory')
    spaces.unmount()

    const net = await renderAt('#/network')
    expect(net.container.textContent).toContain('AitherNet Mesh')
    expect(net.container.textContent).toContain('awnode')
    net.unmount()
  })
})
