begin;
insert into public.destinations(id,name,details,is_bac) values
 ('10000000-0000-4000-8000-000000000001','BAC Secretariat','Municipal Hall',true),
 ('10000000-0000-4000-8000-000000000002','Municipal Budget Office','Municipal Hall',false),
 ('10000000-0000-4000-8000-000000000003','Office of the Municipal Mayor','Municipal Hall',false),
 ('10000000-0000-4000-8000-000000000004','Municipal Accounting Office','Municipal Hall',false);
insert into public.action_templates(id,code,label,kind) values
 ('20000000-0000-4000-8000-000000000001','register','Packet registered','register'),
 ('20000000-0000-4000-8000-000000000002','forward','Forwarded to office','forward'),
 ('20000000-0000-4000-8000-000000000003','receive','Receipt confirmed','confirm_receipt'),
 ('20000000-0000-4000-8000-000000000004','review','Reviewed documents','action'),
 ('20000000-0000-4000-8000-000000000005','signature','Endorsed for signature','action'),
 ('20000000-0000-4000-8000-000000000006','followup','Follow-up recorded','action'),
 ('20000000-0000-4000-8000-000000000007','returned','Returned for correction','action'),
 ('20000000-0000-4000-8000-000000000008','completed','Filed and completed','action');

create function private.require_employee(p_admin boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare member public.profiles;
begin
  select * into member from public.profiles where id=auth.uid() for share;
  if not found or not member.active or (p_admin and member.role<>'admin') then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  return member.id;
end; $$;
create function private.document_snapshot(p_packet uuid,p_documents uuid[]) returns jsonb language sql stable set search_path='' as $$
  select jsonb_agg(jsonb_build_object('id',id,'title',title,'page_count',page_count) order by id)
  from public.packet_documents where packet_id=p_packet and id=any(p_documents);
$$;

create function public.create_tracking_packet(p_submission_key uuid,p_pr_number text,p_description text,p_origin_destination_id uuid,p_documents jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; request jsonb; prior public.tracking_events; packet uuid; event uuid; docs uuid[]; template public.action_templates; item jsonb;
begin
  actor:=private.require_employee();
  if p_submission_key is null then raise exception 'Submission key required' using errcode='22023'; end if;
  request:=jsonb_build_object('operation','register','pr_number',btrim(p_pr_number),'description',btrim(p_description),'origin',p_origin_destination_id,'documents',p_documents);
  perform pg_advisory_xact_lock(hashtextextended(actor::text||p_submission_key::text,0));
  select * into prior from public.tracking_events where recorded_by=actor and submission_key=p_submission_key;
  if found then
    if prior.request_payload<>request then raise exception 'Submission key reused with different input' using errcode='23505'; end if;
    return jsonb_build_object('packet_id',prior.packet_id,'event_id',prior.id,'version',prior.packet_version,'duplicate',true);
  end if;
  if p_pr_number is null or length(btrim(p_pr_number)) not between 1 and 80 or p_description is null or length(btrim(p_description)) not between 3 and 1000 then
    raise exception 'Invalid packet metadata' using errcode='22023';
  end if;
  if not exists(select 1 from public.destinations where id=p_origin_destination_id and active) then raise exception 'Invalid origin' using errcode='22023'; end if;
  if p_documents is null or jsonb_typeof(p_documents)<>'array' then raise exception 'Documents must be an array' using errcode='22023'; end if;
  if jsonb_array_length(p_documents) not between 1 and 100 then raise exception 'Include 1 to 100 documents' using errcode='22023'; end if;
  select * into strict template from public.action_templates where code='register' and active;
  insert into public.tracking_packets(pr_number,description,originating_destination_id,created_by)
    values(btrim(p_pr_number),btrim(p_description),p_origin_destination_id,actor) returning id into packet;
  for item in select value from jsonb_array_elements(p_documents) loop
    if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'title') is distinct from 'string' or jsonb_typeof(item->'page_count') is distinct from 'number'
      or (item->>'page_count') !~ '^[0-9]{1,5}$' then raise exception 'Invalid document' using errcode='22023'; end if;
    insert into public.packet_documents(packet_id,title,page_count) values(packet,btrim(item->>'title'),(item->>'page_count')::integer);
  end loop;
  select array_agg(id order by id) into docs from public.packet_documents where packet_id=packet;
  insert into public.tracking_events(packet_id,packet_version,action_template_id,action_label,action_kind,processing_status,reported_destination_id,document_ids,document_snapshot,recorded_by,submission_key,request_payload)
    values(packet,1,template.id,template.label,'register','registered',p_origin_destination_id,docs,private.document_snapshot(packet,docs),actor,p_submission_key,request) returning id into event;
  insert into public.tracking_current_state(packet_id,version,latest_event_id,processing_status,reported_destination_id,receipt_state)
    values(packet,1,event,'registered',p_origin_destination_id,'unconfirmed');
  return jsonb_build_object('packet_id',packet,'event_id',event,'version',1,'duplicate',false);
end; $$;

create function public.record_tracking_event(
 p_packet_id uuid,p_submission_key uuid,p_expected_version bigint,p_action_template_id uuid,
 p_processing_status text,p_reported_destination_id uuid,p_document_ids uuid[],p_remarks text default null,
 p_transfer_id uuid default null,p_receipt_recipient text default null,p_receipt_reference text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; request jsonb; prior public.tracking_events; current_state public.tracking_current_state;
 template public.action_templates; transfer public.tracking_transfers; docs uuid[]; event uuid; transfer_id uuid;
 stamp timestamptz:=clock_timestamp(); confirmed_destination uuid; receipt text; all_docs integer; confirmed_docs integer; pending boolean;
begin
  actor:=private.require_employee();
  if p_submission_key is null or p_packet_id is null or p_expected_version is null or p_expected_version<1 then raise exception 'Invalid event identity or version' using errcode='22023'; end if;
  if p_document_ids is null or cardinality(p_document_ids) not between 1 and 100 or array_position(p_document_ids,null) is not null then raise exception 'Documents required' using errcode='22023'; end if;
  select array_agg(distinct d order by d) into docs from unnest(p_document_ids) d;
  if cardinality(docs)<>cardinality(p_document_ids) then raise exception 'Duplicate document selection' using errcode='22023'; end if;
  request:=jsonb_build_object('operation','event','packet',p_packet_id,'version',p_expected_version,'action',p_action_template_id,'status',p_processing_status,
    'reported',p_reported_destination_id,'documents',to_jsonb(docs),'remarks',nullif(btrim(p_remarks),''),'transfer',p_transfer_id,'recipient',nullif(btrim(p_receipt_recipient),''),'reference',nullif(btrim(p_receipt_reference),''));
  perform pg_advisory_xact_lock(hashtextextended(actor::text||p_submission_key::text,0));
  select * into prior from public.tracking_events where recorded_by=actor and submission_key=p_submission_key;
  if found then
    if prior.request_payload<>request then raise exception 'Submission key reused with different input' using errcode='23505'; end if;
    select id into transfer_id from public.tracking_transfers where forwarded_event_id=prior.id or receipt_event_id=prior.id;
    return jsonb_build_object('packet_id',prior.packet_id,'event_id',prior.id,'version',prior.packet_version,'transfer_id',transfer_id,'duplicate',true);
  end if;
  -- Packet row lock serializes all events and overlapping document transfers.
  perform 1 from public.tracking_packets where id=p_packet_id and archived_at is null for update;
  if not found then raise exception 'Packet is unavailable' using errcode='22023'; end if;
  select * into strict current_state from public.tracking_current_state where packet_id=p_packet_id;
  if current_state.version<>p_expected_version then raise exception 'Tracking changed; reload before saving' using errcode='40001'; end if;
  select * into template from public.action_templates where id=p_action_template_id and active and kind<>'register';
  if not found then raise exception 'Invalid action' using errcode='22023'; end if;
  if p_processing_status is null or p_processing_status not in ('registered','in_review','for_signature','in_transit','returned','completed') then raise exception 'Invalid processing status' using errcode='22023'; end if;
  if not exists(select 1 from public.destinations where id=p_reported_destination_id and active) then raise exception 'Invalid reported location' using errcode='22023'; end if;
  if length(p_remarks)>2000 or (select count(*) from public.packet_documents where packet_id=p_packet_id and id=any(docs))<>cardinality(docs) then raise exception 'Invalid documents or remarks' using errcode='22023'; end if;
  if template.kind<>'confirm_receipt' and (p_transfer_id is not null or nullif(btrim(p_receipt_recipient),'') is not null or nullif(btrim(p_receipt_reference),'') is not null) then
    raise exception 'Only a receipt event can confirm custody' using errcode='22023';
  end if;
  if template.kind='forward' and exists(select 1 from public.tracking_transfers where packet_id=p_packet_id and status='pending' and document_ids && docs) then
    raise exception 'Selected documents already have a pending transfer' using errcode='40001';
  end if;
  if template.kind='confirm_receipt' then
    select * into transfer from public.tracking_transfers where id=p_transfer_id and packet_id=p_packet_id and status='pending' for update;
    if not found or transfer.to_destination_id<>p_reported_destination_id or transfer.document_ids<>docs then raise exception 'Receipt must match the pending transfer and all of its documents' using errcode='22023'; end if;
    if length(btrim(coalesce(p_receipt_recipient,''))) not between 1 and 120 or length(btrim(coalesce(p_receipt_reference,''))) not between 1 and 240 then
      raise exception 'Receipt recipient and acknowledgment reference required' using errcode='22023';
    end if;
    transfer_id:=transfer.id;
  end if;
  if p_processing_status='completed' and (template.kind='forward' or exists(select 1 from public.tracking_transfers where packet_id=p_packet_id and status='pending' and id is distinct from p_transfer_id)) then
    raise exception 'Resolve pending transfers before completing tracking' using errcode='22023';
  end if;
  insert into public.tracking_events(packet_id,packet_version,action_template_id,action_label,action_kind,processing_status,reported_destination_id,
    custody_confirmed,confirmed_destination_id,receipt_recipient,receipt_reference,document_ids,document_snapshot,recorded_by,recorded_at,remarks,submission_key,request_payload)
  values(p_packet_id,current_state.version+1,template.id,template.label,template.kind,p_processing_status,p_reported_destination_id,
    template.kind='confirm_receipt',case when template.kind='confirm_receipt' then p_reported_destination_id end,
    case when template.kind='confirm_receipt' then btrim(p_receipt_recipient) end,case when template.kind='confirm_receipt' then btrim(p_receipt_reference) end,
    docs,private.document_snapshot(p_packet_id,docs),actor,stamp,nullif(btrim(p_remarks),''),p_submission_key,request) returning id into event;
  if template.kind='forward' then
    insert into public.tracking_transfers(packet_id,from_destination_id,to_destination_id,document_ids,forwarded_event_id,forwarded_at)
      values(p_packet_id,current_state.reported_destination_id,p_reported_destination_id,docs,event,stamp) returning id into transfer_id;
  elsif template.kind='confirm_receipt' then
    update public.tracking_transfers set status='confirmed',receipt_event_id=event,confirmed_at=stamp where id=transfer_id;
    update public.packet_documents set last_confirmed_destination_id=p_reported_destination_id,last_confirmed_at=stamp where packet_id=p_packet_id and id=any(docs);
  end if;
  select count(*),count(*) filter(where d.last_confirmed_destination_id is not null and not exists(
    select 1 from public.tracking_transfers t where t.packet_id=p_packet_id and t.status='pending' and d.id=any(t.document_ids)
  )) into all_docs,confirmed_docs from public.packet_documents d where d.packet_id=p_packet_id;
  select exists(select 1 from public.tracking_transfers where packet_id=p_packet_id and status='pending') into pending;
  if not pending and confirmed_docs=all_docs and (select count(distinct last_confirmed_destination_id) from public.packet_documents where packet_id=p_packet_id)=1 then
    select last_confirmed_destination_id into confirmed_destination from public.packet_documents where packet_id=p_packet_id limit 1;
    receipt:='confirmed';
  else
    confirmed_destination:=null;
    receipt:=case when confirmed_docs>0 then 'partial' when pending then 'pending' else 'unconfirmed' end;
  end if;
  update public.tracking_current_state set version=current_state.version+1,latest_event_id=event,processing_status=p_processing_status,
    reported_destination_id=p_reported_destination_id,confirmed_custody_destination_id=confirmed_destination,receipt_state=receipt,updated_at=stamp where packet_id=p_packet_id;
  return jsonb_build_object('packet_id',p_packet_id,'event_id',event,'version',current_state.version+1,'transfer_id',transfer_id,'duplicate',false);
end; $$;

-- Admin-only configuration. Changing a label never rewrites event snapshots.
create function public.save_destination(p_id uuid,p_name text,p_details text,p_active boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  perform private.require_employee(true);
  if p_active is null then raise exception 'Active state required' using errcode='22023'; end if;
  insert into public.destinations(id,name,details,active) values(coalesce(p_id,gen_random_uuid()),btrim(p_name),coalesce(p_details,''),p_active)
    on conflict(id) do update set name=excluded.name,details=excluded.details,active=excluded.active returning id into result;
  return result;
end; $$;
create function public.save_action_template(p_id uuid,p_label text,p_description text,p_active boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  perform private.require_employee(true);
  if p_active is null then raise exception 'Active state required' using errcode='22023'; end if;
  if p_id is null then
    insert into public.action_templates(code,label,description,kind,active) values('custom_'||replace(gen_random_uuid()::text,'-',''),btrim(p_label),coalesce(p_description,''),'action',p_active) returning id into result;
  else
    update public.action_templates set label=btrim(p_label),description=coalesce(p_description,''),active=p_active where id=p_id and kind<>'register' returning id into result;
    if result is null then raise exception 'Template unavailable' using errcode='22023'; end if;
  end if;
  return result;
end; $$;
create function public.link_external_record(p_packet_id uuid,p_source_system text,p_external_record_id text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid; result uuid; existing public.external_record_links;
begin
  actor:=private.require_employee(true);
  select * into existing from public.external_record_links where source_system=btrim(p_source_system) and external_record_id=btrim(p_external_record_id);
  if found then
    if existing.packet_id<>p_packet_id then raise exception 'External record already linked to another packet' using errcode='23505'; end if;
    return existing.id;
  end if;
  insert into public.external_record_links(packet_id,source_system,external_record_id,created_by) values(p_packet_id,btrim(p_source_system),btrim(p_external_record_id),actor) returning id into result;
  return result;
end; $$;
revoke all on function private.require_employee(boolean),private.document_snapshot(uuid,uuid[]) from public,anon,authenticated,service_role;
revoke all on function public.create_tracking_packet(uuid,text,text,uuid,jsonb),
 public.record_tracking_event(uuid,uuid,bigint,uuid,text,uuid,uuid[],text,uuid,text,text),
 public.save_destination(uuid,text,text,boolean),public.save_action_template(uuid,text,text,boolean),public.link_external_record(uuid,text,text)
 from public,anon,authenticated,service_role;
grant execute on function public.create_tracking_packet(uuid,text,text,uuid,jsonb),
 public.record_tracking_event(uuid,uuid,bigint,uuid,text,uuid,uuid[],text,uuid,text,text),
 public.save_destination(uuid,text,text,boolean),public.save_action_template(uuid,text,text,boolean),public.link_external_record(uuid,text,text)
 to authenticated;
commit;
