import { describe, expect, it, vi } from 'vitest'
import {
  fetchAitherNetPulse,
  fetchPublicFeed,
  normalizeFeedItems,
  normalizePulse,
  normalizeSpaces,
  normalizeWorlds,
} from './public'

describe('public discovery API client (aionyn.public.*/1)', () => {
  it('normalizes locked feed contract (nested author object) and strips unsafe URLs', () => {
    const items = normalizeFeedItems({
      schema: 'aionyn.public.feed/1',
      status: 'ok',
      items: [
        {
          id: 'p1',
          source: 'openaw',
          kind: 'update',
          title: 'RFC-12: AitherNet mesh',
          body: 'Shipped live OIDC SSO.',
          author: { handle: 'openaw', display_name: 'openAW Core', is_agent: false, space_url: 'https://aitherium.com/spaces/openaw' },
          channel: 'openaw',
          created_at: '2026-11-25T20:00:00Z',
          url: 'https://www.openaw.org/rfc/12',
          reply_count: 4,
        },
        {
          id: 'p2',
          source: 'relay',
          kind: 'message',
          channel: '#general',
          body: 'Hello from Discord',
          author: { handle: 'ada', display_name: 'Ada', is_agent: true },
          created_at: '2026-11-25T19:00:00Z',
          url: 'javascript:alert(1)',
          guild_name: 'Occupy SaaS',
        },
      ],
    })
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      id: 'p1',
      source: 'openaw',
      author: 'openaw',
      authorName: 'openAW Core',
      replies: 4,
      url: 'https://www.openaw.org/rfc/12',
    })
    expect(items[1]).toMatchObject({ id: 'p2', author: 'ada', isAgent: true, discordOrigin: 'Occupy SaaS' })
    expect(items[1].url).toBeUndefined()
  })

  it('normalizes locked spaces, worlds, and AitherNet pulse schemas', () => {
    const spaces = normalizeSpaces({
      schema: 'aionyn.public.spaces/1',
      spaces: [{
        handle: 'ada',
        username: 'ada',
        display_name: 'Ada',
        bio: 'Systems builder',
        mood: { emoji: '⚡', text: 'shipping AitherNet' },
        entity_type: 'human',
        verified: true,
        badges: ['Founder'],
        stats: { total_views: 42 },
      }],
    })
    expect(spaces[0]).toMatchObject({
      username: 'ada',
      displayName: 'Ada',
      headline: '⚡ shipping AitherNet',
      entityType: 'human',
      verified: true,
      badges: ['Founder'],
      totalViews: 42,
      spaceUrl: 'https://aitherium.com/spaces/ada',
    })

    const worlds = normalizeWorlds({
      schema: 'aionyn.public.worlds/1',
      worlds: [{
        slug: 'occupy-saas',
        name: 'Occupy SaaS',
        kind: 'discord_world',
        workspace_url: 'https://app.aitherium.com/',
        discord: {
          guild_name: 'Occupy SaaS Discord',
          invite_url: 'https://discord.gg/zSvECrMjE',
          bridged_channels: ['#announcements', '#general'],
          member_count: 120,
        },
      }],
    })
    expect(worlds[0]).toMatchObject({
      slug: 'occupy-saas',
      guildName: 'Occupy SaaS Discord',
      inviteUrl: 'https://discord.gg/zSvECrMjE',
      bridgedChannels: ['#announcements', '#general'],
      members: 120,
    })

    const pulse = normalizePulse({
      schema: 'aionyn.public.aithernet/1',
      generated_at: '2026-11-25T21:00:00Z',
      status: 'ok',
      mesh: { health: 'ok', nodes_total: 18, nodes_online: 14, gpu_nodes: 6 },
      providers: { online_count: 5, relays_public: 2, rooms_public: 9 },
      models: [{ id: 'm1', name: 'qwen2.5-coder', status: 'online' }, { id: 'm2', name: 'llama-3.3-70b', status: 'online' }],
      join: { docs_url: 'https://aitherium.github.io/awnode/', cli: 'awnode up' },
    })
    expect(pulse).toMatchObject({
      status: 'healthy',
      onlineNodes: 14,
      totalNodes: 18,
      gpuNodes: 6,
      totalProviders: 5,
      relaysPublic: 2,
      roomsPublic: 9,
      servedModels: ['qwen2.5-coder', 'llama-3.3-70b'],
      joinDocsUrl: 'https://aitherium.github.io/awnode/',
      joinCli: 'awnode up',
    })
  })

  it('degrades gracefully on HTTP errors and never sends credentials', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ detail: 'deploying' }), { status: 503 }))
    const feed = await fetchPublicFeed('https://api.example', f as unknown as typeof fetch)
    expect(feed.ok).toBe(false)
    expect(feed.degraded).toBe(true)
    expect(feed.data).toEqual([])

    const pulse = await fetchAitherNetPulse('https://api.example', f as unknown as typeof fetch)
    expect(pulse.ok).toBe(false)
    expect(pulse.data.status).toBe('unavailable')
    expect(pulse.data.onlineNodes).toBeNull()

    for (const call of f.mock.calls as unknown as [string, RequestInit][]) {
      expect(call[1].credentials).toBe('omit')
    }
  })
})
