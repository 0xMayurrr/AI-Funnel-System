-- Funnel page views tracking, delete policies for knowledge & conversations, and admin package visibility.

create table if not exists public.funnel_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  fingerprint text,
  created_at timestamptz not null default now()
);

create index if not exists funnel_views_lookup on public.funnel_views(workspace_id, funnel_id, created_at desc);

alter table public.funnel_views enable row level security;
create policy tenant_select on public.funnel_views for select to authenticated using (public.is_workspace_member(workspace_id));

-- Function to record a public funnel page view safely
create or replace function public.record_funnel_view(requested_slug text, request_fingerprint text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  target_funnel record;
begin
  select f.id, f.workspace_id, f.status into target_funnel
  from public.funnels f
  where f.slug = requested_slug and f.status = 'published';

  if target_funnel.id is null then
    return jsonb_build_object('recorded', false, 'reason', 'funnel_not_found');
  end if;

  insert into public.funnel_views (workspace_id, funnel_id, fingerprint)
  values (target_funnel.workspace_id, target_funnel.id, request_fingerprint);

  return jsonb_build_object('recorded', true, 'funnel_id', target_funnel.id);
end $$;

grant execute on function public.record_funnel_view(text, text) to anon, authenticated;

-- Enable deletion policies for knowledge tables
create policy tenant_delete on public.knowledge_documents for delete to authenticated
  using (public.has_workspace_permission(workspace_id, 'workspace.manage'));

create policy tenant_delete on public.knowledge_sources for delete to authenticated
  using (public.has_workspace_permission(workspace_id, 'workspace.manage'));

-- Enable deletion policies for conversations
create policy tenant_delete on public.conversations for delete to authenticated
  using (public.has_workspace_permission(workspace_id, 'leads.manage'));

create policy tenant_delete on public.conversation_messages for delete to authenticated
  using (public.has_workspace_permission(workspace_id, 'leads.manage'));

-- Update admin_list_workspaces to return assigned service package code and limits
create or replace function public.admin_list_workspaces()
returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_platform_admin() then raise exception 'platform administrator required' using errcode='42501'; end if;
  return query select jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'slug', w.slug,
    'status', w.status,
    'created_at', w.created_at,
    'package_code', sp.code,
    'package_name', sp.name,
    'member_count', (select count(*) from public.workspace_memberships m where m.workspace_id = w.id and m.status = 'active'),
    'modules', coalesce((select jsonb_object_agg(wm.module_code, wm.enabled) from public.workspace_modules wm where wm.workspace_id = w.id), '{}'::jsonb)
  ) from public.workspaces w
  left join public.service_packages sp on w.service_package_id = sp.id
  order by w.created_at desc;
end $$;

revoke all on function public.admin_list_workspaces() from public;
grant execute on function public.admin_list_workspaces() to authenticated;
