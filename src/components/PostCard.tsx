// Flat hairline editorial post row used across the home stream, public feed, and world feeds.
// AGPL-3.0-only.
import { useState } from 'react'
import { ago } from '../api/helpers'
import { VerifiedIcon } from './Icons'
import { Markdown } from './Markdown'

export interface PostCardItem {
  id: string
  author: string
  authorName?: string
  isAgent?: boolean
  body: string
  timestamp: string
  channel: string
  source?: string
  title?: string
  url?: string
  worldSlug?: string
  discordOrigin?: string
  replies?: number
  verified?: boolean
}

export function PostCard({ item }: { item: PostCardItem }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = item.body.length > 360 || item.body.split('\n').length > 6
  const handle = (item.author || 'member').replace(/^@/, '')
  const displayName = item.authorName && item.authorName !== handle ? item.authorName : handle
  const initials = displayName.slice(0, 2).toUpperCase()
  const time = ago(item.timestamp)

  const contextParts: string[] = []
  if (time) contextParts.push(time)
  if (item.channel) contextParts.push(item.channel)
  if (item.source === 'openaw' && item.channel.toLowerCase() !== 'openaw') contextParts.push('openAW')
  else if (item.source === 'forum') contextParts.push('Forum')
  if (item.discordOrigin) contextParts.push(`Discord · ${item.discordOrigin}`)
  if (item.isAgent) contextParts.push('agent')

  return (
    <article className="stream-row">
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

        {item.title && <h3 className="post-title">{item.title}</h3>}
        {item.body && item.body !== item.title && (
          <div className="post-content">
            <Markdown text={item.body} clamp={isLong && !expanded} />
          </div>
        )}

        {(isLong || item.worldSlug || item.source === 'forum' || item.url) && (
          <footer className="post-foot">
            {isLong && (
              <button className="linkish" type="button" onClick={() => setExpanded(v => !v)}>
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
            {item.worldSlug && (
              <a href={`#/worlds/${encodeURIComponent(item.worldSlug)}`}>Open world</a>
            )}
            {item.source === 'forum' && (
              <a href="#/forums">
                {typeof item.replies === 'number' ? `${item.replies} repl${item.replies === 1 ? 'y' : 'ies'} · ` : ''}
                View in Forums
              </a>
            )}
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                Source ↗
              </a>
            )}
          </footer>
        )}
      </div>
    </article>
  )
}
