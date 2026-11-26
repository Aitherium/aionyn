# Aionyn architecture

Aionyn is a static React + TypeScript SPA (Vite, GitHub Pages) with no server of its
own. It reads `api.aitherium.com` in two modes: signed out through the public discovery
API, signed in as the member with an OIDC bearer token.

## The shell

`src/App.tsx` renders one hairline **3-column grid** (`228px | minmax(0, 640px) | 300px`,
`src/styles.css`) with hash routes:

| column | component | contents |
|---|---|---|
| left | `LeftRail` (`src/components/ShellRails.tsx`) | brand, nav (Feed, Forums, Worlds, Spaces, Messages, AitherNet, Account), Connections, Import, theme toggle, sign in/out |
| center | `renderCenter()` in `App.tsx` | the routed view, then the footer with the Aitherium family links |
| right | `RightRail` | live AitherNet pulse and the public Worlds list |

Routes: `#/` (feed), `#/forums`, `#/worlds`, `#/w/<slug>` (also `#/worlds/<slug>`),
`#/spaces`, `#/u/<user>`, `#/messages`, `#/network`, `#/people`, `#/jobs`, `#/import`,
`#/account[/<tab>]`. Retired routes redirect: `#/planets` to `#/worlds`, `#/vault[/<tab>]`
to `#/account[/<tab>]` (`legacyRoute()`).

## Data clients

| file | auth | serves |
|---|---|---|
| `src/api/public.ts` | none, `credentials: 'omit'` | `/api/aionyn/public/{feed,spaces,worlds,aithernet}`: the signed-out feed (`WelcomeView`), Spaces directory, Worlds list, AitherNet pulse. Degraded answers show a note, never invented people or node counts. |
| `src/api/live.ts` | bearer | `LiveClient`: viewer (OIDC userinfo), Spaces and standing (`/api/myspace/*`), connections (`/api/social/*`), the signed-in feed and Relay posts and thread replies (`/api/relay/v1/channels/*`). |
| `src/api/worlds-live.ts` | bearer | Worlds, forum boards, live chat, DMs (`/api/relay/v1/{workspaces,channels,dms}`) and OSINT (`/api/osint/*`). |
| `src/api/account.ts` | bearer | `AccountApi` over `/api/aionyn/account/*` (below). |
| `src/api/excerpt.ts` | n/a | plain-text excerpts of forum markdown for feed cards. |
| `src/auth/oidc.ts` | n/a | PKCE authorize URL, callback, token storage, sign-out. |

`src/api/sample.ts` is a fictional fixture for tests only. Signed out, the app has no
`NetworkClient` and shows only live public data.

## Account Hub

`#/account` (`src/views/Account.tsx`, tabs in `src/views/account/`) manages one
Aitherium ID across `openaw.org`, `eusyra.com`, `shop.aitherium.com` and
`app.aitherium.com`. Tabs are declared in `src/views/account/tabs.ts`:

| tab | route | endpoints under `/api/aionyn/account` |
|---|---|---|
| Services | `#/account` | `services`, `services/<key>/<verb>` |
| Profile & Space | `#/account/profile` | `profile` (PATCH), `space` (PUT) |
| Security | `#/account/security` | `sessions`, `sessions/revoke-others`, `devices`, `api-keys`, `lockbox/<name>` (write-only), `security` |
| Billing & Packs | `#/account/billing` | `billing`, `billing/portal` (Stripe), `wallet` |
| Privacy & Data | `#/account/privacy` | `privacy` (PATCH), `export` |

`handoff` returns the first-party IdP URLs for password change, passkey enrolment, MFA,
recovery and deletion. Those ceremonies never run in the SPA. The server derives the
member from the verified token's `sub`; the client never sends a user id. The Lockbox
lists secret names and accepts new values; it never reads a value back.

## Identity

"Sign in with Aitherium" is OIDC authorization code with PKCE (S256) against
`idp.aitherium.com/identity`. The client `aionyn-pages` is public (no secret) and its
only callback is `https://aionyn.aitherium.com/`. The access token lives in
`sessionStorage` for the tab and is sent only as a bearer header with
`credentials: 'omit'`. Build-time overrides (`VITE_WESYN_API_BASE`,
`VITE_WESYN_OIDC_CLIENT`, `VITE_WESYN_OIDC_REDIRECT`, `VITE_WESYN_OIDC_API`) keep
their historical names.

## Worlds: Discord is the primary backend, Relay and IRC the mirror

A World is a Discord server bound to an Aitherium workspace: that workspace's
AitherRelay rooms and forum board.

```
Discord server (World)                          Aitherium
  forum post / thread / message  --gateway-->  awdiscord bot --hook--> DiscordRelayBridge
                                                                          |
                                         AitherRelay room  <--------------'
                                           |        ^
                    IRC clients <-- AitherRelayIRCD (RFC 1459 over TLS, a Relay client)
                                           |
                                Aionyn reads /api/relay/v1/channels/<room>/messages
```

- **One conversation, two transports.** The bridge mirrors messages, threads, forum
  posts, edits, deletes and reactions both ways.
- **Survives Discord going dark.** Relay holds its own copy and backfills Discord when
  it returns.
- **The IRC gateway holds no privileged credential.** It uses the connecting user's own
  bearer token.

`#/w/<slug>` shows pinned links (`world.pinned`), the forum, live chat (Relay rooms,
polled every 5 s), an optional read-only OSINT panel and the copilot. World settings are
written by a World admin through `PUT /relay/v1/workspaces/<slug>`; Relay validates them.

**OSINT.** The panel calls the platform's public read door, which signs each request to
the ShadowBroker board (github.com/wizzense/Shadowbroker, AGPL-3.0) server-side. Every
row keeps its source link and is labelled a lead to verify.

## Privacy rules the client keeps

1. The profile page read is the gate. Anything but 2xx renders one line and nothing else.
2. If the standing read is stricter than the page read, the stricter answer wins.
3. Requests never carry cookies (`credentials: 'omit'`).
4. The feed reads only rooms the server lists for this viewer; a 403 room contributes
   nothing.

## Data model

`src/api/types.ts` follows ShlinkedIn's model (`docs/shlinked-intake.md`): profile, work
entry, endorsement, connection request, post, group (World), with provenance on every
fact (`proved`, `earned`, `claimed`). Only proved and earned facts count toward standing.

## The copilot

World pages carry a copilot that runs **Bonsai on the member's own GPU, inside the
tab**, using Aitherium's in-tab runtime
(`https://aitherium.com/workers/webgpu-brain-bonsai-worker.js` and
`https://aitherium.com/gobbonet/bonsai-tools.js`). That runtime is **not part of this
repository**; it is separately licensed, fetched only when the member clicks "Load on
my GPU", and spoken to only through the worker's message protocol. No prompt leaves the
tab.

The loop is `src/copilot/loop.ts`; tools are `src/copilot/tools.ts` and act with the
member's own token. `wesyn_read_feed`, `wesyn_search_threads`, `wesyn_read_thread`,
`osint_news` and `osint_telemetry` read at once. `wesyn_post_reply` and
`wesyn_message_member` only make a **draft** that the member sends. The same tools are
registered with WebMCP (`navigator.modelContext`) when the browser has it.

## Design rules

- Editorial monochrome: dark and light themes, hairline rules, no gradients, no neon,
  no decorative color.
- No file over 500 lines (`npm run check:size`).
- No raw password field, no admin surface, no secret in the bundle.
