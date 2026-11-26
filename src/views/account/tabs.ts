// The five Account tabs and their hash routes. AGPL-3.0-only.

export type AccountTab = 'services' | 'profile' | 'security' | 'billing' | 'privacy'

export const ACCOUNT_TABS: ReadonlyArray<readonly [AccountTab, string, string]> = [
  ['services', 'Services', '#/account'],
  ['profile', 'Profile & Space', '#/account/profile'],
  ['security', 'Security', '#/account/security'],
  ['billing', 'Billing & Packs', '#/account/billing'],
  ['privacy', 'Privacy & Data', '#/account/privacy'],
]

/** `''`/`services` → services; a known slug → that tab; anything else → null (no such tab). */
export function parseAccountTab(slug: string): AccountTab | null {
  const s = slug.replace(/\/+$/, '')
  if (!s || s === 'services') return 'services'
  const hit = ACCOUNT_TABS.find(([key]) => key === s)
  return hit ? hit[0] : null
}
