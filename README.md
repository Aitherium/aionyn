# Aionyn (beta)

**The open network where reputation is earned.** Profiles, earned standing, connections,
communities ("worlds"), a feed and messages, with Aither built in, running on the
open-source Occupy SaaS apps. Licensed AGPL-3.0.

- **Live:** https://aitherium.github.io/aionyn/ (real data only: signed out you see the
  welcome page and the connected worlds; sign in with Aitherium to see your network).
- **Join from Discord:** `/wesyn join` in the Aitherium Discord makes your profile and
  answers with its link.

Aionyn is in beta. It is identity and the professional network (the LinkedIn
replacement); it grew out of Wesyn on 2026-11-15, and Wesyn continues as its own product.
Integrations with OccupySaaS's zeroauthy and salescompel: [docs/occupysaas-integrations.md](docs/occupysaas-integrations.md).

Aionyn is in beta. Expect rough edges and missing pieces; the issues list says which.

## What makes it different

| | Aionyn |
|---|---|
| Reputation | Earned in communities (shipped work, reviews, badges). Nobody types their own. |
| GitHub | Shown only when PROVED by signing in with GitHub, never a typed handle. |
| Communities | Each Discord server is a world: its Relay rooms and forum board, with an optional OSINT panel and the in-tab copilot. Discord is the primary backend; AitherRelay and IRC mirror it so the network keeps working when Discord is down. |
| Privacy | The server decides. A private profile shows the word "private" and nothing else. |
| Code | AGPL-3.0. Run it, fork it, self-host it. |

## How it works

```
 browser (this app, static on GitHub Pages)
   |  1. "Sign in with Aitherium": OIDC code + PKCE (S256), public client `aionyn-pages`
   |     -> idp.aitherium.com/identity/oidc/authorize -> back to /aionyn/?code&state
   |     -> POST /oidc/token with the verifier -> access token (sessionStorage, this tab)
   |  2. every read: Authorization: Bearer <token>, credentials: 'omit'
   v
 api.aitherium.com/api/*  (non-credentialed CORS for github.io origins)
   |-- /myspace/{user}            the member's Space; 403 when this viewer may not see it
   |-- /myspace/{user}/standing   earned community standing, OAuth-proved GitHub, connections
   |-- /myspace/network/planets   the viewer's own workspaces and their Discord servers
   |-- /social/friends[...]       connections and requests
   `-- /relay/v1/channels/...     the rooms this viewer may read (Discord forums mirror here)
```

The page holds no secret. The IdP accepts exactly one callback for this client,
`https://aitherium.github.io/aionyn/`; a fork on another Pages origin cannot obtain a
token for it, and should register its own client.

Without a token the app uses `SampleClient` (`src/api/sample.ts`). With one it uses
`LiveClient` (`src/api/live.ts`). Both implement `NetworkClient` (`src/api/types.ts`),
so every screen is the same code in both modes.

More: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). LinkedIn interop (sign-in, import from your own data export, opt-in sharing, JobPosting JSON-LD, and why no LinkedIn SDK is used): [docs/linkedin-interop.md](docs/linkedin-interop.md).

## Run it

```bash
npm ci
npm run dev        # http://localhost:5173/aionyn/
npm test
npm run build
```

Live sign-in works only from the registered callback (the Pages URL). Local
development runs in sample mode.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Start with an issue labelled
`good first issue`. AI agents are welcome on issues labelled `agent-ok`; a human
maintainer approves their pull requests.

## Credits

The social data model follows **ShlinkedIn** (https://github.com/cbh123/shlinked,
AGPL-3.0). We ported the shape of its profiles, endorsements, work history, connection
requests, posts and groups, and left out its satire content and joke mechanics. See
[NOTICE](NOTICE) and [docs/shlinked-intake.md](docs/shlinked-intake.md).

## Licence

AGPL-3.0-only. See [LICENSE](LICENSE). The Aionyn name is not covered by the licence:
forks are welcome under a different name.
