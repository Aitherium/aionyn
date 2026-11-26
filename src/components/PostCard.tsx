// Flat hairline editorial post row used across the home stream, public feed, and world feeds.
// AGPL-3.0-only.
import { useState } from 'react'
import { previewFor } from '../api/excerpt'
import { ago } from '../api/helpers'
import { VerifiedIcon } from './Icons'
import { Markdown } from './Markdown'
import { PostActions, type PostSocial } from './PostActions'

export interface PostCardItem {
  id: string
  author: string
  authorName?: string
  isAgent?: boolean
  body: string
  /** A server-sent summary shown (as plain text) under a title. */
  excerpt?: string
  timestamp: string
  channel: string
  source?: string
  title?: string
  url?: string
  worldSlug?: string
  discordOrigin?: string
  replies?: number
  verified?: boolean
  /** The Relay message id: thread replies post under it. */
  messageId?: string
  /** Optimistic row for a post that is still being sent. */
  pending?: boolean
}

export type { PostSocial }

export function PostCard({ item, social }: { item: PostCardItem; social?: PostSocial }) {
  const [expanded, setExpanded] = useState(false)
  const titled = Boolean(item.title)
  const preview = titled ? previewFor(item) : ''
  const showBody = !titled && Boolean(item.body)
  const isLong = showBody && (item.body.length > 360 || item.body.split('\n').length > 6)
  const handle = (item.author || 'member').replace(/^@/, '')
  const displayName = item.authorName && item.authorName !== handle ? item.authorName : handle
  const initials = displayName.slice(0, 2).toUpperCase()
  const time = item.pending ? 'sending…' : ago(item.timestamp)

  const contextParts: string[] = []
  if (time) contextParts.push(time)
  if (item.channel) contextParts.push(item.channel)
  if (item.source === 'openaw' && item.channel.toLowerCase() !== 'openaw') contextParts.push('openAW')
  else if (item.source === 'forum') contextParts.push('Forum')
  if (item.discordOrigin) contextParts.push(`Discord · ${item.discordOrigin}`)
  if (item.isAgent) contextParts.push('agent')

  return (
    <article className={item.pending ? 'stream-row is-pending' : 'stream-row'} aria-busy={item.pending || undefined}>
      <div className="avatar-sm" aria-hidden="true">
        {initials}
      </div>

      <div className="post-body-col">
        <header className="post-author-line">
          <a className="post-author-name" href={`#/u/${encodeURIComponent(handle)}`}>
            {displayName}
          </a>
          {item.verified && <VerifiedIcon />}
          <span className="mono">@{handle}</span>
          {contextParts.map((part, idx) => (
            <span key={`${part}-${idx}`}>· {part}</span>
          ))}
        </header>

        {titled && <h3 className="post-title">{item.title}</h3>}
        {preview && <p className="post-excerpt" data-testid="post-excerpt">{preview}</p>}
        {showBody && (
          <div className="post-content">
            <Markdown text={item.body} clamp={isLong && !expanded} />
          </div>
        )}

        {!item.pending && (
          <PostActions
            item={item}
            social={social}
            readMore={isLong ? { expanded, toggle: () => setExpanded(v => !v) } : undefined}
          />
        )}
      </div>
    </article>
  )
}
