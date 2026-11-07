# DocTrack database design

This replaces the earlier proposal. The nine public tables and event distinctions follow the latest implementation request. No separate approved column-level document was found; reconcile these explicit choices with any such document before applying to a hosted environment. No procurement-management workflows are implemented.

## Migrations

| File | Responsibility |
| --- | --- |
| 202611070001_tracking_schema.sql | Nine tables, private seven-slot roster, constraints/indexes, RLS and read grants |
| 202611070002_invite_only_profiles.sql | Invite-only enrollment, protected email identity and admin access RPC |
| 202611070003_atomic_tracking.sql | Lookup defaults and atomic registration/event/admin RPCs |
| 202611070004_integrity_guards.sql | Document ownership checks, immutable history/identities, transfer validation, truncate protection |
| 202611070005_consistent_workspace_reads.sql | One RLS-scoped stable snapshot for coherent packet/state/history reads |

Every migration is transactional. They have been applied only to disposable embedded PostgreSQL tests, not a Supabase project or production database.

## Public schema

| Table | Main fields and constraints |
| --- | --- |
| profiles | Auth UUID PK/FK, unique durable slot 1-7, normalized unique email, display_name, role admin/staff, active, created_at |
| tracking_packets | UUID PK, distinct immutable unique UUID qr_token, pr_number, description, originating_destination_id, created_by, created_at, archived_at |
| packet_documents | UUID PK, packet_id, title, page_count, last_confirmed_destination_id/at; registered identities/metadata immutable |
| tracking_events | UUID PK, packet_id/version, action_template_id and action label/kind snapshot, processing_status, reported_destination_id, custody_confirmed, confirmed_destination_id, receipt_recipient/reference, document_ids and metadata snapshot, recorded_by/at, optional remarks, submission_key/request_payload |
| tracking_transfers | UUID PK, packet_id, from/to destinations, document_ids, forwarded_event_id, receipt_event_id, pending/confirmed status and timestamps |
| destinations | UUID PK, case-insensitive unique name, details, active, is_bac; at most one BAC destination |
| action_templates | UUID PK, immutable code/kind, label, description, active; kind register/action/forward/confirm_receipt |
| tracking_current_state | packet_id PK, version, latest_event_id, processing_status, reported_destination_id, nullable confirmed_custody_destination_id, receipt_state, updated_at |
| external_record_links | UUID PK, packet_id, source_system/external_record_id UNIQUE, created_by/at |

private.authorized_employees is an operator-only allowlist with seven permanent slots and approved email/name/role plus eventual Auth UUID. It is not exposed through the API. Assigned slots/emails are not recycled. No real roster is committed.

Permanent identities use UUIDs. Foreign keys restrict deletion, including Auth user deletion. PR numbers are display references, not identities, and are not assumed unique; retries are deduplicated by submission UUID. External identifiers are opaque strings and never replace local UUIDs. Source-system/external-ID uniqueness is case-sensitive.

## Separate event facts

Action, processing status, reported location and custody confirmation are independent. Processing values are registered, in_review, for_signature, in_transit, returned and completed; these are tracking states, not procurement approvals.

- Registration creates the initial reported location and documents without asserting receipt.
- Forwarding creates a pending transfer for the selected documents. It never confirms custody.
- Receipt confirmation must match a pending transfer, its exact documents and destination, and include receiving person's name plus acknowledgment reference. The BAC recorder attests to that evidence; external receiving offices do not need accounts.
- Ordinary actions cannot supply receipt/transfer fields. A processing status such as for_signature never substitutes for receipt evidence.
- Documents in a pending transfer cannot be forwarded again. An approved append-only cancellation/correction workflow is a separate decision; existing history is never silently changed.
- Partial receipt updates only the selected documents. Full-packet custody is populated only when every document has confirmed custody at the same destination and no transfer is pending. Otherwise it remains null, with receipt_state unconfirmed/pending/partial.
- Reported location may differ from historical confirmed custody. Actor and timestamps come from auth.uid() and the PostgreSQL server, never client input.

Document arrays are checked against their packet by both RPC and trigger. Snapshots preserve the documents and action label used at the time. Event updates, deletion and TRUNCATE are rejected. Database owners who disable protections remain trusted operators, not application identities.

## Atomicity and retries

create_tracking_packet atomically writes packet, documents, initial event and state. record_tracking_event locks the packet, checks expected_version, then writes event, transfer/document custody and current state in one transaction. Any failure rolls back all changes.

(recorded_by, submission_key) is globally unique across registration/events. An advisory transaction lock serializes a repeated employee/key. Identical retries return the original identities/version, even after the version advanced; changed input with the same key raises 23505. A different stale update raises 40001. Document selections are sorted and duplicates rejected. Real independent-session race testing remains a local Supabase pilot gate.

## Permissions and indexes

RLS is enabled on every public table. Active members may read data. Anonymous users cannot read tables or call tracking RPCs. Unknown/inactive authenticated users see no data and cannot mutate. Staff may register/record tracking; only admins manage roles, destinations, templates and external links.

Direct INSERT/UPDATE/DELETE/TRUNCATE privileges are revoked from anon, authenticated and service_role clients. Narrow SECURITY DEFINER RPCs use empty search_path, qualified objects and current database membership, never editable Auth metadata. A shared profile lock prevents deactivation racing an authorized write. Read helpers avoid recursive profiles policies. Admin role changes serialize, protect the acting admin and retain an active administrator.

Indexes cover references, packet chronology/actor/origin, document ownership/custody, event packet chronology/version/actor/action/location, pending transfers, current status/reported/custody/receipt, and external mappings. Unique constraints protect all identities, keys, versions and mapping pairs.

Use auth-setup.md and database-testing.md. lib/supabase/database.types.ts mirrors these migrations; compare Supabase-generated local types after changes while preserving the exported row aliases. Add migrations rather than editing applied versions. Hosted schema changes, real invitations and deployments require explicit approval.

The live workspace reads through read_tracking_workspace, an RLS-enforced SECURITY INVOKER function with a single stable PostgreSQL snapshot. This prevents cross-query inconsistencies while employees register/update concurrently. It raises an explicit error beyond 50,000 events/documents rather than silently truncating a history; dedicated paginated history queries are required before that scale.
