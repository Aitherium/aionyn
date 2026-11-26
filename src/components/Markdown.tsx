// Safe zero-dependency markdown renderer (pure React nodes, never dangerouslySetInnerHTML).
// AGPL-3.0-only.
import type { ReactNode } from 'react'
import { safeLink } from '../api/worlds-live'

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const rx = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s)]+))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('`') && tok.endsWith('`')) {
      out.push(<code key={k++}>{tok.slice(1, -1)}</code>)
    } else if (tok.startsWith('**') && tok.endsWith('**')) {
      out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith('*') && tok.endsWith('*')) {
      out.push(<em key={k++}>{tok.slice(1, -1)}</em>)
    } else if (m[2] && m[3]) {
      const href = safeLink(m[3])
      out.push(href
        ? <a key={k++} href={href} target="_blank" rel="noopener noreferrer">{m[2]}</a>
        : m[2])
    } else if (m[4]) {
      const href = safeLink(m[4])
      out.push(href
        ? <a key={k++} href={href} target="_blank" rel="noopener noreferrer">{href}</a>
        : tok)
    }
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text, clamp = false }: { text: string; clamp?: boolean }) {
  const lines = (text || '').replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++
      blocks.push(<pre key={key++} className="md-code"><code>{codeLines.join('\n')}</code></pre>)
      continue
    }

    if (/^#{1,3}\s+/.test(line)) {
      const content = line.replace(/^#{1,3}\s+/, '')
      blocks.push(<p key={key++} className="md-h"><strong>{renderInline(content)}</strong></p>)
      i++
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(<li key={items.length}>{renderInline(lines[i].replace(/^[-*]\s+/, ''))}</li>)
        i++
      }
      blocks.push(<ul key={key++} className="md-list">{items}</ul>)
      continue
    }

    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('```') && !/^[-*]\s+/.test(lines[i]) && !/^#{1,3}\s+/.test(lines[i])) {
      para.push(lines[i])
      i++
    }
    blocks.push(<p key={key++}>{renderInline(para.join(' '))}</p>)
  }

  return <div className={clamp ? 'md clamp' : 'md'}>{blocks}</div>
}
