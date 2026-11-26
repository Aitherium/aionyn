# Aionyn

**The open-source Aitherium Social Network and Personal Account Hub.** One
Aitherium ID, one place to see the network and run your account. AGPL-3.0.

- **Live:** https://aionyn.aitherium.com/ (custom domain https://aionyn.com/ is wired
  through `public/CNAME`).
- **Signed out**, the home page is the live public feed, Worlds, Spaces and AitherNet
  status, read from the public discovery API. Nothing on it is sample data.
- **Signed in** ("Sign in with Aitherium", OIDC + PKCE), you post, reply, message and
  manage your account.

## What's inside

### Social network

| Route | What it is |
|---|---|
| `#/` | **Feed.** Live public stream of AitherRelay rooms, Forum threads (plain-text excerpts) and openAW activity, filterable by source. Signed in: inline composer and Relay thread replies. |
| `#/forums` | **Forums.** The Relay workspace forum boards: threads, search, reply, new thread. |
| `#/worlds`, `#/w/<slug>` | **Worlds.** Each World is a Relay workspace bridged with its Discord server: rooms, live chat, forum, pinned links, optional OSINT panel and in-tab copilot. |
| `#/spaces`, `#/u/<user>` | **Aither Spaces.** Public member directory and member pages (standing, Space blocks, connection status). |
| `#/messages` | **Messages.** Direct messages over Relay. |
| `#/network` | **AitherNet.** Live mesh status: online nodes, providers, public relays and rooms, served models. |
| `#/people`, `#/jobs`, `#/import` | Connections, Jobs from your Worlds, and import from your own LinkedIn data export. |

### Personal Account Hub (`#/account`, `#/vault` redirects)

One Aitherium ID across `openaw.org`, `eusyra.com`, `shop.aitherium.com` and
`app.aitherium.com`, managed in five tabs:

| Tab | Route | What it does |
|---|---|---|
| **Services** | `#/account` | The apps your ID is signed into (OIDC grants), with connect and revoke. |
| **Profile & Space** | `#/account/profile` | Inline editor for your profile, links and public Space. |
| **Security** | `#/account/security` | Sessions, devices, API keys, the write-only **Personal Lockbox** for bring-your-own keys, MFA and passkeys, linked accounts. |
| **Billing & Packs** | `#/account/billing` | Plan, Shop and Eusyra packs, invoices, Stripe customer portal, Wallet and Credits. |
| **Privacy & Data** | `#/account/privacy` | Visibility, consents, data export, and handoff to the first-party IdP for recovery and deletion. |

### Design and privacy principles

- **Editorial monochrome.** Dark and light themes, hairline 3-column shell, no
  gradients, no neon.
- **Bearer only.** Every authenticated call sends `Authorization: Bearer <token>` with
  `credentials: 'omit'`. The server derives the member from the token's `sub`; the
  client never sends a user id.
- **Nothing privileged in the page.** No raw password fields, no admin surface and no
  secret in the browser bundle. Passwords, passkey enrolment, recovery and deletion stay
  on the first-party IdP; the Lockbox is write-only (values are never read back).
- **Privacy is the server's.** A profile the server refuses renders one line
  ("private") and nothing else.

## Architecture

```
 browser: this app, static on GitHub Pages (aionyn.aitherium.com)
   |  "Sign in with Aitherium": OIDC code + PKCE (S256), public client `aionyn-pages`
   |    -> idp.aitherium.com/identity/oidc/authorize -> back to /?code&state
   |    -> POST /oidc/token with the verifier -> access token (sessionStorage, this tab)
   v
 api.aitherium.com
   |-- /api/aionyn/public/{feed,spaces,worlds,aithernet}    no auth: signed-out discovery
   |-- /api/aionyn/account/{handoff,me,profile,space,       bearer: the Account Hub
   |     sessions,devices,api-keys,lockbox,security,
   |     services,billing,wallet,privacy,export}
   |-- /api/relay/v1/{channels,workspaces,dms}/...          bearer: rooms, forums, Worlds, DMs
   |-- /api/myspace/{user}[/standing], /api/social/...      bearer: Spaces, connections
   `-- /api/osint/{news,telemetry}                          public read door for World OSINT
```

| Module | Role |
|---|---|
| `src/api/public.ts` | Signed-out discovery client. No auth header; never invents users or node counts when degraded. |
| `src/api/live.ts` | `LiveClient`: the signed-in social network (Spaces, feed, connections, Relay posts and replies). |
| `src/api/worlds-live.ts` | Worlds, forums, live chat, DMs and OSINT over Relay. |
| `src/api/account.ts` | Account Hub client for `/api/aionyn/account/*`. |
| `src/auth/oidc.ts` | PKCE sign-in, callback and sign-out. |

The page holds no secret. The IdP accepts exactly one callback for `aionyn-pages`,
`https://aionyn.aitherium.com/`; a fork on another origin must register its own client.
More: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/linkedin-interop.md](docs/linkedin-interop.md),
[docs/occupysaas-integrations.md](docs/occupysaas-integrations.md).

## Develop

```bash
npm ci
npm run dev          # http://localhost:5173/
npm run check:size   # prints "ok": no source file over 500 lines
npm run typecheck
npm test             # vitest, 113+ tests
npm run build
```

Local dev reads the public API live. Sign-in only completes on the registered callback
(the Pages URL), so signed-in screens are covered by tests rather than local login.
`src/api/sample.ts` is a fictional test fixture; the app never shows it.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md). Start with an issue
labelled `good first issue`. AI agents work issues labelled `agent-ok`.

## Credits

The social data model follows **ShlinkedIn** (https://github.com/cbh123/shlinked,
AGPL-3.0): the shape of its profiles, endorsements, work history, connection requests,
posts and groups, without its satire content or joke mechanics. The World OSINT panel
shows rows from the **ShadowBroker** board (https://github.com/wizzense/Shadowbroker,
AGPL-3.0). See [NOTICE](NOTICE) and [docs/shlinked-intake.md](docs/shlinked-intake.md).

## Licence

AGPL-3.0-only. See [LICENSE](LICENSE). The Aionyn name is not covered by the licence:
forks are welcome under a different name.
