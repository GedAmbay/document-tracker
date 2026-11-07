# Foundation setup report
## Repository inspection
Initial repository: Next.js 16.4.5 / React 19.3.0 App Router starter, Tailwind v4, strict TypeScript, ESLint; three pre-existing untracked empty docs. Read bundled Next.js project structure, authentication and Vitest/Playwright guides. Preserved generated Next.js AGENTS block.

## Decisions
Root app/ retained; business rules separate under modules/. Permanent document and QR UUIDs are distinct. QR never changes or grants authorization. Proposed Supabase Auth + active membership RLS, atomic custody history and versioned integration/outbox. No procurement workflows, production changes or deployment. shadcn configuration/utilities prepared; UI generation deferred until needed. Starter landing page replaced with a foundation notice; system fonts avoid external font downloads. Node types aligned to Node 22. Vitest config uses .mts for ESM compatibility.

## Files
Modified: AGENTS.md, README.md, .gitignore, package.json, package-lock.json, eslint.config.mjs, app/page.tsx, app/layout.tsx, app/globals.css. Existing empty docs were populated. Created files and directory guidance:

- .env.example
- .github/workflows/ci.yml
- components.json
- components/ui/README.md
- contracts/README.md
- docs/architecture.md
- docs/database-design.md
- docs/dependencies.md
- docs/integration-contract.md
- docs/phases.md
- docs/requirements.md
- docs/testing.md
- lib/supabase/README.md
- lib/utils.ts
- modules/auth/README.md
- modules/documents/application/README.md
- modules/documents/domain/identity.ts
- modules/documents/infrastructure/README.md
- modules/integration/README.md
- playwright.config.ts
- supabase/migrations/README.md
- tests/e2e/foundation.spec.ts
- tests/integration/README.md
- tests/setup.ts
- tests/unit/identity.test.ts
- vitest.config.mts
- docs/setup-report.md (this report)

## Commands executed
- Inspection: Get-Location, rg --files, Get-Content, Get-ChildItem, git status --short, git diff --check.
- npm install @supabase/supabase-js @supabase/ssr zod clsx tailwind-merge class-variance-authority lucide-react server-only (sandbox attempt stalled; elevated retry succeeded).
- npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom @playwright/test (peer conflict).
- npm install -D @types/node@^22 vitest @vitejs/plugin-react @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom @playwright/test (succeeded).
- npm audit --json (8 moderate existing lint-toolchain advisories; no forced fix).
- npm run check, npm run build, npx playwright install chromium, npm run test:e2e.
- File generation used Node.js; an initial Python alias invocation failed without changing files.

## Verification
- npm run check: PASS, including lint, strict typecheck and 12 unit cases.
- git diff --check: PASS; only line-ending notices.
- npm run build: initial Google font network failure removed using system fonts; subsequent build blocked by Turbopack CSS worker exiting before connection, reproducible outside sandbox.
- First E2E attempt: both projects blocked by browser download still in progress; final result recorded below.

## Remaining work
Resolve build worker issue and dependency advisories; confirm office decisions in requirements; implement invite-only Auth and locally tested RLS/migrations before real data; then document registration, QR and custody phases. No existing security implementation is implied. Follow phase gates; explicit approval remains required for production operations/deployment.

## Final browser result
Chromium installation completed. Desktop and mobile Chromium smoke checks both PASS (2/2). They test the development server; production build remains blocked by the reproducible Turbopack CSS-worker failure. Rechecked after successful dev E2E and confirmed the build still fails.

Runtime engines are declared as ^22.22.2 || ^24.15.0 || >=26.0.0 to match installed test-tool requirements. CI uses the latest Node 22 patch.

## Subsequent mock interface milestone

The foundation landing page has been replaced by the complete mock interface described in [mock-interface.md](mock-interface.md). That guide is the current source for screens and verification. The production build now passes; the earlier CSS-worker build blocker was not reproduced in this milestone. Current results: clean lint/types, 15 unit tests and 16 desktop/mobile production UI tests passing. Supabase and real authentication remain disconnected.
