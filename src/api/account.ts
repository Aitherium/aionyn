// Aionyn Account hub API: the member's own account, over the bearer facade
// `https://api.aitherium.com/api/aionyn/account/*` (AitherGenesis). AGPL-3.0-only.
//
// Every call sends `Authorization: Bearer <OIDC access token>` with `credentials: 'omit'`.
// The server derives the member from the verified token only: no user ids are ever
// sent. Passwords, passkey enrolment and account deletion stay on the first-party
// IdP; this module only reads the handoff URLs for those ceremonies.

type Fetch = typeof fetch

export const ACCOUNT_PREFIX = '/api/aionyn/account'
export const SHOP_PACKS_URL = 'https://shop.aitherium.com/packs'

export type Section = 'ok' | 'unavailable'
export type Visibility = 'public' | 'friends_only' | 'workspace' | 'private'
export const VISIBILITIES: ReadonlyArray<readonly [Visibility, string]> = [
  ['public', 'Public'],
  ['friends_only', 'Connections only'],
  ['workspace', 'Workspace members'],
  ['private', 'Private'],
]
export const LINK_FIELDS = [
  ['website', 'Website'],
  ['github_username', 'GitHub username'],
  ['linkedin_url', 'LinkedIn URL'],
  ['twitter_handle', 'X / Twitter handle'],
] as const
export type LinkField = typeof LINK_FIELDS[number][0]

export interface Handoff { [key: string]: string | undefined
  password_change?: string; passkeys?: string; two_factor?: string; account_recovery?: string
  forgot_password?: string; delete_account?: string; billing?: string; devices?: string
  linked_accounts?: string; discord_link?: string; openaw_sso?: string; sign_out?: string
}

export interface CatalogService {
  key: string; name: string; line: string; url: string
  status: 'active' | 'inactive' | 'unavailable'; price: string; always: boolean
  action: '' | 'Activate' | 'Deactivate'
}
export interface CatalogBundle {
  key: string; name: string; line: string; services: string[]; price: string
  status: 'active' | 'inactive' | 'unavailable'
}
export interface ServicesResponse { services: CatalogService[]; bundles: CatalogBundle[] }
export interface ServiceActionResponse { status?: string; sku?: string; detail?: string }

export interface AccountProfile {
  username: string; display_name: string; avatar_url: string; headline: string; headline_emoji: string
  bio: string; links: Record<LinkField, string>; visibility: Visibility | null
  space_exists: boolean; space_url: string | null
}
export interface ProfileResponse { profile: AccountProfile; sources: { identity: Section; space: Section } }
export interface ProfilePatch {
  display_name?: string; headline?: string; headline_emoji?: string; bio?: string
  avatar_url?: string; links?: Partial<Record<LinkField, string>>; visibility?: Visibility
}

export interface SpaceBlock { id?: string; type: string; config?: Record<string, unknown>; [k: string]: unknown }
export interface SpaceConfig { blocks?: SpaceBlock[]; [k: string]: unknown }
export interface SpaceResponse {
  username: string; exists: boolean; visibility: Visibility | null; updated_at: string | null
  space_url: string | null; config: SpaceConfig | null
}

export interface SessionRow { id: string; created_at: string | null; last_active: string | null; is_current: boolean }
export interface SessionsResponse { count: number; sessions: SessionRow[]; note?: string }
export interface DeviceRow { name: string; kind: string; last_seen: string | null; healthy: boolean | null }
export interface DevicesResponse {
  status: 'linked' | 'none' | 'unknown' | 'unavailable'; count: number; devices: DeviceRow[]
  revoke_supported: boolean; manage_url: string
}
export interface ApiKeyRow {
  id: string; name?: string; prefix?: string; scopes?: string[]; created_at?: string | null
  expires_at?: string | null; last_used?: string | null; revoked_at?: string | null; is_active?: boolean
}
export interface ApiKeysResponse { count: number; keys: ApiKeyRow[] }
export interface ApiKeyCreated {
  key: { id: string; name: string; prefix: string; scopes: string[]; expires_at: string | null }
  api_key: string; warning: string; keys: ApiKeyRow[]
}
export interface SecurityResponse {
  mfa: { status: Section; two_factor_enabled: boolean; totp_enabled: boolean; compliant?: boolean | null
    secure_methods_only: boolean; methods: Array<{ type: string; name: string; last_used?: string | null }> }
  passkeys: { status: Section; available: boolean; count: number
    credentials: Array<{ credential_id?: string; device_name?: string; created_at?: string; last_used_at?: string }> }
  linked_accounts: { status: Section; providers: Array<{ provider: string; linked_at: string | null; primary: boolean }> }
  chat_accounts: { status: Section; accounts: Array<{ platform: string }> }
  external: { github: { linked: boolean }; discord: { linked: boolean }
    openaw: { status: string | null; sso_url: string } }
  handoff: Handoff
}

export interface Subscription {
  subscription_id?: string; status?: string; listing_id?: string; current_period_end?: number | string | null
  cancel_at_period_end?: boolean; amount_cents?: number; interval?: string; currency?: string; plan?: string
}
export interface PackRow { listing_id?: string; status?: string; created_at?: string; version?: string; pack_type?: string; source?: string }
export interface InvoiceRow {
  id?: string; number?: string; date?: number | string; amount_due?: number; amount_paid?: number
  currency?: string; status?: string; plan?: string; hosted_invoice_url?: string; invoice_pdf?: string
}
export interface BillingResponse {
  plan: { status: Section; tier: string | null; is_paid: boolean | null; is_preview: boolean | null }
  subscriptions: { status: Section; stripe_available: boolean; items: Subscription[] }
  packs: { status: Section; items: PackRow[] }
  entitlements: { status: Section; products: Record<string, boolean> }
  invoices: { status: Section; has_more: boolean; items: InvoiceRow[] }
  portal: { status: Section; available: boolean; handoff_url: string }
}
/** Personal Lockbox (BYO provider keys): metadata only, the server never returns a value. */
export interface LockboxSecret { name: string; type?: string | null; hint?: string | null; updated_at?: string | null }
export interface LockboxResponse { available?: boolean; count?: number; secrets?: LockboxSecret[]; reason?: string | null }
export interface LockboxStored { name: string; type?: string | null; hint?: string | null; stored: boolean }

export type WalletStatus = 'ok' | 'none' | 'unavailable'
export interface WalletResponse {
  available: boolean
  credits?: { status: WalletStatus; balance: number | null; unit?: string; [k: string]: unknown }
  community?: { status: WalletStatus; earned_total: number | null; pending_settlement: number | null; [k: string]: unknown }
  platform_credits?: { status: WalletStatus; balance: number | null; transferable?: boolean; cash_value?: boolean; [k: string]: unknown }
}

/** Env-style secret names only (OPENAI_API_KEY): what agents and World Studio read. */
export const SECRET_NAME = /^[A-Z][A-Z0-9_]{1,63}$/

export interface PortalResponse { available: boolean; reason: string | null; url: string | null; handoff_url: string }

export interface PrivacyResponse {
  space_visibility: { status: Section; value: Visibility | null; options: Visibility[] }
  consents: { status: Section; purposes: Record<string, string>
    items: Record<string, { granted: boolean; recorded_at: string | null; editable: boolean }> }
  data_export: { available: boolean; method: string; path: string }
  deletion: { self_service_in_spa: boolean; handoff_url: string }
}
export interface PrivacyPatch { space_visibility?: Visibility; consents?: Record<string, boolean> }

/** A refused or failed account call: `status` 0 means the network never answered. */
export class AccountError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'AccountError' }
}

/** The human sentence in a FastAPI error body (`detail` string or `{error, message}`). */
export function errorMessage(body: unknown, status: number): string {
  const d = body && typeof body === 'object' ? (body as { detail?: unknown }).detail : undefined
  if (typeof d === 'string' && d.trim()) return d.trim()
  if (d && typeof d === 'object') {
    const m = (d as { message?: unknown }).message
    if (typeof m === 'string' && m.trim()) return m.trim()
  }
  if (status === 401) return 'Your sign-in expired. Sign in again.'
  if (status === 403) return 'Your account is not allowed to do that.'
  if (status === 404) return 'That item no longer exists.'
  if (status === 429) return 'Too many requests. Try again in a minute.'
  if (status >= 500) return 'Aitherium is unavailable right now. Try again shortly.'
  return `The server answered ${status}.`
}

export interface AccountConfig { apiBase: string; token: string }

export class AccountApi {
  private readonly base: string
  constructor(private cfg: AccountConfig, private f: Fetch = fetch.bind(globalThis)) {
    this.base = cfg.apiBase.replace(/\/+$/, '') + ACCOUNT_PREFIX
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.cfg.token}`, Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    let r: Response
    try {
      r = await this.f(this.base + path, {
        method, credentials: 'omit', headers, body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new AccountError('Could not reach Aitherium. Check your connection.', 0)
    }
    const data = await r.json().catch(() => null)
    if (!r.ok) throw new AccountError(errorMessage(data, r.status), r.status)
    return (data ?? {}) as T
  }

  services() { return this.call<ServicesResponse>('GET', '/services') }
  setService(key: string, verb: 'activate' | 'deactivate') {
    return this.call<ServiceActionResponse>('POST', `/services/${encodeURIComponent(key)}/${verb}`)
  }

  profile() { return this.call<ProfileResponse>('GET', '/profile') }
  saveProfile(patch: ProfilePatch) { return this.call<ProfileResponse>('PATCH', '/profile', patch) }
  space() { return this.call<SpaceResponse>('GET', '/space') }
  saveSpace(config: SpaceConfig) { return this.call<SpaceResponse>('PUT', '/space', { config }) }

  sessions() { return this.call<SessionsResponse>('GET', '/sessions') }
  revokeSession(id: string) {
    return this.call<{ revoked: number }>('DELETE', `/sessions/${encodeURIComponent(id)}`)
  }
  revokeOtherSessions() { return this.call<{ revoked: number }>('POST', '/sessions/revoke-others') }
  devices() { return this.call<DevicesResponse>('GET', '/devices') }
  apiKeys() { return this.call<ApiKeysResponse>('GET', '/api-keys') }
  createApiKey(name: string, expiresInDays = 90, scopes: string[] = ['read']) {
    return this.call<ApiKeyCreated>('POST', '/api-keys', { name, scopes, expires_in_days: expiresInDays })
  }
  revokeApiKey(id: string) {
    return this.call<{ revoked: boolean; keys: ApiKeyRow[] }>('DELETE', `/api-keys/${encodeURIComponent(id)}`)
  }
  security() { return this.call<SecurityResponse>('GET', '/security') }

  billing() { return this.call<BillingResponse>('GET', '/billing') }
  billingPortal(returnUrl: string) { return this.call<PortalResponse>('POST', '/billing/portal', { return_url: returnUrl }) }

  /** A backend without the Lockbox yet (404) reads as "not available", never as an error. */
  lockbox() {
    return this.call<LockboxResponse>('GET', '/lockbox').catch((e: unknown): LockboxResponse => {
      if (e instanceof AccountError && e.status === 404) return { available: false, reason: 'The Lockbox is not available yet.' }
      throw e
    })
  }
  /** Write-only: the value goes up once and is never read back. */
  putSecret(name: string, value: string, type = 'api_key') {
    return this.call<LockboxStored>('PUT', `/lockbox/${encodeURIComponent(name)}`, { value, type })
  }
  deleteSecret(name: string) { return this.call<{ deleted: boolean }>('DELETE', `/lockbox/${encodeURIComponent(name)}`) }
  wallet() {
    return this.call<WalletResponse>('GET', '/wallet').catch((e: unknown) => {
      if (e instanceof AccountError && e.status === 404) return { available: false } as WalletResponse
      throw e
    })
  }

  privacy() { return this.call<PrivacyResponse>('GET', '/privacy') }
  savePrivacy(patch: PrivacyPatch) { return this.call<PrivacyResponse>('PATCH', '/privacy', patch) }
  /** The member's own DSAR export (scrubbed server-side), as a JSON Blob for download. */
  async exportData(): Promise<Blob> {
    const data = await this.call<unknown>('GET', '/export')
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  }
}

/** Public, unauthenticated: first-party IdP pages for every credential ceremony. */
export async function fetchHandoff(apiBase: string, f: Fetch = fetch.bind(globalThis)): Promise<Handoff | null> {
  try {
    const r = await f(apiBase.replace(/\/+$/, '') + ACCOUNT_PREFIX + '/handoff', {
      credentials: 'omit', headers: { Accept: 'application/json' },
    })
    if (!r.ok) return null
    const d = (await r.json().catch(() => null)) as { urls?: Handoff } | null
    return d?.urls && typeof d.urls === 'object' ? d.urls : null
  } catch {
    return null
  }
}

/** Only https URLs ever become links (handoff, portal, invoice URLs are server-sent). */
export function safeHttps(u: unknown): string | undefined {
  return typeof u === 'string' && /^https:\/\//i.test(u) ? u : undefined
}

/** `2026-11-25T10:00:00Z` or unix seconds → `2026-11-25`; anything else → `—`. */
export function shortDate(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v))
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10)
}

/** Minor units → `12.00 USD`. */
export function money(cents: unknown, currency: unknown): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '—'
  const cur = typeof currency === 'string' && currency ? currency.toUpperCase() : 'USD'
  return `${(cents / 100).toFixed(2)} ${cur}`
}
