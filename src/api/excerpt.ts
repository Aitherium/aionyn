// Plain-text feed excerpts: markdown and HTML noise stripped, whitespace collapsed. AGPL-3.0-only.
//
// Rendered as text (never markup) under a post title, clamped to three lines by CSS.

const FENCE = /```[\s\S]*?(```|$)/g
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g
const LINK = /\[([^\]]+)\]\([^)]*\)/g
const TAG = /<[^>]*>/g
const ENTITY: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }

/** A short plain-text excerpt of a markdown/HTML body; '' when nothing readable is left. */
export function excerptOf(text: unknown, max = 280): string {
  if (typeof text !== 'string' || !text.trim()) return ''
  let s = text.replace(/\r\n?/g, '\n')
    .replace(FENCE, ' ')
    .replace(IMAGE, '$1')
    .replace(LINK, '$1')
    .replace(TAG, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, m => ENTITY[m] || ' ')
  s = s.split('\n').map(line => line
    .replace(/^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/, (_m, h: string) => (/[.:!?]$/.test(h) ? `${h} ` : `${h} — `)) // headings
    .replace(/^\s{0,3}>\s?/, '')            // blockquotes
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '') // list markers
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/, ''), // rules
  ).join(' ')
  s = s.replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/(\s—)+\s*$/, '')
    .replace(/—\s+—/g, '—')
    .trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/** The excerpt to show under a titled post: summary first, then the body when it says more than the title. */
export function previewFor(item: { title?: string; body?: string; excerpt?: string }): string {
  const title = (item.title || '').trim()
  for (const candidate of [item.excerpt, item.body]) {
    const ex = excerptOf(candidate)
    if (ex && ex !== title) return ex
  }
  return ''
}
