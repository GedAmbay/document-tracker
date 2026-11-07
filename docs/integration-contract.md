# Integration contract v1: proposed, not implemented
DocTrack owns UUIDs, QR identity, custody and movement history. Procurement owns its records and approvals. Integration must not duplicate procurement logic.

## Proposed interfaces
- GET /api/v1/documents/{uuid}: authorized minimal tracking DTO.
- POST /api/v1/document-links: {documentId, sourceSystem, externalId}; conflicting mappings return 409.
- GET /q/{qrId}: stable authenticated resolver, returns to the exact QR after login. No public metadata.

Print a controlled stable HTTPS origin plus /q/{qrId}. Preserve the origin or permanent redirects during hosting changes. QR IDs are separate immutable UUIDs, never regenerated on reprint/migration. No names, titles, mutable references, login tokens or procurement URLs in payloads.

## Contract rules
Future Zod schemas live in contracts/v1. Validate UUIDs, bounded strings and UTC ISO timestamps. Event envelope: schemaVersion (1), eventId (UUID), type (document.custody_changed), occurredAt (UTC), documentId (UUID), aggregateVersion (integer), data (minimal custodian UUID). Add optional fields compatibly; breaking changes require v2.

Errors: {error:{code,message,correlationId}}; use 400 invalid input, 401 invalid identity, 403 forbidden/inactive, 404 missing authorized record, 409 version/idempotency conflict, 429 rate limit. Never expose SQL internals.

## Trust and delivery
Use TLS, scoped rotating service credentials, verified issuer/audience/expiry, rate limits and audit. Credential mechanism is a phase-5 decision; no integration endpoint exists yet. Do not assume user tokens and integration identities are interchangeable.

Require Idempotency-Key on writes, scoped to client. Atomically store request hash/result; replay matching requests, reject different payload with 409. Transactional outbox provides at-least-once delivery, bounded exponential retries and dead-letter review. Consumers deduplicate eventId and order by aggregateVersion with gap reconciliation. Sign webhook body/timestamp; reject expired/replayed deliveries. Test duplicates, out-of-order events, rotation and procurement downtime. DocTrack remains independently usable.

## Database implementation alignment

DocTrack now stores external_record_links with unique source_system/external_record_id pairs referencing permanent tracking_packets UUIDs. Only an active admin can call link_external_record; existing mappings cannot silently move to another packet. These database RPCs are internal application interfaces, not a published procurement integration API. The versioned HTTP/event delivery contract and outbox remain future work.
