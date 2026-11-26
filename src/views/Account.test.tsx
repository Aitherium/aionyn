import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountView } from './Account'
import {
  API, HANDOFF, PROFILE, SPACE, button, callsTo, click, mount, routeFetch, typeInto,
} from './account/testUtil'
import { parseAccountTab } from './account/tabs'
import { diffProfile } from './account/ProfileTab'

const VIEWER = { username: 'ada', displayName: 'Ada L' }
let cleanup: (() => void) | null = null
afterEach(() => { cleanup?.(); cleanup = null })

async function render(tab: string, token: string | null, f: ReturnType<typeof routeFetch>, extra: Partial<{ go: (h: string) => void; signIn: () => void }> = {}) {
  const go = extra.go || vi.fn()
  const signIn = extra.signIn || vi.fn()
  const m = await mount(
    <AccountView tab={tab} token={token} viewer={token ? VIEWER : null} apiBase={API} signIn={signIn} go={go}
      fetchImpl={f as unknown as typeof fetch} />,
  )
  cleanup = m.unmount
  return { ...m, go, signIn }
}

describe('Account tabs & routing', () => {
  it('parses tab slugs, with services as the default', () => {
    expect(parseAccountTab('')).toBe('services')
    expect(parseAccountTab('services')).toBe('services')
    expect(parseAccountTab('security/')).toBe('security')
    expect(parseAccountTab('billing')).toBe('billing')
    expect(parseAccountTab('nope')).toBeNull()
  })

  it('renders five underline tabs and routes each to its hash', async () => {
    const { container, go } = await render('', null, routeFetch({}))
    const tabs = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(tabs.map(t => t.textContent)).toEqual(['Services', 'Profile & Space', 'Security', 'Billing & Packs', 'Privacy & Data'])
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(tabs[0].className).toContain('active')
    await click(tabs[2])
    expect(go).toHaveBeenCalledWith('#/account/security')
    await click(tabs[4])
    expect(go).toHaveBeenCalledWith('#/account/privacy')
  })

  it('an unknown tab shows one calm line back to Account', async () => {
    const { container } = await render('nope', null, routeFetch({}))
    expect(container.textContent).toContain('No such Account page')
    expect(container.querySelector('a[href="#/account"]')).not.toBeNull()
  })
})

describe('Account signed out', () => {
  it.each([
    ['', 'openAW', 'Sign in to activate services'],
    ['profile', 'Display name & headline', 'Sign in to edit your name'],
    ['security', 'Personal API keys', 'Sign in to review sessions'],
    ['billing', 'Order history', 'Sign in to see your plan'],
    ['privacy', 'Data export', 'Sign in to control visibility'],
  ])('tab "%s" shows a 1-row sign-in strip and a hairline overview, never an error', async (tab, overview, strip) => {
    const f = routeFetch({ 'GET /handoff': [200, HANDOFF] })
    const { container, signIn } = await render(tab, null, f)
    expect(container.querySelectorAll('.signin-strip')).toHaveLength(1)
    expect(container.textContent).toContain(strip)
    expect(container.textContent).toContain(overview)
    expect(container.querySelector('[role="alert"]')).toBeNull()
    // Only the public handoff is ever fetched while signed out.
    for (const [u] of f.mock.calls) expect(String(u)).toMatch(/\/handoff$/)
    await click(button(container, 'Sign in'))
    expect(signIn).toHaveBeenCalled()
  })

  it('services overview names what one account unlocks', async () => {
    const { container } = await render('', null, routeFetch({}))
    for (const name of ['openAW', 'Eusyra Studio', 'Aither Spaces', 'Relay chat', 'Shop', 'AitherOS workspace']) {
      expect(container.textContent).toContain(name)
    }
    expect(container.innerHTML).toContain('https://www.openaw.org/auth/aitherium/start')
    expect(container.innerHTML).toContain('https://shop.aitherium.com/packs')
  })

  it('security overview links password/passkey changes to the first-party IdP', async () => {
    const { container } = await render('security', null, routeFetch({ 'GET /handoff': [200, HANDOFF] }))
    const hrefs = Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href'))
    expect(hrefs).toContain(HANDOFF.urls.password_change)
    expect(hrefs).toContain(HANDOFF.urls.passkeys)
    expect(container.querySelector('input[type="password"]')).toBeNull()
  })
})

const SERVICES = {
  services: [
    { key: 'openaw', name: 'openAW', line: 'Hub', url: 'https://openaw.org', status: 'active', price: '', always: false, action: 'Deactivate' },
    { key: 'eusyra', name: 'Eusyra Studio', line: 'Studio', url: 'https://eusyra.aitherium.com', status: 'inactive', price: '$5', always: false, action: 'Activate' },
  ],
  bundles: [{ key: 'all', name: 'Everything', line: 'All of it', services: ['openaw', 'eusyra'], price: '', status: 'inactive' }],
}

describe('Account › Services signed in', () => {
  it('lists grants with SSO launch and toggles a service', async () => {
    const f = routeFetch({
      'GET /services': [200, SERVICES],
      'POST /services/eusyra/activate': [200, { status: 'active' }],
    })
    const { container } = await render('', 'tok', f)
    expect(container.textContent).toContain('@ada')
    expect(container.textContent).toContain('Open with SSO ↗')
    expect(container.textContent).toContain('Includes: openaw · eusyra')
    await click(button(container, 'Activate'))
    expect(callsTo(f, 'POST', '/services/eusyra/activate')).toHaveLength(1)
    expect(container.textContent).toContain('Eusyra Studio is now active.')
    expect(callsTo(f, 'GET', '/services').length).toBeGreaterThanOrEqual(2)
  })

  it('a failed catalog shows one error row and the static overview, not a wall', async () => {
    const f = routeFetch({ 'GET /services': [503, { detail: { error: 'identity_unavailable', message: 'Aitherium Identity is unavailable; try again.' } }] })
    const { container } = await render('', 'tok', f)
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1)
    expect(container.textContent).toContain('Aitherium Identity is unavailable; try again.')
    expect(container.textContent).toContain('Ecosystem services')
    expect(button(container, 'Retry')).toBeTruthy()
  })
})

describe('Account › Profile & Space', () => {
  it('diffProfile sends only changed fields', () => {
    const base = { display_name: 'A', headline_emoji: '', headline: '', bio: '', visibility: 'public' as const,
      links: { website: '', github_username: '', linkedin_url: '', twitter_handle: '' } }
    expect(diffProfile(base, base)).toEqual({})
    expect(diffProfile(base, { ...base, bio: 'hi ', links: { ...base.links, website: 'https://a.test' } }))
      .toEqual({ bio: 'hi', links: { website: 'https://a.test' } })
  })

  it('edits the profile inline and shows saved feedback', async () => {
    let sent: unknown = null
    const f = routeFetch({
      'GET /profile': [200, PROFILE],
      'GET /space': [200, SPACE],
      'PATCH /profile': init => {
        sent = JSON.parse(String(init.body))
        return [200, { ...PROFILE, profile: { ...PROFILE.profile, display_name: 'Ada Lovelace' } }]
      },
    })
    const { container } = await render('profile', 'tok', f)
    expect(container.textContent).toContain('@ada')
    const save = button(container, 'Save profile')!
    expect(save.disabled).toBe(true)
    typeInto(container.querySelector('#acct-name'), 'Ada Lovelace')
    expect(button(container, 'Save profile')!.disabled).toBe(false)
    await click(button(container, 'Save profile'))
    expect(sent).toEqual({ display_name: 'Ada Lovelace' })
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Profile saved.')
    expect((container.querySelector('#acct-name') as HTMLInputElement).value).toBe('Ada Lovelace')
  })

  it('shows the server error when a save is refused', async () => {
    const f = routeFetch({
      'GET /profile': [200, PROFILE],
      'GET /space': [200, SPACE],
      'PATCH /profile': [422, { detail: { error: 'invalid', message: 'visibility must be one of public, private' } }],
    })
    const { container } = await render('profile', 'tok', f)
    typeInto(container.querySelector('#acct-bio'), 'New bio')
    await click(button(container, 'Save profile'))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('visibility must be one of')
  })

  it('reorders and removes Space blocks, saving the full config', async () => {
    let put: { config?: { blocks?: Array<{ id: string }>; mood?: unknown } } = {}
    const f = routeFetch({
      'GET /profile': [200, PROFILE],
      'GET /space': [200, SPACE],
      'PUT /space': init => { put = JSON.parse(String(init.body)); return [200, { ...SPACE, config: put.config }] },
    })
    const { container } = await render('profile', 'tok', f)
    expect(container.textContent).toContain('Top friends')
    await click(container.querySelector('button[aria-label="Move Top friends up"]'))
    await click(container.querySelector('button[aria-label="Remove bio"]'))
    await click(button(container, 'Save Space'))
    expect(put.config?.blocks?.map(b => b.id)).toEqual(['b2'])
    expect(put.config?.mood).toEqual({ text: 'Shipping' })
    expect(container.textContent).toContain('Space saved.')
  })
})
