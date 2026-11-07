# Architecture
Keep the existing root app/ App Router; do not create a second src/app.

| Path | Responsibility |
| --- | --- |
| app/ | Routing, layouts, composition and thin transport adapters |
| components/ui/ | shadcn/ui owned component source, added when needed |
| modules/documents/domain/ | Pure identity and later lifecycle rules |
| modules/documents/application/ | Use cases and repository/transaction ports |
| modules/documents/infrastructure/ | Supabase repository adapters |
| modules/auth/ | Future membership/authorization module |
| modules/integration/ | Future integration orchestration |
| lib/supabase/ | Future separate request-scoped server/browser clients |
| contracts/ | Versioned Zod HTTP/event schemas |
| supabase/migrations/ | Reviewed SQL only; none applied |
| tests/ | Unit, component, database integration and E2E |

Dependencies: transport/UI -> application -> domain. Infrastructure implements application ports and is wired at server boundaries. ESLint restricts framework/database imports in domain/application. Domain rules must survive moving to the procurement repository unchanged.

Planned request: Zod validation -> verified Supabase identity -> active membership -> use case -> user-scoped database client under RLS -> minimal DTO. Transactions atomically update custody, movement, audit and outbox with optimistic concurrency. Client validation is supplementary.

When Auth is implemented use @supabase/ssr request-scoped cookie clients and the installed Next.js async request APIs. A future proxy may refresh sessions but is not the authorization boundary. No shared private-data caching or singleton user session. Server adapters use server-only. Public environment variables contain only Supabase URL/publishable key; privileged secrets stay server-side and are unnecessary now.

Procurement references are optional mappings. DocTrack owns tracking records; no procurement tables or login cookies are shared by assumption. Shared login later needs explicit issuer, audience and membership mapping. Versioned adapters and outbox delivery keep procurement downtime isolated.

## Implemented database/Auth milestone

The nine-table schema in database-design.md supersedes earlier table naming. Auth guards and server actions verify getUser and current active profiles; the proxy refreshes HttpOnly cookies. Tracking/domain contains Zod contracts, tracking/infrastructure contains user-scoped RPC adapters and queries, and atomic business invariants live in reviewed PostgreSQL functions. App pages remain thin and each protected page independently checks access; admin settings/user pages require admin. Privileged keys exist only in the standalone operator CLI. Normal mode fails closed; demo mode is development-only. See auth-setup.md and database-testing.md for verified scope and pending full-stack gates.
