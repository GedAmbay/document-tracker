> Historical mock-interface milestone. It now runs only with DOCTRACK_DEMO_MODE=true in development. See auth-setup.md for the current authenticated implementation.

# Mock interface

This UI-only milestone supersedes the foundation landing page. It does not implement production authentication, authorization, database persistence, camera scanning, or procurement business processes. All people and records are fictional. No Supabase client is instantiated and no credentials are needed.

## Screens

| Route / interaction | Screen |
| --- | --- |
| /login | Demo login, credential autofill, validation, password visibility, loading and simulated error |
| / | Tracking dashboard with four derived metrics, follow-ups and recent activity |
| /packets | Searchable/filterable PR packet list, pagination and CSV export |
| /packets/{UUID} | Documents included, reported location, status, receipt state, latest action and chronological timeline |
| /scanner | Simulated QR scan, manual PR/QR lookup, camera-unavailable and unmatched identifier states |
| Packet details → Update tracking | Accessible bottom sheet, validation, busy state, simulated failure/retry and save |
| /history | Searchable movement history, destination filter, newest first |
| /activity | Read-only activity list with search/category filters |
| /settings | Destinations/action-template tabs, create/edit, duplicate validation and activation state |
| /users | Seven-employee roster, search, role/access editing and self-administrator protection |
| /q/{QR UUID} | Resolver for sample permanent QR identifiers; unknown IDs show not-found UI |

## Try the primary workflow

1. Open the QR scanner from the sidebar or mobile bottom navigation.
2. Select “Start demo scan”; the camera is simulated and never requests permission.
3. Open the identified packet, then select “Update tracking”.
4. Set reported location, tracking status and receipt confirmation; choose an action and enter a note.
5. Save. The packet, timeline, dashboard totals and activity log update together in this session.

For manual lookup try PR `2026-11-0142`. “Packet QR” renders a genuine QR containing a relative `/q/{qrId}` path, supports copying the identifier, and opens the browser print dialog. These labels are demo artifacts; a stable HTTPS origin is still required before real-world printing. Document/QR UUIDs remain unchanged after updates. No personal data is encoded in QR payloads.

## States and navigation

The workspace header’s “Preview state” selector provides ready, loading skeleton, empty, and recoverable error views. Updates and configuration changes show dismissible success notifications. Expand “Demo testing options” in the update sheet to simulate a save failure without losing the form. Login has a separate simulated-error checkbox. Search/filter misses, inactive employees, unknown packets and unavailable cameras have dedicated UI.

Desktop uses a navy sidebar; tablet/mobile uses bottom navigation with a raised scan action and a More sheet for activity and administration. Ctrl/Cmd+K opens packet search. Dialogs/sheets use shadcn/ui Radix focus management and Escape dismissal. The mobile update action remains reachable above bottom navigation. Development indicators are disabled to prevent their overlay covering Home; compile/runtime errors remain visible.

## Implementation boundaries

- `components/doctrack/`: reusable shell, screen components, forms, common display primitives and mock React context.
- `components/ui/`: generated shadcn/ui primitives with Radix and Lucide.
- `modules/documents/domain/packet.ts`: pure types, Zod update validation and metrics.
- `modules/documents/application/update-mock-packet.ts`: pure immutable mock update operation.
- `modules/documents/infrastructure/mock-data.ts`: eight packets, seven employees, destinations/templates and initial activities.
- `app/`: thin App Router composition and global/theme/responsive styling.

The demo starts with administrator access to allow direct review. Signing out changes only in-memory demo state; reloading reopens the demo. This is not an access-control mechanism. Replace the mock provider with application ports and authenticated adapters in a later phase; preserve server and RLS authorization gates from the architecture plan.

## Commands and verification

Run `npm run check` for lint, strict type checking and unit tests. Run `npx playwright install chromium`, then `npm run test:e2e` for desktop/mobile browser checks. The suite starts its own server on port 3100. If a dev server is already running, set `PLAYWRIGHT_BASE_URL=http://localhost:3000` to reuse it; use localhost because the existing development server showed a WebSocket handshake problem with the numerical loopback hostname. On Windows with restricted PowerShell script execution use `npm.cmd` / `npx.cmd`.

UI tests cover screen rendering/overflow, scan-to-save consistency, search/pagination/filtering, preview state recovery, manual lookup, simulated save failure, settings/user edits and demo login. Unit tests cover boundary IDs, immutable packet updates and consistent derived totals. These checks do not prove production security or camera compatibility.

Dependencies added for the interface: Radix UI and `cn` via the official shadcn CLI; `qrcode.react` for QR rendering. No production database operations or deployments occurred.

## Verified result

- Lint and strict type checking: passed without code warnings.
- Unit tests: 15 passed.
- Desktop/mobile UI tests: 16 passed on the production build, including the 360px screen check and complete scan-to-save workflow. The same suite also passed against the development server.
- Production build: passed. Dynamic packet and QR routes stream under a Suspense boundary, as required with Cache Components in the installed Next.js version.
- Screenshot review: dashboard on desktop/mobile, packet details and login reviewed for layout.
- Git whitespace check: passed; only local line-ending conversion notices.

Next steps remain production Auth/RLS, persistence, approved custody rules and real camera scanning; those are outside this mock interface milestone.
