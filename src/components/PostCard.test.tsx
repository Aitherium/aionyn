import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NetworkClient, Outcome, Post } from '../api/types'
import { FeedView } from '../views/Lists'
import { button, click, flush, mount, typeInto } from '../views/account/testUtil'
import { PostCard, type PostCardItem } from './PostCard'
import { permalinkOf } from './PostActions'

let cleanup: (() => void) | null = null
afterEach(() => { cleanup?.(); cleanup = null; vi.restoreAllMocks() })

const FORUM: PostCardItem = {
  id: 'forum:1', source: 'forum', channel: 'awsh', author: 'vera', title: 'awsh v2.0.0 released',
  body: 'awsh v2.0.0 released', excerpt: '**Highlights**: faster `aw run`, new [docs](https://x.test).',
  timestamp: '2026-11-25T00:00:00Z', url: 'https://forums.aitherium.com/?category=awsh&thread=8994ac89', replies: 2,
}
const RELAY: PostCardItem = {
  id: '#general:m1', source: 'relay', channel: '#general', author: 'david', body: 'relay deserves love',
  timestamp: '2026-11-25T00:00:00Z', messageId: 'm1', url: 'https://relay.aitherium.com/',
}

function fakeClient(over: Partial<NetworkClient> = {}): NetworkClient {
  return {
    mode: 'live',
    viewer: vi.fn(async () => ({ username: 'ada', displayName: 'Ada' })),
    profile: vi.fn(), people: vi.fn(), worlds: vi.fn(async () => []), connect: vi.fn(),
    feed: vi.fn(async () => []),
    post: vi.fn(async (room: string) => ({ ok: true, message: `Posted to ${room}.` })),
    shareStatus: vi.fn(async () => ({ available: false, connected: false, postsLeftToday: 0, postsPerDay: 2 })),
    shareConnectUrl: vi.fn(), shareToLinkedIn: vi.fn(),
    world: {} as NetworkClient['world'],
    ...over,
  } as NetworkClient
}

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

describe('PostCard excerpts', () => {
  it('renders a clean plain-text excerpt under the title', async () => {
    const m = await mount(<PostCard item={FORUM} />)
    cleanup = m.unmount
    const ex = m.container.querySelector('[data-testid="post-excerpt"]')
    expect(ex?.className).toBe('post-excerpt')
    expect(ex?.textContent).toBe('Highlights: faster aw run, new docs.')
    expect(m.container.querySelector('h3.post-title')?.textContent).toBe('awsh v2.0.0 released')
  })

  it('shows no excerpt when the body only repeats the title', async () => {
    const m = await mount(<PostCard item={{ ...FORUM, excerpt: undefined }} />)
    cleanup = m.unmount
    expect(m.container.querySelector('[data-testid="post-excerpt"]')).toBeNull()
  })

  it('copy link is offered only for a real per-item URL', async () => {
    expect(permalinkOf(FORUM.url)).toBe(FORUM.url)
    expect(permalinkOf('https://relay.aitherium.com/')).toBe('')
    expect(permalinkOf('javascript:alert(1)')).toBe('')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const m = await mount(<><PostCard item={FORUM} /><PostCard item={{ ...RELAY, id: 'r2' }} /></>)
    cleanup = m.unmount
    const copies = Array.from(m.container.querySelectorAll('button')).filter(b => b.textContent === 'Copy link')
    expect(copies).toHaveLength(1)
    await click(copies[0])
    expect(writeText).toHaveBeenCalledWith(FORUM.url)
    expect(m.container.textContent).toContain('Link copied')
  })
})

describe('Relay thread replies', () => {
  it('signed out: a quiet "Sign in to reply" that starts sign-in', async () => {
    const signIn = vi.fn()
    const m = await mount(<PostCard item={RELAY} social={{ signIn }} />)
    cleanup = m.unmount
    expect(button(m.container, 'Reply')).toBeUndefined()
    await click(button(m.container, 'Sign in to reply'))
    expect(signIn).toHaveBeenCalledTimes(1)
  })

  it('signed in: loads the thread, shows the reply at once, then posts it under the message', async () => {
    const sent = deferred<Outcome>()
    const replyTo = vi.fn(() => sent.promise)
    const threadReplies = vi.fn(async () => [{ id: 'r1', author: 'bo', body: 'agreed', timestamp: '2026-11-25T00:00:00Z' }])
    const client = fakeClient({ replyTo, threadReplies })
    const m = await mount(<PostCard item={RELAY} social={{ client, me: 'ada' }} />)
    cleanup = m.unmount
    expect(m.container.textContent).not.toContain('Sign in to reply')
    await click(button(m.container, 'Reply'))
    expect(threadReplies).toHaveBeenCalledWith('#general', 'm1')
    expect(m.container.textContent).toContain('agreed')
    typeInto(m.container.querySelector('textarea[aria-label="Reply text"]'), 'me too')
    await click(m.container.querySelector('form[aria-label="Write a reply"] button[type="submit"]'))
    expect(replyTo).toHaveBeenCalledWith('#general', 'm1', 'me too')
    const pending = m.container.querySelector('.reply-row.is-pending')
    expect(pending?.textContent).toContain('@ada')
    expect(pending?.textContent).toContain('me too')
    threadReplies.mockResolvedValueOnce([
      { id: 'r1', author: 'bo', body: 'agreed', timestamp: '2026-11-25T00:00:00Z' },
      { id: 'r2', author: 'ada', body: 'me too', timestamp: '2026-11-25T00:01:00Z' },
    ])
    sent.resolve({ ok: true, message: 'Replied.' })
    await flush()
    expect(m.container.querySelector('.reply-row.is-pending')).toBeNull()
    expect(m.container.textContent).toContain('Replied.')
    expect(m.container.querySelectorAll('.reply-row')).toHaveLength(2)
  })

  it('a refused reply is rolled back and the text is kept', async () => {
    const client = fakeClient({ replyTo: vi.fn(async () => ({ ok: false, message: 'The server answered 403.' })), threadReplies: vi.fn(async () => []) })
    const m = await mount(<PostCard item={RELAY} social={{ client }} />)
    cleanup = m.unmount
    await click(button(m.container, 'Reply'))
    typeInto(m.container.querySelector('textarea[aria-label="Reply text"]'), 'hello')
    await click(m.container.querySelector('form[aria-label="Write a reply"] button[type="submit"]'))
    expect(m.container.querySelectorAll('.reply-row')).toHaveLength(0)
    expect(m.container.querySelector('[role="alert"]')?.textContent).toBe('The server answered 403.')
    expect((m.container.querySelector('textarea[aria-label="Reply text"]') as HTMLTextAreaElement).value).toBe('hello')
  })
})

describe('Feed composer', () => {
  it('posts via client.post with the chosen room, shows an optimistic row, then refreshes', async () => {
    const rows: Post[] = [{ id: '#general:1', channel: '#general', author: 'bo', body: 'hi', timestamp: '2026-11-25T00:00:00Z', messageId: '1' }]
    const feed = vi.fn(async () => [...rows])
    const sent = deferred<Outcome>()
    const post = vi.fn(() => sent.promise)
    const client = fakeClient({ feed, post })
    const m = await mount(<FeedView client={client} me="ada" />)
    cleanup = m.unmount
    expect((m.container.querySelector('select[aria-label="Room"]') as HTMLSelectElement).value).toBe('#general')
    typeInto(m.container.querySelector('textarea[aria-label="Post text"]'), 'shipping today')
    await click(button(m.container, 'Post'))
    expect(post).toHaveBeenCalledWith('#general', 'shipping today')
    const pending = m.container.querySelector('.stream-row.is-pending')
    expect(pending?.textContent).toContain('shipping today')
    expect(pending?.textContent).toContain('sending…')
    rows.unshift({ id: '#general:2', channel: '#general', author: 'ada', body: 'shipping today', timestamp: '2026-11-26T00:00:00Z', messageId: '2' })
    sent.resolve({ ok: true, message: 'Posted to #general.' })
    await flush()
    expect(feed).toHaveBeenCalledTimes(2)
    expect(m.container.querySelector('.stream-row.is-pending')).toBeNull()
    expect(m.container.textContent).toContain('Posted to #general.')
    expect((m.container.querySelector('textarea[aria-label="Post text"]') as HTMLTextAreaElement).value).toBe('')
  })

  it('a failed post drops the optimistic row and says why', async () => {
    const client = fakeClient({
      feed: vi.fn(async () => [{ id: '#general:1', channel: '#general', author: 'bo', body: 'hi', timestamp: '2026-11-25T00:00:00Z' }]),
      post: vi.fn(async () => ({ ok: false, message: 'The server answered 403 (this may need a paid plan).' })),
    })
    const m = await mount(<FeedView client={client} />)
    cleanup = m.unmount
    typeInto(m.container.querySelector('textarea[aria-label="Post text"]'), 'nope')
    await click(button(m.container, 'Post'))
    expect(m.container.querySelector('.stream-row.is-pending')).toBeNull()
    expect(m.container.querySelector('[role="alert"]')?.textContent).toContain('403')
  })
})
