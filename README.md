# DocTrack

Standalone mobile-first document tracking for seven authorized BAC employees. Supabase Auth and the nine-table PostgreSQL tracking implementation are now present. No hosted migration, real employee provisioning or deployment has been performed.

## Setup

Use Node.js 22.22.2+ or 24.15+ and npm. Run npm ci, then follow [authentication/database setup](docs/auth-setup.md) for a disposable local Supabase stack, private roster and invitations. Application configuration is documented in .env.example. With no configuration the app remains locked at login. Public registration is disabled.

The old mock UI is available only on a development server with DOCTRACK_DEMO_MODE=true; production ignores that flag. See [mock guide](docs/mock-interface.md). Normal mode uses user-scoped server actions and RLS for packet registration, tracking, configuration and access changes.

## Checks

- npm run check: lint, strict types and unit tests.
- npm run test:db: migrations and RLS/RPC/integrity tests in embedded PostgreSQL.
- npm run test:auth:local: optional real local Auth/PostgREST tests; explicitly skips without a local test endpoint.
- npm run build: production compile, no deployment.
- npm run test:e2e: secure desktop/mobile route tests; PLAYWRIGHT_PRODUCTION=1 tests the production build.
- npm run provision:users -- --roster=PATH: roster-only dry run. Explicit --apply-local is required for local account creation and invitations; remote targets are refused.

Read [database design](docs/database-design.md), [permission testing](docs/database-testing.md), [architecture](docs/architecture.md), [requirements](docs/requirements.md) and [integration contract](docs/integration-contract.md). Forwarding never confirms receipt; receipt events require a pending transfer, exact documents, recipient and acknowledgment reference.

Full local Supabase Auth/mail testing, approved real roster/column reconciliation, independent-session race testing and backup restoration remain pilot gates. Production changes require explicit approval.
