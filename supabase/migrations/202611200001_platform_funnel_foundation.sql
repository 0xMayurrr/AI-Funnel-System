-- Initial tenant-safe platform and funnel schema. All tenant rows carry workspace_id.
create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default '', created_at timestamptz not null default now());
create table public.service_packages (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, limits_config jsonb not null default '{}'::jsonb);
create table public.workspaces (id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, service_package_id uuid references public.service_packages(id), status text not null default 'active' check(status in ('active','suspended','deleting')), created_at timestamptz not null default now());
create table public.roles (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, platform_role boolean not null default false);
create table public.permissions (code text primary key, description text not null);
create table public.role_permissions (role_id uuid references public.roles(id) on delete cascade, permission_code text references public.permissions(code) on delete cascade, primary key(role_id,permission_code));
insert into public.roles(code,name,platform_role) values
 ('platform_admin','Buildicy administrator',true),('workspace_owner','Workspace owner',false),
 ('workspace_admin','Workspace administrator',false),('workspace_operator','Workspace operator',false),
 ('workspace_analyst','Read-only analyst',false);
insert into public.permissions(code,description) values
 ('workspace.read','Read workspace details'),('workspace.manage','Manage workspace settings'),
 ('funnels.read','View funnels'),('funnels.manage','Create and edit funnels'),('leads.read','View leads'),
 ('leads.manage','Manage lead status and details'),('integrations.manage','Manage integrations'),
 ('workflows.read','View workflow executions'),('workflows.manage','Manage follow-up workflows'),
 ('modules.manage','Configure enabled modules'),('members.manage','Manage workspace memberships'),
 ('platform.workspaces.manage','Manage client workspaces'),('platform.audit.read','View platform audit events');
insert into public.role_permissions(role_id,permission_code)
 select r.id,p.code from public.roles r cross join public.permissions p
 where (r.code='platform_admin')
    or (r.code='workspace_owner')
    or (r.code='workspace_admin' and p.code not in ('platform.workspaces.manage','platform.audit.read','modules.manage'))
    or (r.code='workspace_operator' and p.code in ('workspace.read','funnels.read','funnels.manage','leads.read','leads.manage','workflows.read'))
    or (r.code='workspace_analyst' and p.code in ('workspace.read','funnels.read','leads.read','workflows.read'));
create table public.workspace_memberships (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, profile_id uuid not null references public.profiles(id) on delete cascade, role_id uuid not null references public.roles(id), status text not null default 'active' check(status in ('invited','active','suspended')), created_at timestamptz not null default now(), unique(workspace_id,profile_id), unique(workspace_id,id));
create index memberships_profile_active on public.workspace_memberships(profile_id,workspace_id) where status='active';
create table public.module_catalog (code text primary key check(code in ('ai_funnel','lead_concierge','growth_engine')), name text not null, lifecycle text not null check(lifecycle in ('available','planned','retired')));
insert into public.module_catalog values ('ai_funnel','AI Funnel System','available'),('lead_concierge','AI Lead Concierge','planned'),('growth_engine','Complete AI Growth Engine','planned');
create table public.workspace_modules (workspace_id uuid references public.workspaces(id) on delete cascade, module_code text references public.module_catalog(code), enabled boolean not null default false, config jsonb not null default '{}'::jsonb, primary key(workspace_id,module_code));

create table public.funnels (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, name text not null, slug text not null, status text not null default 'draft' check(status in ('draft','published','inactive')), published_version integer, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), unique(workspace_id,id), unique(workspace_id,slug));
create index funnels_workspace_created on public.funnels(workspace_id,created_at desc);
create table public.funnel_pages (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, funnel_id uuid not null, version integer not null check(version>0), content jsonb not null, created_at timestamptz not null default now(), unique(workspace_id,funnel_id,version), foreign key(workspace_id,funnel_id) references public.funnels(workspace_id,id) on delete cascade);
create table public.forms (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, funnel_id uuid not null, name text not null, settings jsonb not null default '{}'::jsonb, unique(workspace_id,id), foreign key(workspace_id,funnel_id) references public.funnels(workspace_id,id) on delete cascade);
create table public.form_fields (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, form_id uuid not null, field_key text not null, label text not null, field_type text not null check(field_type in ('text','email','phone','select','textarea','checkbox')), required boolean not null default false, position integer not null default 0, validation jsonb not null default '{}'::jsonb, unique(workspace_id,form_id,field_key), foreign key(workspace_id,form_id) references public.forms(workspace_id,id) on delete cascade);
create table public.leads (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, name text not null, email_normalized text, phone_normalized text, company text not null default '', status text not null default 'new' check(status in ('new','qualified','unqualified','contacted','booked')), source text not null default 'unknown', communication_preferences jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,id));
create index leads_workspace_created on public.leads(workspace_id,created_at desc);
create index leads_workspace_status on public.leads(workspace_id,status,created_at desc);
create index leads_workspace_email on public.leads(workspace_id,email_normalized) where email_normalized is not null;
create table public.form_submissions (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, funnel_id uuid not null, form_id uuid not null, lead_id uuid not null, answers jsonb not null, consent_snapshot jsonb not null, idempotency_key text, submitted_at timestamptz not null default now(), unique(workspace_id,id), foreign key(workspace_id,funnel_id) references public.funnels(workspace_id,id), foreign key(workspace_id,form_id) references public.forms(workspace_id,id), foreign key(workspace_id,lead_id) references public.leads(workspace_id,id), unique(workspace_id,idempotency_key));
create index submissions_funnel_date on public.form_submissions(workspace_id,funnel_id,submitted_at desc);
create table public.lead_activities (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid not null, activity_type text not null, details jsonb not null default '{}'::jsonb, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade);
create index lead_activities_history on public.lead_activities(workspace_id,lead_id,created_at desc);
create table public.qualification_rules (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, version integer not null, config jsonb not null, active boolean not null default false, unique(workspace_id,version));
create table public.scoring_rules (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, version integer not null, criteria jsonb not null, active boolean not null default false, unique(workspace_id,version));
create table public.qualification_results (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid not null, submission_id uuid, classification text not null check(classification in ('qualified','unqualified','review')), score integer not null check(score between 0 and 100), confidence numeric check(confidence between 0 and 1), validated_summary jsonb not null, created_at timestamptz not null default now(), foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade, foreign key(workspace_id,submission_id) references public.form_submissions(workspace_id,id));

create table public.followup_sequences (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, name text not null, status text not null default 'draft' check(status in ('draft','active','inactive')), version integer not null, unique(workspace_id,id));
create table public.followup_steps (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, sequence_id uuid not null, position integer not null, action_type text not null, delay_config jsonb not null default '{}'::jsonb, config jsonb not null default '{}'::jsonb, foreign key(workspace_id,sequence_id) references public.followup_sequences(workspace_id,id) on delete cascade, unique(workspace_id,sequence_id,position));
create table public.workflow_executions (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid, sequence_id uuid, state text not null default 'pending' check(state in ('pending','running','succeeded','retry','failed','cancelled')), idempotency_key text not null, attempt integer not null default 0 check(attempt>=0), error_code text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,idempotency_key), unique(workspace_id,id), foreign key(workspace_id,lead_id) references public.leads(workspace_id,id), foreign key(workspace_id,sequence_id) references public.followup_sequences(workspace_id,id));
create table public.scheduled_actions (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, execution_id uuid not null, run_at timestamptz not null, state text not null default 'pending' check(state in ('pending','running','succeeded','retry','failed','cancelled')), attempts integer not null default 0, idempotency_key text not null, payload jsonb not null default '{}'::jsonb, foreign key(workspace_id,execution_id) references public.workflow_executions(workspace_id,id) on delete cascade, unique(workspace_id,idempotency_key));
create index scheduled_actions_due on public.scheduled_actions(run_at) where state in ('pending','retry');
create table public.booking_configs (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, provider text not null default 'external_link', booking_url text not null, active boolean not null default true, unique(workspace_id,id));
create table public.booking_requests (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid not null, booking_config_id uuid not null, status text not null default 'requested' check(status in ('requested','link_opened','cancelled','confirmed')), requested_at timestamptz not null default now(), foreign key(workspace_id,lead_id) references public.leads(workspace_id,id), foreign key(workspace_id,booking_config_id) references public.booking_configs(workspace_id,id), unique(workspace_id,id));
create table public.appointments (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, booking_request_id uuid not null, external_reference text, starts_at timestamptz not null, confirmation_source text not null, foreign key(workspace_id,booking_request_id) references public.booking_requests(workspace_id,id), unique(workspace_id,booking_request_id));
create table public.integration_connections (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, provider text not null, status text not null default 'disconnected', secret_reference text, config jsonb not null default '{}'::jsonb, unique(workspace_id,provider));
create table public.ai_configurations (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, purpose text not null, provider_code text, model_code text, policy jsonb not null default '{}'::jsonb, enabled boolean not null default false, unique(workspace_id,purpose), unique(workspace_id,id));
create table public.ai_prompt_versions (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, ai_configuration_id uuid not null, version integer not null, prompt_template text not null, created_at timestamptz not null default now(), foreign key(workspace_id,ai_configuration_id) references public.ai_configurations(workspace_id,id), unique(workspace_id,ai_configuration_id,version));
create table public.ai_usage_records (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, provider_code text, model_code text, purpose text not null, prompt_version integer, input_tokens integer, output_tokens integer, estimated_cost numeric, latency_ms integer, outcome text not null, created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, lead_id uuid, channel text not null, status text not null default 'pending', idempotency_key text not null, provider_reference text, created_at timestamptz not null default now(), foreign key(workspace_id,lead_id) references public.leads(workspace_id,id), unique(workspace_id,idempotency_key));
create table public.activity_logs (id uuid primary key default gen_random_uuid(), workspace_id uuid references public.workspaces(id) on delete set null, actor_profile_id uuid references public.profiles(id) on delete set null, event_type text not null, target_type text, target_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table public.idempotency_keys (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade, key text not null, operation text not null, response jsonb, expires_at timestamptz not null, unique(workspace_id,operation,key));

create or replace function public.is_workspace_member(target_workspace uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.workspace_memberships m where m.workspace_id=target_workspace and m.profile_id=(select auth.uid()) and m.status='active') $$;
revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
do $$
declare t text;
begin
  foreach t in array array['workspace_memberships','workspace_modules','funnels','funnel_pages','forms','form_fields','leads','form_submissions','lead_activities','qualification_rules','scoring_rules','qualification_results','followup_sequences','followup_steps','workflow_executions','scheduled_actions','booking_configs','booking_requests','appointments','integration_connections','ai_configurations','ai_prompt_versions','ai_usage_records','notifications','idempotency_keys'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy tenant_select on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))',t);
  end loop;
end $$;
alter table public.profiles enable row level security;
create policy profile_self on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_update_self on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
alter table public.workspaces enable row level security;
create policy workspace_member_read on public.workspaces for select to authenticated using(public.is_workspace_member(id));
alter table public.roles enable row level security;
create policy roles_read on public.roles for select to authenticated using(true);
alter table public.permissions enable row level security;
create policy permissions_read on public.permissions for select to authenticated using(true);
alter table public.role_permissions enable row level security;
create policy role_permissions_read on public.role_permissions for select to authenticated using(true);
alter table public.module_catalog enable row level security;
create policy module_catalog_read on public.module_catalog for select to authenticated using(true);
alter table public.service_packages enable row level security;
create policy packages_read on public.service_packages for select to authenticated using(true);
alter table public.activity_logs enable row level security;
create policy audit_member_read on public.activity_logs for select to authenticated using(workspace_id is not null and public.is_workspace_member(workspace_id));
-- No anonymous table writes. Public funnel intake must use a validated, rate-limited server-side path.
