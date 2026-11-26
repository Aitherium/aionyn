import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import App, { legacyRoute } from './App'

const origFetch = globalThis.fetch

function renderAt(hash: string) {
  window.location.hash = hash
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => { root.render(<App />) })
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
    // Keep unit tests deterministic and offline without noisy network failures.
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ status: 'degraded', items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = origFetch
  })

  it('shows "No such page" for an unknown hash', () => {
    const { container, unmount } = renderAt('#/no-such-page')
    expect(container.textContent).toContain('No such page')
    expect(container.querySelector('a[href="#/"]')).not.toBeNull()
    unmount()
  })

  it('the old #/planets route moves to #/worlds', () => {
    expect(legacyRoute('#/planets')).toBe('#/worlds')
    expect(legacyRoute('#/worlds')).toBeNull()
    const { container, unmount } = renderAt('#/planets')
    expect(window.location.hash).toBe('#/worlds')
    expect(container.querySelector('a[href="#/worlds"]')).not.toBeNull()
    unmount()
  })

  it('signed out, renders the 3-column shell, Occupy SaaS, openAW SSO, zero /wesyn join, and never sample people', () => {
    const { container, unmount } = renderAt('#/')
    expect(container.textContent).toContain('Occupy SaaS')
    expect(container.textContent).not.toContain('(sample)')
    expect(container.textContent).not.toContain('/wesyn join')
    expect(container.textContent).not.toMatch(/planet/i)
    expect(container.textContent).toContain('Powered by Aitherium')
    expect(container.textContent).toContain('AitherNet Live Pulse')
    expect(container.innerHTML).not.toContain('https://eusyra.com/')
    expect(container.innerHTML).toContain('https://eusyra.aitherium.com/creators')
    expect(container.innerHTML).toContain('https://shop.aitherium.com/packs')
    expect(container.innerHTML).toContain('https://www.openaw.org/auth/aitherium/start')
    // Primary nav includes all 7 Phase 1 pillars and excludes fake Jobs.
    for (const href of ['#/', '#/forums', '#/worlds', '#/spaces', '#/messages', '#/network', '#/vault']) {
      expect(container.querySelector(`nav.rail-nav a[href="${href}"]`)).not.toBeNull()
    }
    expect(container.querySelector('nav.rail-nav a[href="#/jobs"]')).toBeNull()
    unmount()
  })

  it('renders the #/vault service catalog overview with openAW SSO link when signed out', () => {
    const { container, unmount } = renderAt('#/vault')
    expect(container.textContent).toContain('Aionyn vault')
    expect(container.textContent).toContain('openAW')
    expect(container.textContent).toContain('Eusyra Studio')
    expect(container.innerHTML).toContain('https://www.openaw.org/auth/aitherium/start')
    unmount()
  })

  it('renders top-level #/forums, #/spaces, and #/network views cleanly when signed out', () => {
    const forums = renderAt('#/forums')
    expect(forums.container.textContent).toContain('Forums & RFCs')
    forums.unmount()

    const spaces = renderAt('#/spaces')
    expect(spaces.container.textContent).toContain('AitherSpaces Directory')
    spaces.unmount()

    const net = renderAt('#/network')
    expect(net.container.textContent).toContain('AitherNet Mesh')
    expect(net.container.textContent).toContain('awnode')
    net.unmount()
  })
})
