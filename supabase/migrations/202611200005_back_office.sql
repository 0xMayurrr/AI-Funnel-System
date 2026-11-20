create table public.platform_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
create policy platform_admin_self_read on public.platform_admins for select to authenticated using(profile_id=(select auth.uid()));

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.platform_admins where profile_id=(select auth.uid()))
$$;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.admin_create_workspace(workspace_name text,workspace_slug text)
returns public.workspaces language plpgsql security definer set search_path='' as $$
declare made public.workspaces%rowtype; actor uuid:=auth.uid();
begin
  if not public.is_platform_admin() then raise exception 'platform administrator required' using errcode='42501'; end if;
  if length(trim(workspace_name))<2 or length(workspace_name)>120 or workspace_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'invalid workspace details' using errcode='22023'; end if;
  insert into public.workspaces(name,slug) values(trim(workspace_name),workspace_slug) returning * into made;
  insert into public.workspace_modules(workspace_id,module_code,enabled) values(made.id,'ai_funnel',true);
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id) values(made.id,actor,'workspace.created_by_platform','workspace',made.id);
  return made;
end $$;
revoke all on function public.admin_create_workspace(text,text) from public;
grant execute on function public.admin_create_workspace(text,text) to authenticated;

create or replace function public.admin_list_workspaces()
returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_platform_admin() then raise exception 'platform administrator required' using errcode='42501'; end if;
  return query select jsonb_build_object(
    'id',w.id,'name',w.name,'slug',w.slug,'status',w.status,'created_at',w.created_at,
    'member_count',(select count(*) from public.workspace_memberships m where m.workspace_id=w.id and m.status='active'),
    'modules',coalesce((select jsonb_object_agg(wm.module_code,wm.enabled) from public.workspace_modules wm where wm.workspace_id=w.id),'{}'::jsonb)
  ) from public.workspaces w order by w.created_at desc;
end $$;
revoke all on function public.admin_list_workspaces() from public;
grant execute on function public.admin_list_workspaces() to authenticated;

create or replace function public.admin_set_workspace_module(selected_workspace uuid,module_name text,should_enable boolean)
returns public.workspace_modules language plpgsql security definer set search_path='' as $$
declare changed public.workspace_modules%rowtype; lifecycle text;
begin
  if not public.is_platform_admin() then raise exception 'platform administrator required' using errcode='42501'; end if;
  select mc.lifecycle into lifecycle from public.module_catalog mc where mc.code=module_name;
  if lifecycle is null then raise exception 'unknown module' using errcode='22023'; end if;
  if should_enable and lifecycle<>'available' then raise exception 'module is not available for assignment' using errcode='22023'; end if;
  insert into public.workspace_modules(workspace_id,module_code,enabled) values(selected_workspace,module_name,should_enable)
    on conflict(workspace_id,module_code) do update set enabled=excluded.enabled returning * into changed;
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id,metadata)
    values(selected_workspace,auth.uid(),'workspace.module_changed','workspace',selected_workspace,jsonb_build_object('module',module_name,'enabled',should_enable));
  return changed;
end $$;
revoke all on function public.admin_set_workspace_module(uuid,text,boolean) from public;
grant execute on function public.admin_set_workspace_module(uuid,text,boolean) to authenticated;

create or replace function public.admin_set_workspace_status(selected_workspace uuid,requested_status text)
returns public.workspaces language plpgsql security definer set search_path='' as $$
declare changed public.workspaces%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'platform administrator required' using errcode='42501'; end if;
  if requested_status not in ('active','suspended') then raise exception 'invalid workspace status' using errcode='22023'; end if;
  update public.workspaces set status=requested_status where id=selected_workspace returning * into changed;
  if changed.id is null then raise exception 'workspace not found' using errcode='P0002'; end if;
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id,metadata)
    values(selected_workspace,auth.uid(),'workspace.status_changed','workspace',selected_workspace,jsonb_build_object('status',requested_status));
  return changed;
end $$;
revoke all on function public.admin_set_workspace_status(uuid,text) from public;
grant execute on function public.admin_set_workspace_status(uuid,text) to authenticated;

create or replace function public.admin_add_workspace_member(selected_workspace uuid,target_profile uuid,target_role text default 'workspace_owner')
returns public.workspace_memberships language plpgsql security definer set search_path='' as $$
declare role_id uuid; added public.workspace_memberships%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'platform administrator required' using errcode='42501'; end if;
  select id into role_id from public.roles where code=target_role and not platform_role;
  if role_id is null then raise exception 'invalid workspace role' using errcode='22023'; end if;
  insert into public.profiles(id,display_name) select id,coalesce(raw_user_meta_data->>'name','') from auth.users where id=target_profile on conflict do nothing;
  if not exists(select 1 from public.profiles where id=target_profile) then raise exception 'user not found' using errcode='P0002'; end if;
  insert into public.workspace_memberships(workspace_id,profile_id,role_id,status) values(selected_workspace,target_profile,role_id,'active')
    on conflict(workspace_id,profile_id) do update set role_id=excluded.role_id,status='active' returning * into added;
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id,metadata)
    values(selected_workspace,auth.uid(),'workspace.member_added','membership',added.id,jsonb_build_object('profile_id',target_profile,'role',target_role));
  return added;
end $$;
revoke all on function public.admin_add_workspace_member(uuid,uuid,text) from public;
grant execute on function public.admin_add_workspace_member(uuid,uuid,text) to authenticated;

insert into public.permissions(code,description) values('platform.backoffice','Access Buildicy Back Office') on conflict do nothing;
