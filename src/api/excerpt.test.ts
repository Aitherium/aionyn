import { describe, expect, it } from 'vitest'
import { excerptOf, previewFor } from './excerpt'
import { normalizeFeedItems } from './public'

describe('feed excerpts', () => {
  it('strips markdown, HTML and code noise into one plain line', () => {
    const md = '# Release notes\n\n**awsh v2.0.0** ships `aw run` and [docs](https://x.test/d).\n\n```sh\nrm -rf /\n```\n- faster boot\n> quoted <b>bold</b> &amp; more'
    expect(excerptOf(md)).toBe('Release notes — awsh v2.0.0 ships aw run and docs. faster boot quoted bold & more')
  })

  it('cuts long text on a word boundary with an ellipsis', () => {
    const out = excerptOf('word '.repeat(200), 60)
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/\s…$/)
  })

  it('returns nothing for empty or non-string input', () => {
    expect(excerptOf('')).toBe('')
    expect(excerptOf('   ')).toBe('')
    expect(excerptOf(null)).toBe('')
    expect(excerptOf('## Only a heading')).toBe('Only a heading')
    expect(excerptOf({})).toBe('')
  })

  it('prefers a summary, and never repeats the title as its own excerpt', () => {
    expect(previewFor({ title: 'T', excerpt: 'A *summary*', body: 'Long body' })).toBe('A summary')
    expect(previewFor({ title: 'awsh released', body: 'awsh released' })).toBe('')
    expect(previewFor({ title: 'awsh released', body: 'Changelog: faster.' })).toBe('Changelog: faster.')
  })

  it('normalizes excerpt/summary/first_post into feed items', () => {
    const items = normalizeFeedItems({ items: [
      { id: 'f1', source: 'forum', title: 'Weekly', body: '', summary: 'This week: three releases.' },
      { id: 'f2', source: 'forum', title: 'Thread', body: '', first_post: { body: 'Opening **post**' } },
      { id: 'f3', source: 'forum', title: 'Bare', body: '' },
    ] })
    expect(items[0].excerpt).toBe('This week: three releases.')
    expect(previewFor(items[0])).toBe('This week: three releases.')
    expect(previewFor(items[1])).toBe('Opening post')
    expect(items[2].excerpt).toBeUndefined()
    expect(previewFor(items[2])).toBe('')
  })
})
