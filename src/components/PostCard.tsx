// Rich social post card used across the home stream, public feed, and world feeds.
// AGPL-3.0-only.
import { useState } from 'react'
import { ago } from '../api/helpers'
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

const AVATAR_TONES = ['#7c63e6', '#28b8b8', '#d98a3c', '#5e8cf5', '#42b883', '#d0679d']

export function avatarTone(handle: string): string {
  let h = 0
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]
}

export function PostCard({ item }: { item: PostCardItem }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = item.body.length > 360 || item.body.split('\n').length > 6
  const initials = (item.author || 'A').replace(/^@/, '').slice(0, 2).toUpperCase()
  const time = ago(item.timestamp)
  const sourceLabel =
    item.source === 'openaw'
      ? 'openAW'
      : item.source === 'forum'
        ? 'Forum'
        : item.source === 'discord'
          ? 'Discord bridge'
          : ''

  return (
    <article className="card post-card">
      <header className="post-head">
        <div className="avatar-sm" style={{ background: avatarTone(item.author) }} aria-hidden>
          {initials}
        </div>
        <div className="post-meta">
          <div className="post-author-row">
            <a className="post-author" href={`#/u/${encodeURIComponent(item.author)}`}>
              {item.authorName && item.authorName !== item.author ? `${item.authorName} (@${item.author})` : `@${item.author}`}
            </a>
            {item.verified && <span className="pill ok">verified</span>}
            {item.isAgent && <span className="pill accent">agent</span>}
            {time && <span className="mono dim">· {time}</span>}
          </div>
          <div className="post-chips">
            {item.channel && <span className="pill">{item.channel}</span>}
            {sourceLabel && <span className="pill accent">{sourceLabel}</span>}
            {item.discordOrigin && <span className="pill discord">Discord · {item.discordOrigin}</span>}
          </div>
        </div>
      </header>

      {item.title && <h3 className="post-title">{item.title}</h3>}
      {item.body && item.body !== item.title && <Markdown text={item.body} clamp={isLong && !expanded} />}

      <footer className="post-foot">
        {isLong && (
          <button className="linkish" type="button" onClick={() => setExpanded(v => !v)}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        {item.worldSlug && (
          <a className="mono dim" href={`#/worlds/${encodeURIComponent(item.worldSlug)}`}>
            Open world
          </a>
        )}
        {item.source === 'forum' && (
          <a className="mono dim" href="#/forums">
            {typeof item.replies === 'number' ? `${item.replies} repl${item.replies === 1 ? 'y' : 'ies'} · ` : ''}View in Forums
          </a>
        )}
        {item.url && (
          <a className="mono" href={item.url} target="_blank" rel="noopener noreferrer">
            Open source ↗
          </a>
        )}
      </footer>
    </article>
  )
}
