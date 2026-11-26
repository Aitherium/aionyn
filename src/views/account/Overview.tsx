// Signed-out Account overview: what one Aitherium account unlocks, tab by tab. AGPL-3.0-only.
import { OPENAW_SSO_URL } from '../../api/public'
import type { Handoff } from '../../api/account'
import { IdpLinks } from './shared'
import type { AccountTab } from './tabs'

export const ECOSYSTEM_SERVICES: ReadonlyArray<{ key: string; name: string; line: string; url: string }> = [
  {
    key: 'openaw',
    name: 'openAW',
    line: 'Open-source project hub, search, Deep Research, and installable apps with one-click SSO.',
    url: OPENAW_SSO_URL,
  },
  {
    key: 'eusyra',
    name: 'Eusyra Studio',
    line: 'Make films, packs, stickers, and music with the studio.',
    url: 'https://eusyra.aitherium.com/creators',
  },
  {
    key: 'spaces',
    name: 'Aither Spaces',
    line: 'Your public page, shown on Aionyn and in Discord.',
    url: 'https://aitherium.com/spaces/',
  },
  {
    key: 'relay',
    name: 'Relay chat',
    line: 'Rooms and direct messages, mirrored with Discord.',
    url: 'https://app.aitherium.com/',
  },
  {
    key: 'shop',
    name: 'Shop',
    line: 'Packs, entitlements, and add-ons tied to your account.',
    url: 'https://shop.aitherium.com/packs',
  },
  {
    key: 'aitheros',
    name: 'AitherOS workspace',
    line: 'Your team, agents, and apps in one place.',
    url: 'https://app.aitherium.com/',
  },
]

const CAPABILITIES: Record<Exclude<AccountTab, 'services'>, ReadonlyArray<readonly [string, string]>> = {
  profile: [
    ['Display name & headline', 'How you appear across Aionyn, Spaces, Relay, and Discord.'],
    ['Bio', 'A short plain-text introduction on your profile and Space.'],
    ['Visibility', 'Public, members only, or private, enforced by the server.'],
    ['Space links', 'The links and blocks shown on your AitherSpace.'],
  ],
  security: [
    ['Active sessions', 'See every signed-in browser and revoke any of them.'],
    ['Personal API keys', 'Create scoped keys for scripts and CLIs; revoke instantly.'],
    ['Passkeys & MFA', 'Phishing-resistant sign-in, managed on the Aitherium IdP.'],
    ['Linked accounts', 'GitHub, Discord, and openAW identities proved by sign-in.'],
  ],
  billing: [
    ['Plan', 'Your current plan and subscription status.'],
    ['Packs & entitlements', 'Shop and Eusyra packs owned by your account.'],
    ['Order history', 'Every order with date, amount, and status.'],
    ['Billing portal', 'Payment methods and invoices on the secure billing portal.'],
  ],
  privacy: [
    ['Discoverability', 'Choose whether people can find you in the directory.'],
    ['Data export', 'Download a copy of your account data.'],
    ['Import', 'Bring your LinkedIn or other export in, kept on this device.'],
    ['Recovery & deletion', 'Recover access or delete your account on the IdP.'],
  ],
}

export function SignedOutOverview({ tab, handoff }: { tab: AccountTab; handoff: Handoff | null }) {
  if (tab === 'services') {
    return (
      <>
        <div className="section-bar">One account, every service</div>
        <ul className="list-rows">
          {ECOSYSTEM_SERVICES.map(svc => (
            <li key={svc.key} className="list-row stack-xs">
              <div className="row between wrap">
                <strong className="thread-link">{svc.name}</strong>
                <a className="small dim" href={svc.url} rel="noopener noreferrer">Visit ↗</a>
              </div>
              <p className="dim small">{svc.line}</p>
            </li>
          ))}
        </ul>
      </>
    )
  }
  return (
    <>
      <div className="section-bar">What you can manage here</div>
      <ul className="list-rows">
        {CAPABILITIES[tab].map(([name, line]) => (
          <li key={name} className="kv-row">
            <span className="kv-label">{name}</span>
            <span className="kv-value dim">{line}</span>
            <span className="kv-action" />
          </li>
        ))}
      </ul>
      {tab === 'security' && handoff && (
        <div className="pane-section stack-xs">
          <p className="dim small">Passwords, passkeys and recovery are changed on the Aitherium sign-in server.</p>
          <IdpLinks handoff={handoff} />
        </div>
      )}
      {tab === 'privacy' && (
        <div className="pane-section stack-xs">
          <p className="dim small">
            Your import never leaves this device. <a href="#/import">Open Import</a>
          </p>
          {handoff && <IdpLinks handoff={handoff} keys={[['account_recovery', 'Account recovery'], ['delete_account', 'Delete account']]} />}
        </div>
      )}
    </>
  )
}
