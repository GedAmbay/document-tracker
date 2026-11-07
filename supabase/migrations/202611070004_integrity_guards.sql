begin;
alter table public.tracking_events add constraint confirmed_location_required check (not custody_confirmed or confirmed_destination_id is not null);
create function private.validate_event_documents() returns trigger language plpgsql set search_path='' as $$
begin
  if (select count(distinct d.id) from public.packet_documents d where d.packet_id=new.packet_id and d.id=any(new.document_ids))<>cardinality(new.document_ids)
    or array_position(new.document_ids,null) is not null then raise exception 'Event documents must belong to the packet' using errcode='23514'; end if;
  if new.document_snapshot is distinct from private.document_snapshot(new.packet_id,new.document_ids) then raise exception 'Document snapshot does not match event documents' using errcode='23514'; end if;
  if not exists(select 1 from public.action_templates where id=new.action_template_id and kind=new.action_kind and label=new.action_label) then raise exception 'Invalid action snapshot' using errcode='23514'; end if;
  return new;
end; $$;
create trigger valid_event_documents before insert on public.tracking_events for each row execute function private.validate_event_documents();
create function private.protect_document_identity() returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.id,new.packet_id,new.title,new.page_count,new.created_at) is distinct from row(old.id,old.packet_id,old.title,old.page_count,old.created_at) then
    raise exception 'Document identities and registered metadata are permanent' using errcode='42501';
  end if;
  return new;
end; $$;
create trigger immutable_document_identity before update on public.packet_documents for each row execute function private.protect_document_identity();
create function private.protect_profile_identity() returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.id,new.slot,new.email,new.created_at) is distinct from row(old.id,old.slot,old.email,old.created_at) then raise exception 'Profile identity is permanent' using errcode='42501'; end if;
  return new;
end; $$;
create trigger immutable_profile_identity before update on public.profiles for each row execute function private.protect_profile_identity();
create function private.protect_template_semantics() returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.id,new.code,new.kind,new.created_at) is distinct from row(old.id,old.code,old.kind,old.created_at) then raise exception 'Action semantics are permanent' using errcode='42501'; end if;
  return new;
end; $$;
create trigger immutable_action_semantics before update on public.action_templates for each row execute function private.protect_template_semantics();
create function private.validate_transfer_confirmation() returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.id,new.packet_id,new.from_destination_id,new.to_destination_id,new.document_ids,new.forwarded_event_id,new.forwarded_at)
    is distinct from row(old.id,old.packet_id,old.from_destination_id,old.to_destination_id,old.document_ids,old.forwarded_event_id,old.forwarded_at)
    or old.status<>'pending' or new.status<>'confirmed' then raise exception 'Transfer history cannot be rewritten' using errcode='42501'; end if;
  if not exists(select 1 from public.tracking_events where id=new.receipt_event_id and packet_id=new.packet_id and action_kind='confirm_receipt'
      and reported_destination_id=new.to_destination_id and document_ids=new.document_ids) then raise exception 'Matching receipt event required' using errcode='23514'; end if;
  return new;
end; $$;
create trigger valid_transfer_confirmation before update on public.tracking_transfers for each row execute function private.validate_transfer_confirmation();
-- TRUNCATE does not fire DELETE triggers; protect the history from that path too.
do $$ declare t text; begin
  foreach t in array array['profiles','tracking_packets','packet_documents','tracking_events','tracking_transfers','destinations','action_templates','external_record_links'] loop
    execute format('create trigger no_truncate before truncate on public.%I for each statement execute function private.reject_history_change()',t);
  end loop;
end; $$;
revoke all on function private.validate_event_documents(),private.protect_document_identity(),private.protect_profile_identity(),private.protect_template_semantics(),private.validate_transfer_confirmation() from public,anon,authenticated,service_role;
commit;
