# Authentication and database setup

The app now defaults to authenticated Supabase mode and fails closed without configuration. DOCTRACK_DEMO_MODE=true only enables the old demo in development; production ignores it. No hosted schema, real account, invitation or deployment was created during implementation.

## Check without external services

```sh
npm ci
npm run check
npm run test:db
npm run provision:users -- --roster=scripts/roster.example.json
```

The provisioning command above only validates the fictional roster: no database, Auth or email operations. Database tests use disposable embedded PostgreSQL with a minimal Auth schema stub; they do not emulate GoTrue or email delivery.

## Start a disposable local Supabase stack

Install Docker and the Supabase CLI on the operator's machine. From this repository:

```sh
npx supabase start
npx supabase db reset --local
npx supabase status
```

Reset only this disposable local project. It applies the five transactional migrations and office/action defaults. No employee accounts are seeded. config.toml disables public signup and anonymous sign-in. The Auth insert trigger also rejects non-invitation and unlisted users; do not temporarily enable signup to bootstrap an administrator.

Copy .env.example to ignored .env.local:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable or legacy anon key>
APP_URL=http://localhost:3000
DOCTRACK_DEMO_MODE=false
```

Use the local CLI status values. Requests use a server-only user-scoped client and a publishable/anon key, never a privileged key. Every protected page/action verifies auth.getUser() and current active profile/role; neither getSession() nor editable user_metadata authorizes access. Cookies are HttpOnly, SameSite=Lax and Secure in production. Proxy refresh and private/no-store responses prevent shared session caching. No public signup route exists.

APP_URL is the trusted canonical origin for invitation redirects and permanent QR labels. Choose a stable HTTPS origin before hosted use; preserve it or permanent redirects during integration/hosting changes. Authentication is required even when a user possesses the QR.

## Prepare the approved seven-person roster

Copy scripts/roster.example.json to ignored roster.local.json and replace it with the approved emails/names/admin-or-staff roles. Exactly seven distinct slots 1-7, seven distinct normalized emails and at least one admin are required. No actual employee roster or separate approved column-level document was supplied in this task. Reconcile database-design.md with them before hosted application.

Do not commit real employee addresses or assign shared temporary passwords. Only a trusted operator can initialize the private allowlist and invite the first administrator. A public user cannot choose a role or claim a slot. Assigned slot/email identities are retained; replacements require a reviewed migration.

## Provision local users in a separate operator environment

The standalone Node script is outside the Next.js import graph and refuses non-loopback targets. Its credentials must never enter client bundles, NEXT_PUBLIC variables or normal app hosting configuration.

Supply in a separate terminal or ignored operator environment file:

```dotenv
SUPABASE_OPERATOR_URL=http://localhost:54321
SUPABASE_OPERATOR_DB_URL=postgresql://postgres:<local-password>@localhost:54322/postgres
SUPABASE_OPERATOR_SECRET_KEY=<local admin/secret key from CLI status>
APP_URL=http://localhost:3000
```

Then:

```sh
npm run provision:users -- --roster=roster.local.json
npm run provision:users -- --roster=roster.local.json --apply-local
```

Only the second command explicitly changes the disposable local roster/Auth and requests local invitations. The script commits the roster before inviting, because the Auth trigger acquires the same lock. It prints slot results, not passwords/tokens/invite links. Reruns skip assigned slots and do not overwrite their roles or recreate identities. If mail delivery fails after account creation, inspect local Auth/mail state and resend with local operator tools; do not delete history to retry.

Invites use Supabase's admin invitation API. The Auth trigger requires GoTrue's invited_at field and an unclaimed allowlist match, then creates the profile from the private roster. User metadata cannot grant admin. Existing Auth accounts are not silently imported; review such a migration explicitly.

Open the local mail inbox, normally http://localhost:54324. Accept each invitation. The template passes a token hash to /auth/confirm, then opens /auth/set-password. Set a unique password of at least 12 characters. Public recovery and account self-enrollment are not added. MFA, account recovery and approved email changes remain operator procedures to finalize before pilot.

## Verify the live workflow

Run npm run dev. Sign in with local test admin/staff identities. Register a packet (receipt initially unconfirmed). Forward documents, then confirm the exact pending transfer using recipient and acknowledgment reference. A partial receipt must not confirm the full packet. Test stale tabs, repeated submissions, inactive profiles and direct staff/admin/QR URLs.

Registration, tracking, destinations/templates and access settings now use database-backed server actions. The activity screen reflects immutable tracking events, not a fabricated administration log. Camera decoding is a separate milestone; live mode supports manual PR/QR lookup.

## Hosted work requires approval

Remote provisioning is deliberately not enabled by the script. Hosted migrations, Auth settings/templates/redirect URLs, actual employee invitations and deployment require explicit approval, target verification and backup/restore review. Verify TLS, rate limits, email delivery, the real approved roster, current schema types and the full local Auth tests before requesting it. Do not bootstrap by permitting signup or trusting client metadata.

References: [server-side clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [admin invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [CLI/Auth configuration](https://supabase.com/docs/guides/local-development/cli/config). Installed Next.js async cookie/proxy/Suspense guides govern the framework integration.

Use a dedicated local Supabase project: the invitation-only auth.users trigger is project-wide. Do not apply it to an existing shared/procurement Auth project without a separate integration review. Require APP_URL with HTTPS in production; an HTTP production origin leaves the app locked. Redact invitation token_hash values in infrastructure access logs.
