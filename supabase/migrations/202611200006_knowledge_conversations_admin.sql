-- Extensible knowledge and conversation primitives for AI qualification and future Concierge.
create table public.knowledge_sources(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null,source_type text not null check(source_type in ('text','url','file')),status text not null default 'active' check(status in ('active','inactive','processing','failed')),
 created_at timestamptz not null default now(),unique(workspace_id,id)
);
create table public.knowledge_documents(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,source_id uuid not null,title text not null,content text not null,
 approved boolean not null default false,created_at timestamptz not null default now(),
 foreign key(workspace_id,source_id) references public.knowledge_sources(workspace_id,id) on delete cascade,unique(workspace_id,id)
);
create index knowledge_documents_lookup on public.knowledge_documents(workspace_id,approved,created_at desc);
create table public.conversations(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,lead_id uuid not null,channel text not null default 'web',status text not null default 'open' check(status in ('open','waiting_human','closed')),
 handoff_reason text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade,unique(workspace_id,id)
);
create table public.conversation_messages(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,conversation_id uuid not null,sender_type text not null check(sender_type in ('lead','assistant','human','system')),
 content text not null,review_state text not null default 'approved' check(review_state in ('draft','approved','sent','rejected')),
 created_at timestamptz not null default now(),foreign key(workspace_id,conversation_id) references public.conversations(workspace_id,id) on delete cascade
);
do $$ declare t text; begin
 foreach t in array array['knowledge_sources','knowledge_documents','conversations','conversation_messages'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy tenant_select on public.%I for select to authenticated using(public.is_workspace_member(workspace_id))',t);
  execute format('create policy tenant_insert on public.%I for insert to authenticated with check(public.has_workspace_permission(workspace_id,%L))',t,case when t like 'knowledge_%' then 'workspace.manage' else 'leads.manage' end);
  execute format('create policy tenant_update on public.%I for update to authenticated using(public.has_workspace_permission(workspace_id,%L)) with check(public.has_workspace_permission(workspace_id,%L))',t,case when t like 'knowledge_%' then 'workspace.manage' else 'leads.manage' end,case when t like 'knowledge_%' then 'workspace.manage' else 'leads.manage' end);
 end loop;
end $$;

create or replace function public.admin_set_workspace_package(selected_workspace uuid,package_code text)
returns public.workspaces language plpgsql security definer set search_path='' as $$
declare changed public.workspaces%rowtype; selected_package uuid;
begin
 if not public.is_platform_admin() then raise exception 'platform administrator required' using errcode='42501'; end if;
 select id into selected_package from public.service_packages where code=package_code;
 if selected_package is null then raise exception 'service package not found' using errcode='P0002'; end if;
 update public.workspaces set service_package_id=selected_package where id=selected_workspace returning * into changed;
 if changed.id is null then raise exception 'workspace not found' using errcode='P0002'; end if;
 insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id,metadata)
 values(selected_workspace,auth.uid(),'workspace.package_changed','workspace',selected_workspace,jsonb_build_object('package_code',package_code));
 return changed;
end $$;
revoke all on function public.admin_set_workspace_package(uuid,text) from public;
grant execute on function public.admin_set_workspace_package(uuid,text) to authenticated;

create or replace function public.admin_operational_overview()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_platform_admin() then raise exception 'platform administrator required' using errcode='42501'; end if;
 return jsonb_build_object(
  'workspaces',(select count(*) from public.workspaces),
  'active_workspaces',(select count(*) from public.workspaces where status='active'),
  'leads',(select count(*) from public.leads),
  'pending_actions',(select count(*) from public.scheduled_actions where state in ('pending','retry')),
  'failed_actions',(select count(*) from public.scheduled_actions where state='failed'),
  'ai_calls_24h',(select count(*) from public.ai_usage_records where created_at>=now()-interval '24 hours'),
  'recent_errors',(select coalesce(jsonb_agg(jsonb_build_object('workspace_id',workspace_id,'event_type',event_type,'metadata',metadata,'created_at',created_at) order by created_at desc),'[]'::jsonb) from public.activity_logs where event_type like '%failed%' and created_at>=now()-interval '7 days' limit 20)
 );
end $$;
revoke all on function public.admin_operational_overview() from public;
grant execute on function public.admin_operational_overview() to authenticated;

insert into public.service_packages(code,name,limits_config) values
 ('starter','Starter','{"monthly_lead_limit":500}'::jsonb),
 ('growth','Growth','{"monthly_lead_limit":5000}'::jsonb),
 ('custom','Custom','{}'::jsonb)
on conflict(code) do nothing;
