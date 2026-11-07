begin;
-- One STABLE statement snapshot prevents a newly registered packet appearing
-- without its documents/state during concurrent employee activity.
create function public.read_tracking_workspace() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
  if not private.is_active_user() then raise exception 'Permission denied' using errcode='42501'; end if;
  -- Fail explicitly instead of silently truncating a timeline at the REST row limit.
  if (select count(*) from public.tracking_events)>50000 or (select count(*) from public.packet_documents)>50000 then
    raise exception 'Workspace requires paginated history queries' using errcode='54000';
  end if;
  return jsonb_build_object(
    'profiles',(select coalesce(jsonb_agg(to_jsonb(p) order by p.id),'[]'::jsonb) from public.profiles p),
    'destinations',(select coalesce(jsonb_agg(to_jsonb(d) order by d.id),'[]'::jsonb) from public.destinations d),
    'templates',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.action_templates t),
    'packets',(select coalesce(jsonb_agg(to_jsonb(p) order by p.id),'[]'::jsonb) from public.tracking_packets p),
    'documents',(select coalesce(jsonb_agg(to_jsonb(d) order by d.id),'[]'::jsonb) from public.packet_documents d),
    'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.packet_id,e.packet_version),'[]'::jsonb) from public.tracking_events e),
    'transfers',(select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) from public.tracking_transfers t),
    'states',(select coalesce(jsonb_agg(to_jsonb(s) order by s.packet_id),'[]'::jsonb) from public.tracking_current_state s),
    'externalLinks',(select coalesce(jsonb_agg(to_jsonb(l) order by l.id),'[]'::jsonb) from public.external_record_links l)
  );
end; $$;
revoke all on function public.read_tracking_workspace() from public,anon,authenticated,service_role;
grant execute on function public.read_tracking_workspace() to authenticated;
commit;
