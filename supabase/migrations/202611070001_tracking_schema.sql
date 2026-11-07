-- DocTrack: independent document tracking. No procurement-system tables.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
revoke create on schema public from public, anon, authenticated;

-- Operator-maintained allowlist, deliberately outside the exposed API schema.
-- Seven durable slots; deactivation does not release an employee's identity.
create table private.authorized_employees (
  slot smallint primary key check (slot between 1 and 7),
  email text not null unique check (email = lower(btrim(email)) and length(email) between 3 and 254),
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  role text not null check (role in ('admin','staff')),
  user_id uuid unique,
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  slot smallint not null unique references private.authorized_employees(slot) on delete restrict,
  email text not null unique check (email = lower(btrim(email))),
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  role text not null check (role in ('admin','staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table private.authorized_employees add constraint roster_user_fk foreign key (user_id) references public.profiles(id) on delete restrict;

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 3 and 120),
  details text not null default '' check (length(details) <= 500),
  is_bac boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index destinations_name_unique on public.destinations (lower(btrim(name)));
create unique index one_bac_destination on public.destinations (is_bac) where is_bac;
create table public.action_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,59}$'),
  label text not null check (length(btrim(label)) between 3 and 120),
  description text not null default '' check (length(description) <= 500),
  kind text not null check (kind in ('register','action','forward','confirm_receipt')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.tracking_packets (
  id uuid primary key default gen_random_uuid(),
  qr_token uuid not null unique default gen_random_uuid(),
  pr_number text not null check (length(btrim(pr_number)) between 1 and 80),
  description text not null check (length(btrim(description)) between 3 and 1000),
  originating_destination_id uuid not null references public.destinations(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check (id <> qr_token)
);
create unique index action_template_label_unique on public.action_templates(lower(btrim(label)));
create index packets_reference on public.tracking_packets (lower(pr_number));
create index packets_created_by on public.tracking_packets (created_by);
create index packets_origin on public.tracking_packets (originating_destination_id);
create index packets_created_at on public.tracking_packets (created_at desc);
-- PR display references intentionally are not permanent identities or assumed unique.
create table public.packet_documents (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.tracking_packets(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 240),
  page_count integer not null check (page_count between 1 and 10000),
  last_confirmed_destination_id uuid references public.destinations(id) on delete restrict,
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (packet_id,id),
  check ((last_confirmed_destination_id is null) = (last_confirmed_at is null))
);
create index documents_packet on public.packet_documents(packet_id);
create index documents_confirmed_destination on public.packet_documents(last_confirmed_destination_id);
create table public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.tracking_packets(id) on delete restrict,
  packet_version bigint not null check (packet_version > 0),
  action_template_id uuid not null references public.action_templates(id) on delete restrict,
  action_label text not null,
  action_kind text not null check (action_kind in ('register','action','forward','confirm_receipt')),
  processing_status text not null check (processing_status in ('registered','in_review','for_signature','in_transit','returned','completed')),
  reported_destination_id uuid not null references public.destinations(id) on delete restrict,
  custody_confirmed boolean not null default false,
  confirmed_destination_id uuid references public.destinations(id) on delete restrict,
  receipt_recipient text check (length(btrim(receipt_recipient)) between 1 and 120),
  receipt_reference text check (length(btrim(receipt_reference)) between 1 and 240),
  document_ids uuid[] not null check (cardinality(document_ids) between 1 and 100),
  document_snapshot jsonb not null check (jsonb_typeof(document_snapshot) = 'array'),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  remarks text check (length(remarks) <= 2000),
  submission_key uuid not null,
  request_payload jsonb not null,
  unique (recorded_by,submission_key),
  unique (packet_id,packet_version),
  unique (packet_id,id),
  check ((action_kind = 'confirm_receipt') = custody_confirmed),
  check ((custody_confirmed and confirmed_destination_id = reported_destination_id and receipt_recipient is not null and receipt_reference is not null)
    or (not custody_confirmed and confirmed_destination_id is null and receipt_recipient is null and receipt_reference is null))
);
create index events_packet_time on public.tracking_events(packet_id,recorded_at,id);
create index events_actor on public.tracking_events(recorded_by,recorded_at desc);
create index events_action on public.tracking_events(action_template_id);
create index events_reported_destination on public.tracking_events(reported_destination_id);
create index events_confirmed_destination on public.tracking_events(confirmed_destination_id);
create table public.tracking_transfers (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.tracking_packets(id) on delete restrict,
  from_destination_id uuid not null references public.destinations(id) on delete restrict,
  to_destination_id uuid not null references public.destinations(id) on delete restrict,
  document_ids uuid[] not null check (cardinality(document_ids) between 1 and 100),
  forwarded_event_id uuid not null unique,
  receipt_event_id uuid unique,
  status text not null default 'pending' check (status in ('pending','confirmed')),
  forwarded_at timestamptz not null default now(),
  confirmed_at timestamptz,
  foreign key (packet_id,forwarded_event_id) references public.tracking_events(packet_id,id) on delete restrict,
  foreign key (packet_id,receipt_event_id) references public.tracking_events(packet_id,id) on delete restrict,
  check ((status='pending' and receipt_event_id is null and confirmed_at is null) or (status='confirmed' and receipt_event_id is not null and confirmed_at is not null))
);
create index pending_transfers_packet on public.tracking_transfers(packet_id) where status='pending';
create index transfers_from on public.tracking_transfers(from_destination_id);
create index transfers_to on public.tracking_transfers(to_destination_id);
create table public.tracking_current_state (
  packet_id uuid primary key references public.tracking_packets(id) on delete restrict,
  version bigint not null check (version > 0),
  latest_event_id uuid not null unique,
  processing_status text not null check (processing_status in ('registered','in_review','for_signature','in_transit','returned','completed')),
  reported_destination_id uuid not null references public.destinations(id) on delete restrict,
  -- Null while documents are in transit or custody is split/unconfirmed.
  confirmed_custody_destination_id uuid references public.destinations(id) on delete restrict,
  receipt_state text not null check (receipt_state in ('unconfirmed','pending','partial','confirmed')),
  updated_at timestamptz not null default now(),
  foreign key (packet_id,latest_event_id) references public.tracking_events(packet_id,id) on delete restrict,
  check ((receipt_state='confirmed') = (confirmed_custody_destination_id is not null))
);
create index current_status on public.tracking_current_state(processing_status);
create index current_reported on public.tracking_current_state(reported_destination_id);
create index current_confirmed on public.tracking_current_state(confirmed_custody_destination_id);
create index current_receipt on public.tracking_current_state(receipt_state) where receipt_state <> 'confirmed';
create table public.external_record_links (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.tracking_packets(id) on delete restrict,
  source_system text not null check (length(btrim(source_system)) between 1 and 80),
  external_record_id text not null check (length(btrim(external_record_id)) between 1 and 240),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(source_system,external_record_id)
);
create index external_links_packet on public.external_record_links(packet_id);
create index external_links_actor on public.external_record_links(created_by);

create function private.is_active_user() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and active);
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and active and role='admin');
$$;
create function private.reject_history_change() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'History and permanent records cannot be deleted or rewritten' using errcode='42501'; end;
$$;
create trigger immutable_events before update or delete on public.tracking_events for each row execute function private.reject_history_change();
create function private.protect_packet_identity() returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.id,new.qr_token,new.created_by,new.created_at) is distinct from row(old.id,old.qr_token,old.created_by,old.created_at) then
    raise exception 'Permanent packet identity cannot change' using errcode='42501';
  end if;
  return new;
end; $$;
create trigger immutable_packet_identity before update on public.tracking_packets for each row execute function private.protect_packet_identity();
create trigger no_packet_delete before delete on public.tracking_packets for each row execute function private.reject_history_change();
create trigger no_document_delete before delete on public.packet_documents for each row execute function private.reject_history_change();
create trigger no_profile_delete before delete on public.profiles for each row execute function private.reject_history_change();
create trigger no_transfer_delete before delete on public.tracking_transfers for each row execute function private.reject_history_change();
create trigger no_destination_delete before delete on public.destinations for each row execute function private.reject_history_change();
create trigger no_template_delete before delete on public.action_templates for each row execute function private.reject_history_change();
create trigger no_external_link_delete before delete on public.external_record_links for each row execute function private.reject_history_change();

-- No direct client writes, including service-role REST clients. Mutations use RPCs below.
do $$ declare t text; begin
  foreach t in array array['profiles','tracking_packets','packet_documents','tracking_events','tracking_transfers','destinations','action_templates','tracking_current_state','external_record_links'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy active_employee_read on public.%I for select to authenticated using ((select private.is_active_user()))',t);
  end loop;
end; $$;
revoke all on all tables in schema private from public,anon,authenticated,service_role;
revoke all on all functions in schema private from public,anon,authenticated,service_role;
grant usage on schema private to authenticated;
grant execute on function private.is_active_user(),private.is_admin() to authenticated;
commit;
