> Current database/Auth checks are described in database-testing.md. The original mock UI tests require explicit development demo mode; secure production tests are now the default.

# Testing
Run npm ci and npm run check. Vitest uses jsdom and Testing Library for pure modules and synchronous components. Async Server Components need integration/E2E coverage rather than unsupported Vitest rendering. Identity tests reject non-UUID boundary input; mock tracking tests protect immutable IDs, append-only history, validation and dashboard totals.

Install Chromium with npx playwright install chromium; npm run test:e2e starts a local dev server on localhost port 3100. The current 16 desktop/mobile tests cover every screen, the scan-to-save workflow, validation/failure recovery, filters/pagination, preview states, settings/access edits and mock login. Screen-rendering checks include 360px phone width. CI builds first and sets PLAYWRIGHT_PRODUCTION=1 to test the production server. To reuse an existing dev server, set PLAYWRIGHT_BASE_URL=http://localhost:3000. See mock-interface.md for UI-only limitations.

Future required checks:
- Domain: transition rules, archival, QR immutability and stale versions.
- Application: inactive/forbidden actors, invalid inputs, repository failures and transaction rollback.
- Local Supabase: RLS with anonymous, unknown authenticated, inactive, employee/admin users; direct REST/RPC bypass, self-promotion, audit edits, QR changes, concurrency and partial failure. Mocks do not prove RLS.
- E2E: invite/login/logout, expiry, protected URLs, QR reprints, camera-denied entry, transfers and search.
- Contracts: schema compatibility, scopes, idempotency, retries and outbox recovery with procurement unavailable.
- Manual pilot: real printed QR/camera, 360px layout, keyboard/focus, slow network, timezone and backup restore.

CI blocks on lint, types, unit tests, build and E2E. SQL security checks become mandatory when SQL is introduced. Use synthetic data and disposable local databases only; no production credentials or sensitive artifacts.
