# Requirements
## Scope
Track document identity, custody and movement independently of the unfinished procurement system. Seven invited BAC employees only. Implemented roles: staff and admin, with at least one admin among the seven. Confirm the roster and privileges before provisioning. No public signup or public lookup.

## Planned capabilities
- Register bounded metadata, assign permanent UUID and QR, print/reprint the same QR, search reference/title and resolve authenticated scans.
- View current custodian and chronological movement history. Record authenticated actor and server time on transfers.
- Provisional lifecycle: registered, in_custody, archived. Confirm receiver acceptance, rejection, cancellation and correction rules before implementation.
- Reject stale versions and duplicate submissions; show actionable errors without database internals.
- Mobile-first at 360px; labelled inputs, keyboard support, visible focus and 44px touch targets. Manual QR entry when camera fails.
- UTC storage; Asia/Manila display. Network required for mutations. Procurement downtime must not affect tracking.

## Exclusions
No procurement planning, tendering, evaluation, awards, suppliers, payments or procurement approvals. Attachments, notifications, offline writes, public scanning and multi-office tenancy are deferred.

## Security and operations
Invite-only Auth, active membership RLS, least privilege, immutable audit, no credentials/personal data in QR. Check server and database authorization on every operation. Before live use, office must approve retention, data sensitivity/residency, recovery, MFA expectations, lost-device response and backup ownership. Test backup restoration before pilot. This setup makes no legal compliance claim.

## Open decisions
Roster/admin, required metadata, numbering uniqueness, custody/receipt rules, correction/archive permissions, retention and pilot success measures require office confirmation.
