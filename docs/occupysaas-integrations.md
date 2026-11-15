# Aionyn + OccupySaaS: zeroauthy and salescompel

Aionyn is identity and the professional network: people, worlds and jobs. OccupySaaS
builds two open-source projects that sit on both sides of it:

| project | what it is | Aionyn's role | state (2026-11-15) |
|---|---|---|---|
| [occupysaas/zeroauthy](https://github.com/occupysaas/zeroauthy) | Self-hostable identity server that speaks the Auth0 Authentication and Management APIs; OpenID Certified | a world can bring its own zeroauthy as the place its members sign in | designed; not yet proven against a real zeroauthy |
| [occupysaas/salescompel](https://github.com/occupysaas/salescompel) | Salesforce-compatible CRM (Go/PostgreSQL + Vue), pre-0.x | a world can send its people and jobs to its own CRM | designed; salescompel has no release yet |

Both are the partner's projects under Apache-2.0. Aionyn builds **into** them: it talks to
their APIs and never copies, forks around or rehosts their code.

## zeroauthy: sign in with your world's own identity server

Today Aionyn signs everyone in with "Sign in with Aitherium" (OIDC authorization code +
PKCE, public client `aionyn-pages`). A world that already runs zeroauthy should not need a
second account:

1. The world's admin registers zeroauthy as the world's upstream identity provider
   (standard OpenID Connect discovery: issuer URL, client id, client secret, all held
   server-side by Aitherium Identity, never in this page).
2. A member who signs in to Aionyn for that world is sent to zeroauthy, signs in there,
   and returns to Aionyn through Aitherium Identity as usual. Aionyn itself still only
   ever sees an Aitherium token, so nothing in this app changes per world.
3. Access stays per world: a zeroauthy login admits a member to the world that trusts that
   zeroauthy, and no other.

**Done when:** a live test signs a seeded user in through zeroauthy's own
`examples/testing` compose stack (pinned to its release image) and lands on that user's
Aionyn profile. Until then this is wiring, not proof.

## salescompel: your network, in your CRM

A world that runs salescompel can opt in to sync, one way first:

| Aionyn | salescompel (Salesforce-compatible REST) |
|---|---|
| a person in the world | Contact |
| the world | Account |
| a job posted in the world | Opportunity (with the JobPosting fields) |

Rules: off by default; the world admin turns it on; the CRM credential lives with the
world (its own key, its own instance), never with Aionyn; nothing is written back into
Aionyn from the CRM until a later, separately agreed step.

**Done when:** salescompel tags a release with a stable Contact/Account API, and a live
test creates a contact from an Aionyn person and reads it back.

## Contributing upstream

Changes that belong in zeroauthy or salescompel go to their repositories under their
`CONTRIBUTING.md`: agree the work in an issue first, a fork-based PR, and a DCO
`Signed-off-by` from a real person on every commit.
