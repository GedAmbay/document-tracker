begin;
create function private.create_invited_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare approved private.authorized_employees;
begin
  -- invited_at is set by GoTrue's admin invite API, never by public signup metadata.
  if new.invited_at is null then raise exception 'Only administrator invitations are permitted' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(71001);
  select * into approved from private.authorized_employees where email=lower(new.email) for update;
  if not found or approved.user_id is not null then raise exception 'Account is not authorized for this workspace' using errcode='42501'; end if;
  insert into public.profiles(id,slot,email,display_name,role) values(new.id,approved.slot,approved.email,approved.display_name,approved.role);
  update private.authorized_employees set user_id=new.id where slot=approved.slot;
  return new;
end; $$;
create trigger doctrack_invited_profile after insert on auth.users for each row execute function private.create_invited_profile();
create function private.protect_authorized_email() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if lower(new.email) is distinct from lower(old.email) then raise exception 'Email changes require an operator-reviewed roster migration' using errcode='42501'; end if;
  return new;
end; $$;
create trigger doctrack_authorized_email before update of email on auth.users for each row execute function private.protect_authorized_email();

create function public.set_profile_access(p_profile_id uuid,p_role text,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(71001);
  if not private.is_admin() then raise exception 'Administrator permission required' using errcode='42501'; end if;
  if p_role is null or p_role not in ('admin','staff') or p_active is null then raise exception 'Invalid access settings' using errcode='22023'; end if;
  if p_profile_id=auth.uid() then raise exception 'Cannot change your own administrator access' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=p_profile_id) then raise exception 'Profile not found' using errcode='22023'; end if;
  if not (p_role='admin' and p_active) and not exists(select 1 from public.profiles where active and role='admin' and id<>p_profile_id) then
    raise exception 'An active administrator must remain' using errcode='42501';
  end if;
  update public.profiles set role=p_role,active=p_active where id=p_profile_id;
  update private.authorized_employees set role=p_role where user_id=p_profile_id;
end; $$;
revoke all on function public.set_profile_access(uuid,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_profile_access(uuid,text,boolean) to authenticated;
revoke all on function private.create_invited_profile(),private.protect_authorized_email() from public,anon,authenticated,service_role;
commit;
