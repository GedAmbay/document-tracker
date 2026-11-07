# Phases and acceptance criteria
All phases after foundation are future work. Setup grants no production/deployment permission.

| Phase | Acceptance gate |
| --- | --- |
| 0 Foundation | Boundaries/schema/contracts documented; lockfile and scripts present; lint/types/unit checks pass; desktop/mobile smoke configured; record unavailable checks; no business workflows or production changes. |
| 1 Identity/database | Office confirms roster/roles/workflows; reviewed local migrations; invite-only Auth; seven-user provisioning; real RLS denies anonymous/unknown/inactive and self-promotion; no client secrets; recovery/MFA decisions recorded. |
| 2 Register/QR | Validated atomic registration; unique immutable UUID/QR; invalid/duplicate inputs rejected; authenticated resolver; edit/archive/reprint preserve original printed identifier. |
| 3 Custody/history | Approved receipt/transfer state machine; server actor/time; stale updates conflict; retries create no duplicate movement; failures roll back; history cannot be rewritten by ordinary users. |
| 4 Mobile pilot | Search/history at 360px, camera/manual entry, keyboard/touch checks; seven-user office scenarios pass; backup restored; retention/support agreed; production still requires approval. |
| 5 Integration | Ownership/auth agreed; versioned contracts/mappings; retries/deduplication/downtime tested; original UUIDs and QR remain valid; procurement can be disabled without breaking tracking. |

Resolve open phase requirements before implementation. Automated test success and office operational acceptance are distinct gates.
