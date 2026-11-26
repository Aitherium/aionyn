# Aionyn: ground truth for every coding agent

Aionyn is the open-source Aitherium Social Network and Personal Account Hub: a static
React + TypeScript SPA (GitHub Pages, https://aionyn.aitherium.com/) that reads the
Aitherium backend publicly when signed out and as the member when signed in. Humans
read `CONTRIBUTING.md`; the rules are the same. This file is harness-neutral; Claude
Code reads it through `CLAUDE.md`. Layout and APIs: `docs/ARCHITECTURE.md`.

## Map

- `src/App.tsx`: the 3-column hairline shell and hash routes; rails in
  `src/components/ShellRails.tsx`.
- `src/api/public.ts`: signed-out discovery (`/api/aionyn/public/*`).
- `src/api/live.ts`, `src/api/worlds-live.ts`: signed-in social network and Relay.
- `src/api/account.ts` + `src/views/account/*`: the 5-tab Account Hub
  (Services, Profile & Space, Security, Billing & Packs, Privacy & Data).
- `src/api/sample.ts`: fictional test fixture only; the app never renders it.

## Rules

- **Work from a claimed issue.** One issue per pull request. Agents claim only issues
  labelled `agent-ok`.
- **Real data only.** Signed out shows live public data or an honest "unavailable"
  note. Never fabricate people, posts or node counts.
- **Sample data stays fictional.** Every name in `src/api/sample.ts` ends in
  ` (sample)` and every link points at `example.invalid`. `npm test` checks it.
- **Privacy is the server's.** A profile read that is not 2xx shows one line
  ("private", "no member", "removed") and nothing else. No cache, directory row or
  guess as fallback. `src/api/live.test.ts` pins it.
- **No ambient credentials.** Requests send `Authorization: Bearer` (or nothing, for
  public reads) and `credentials: 'omit'`. Never send a user id; the server uses `sub`.
- **Nothing privileged in the SPA.** No raw password fields, no admin surfaces, no
  secrets in code, commits or tool arguments. Passwords, passkeys, recovery and
  deletion hand off to the IdP. The Lockbox is write-only. The OIDC client is public
  (PKCE); there is no client secret.
- **Editorial monochrome.** Dark/light, hairlines, no gradients, no neon.
- **No file over 500 lines** (`npm run check:size` prints `ok`).
- **No new runtime dependency** without saying why in the pull request.
- **Commits are signed off** (`git commit -s`). CI checks it.

## Verify before you say done

```bash
npm ci
npm run check:size
npm run typecheck
npm test
npm run build
```

## Report format

1. What changed: file paths, one line each.
2. Which checks you ran and what they printed.
3. What you did not do, and why.
