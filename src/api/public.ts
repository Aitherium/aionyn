// Public read-only discovery client for Aionyn (`/api/aionyn/public/*`). AGPL-3.0-only.
//
// Matches `aionyn.public.{feed,spaces,worlds,aithernet}/1` (see board #7) while remaining
// defensively compatible with alternate field names. Always uses `credentials: 'omit'`
// with no auth headers, and never fabricates fake users or fake node counts when degraded.
import { safeLink } from './worlds-live'

type Json = Record<string, unknown>
type Fetch = typeof fetch

export const OPENAW_SSO_URL = 'https://www.openaw.org/auth/aitherium/start'

export interface PublicFeedItem {
  id: string
  source: 'relay' | 'forum' | 'openaw' | 'discord' | string
  kind?: string
  channel: string
  title?: string
  author: string
  authorName?: string
  isAgent?: boolean
  body: string
  timestamp: string
  url?: string
  worldSlug?: string
  discordOrigin?: string
  replies?: number
}

export interface PublicSpace {
  username: string
  displayName: string
  headline: string
  bio: string
  entityType?: 'human' | 'agent'
  verified: boolean
  badges: string[]
  reputation?: number
  level?: number
  totalViews?: number
  spaceUrl: string
  aithernetNode?: string
}

export interface PublicWorld {
  slug: string
  name: string
  kind?: string
  description: string
  members?: number
  guildName?: string
  inviteUrl?: string
  bridgedChannels: string[]
  workspaceUrl: string
}

export interface AitherNetPulse {
  status: 'online' | 'healthy' | 'degraded' | 'offline' | 'unavailable'
  onlineNodes: number | string | null
  totalNodes?: number | string | null
  gpuNodes?: number | string | null
  totalProviders: number | string | null
  relaysPublic?: number | null
  roomsPublic?: number | null
  servedModels: string[]
  latencyMs?: number | null
  updatedAt?: string
  joinDocsUrl?: string
  joinCli?: string
  note?: string
}

export interface PublicResult<T> {
  ok: boolean
  degraded: boolean
  data: T
  note?: string
}

export const FALLBACK_CONNECTED_WORLDS: PublicWorld[] = [
  {
    slug: 'occupy-saas',
    name: 'Occupy SaaS',
    description:
      'Open-source community building, owning, and getting paid for its own software. Projects, bug board, and bounties bridge between Discord and AitherRelay.',
    guildName: 'Occupy SaaS Discord',
    inviteUrl: 'https://discord.gg/zSvECrMjE',
    bridgedChannels: ['#announcements', '#general', '#builders'],
    workspaceUrl: 'https://app.aitherium.com/',
  },
]

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return undefined
}

function countVal(v: unknown): number | string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) return v.trim()
  return undefined
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of v) {
    let label = ''
    if (typeof item === 'string') label = item.trim()
    else if (item && typeof item === 'object') {
      const o = item as Json
      label = str(o.name ?? o.channel ?? o.title ?? o.id)
    }
    if (label && !seen.has(label)) {
      seen.add(label)
      out.push(label)
    }
  }
  return out
}

async function getJson(apiBase: string, path: string, f: Fetch): Promise<{ ok: boolean; status: number; body: Json | null }> {
  try {
    const r = await f(`${apiBase}${path}`, {
      method: 'GET',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    })
    const body = (await r.json().catch(() => null)) as Json | null
    return { ok: r.ok, status: r.status, body }
  } catch {
    return { ok: false, status: 0, body: null }
  }
}

export function normalizeFeedItems(raw: unknown): PublicFeedItem[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? ((raw as Json).items ?? (raw as Json).posts ?? (raw as Json).feed ?? [])
      : []
  if (!Array.isArray(rows)) return []
  const out: PublicFeedItem[] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r || typeof r !== 'object') continue
    const o = r as Json
    const body = str(o.body ?? o.content ?? o.summary ?? o.excerpt ?? o.description)
    const title = str(o.title ?? o.subject)
    if (!body && !title) continue
    const sourceRaw = str(o.source ?? o.origin, 'relay').toLowerCase()
    const channel = str(o.channel ?? o.room ?? o.board ?? o.category, sourceRaw === 'openaw' ? 'openAW' : '#general')
    const authorObj = o.author && typeof o.author === 'object' ? (o.author as Json) : null
    const author = authorObj
      ? str(authorObj.handle ?? authorObj.username ?? authorObj.display_name, sourceRaw === 'openaw' ? 'openaw' : 'member')
      : str(o.author ?? o.nick ?? o.username ?? o.handle, sourceRaw === 'openaw' ? 'openaw' : 'member')
    const authorName = authorObj ? str(authorObj.display_name) || undefined : undefined
    const isAgent = authorObj ? Boolean(authorObj.is_agent) : Boolean(o.is_agent)
    const timestamp = str(o.created_at ?? o.timestamp ?? o.updated_at ?? o.published_at)
    out.push({
      id: str(o.id, `${sourceRaw}:${channel}:${i}`),
      source: sourceRaw,
      kind: str(o.kind) || undefined,
      channel,
      title: title || undefined,
      author,
      authorName,
      isAgent: isAgent || undefined,
      body: body || title,
      timestamp,
      url: safeLink(o.url ?? o.link ?? o.href),
      worldSlug: str(o.world_slug ?? o.workspace_slug ?? o.world ?? o.project_slug) || undefined,
      discordOrigin: str(o.discord_origin ?? o.discord_channel ?? o.guild_name) || undefined,
      replies: num(o.reply_count ?? o.replies),
    })
  }
  return out
}

export function normalizeSpaces(raw: unknown): PublicSpace[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? ((raw as Json).spaces ?? (raw as Json).items ?? (raw as Json).profiles ?? [])
      : []
  if (!Array.isArray(rows)) return []
  const out: PublicSpace[] = []
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const o = r as Json
    const username = str(o.handle ?? o.username ?? o.slug)
    if (!username) continue
    const displayName = str(o.display_name ?? o.displayName ?? o.name, username)
    const spaceUrl = safeLink(o.space_url ?? o.url) || `https://aitherium.com/spaces/${encodeURIComponent(username)}`
    const moodObj = o.mood && typeof o.mood === 'object' ? (o.mood as Json) : null
    const moodLine = moodObj ? [str(moodObj.emoji), str(moodObj.text)].filter(Boolean).join(' ') : str(o.mood)
    const statsObj = o.stats && typeof o.stats === 'object' ? (o.stats as Json) : null
    const entity = str(o.entity_type).toLowerCase()
    out.push({
      username,
      displayName,
      headline: str(o.headline ?? o.tagline) || moodLine,
      bio: str(o.bio ?? o.bio_snippet ?? o.summary ?? o.about),
      entityType: entity === 'agent' ? 'agent' : entity === 'human' ? 'human' : undefined,
      verified: Boolean(o.verified ?? o.github_verified ?? o.is_verified),
      badges: strList(o.badges),
      reputation: num(o.reputation),
      level: num(o.level),
      totalViews: num(statsObj?.total_views),
      spaceUrl,
      aithernetNode: str(o.aithernet_node ?? o.node_status) || undefined,
    })
  }
  return out
}

export function normalizeWorlds(raw: unknown): PublicWorld[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? ((raw as Json).worlds ?? (raw as Json).items ?? (raw as Json).workspaces ?? [])
      : []
  if (!Array.isArray(rows)) return []
  const out: PublicWorld[] = []
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const o = r as Json
    const slug = str(o.slug ?? o.id)
    const name = str(o.name, slug)
    if (!slug && !name) continue
    const discordObj = o.discord && typeof o.discord === 'object' && !Array.isArray(o.discord) ? (o.discord as Json) : null
    const guildName = str(o.guild_name ?? o.discord_guild ?? discordObj?.guild_name ?? discordObj?.name) || undefined
    const inviteUrl = safeLink(o.invite_url ?? o.discord_invite ?? discordObj?.invite_url)
    const discordChannels = strList(discordObj?.bridged_channels ?? o.bridged_channels)
    const pubChannels = strList(o.public_channels ?? o.channels)
    const bridged = [...new Set([...discordChannels, ...pubChannels])]
    const workspaceUrl = safeLink(o.workspace_url ?? o.relay_url) || 'https://app.aitherium.com/'
    out.push({
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      kind: str(o.kind) || undefined,
      description: str(o.description ?? o.summary),
      members: num(o.member_count ?? o.members ?? discordObj?.member_count),
      guildName,
      inviteUrl,
      bridgedChannels: bridged,
      workspaceUrl,
    })
  }
  return out
}

export function normalizePulse(raw: unknown): AitherNetPulse {
  if (!raw || typeof raw !== 'object') {
    return { status: 'unavailable', onlineNodes: null, totalProviders: null, servedModels: [], note: 'Pulse unavailable.' }
  }
  const o = raw as Json
  const mesh = o.mesh && typeof o.mesh === 'object' ? (o.mesh as Json) : o
  const prov = o.providers && typeof o.providers === 'object' && !Array.isArray(o.providers) ? (o.providers as Json) : null
  const joinObj = o.join && typeof o.join === 'object' ? (o.join as Json) : null
  const rawStatus = str(o.status ?? mesh.health ?? mesh.status ?? o.health, 'degraded').toLowerCase()
  const status: AitherNetPulse['status'] =
    rawStatus === 'ok' || rawStatus === 'healthy'
      ? 'healthy'
      : rawStatus === 'online' || rawStatus === 'up'
        ? 'online'
        : rawStatus === 'offline' || rawStatus === 'down'
          ? 'offline'
          : 'degraded'
  const onlineNodes = countVal(mesh.nodes_online ?? o.online_nodes ?? o.nodes_online ?? o.active_nodes) ?? null
  const totalNodes = countVal(mesh.nodes_total ?? o.nodes_total) ?? null
  const gpuNodes = countVal(mesh.gpu_nodes ?? o.gpu_nodes) ?? null
  const totalProviders =
    countVal(prov?.online_count ?? o.providers_online ?? o.total_providers ?? o.providers_count ??
      (Array.isArray(o.providers) ? o.providers.length : undefined)) ?? null
  const relaysPublic = num(prov?.relays_public) ?? null
  const roomsPublic = num(prov?.rooms_public) ?? null
  const servedModels = strList(o.models ?? o.served_models ?? mesh.models)
  const latencyMs = num(o.latency_ms ?? o.avg_latency_ms) ?? null
  const updatedAt = str(o.generated_at ?? o.updated_at ?? o.timestamp ?? o.checked_at) || undefined
  const joinDocsUrl = safeLink(joinObj?.docs_url)
  const joinCli = str(joinObj?.cli) || undefined
  const note = str(o.note ?? o.message ?? o.reason) || undefined
  return {
    status,
    onlineNodes,
    totalNodes,
    gpuNodes,
    totalProviders,
    relaysPublic,
    roomsPublic,
    servedModels,
    latencyMs,
    updatedAt,
    joinDocsUrl,
    joinCli,
    note,
  }
}

export async function fetchPublicFeed(apiBase: string, f: Fetch = fetch.bind(globalThis)): Promise<PublicResult<PublicFeedItem[]>> {
  const r = await getJson(apiBase, '/api/aionyn/public/feed', f)
  if (!r.ok || !r.body) {
    return { ok: false, degraded: true, data: [], note: r.status ? `Public feed unavailable (HTTP ${r.status}).` : 'Public feed unreachable.' }
  }
  const items = normalizeFeedItems(r.body)
  const degraded = Boolean(r.body.degraded || r.body.status === 'degraded')
  return { ok: true, degraded, data: items, note: str(r.body.note) || undefined }
}

export async function fetchPublicSpaces(apiBase: string, f: Fetch = fetch.bind(globalThis)): Promise<PublicResult<PublicSpace[]>> {
  const r = await getJson(apiBase, '/api/aionyn/public/spaces', f)
  if (!r.ok || !r.body) {
    return { ok: false, degraded: true, data: [], note: r.status ? `Public Spaces directory unavailable (HTTP ${r.status}).` : 'Spaces directory unreachable.' }
  }
  return { ok: true, degraded: Boolean(r.body.degraded || r.body.status === 'degraded'), data: normalizeSpaces(r.body) }
}

export async function fetchPublicWorlds(apiBase: string, f: Fetch = fetch.bind(globalThis)): Promise<PublicResult<PublicWorld[]>> {
  const r = await getJson(apiBase, '/api/aionyn/public/worlds', f)
  if (!r.ok || !r.body) {
    return { ok: false, degraded: true, data: [], note: r.status ? `Public Worlds directory unavailable (HTTP ${r.status}).` : 'Worlds directory unreachable.' }
  }
  return { ok: true, degraded: Boolean(r.body.degraded || r.body.status === 'degraded'), data: normalizeWorlds(r.body) }
}

export async function fetchAitherNetPulse(apiBase: string, f: Fetch = fetch.bind(globalThis)): Promise<PublicResult<AitherNetPulse>> {
  const r = await getJson(apiBase, '/api/aionyn/public/aithernet', f)
  if (!r.ok || !r.body) {
    return {
      ok: false,
      degraded: true,
      data: {
        status: 'unavailable',
        onlineNodes: null,
        totalProviders: null,
        servedModels: [],
        note: r.status ? `AitherNet pulse unavailable (HTTP ${r.status}).` : 'AitherNet pulse unreachable.',
      },
    }
  }
  const pulse = normalizePulse(r.body)
  return { ok: true, degraded: pulse.status === 'degraded' || pulse.status === 'offline', data: pulse }
}
