-- ==============================================================================
-- BUILDICY AI FUNNEL SYSTEMS - FULL SUPABASE BOOTSTRAP SCRIPT
-- Run this in your Supabase Project Dashboard -> SQL Editor -> Click 'Run'
-- ==============================================================================

-- 1. Enable required extensions
create extension if not exists pgcrypto;

-- 2. Core Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  limits_config jsonb not null default '{}'::jsonb
);

insert into public.service_packages (code, name, limits_config) values
  ('starter', 'Starter Package', '{"funnels": 2, "leads_per_month": 500}'::jsonb),
  ('growth', 'Growth Package', '{"funnels": 10, "leads_per_month": 5000}'::jsonb),
  ('custom', 'Custom Enterprise', '{"funnels": -1, "leads_per_month": -1}'::jsonb)
on conflict (code) do nothing;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  service_package_id uuid references public.service_packages(id),
  status text not null default 'active' check(status in ('active','suspended','deleting')),
  created_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  platform_role boolean not null default false
);

create table if not exists public.permissions (
  code text primary key,
  description text not null
);

create table if not exists public.role_permissions (
  role_id uuid references public.roles(id) on delete cascade,
  permission_code text references public.permissions(code) on delete cascade,
  primary key(role_id, permission_code)
);

insert into public.roles(code, name, platform_role) values
  ('platform_admin', 'Buildicy Administrator', true),
  ('workspace_owner', 'Workspace Owner', false),
  ('workspace_admin', 'Workspace Administrator', false),
  ('workspace_operator', 'Workspace Operator', false),
  ('workspace_analyst', 'Read-only Analyst', false)
on conflict (code) do nothing;

insert into public.permissions(code, description) values
  ('workspace.read', 'Read workspace details'),
  ('workspace.manage', 'Manage workspace settings'),
  ('funnels.read', 'View funnels'),
  ('funnels.manage', 'Create and edit funnels'),
  ('leads.read', 'View leads'),
  ('leads.manage', 'Manage lead status and details'),
  ('integrations.manage', 'Manage integrations'),
  ('workflows.read', 'View workflow executions'),
  ('workflows.manage', 'Manage follow-up workflows'),
  ('modules.manage', 'Configure enabled modules'),
  ('members.manage', 'Manage workspace memberships'),
  ('platform.workspaces.manage', 'Manage client workspaces'),
  ('platform.audit.read', 'View platform audit events')
on conflict (code) do nothing;

insert into public.role_permissions(role_id, permission_code)
select r.id, p.code from public.roles r cross join public.permissions p
where (r.code = 'platform_admin')
   or (r.code = 'workspace_owner')
   or (r.code = 'workspace_admin' and p.code not in ('platform.workspaces.manage','platform.audit.read','modules.manage'))
   or (r.code = 'workspace_operator' and p.code in ('workspace.read','funnels.read','funnels.manage','leads.read','leads.manage','workflows.read'))
   or (r.code = 'workspace_analyst' and p.code in ('workspace.read','funnels.read','leads.read','workflows.read'))
on conflict do nothing;

create table if not exists public.platform_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  status text not null default 'active' check(status in ('invited','active','suspended')),
  created_at timestamptz not null default now(),
  unique(workspace_id, profile_id),
  unique(workspace_id, id)
);

create table if not exists public.module_catalog (
  code text primary key check(code in ('ai_funnel','lead_concierge','growth_engine')),
  name text not null,
  lifecycle text not null check(lifecycle in ('available','planned','retired'))
);

insert into public.module_catalog values
  ('ai_funnel', 'AI Funnel System', 'available'),
  ('lead_concierge', 'AI Lead Concierge', 'available'),
  ('growth_engine', 'Complete AI Growth Engine', 'available')
on conflict (code) do nothing;

create table if not exists public.workspace_modules (
  workspace_id uuid references public.workspaces(id) on delete cascade,
  module_code text references public.module_catalog(code),
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  primary key(workspace_id, module_code)
);

create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'draft' check(status in ('draft','published','inactive')),
  published_version integer,
  headline text not null default '',
  description text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(workspace_id, id),
  unique(workspace_id, slug)
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  funnel_id uuid not null,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  unique(workspace_id, id),
  foreign key(workspace_id, funnel_id) references public.funnels(workspace_id, id) on delete cascade
);

create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  form_id uuid not null,
  field_key text not null,
  label text not null,
  field_type text not null check(field_type in ('text','email','phone','select','textarea','checkbox')),
  required boolean not null default false,
  position integer not null default 0,
  validation jsonb not null default '{}'::jsonb,
  unique(workspace_id, form_id, field_key),
  foreign key(workspace_id, form_id) references public.forms(workspace_id, id) on delete cascade
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email_normalized text,
  phone_normalized text,
  company text not null default '',
  service text not null default '',
  status text not null default 'new' check(status in ('new','qualified','unqualified','contacted','booked')),
  source text not null default 'unknown',
  consent boolean not null default true,
  communication_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, id)
);

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  source_type text not null check(source_type in ('text','url','file')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique(workspace_id, id)
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  source_id uuid not null,
  title text not null,
  content text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key(workspace_id, source_id) references public.knowledge_sources(workspace_id, id) on delete cascade,
  unique(workspace_id, id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  lead_id uuid not null,
  channel text not null default 'whatsapp',
  status text not null default 'open' check(status in ('open','waiting_human','closed')),
  handoff_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(workspace_id, lead_id) references public.leads(workspace_id, id) on delete cascade,
  unique(workspace_id, id)
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  conversation_id uuid not null,
  sender_type text not null check(sender_type in ('lead','assistant','human','system')),
  content text not null,
  review_state text not null default 'approved' check(review_state in ('draft','approved','sent','rejected')),
  created_at timestamptz not null default now(),
  foreign key(workspace_id, conversation_id) references public.conversations(workspace_id, id) on delete cascade
);

create table if not exists public.client_change_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requester_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in ('landing_page', 'funnel_questions', 'ai_channels', 'qualification_criteria', 'other')),
  title text not null,
  description text not null,
  target_funnel_id uuid references public.funnels(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'declined')),
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.followup_sequences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  status text not null default 'active' check(status in ('draft','active','inactive')),
  version integer not null default 1,
  steps jsonb not null default '[]'::jsonb,
  unique(workspace_id, id)
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 3. SEED AUTH USERS & PROFILES
-- Create auth.users entries if using Supabase Auth (with encrypted password 'Password123!')
do $$
declare
  admin_uid uuid := '00000000-0000-4000-a000-000000000001';
  client_uid uuid := '00000000-0000-4000-a000-000000000002';
  ws_id uuid := '00000000-0000-4000-8000-000000000001';
  pkg_growth uuid;
  role_admin uuid;
  role_owner uuid;
begin
  select id into pkg_growth from public.service_packages where code = 'growth';
  select id into role_admin from public.roles where code = 'platform_admin';
  select id into role_owner from public.roles where code = 'workspace_owner';

  -- Create users in auth.users if not present
  if not exists (select 1 from auth.users where email = 'admin@buildicy.com') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@buildicy.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Buildicy SuperAdmin"}'::jsonb,
      now(),
      now()
    );
  end if;

  if not exists (select 1 from auth.users where email = 'client@prestigerealty.com') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (
      client_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'client@prestigerealty.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Prestige Luxury Realty"}'::jsonb,
      now(),
      now()
    );
  end if;

  -- Create profiles
  insert into public.profiles (id, display_name) values
    (admin_uid, 'Buildicy SuperAdmin'),
    (client_uid, 'Prestige Luxury Realty Broker')
  on conflict (id) do update set display_name = excluded.display_name;

  -- Assign platform_admins
  insert into public.platform_admins (profile_id) values (admin_uid)
  on conflict (profile_id) do nothing;

  -- Create Prestige Workspace
  insert into public.workspaces (id, name, slug, service_package_id, status)
  values (ws_id, 'Prestige Luxury Realty', 'prestige-realty', pkg_growth, 'active')
  on conflict (id) do nothing;

  -- Assign modules
  insert into public.workspace_modules (workspace_id, module_code, enabled) values
    (ws_id, 'ai_funnel', true),
    (ws_id, 'lead_concierge', true),
    (ws_id, 'growth_engine', true)
  on conflict (workspace_id, module_code) do update set enabled = true;

  -- Membership
  insert into public.workspace_memberships (workspace_id, profile_id, role_id, status)
  values (ws_id, client_uid, role_owner, 'active')
  on conflict (workspace_id, profile_id) do nothing;

  -- Real Estate Funnels
  insert into public.funnels (id, workspace_id, name, slug, status, headline, description)
  values
    ('00000000-0000-4000-f000-000000000001', ws_id, 'Miami Luxury Waterfront Villa Funnel', 'luxury-villa-inquiry', 'published', 'Exclusive Waterfront & Off-Market Luxury Properties', 'Tell us your acquisition criteria and investment budget. Our AI broker will verify your criteria and schedule a private VIP tour within 2 hours.'),
    ('00000000-0000-4000-f000-000000000002', ws_id, 'Downtown Penthouse VIP Tour Funnel', 'downtown-penthouse-tour', 'published', 'High-Rise Luxury Penthouses & Pre-Construction Access', 'Instant WhatsApp qualification for pre-approved buyers and high-net-worth investors.')
  on conflict (workspace_id, slug) do nothing;

  -- Real Estate Leads
  insert into public.leads (id, workspace_id, name, email_normalized, phone_normalized, company, service, status, source)
  values
    ('00000000-0000-4000-l000-000000000001', ws_id, 'Marcus Vance', 'marcus.vance@vancerealty.com', '+13055550192', 'Vance Luxury Estates', 'Looking to buy a 4-bedroom beachfront villa in Miami. Budget approved up to $3.5M. Ready to close within 30 days.', 'qualified', 'luxury-villa-inquiry'),
    ('00000000-0000-4000-l000-000000000002', ws_id, 'Sophia Martinez', 'smartinez@skylineholdings.io', '+13055550148', 'Skyline Commercial Holdings', 'Seeking a 12-unit multi-family apartment complex for 1031 tax exchange. Capital ready: $4.2M.', 'booked', 'luxury-villa-inquiry'),
    ('00000000-0000-4000-l000-000000000003', ws_id, 'David Sterling', 'd.sterling@sterlinginvestments.net', '+13055550177', 'Sterling Capital', 'Interested in downtown penthouse listings under $2M. Pre-approved mortgage letter in hand.', 'contacted', 'downtown-penthouse-tour'),
    ('00000000-0000-4000-l000-000000000004', ws_id, 'Elena Rostova', 'elena.rostova@gmail.com', '+13055550133', 'Private Buyer', 'Looking for 1-bed condo rentals under $1,200/mo. Student visa.', 'unqualified', 'downtown-penthouse-tour'),
    ('00000000-0000-4000-l000-000000000005', ws_id, 'Jonathan Hayes', 'jhayes@apexproperties.org', '+13055550111', 'Apex Realty Partners', 'Commercial office floor space acquisition (10,000 sq ft). Budget: $50k/mo lease.', 'new', 'luxury-villa-inquiry')
  on conflict (workspace_id, id) do nothing;

  -- Knowledge Base
  insert into public.knowledge_sources (id, workspace_id, name, source_type, status)
  values ('00000000-0000-4000-k000-000000000001', ws_id, 'Prestige Realty Guidelines', 'text', 'active')
  on conflict (workspace_id, id) do nothing;

  insert into public.knowledge_documents (id, workspace_id, source_id, title, content, approved)
  values
    ('00000000-0000-4000-d000-000000000001', ws_id, '00000000-0000-4000-k000-000000000001', 'Prestige Realty - Buyer Qualification & Rules', 'Prestige Realty represents luxury residential and commercial assets in South Florida. Minimum purchasing budget for private showings is $1,000,000. Verified proof of funds or mortgage pre-approval from an approved tier-1 lender is required for off-market listings. Standard buyer closing timeline is 30 to 60 days. Rental inquiries under $5,000/mo are disqualified from agent showings.', true),
    ('00000000-0000-4000-d000-000000000002', ws_id, '00000000-0000-4000-k000-000000000001', 'Off-Market Inventory & Commission Guidelines', 'Exclusive 5-bedroom waterfront villas in Star Island and Palm Beach range from $3.5M to $12M. Commercial multi-family cap rates range between 5.8% and 7.2%. AI WhatsApp assistant should offer Calendly private tour links only to leads with confirmed budget exceeding $1.5M.', true)
  on conflict (workspace_id, id) do nothing;

  -- Client Change Requests Queue
  insert into public.client_change_requests (id, workspace_id, requester_id, category, title, description, priority, status)
  values
    ('00000000-0000-4000-c000-000000000001', ws_id, client_uid, 'landing_page', 'Update headline to focus on waterfront off-market inventory', 'Please change our hero headline to: "Exclusive Off-Market Waterfront Villas & Ultra-Luxury Estates".', 'high', 'in_progress'),
    ('00000000-0000-4000-c000-000000000002', ws_id, client_uid, 'ai_channels', 'Enable WhatsApp direct qualification channel for Instagram ads', 'We are launching Meta Instagram Ads next week. We need the AI WhatsApp bot to trigger automatically when ad leads submit phone numbers.', 'urgent', 'pending')
  on conflict (id) do nothing;
end $$;

-- 4. Enable Row Level Security (RLS) & Policies for Web Apps
alter table public.workspaces enable row level security;
alter table public.leads enable row level security;
alter table public.funnels enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.client_change_requests enable row level security;

-- Policies allowing public read for funnels
create policy "Allow public funnel read" on public.funnels for select using (status = 'published');
create policy "Allow public lead insert" on public.leads for insert with check (true);
create policy "Allow authenticated read on workspaces" on public.workspaces for select to authenticated using (true);
create policy "Allow authenticated read on leads" on public.leads for select to authenticated using (true);
create policy "Allow authenticated read on change_requests" on public.client_change_requests for select to authenticated using (true);
create policy "Allow authenticated insert on change_requests" on public.client_change_requests for insert to authenticated with check (true);
create policy "Allow authenticated update on change_requests" on public.client_change_requests for update to authenticated using (true);

-- Done!
