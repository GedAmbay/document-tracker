# Database and authentication testing

| Command | Coverage |
| --- | --- |
| npm run check | Lint, strict types, UUID/mock rules, verified server identity/current-role tests and redirect validation |
| npm run test:db | Applies all production migration files to disposable PostgreSQL and tests grants, RLS, RPCs and integrity |
| npm run build | Production App Router, Auth, proxy and prerender validation |
| npm run test:e2e | Secure-mode desktop/mobile checks: protected/admin/QR URLs fail closed; no public signup |
| npm run test:auth:local | Optional real local GoTrue/PostgREST checks after provisioning fictional test accounts |

## PostgreSQL permission tests

PGlite runs real PostgreSQL/PLpgSQL, not mocked repositories. The suite stubs only auth.users/auth.uid and creates anon/authenticated/service_role roles. It applies the exact migration files, and each test rolls back. Anonymous, unknown authenticated, inactive, staff and admin identities are exercised.

Coverage includes seven slots/invite-only enrollment, forged metadata, protected emails, role escalation, inactive sessions, direct writes/private access/service-role REST grants, immutable UUIDs, atomic rollback, retry/reused keys, forwarding without receipt, receipt evidence, partial custody, cross-packet documents, stale versions, pending transfer conflicts and history/truncate denial.

These tests do not prove real GoTrue invitation behavior, HTTP/JWT verification, SMTP, pooled connections, independent-session concurrency or backup restoration. Run those against the disposable local Supabase stack before pilot. Application unit tests separately verify that every guard calls getUser and trusts current profile roles rather than editable Auth metadata.

## Real local Auth tests

After auth-setup.md, supply only fictional local employee credentials in a test environment:

```dotenv
SUPABASE_LOCAL_TEST_URL=http://localhost:54321
SUPABASE_LOCAL_TEST_PUBLISHABLE_KEY=<local publishable/anon key>
SUPABASE_LOCAL_TEST_STAFF_EMAIL=<fictional local staff email>
SUPABASE_LOCAL_TEST_STAFF_PASSWORD=<local test password>
```

Run npm run test:auth:local. It refuses hosted targets, tests public signup denial, anonymous REST denial, real staff login and privilege/history-write denial. Without a URL it explicitly skips; skipped tests are not Auth verification. Also test invitation acceptance/expiry, password setup, logout/refresh and disabled profiles through the local mail inbox and browser. Use independent sessions to race a packet version and submission key.

## Browser modes

Secure mode is default. No configuration means a locked login, never sample tracking records. Build, set PLAYWRIGHT_PRODUCTION=1 and run npm run test:e2e for its own production server on localhost:3100. Secure tests also run with a mistakenly set DOCTRACK_DEMO_MODE=true in a production process.

The 16 prior mock UI tests require DOCTRACK_DEMO_MODE=true on a development server and the test process. PLAYWRIGHT_BASE_URL=http://localhost:3000 reuses that server. Mock tests skip in secure/production mode; secure tests skip only for an explicit development demo. CI runs check, database tests, build and secure production browser checks.

## Remaining gates

Docker, Supabase CLI and a configured Supabase endpoint were unavailable in this implementation environment. The full local GoTrue/PostgREST/mail tests and real independent-session races therefore remain unverified. No production database is ever a valid test target.
