// Aionyn Account: the member's Aitherium account hub. Five underline tabs on hash routes:
// #/account (Services), /profile, /security, /billing, /privacy. `#/vault` is an alias.
// AGPL-3.0-only.
import { useEffect, useMemo, useState } from 'react'
import { AccountApi, fetchHandoff, type Handoff } from '../api/account'
import type { Viewer } from '../api/types'
import { BillingTab } from './account/Billing'
import { SignedOutOverview } from './account/Overview'
import { PrivacyTab } from './account/Privacy'
import { ProfileTab } from './account/ProfileTab'
import { SecurityTab } from './account/Security'
import { ServicesTab } from './account/Services'
import { ACCOUNT_TABS, parseAccountTab, type AccountTab } from './account/tabs'

export interface AccountViewProps {
  tab: string
  token: string | null
  viewer: Viewer | null
  apiBase: string
  signIn: () => void
  go: (hash: string) => void
  fetchImpl?: typeof fetch
}

const SIGNED_OUT_LINE: Record<AccountTab, string> = {
  services: 'Sign in to activate services and see what your Aitherium account unlocks.',
  profile: 'Sign in to edit your name, headline, bio, links and Space.',
  security: 'Sign in to review sessions, API keys, passkeys and linked accounts.',
  billing: 'Sign in to see your plan, packs and order history.',
  privacy: 'Sign in to control visibility, consents and your data.',
}

export function AccountView({ tab, token, viewer, apiBase, signIn, go, fetchImpl }: AccountViewProps) {
  const active = parseAccountTab(tab)
  const api = useMemo(
    () => (token ? new AccountApi({ apiBase, token }, fetchImpl || fetch.bind(globalThis)) : null),
    [apiBase, token, fetchImpl],
  )
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const needsHandoff = active === 'security' || active === 'privacy'
  useEffect(() => {
    if (!needsHandoff || handoff) return
    let live = true
    fetchHandoff(apiBase, fetchImpl || fetch.bind(globalThis)).then(h => { if (live && h) setHandoff(h) })
    return () => { live = false }
  }, [needsHandoff, handoff, apiBase, fetchImpl])

  const body = () => {
    if (!active) {
      return (
        <div className="pane-section">
          <p className="err" role="alert">No such Account page. <a href="#/account">Back to Account</a></p>
        </div>
      )
    }
    if (!api) {
      return (
        <>
          <div className="signin-strip">
            <span>{SIGNED_OUT_LINE[active]}</span>
            <button className="primary btn-sm" type="button" onClick={signIn}>Sign in</button>
          </div>
          <SignedOutOverview tab={active} handoff={handoff} />
        </>
      )
    }
    switch (active) {
      case 'services': return <ServicesTab api={api} viewer={viewer} />
      case 'profile': return <ProfileTab api={api} />
      case 'security': return <SecurityTab api={api} handoff={handoff} />
      case 'billing': return <BillingTab api={api} />
      case 'privacy': return <PrivacyTab api={api} handoff={handoff} />
    }
  }

  return (
    <section className="stack" aria-label="Account">
      <header className="stream-header account-header">
        <h1>Account</h1>
        <div className="tab-bar" role="tablist" aria-label="Account sections">
          {ACCOUNT_TABS.map(([key, label, href]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active === key}
              className={active === key ? 'tab-btn active' : 'tab-btn'}
              onClick={() => go(href)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <div key={`${active}:${token ? 'in' : 'out'}`}>{body()}</div>
    </section>
  )
}
