-- ==============================================================================
-- BUILDICY AI LEAD RECOVERY & BOOKING PLATFORM
-- Migration: 20261122_ai_lead_recovery_platform.sql
-- Comprehensive Schema for Multi-Tenant Lead Recovery, Booking, CRM, and Voice
-- ==============================================================================

-- 1. Extend Leads Table with Canonical Lifecycle & Recovery Metrics
alter table if exists public.leads 
  add column if not exists stage text not null default 'NEW' check (stage in (
    'NEW', 'CONTACTED', 'QUALIFYING', 'QUALIFIED', 'DISQUALIFIED', 'NURTURE',
    'APPOINTMENT_BOOKED', 'REMINDED', 'VISITED', 'NO_SHOW', 'RECOVERY_FOLLOW_UP',
    'RESCHEDULED', 'WON', 'LOST', 'ARCHIVED'
  )),
  add column if not exists stage_entered_at timestamptz not null default now(),
  add column if not exists stage_history jsonb not null default '[]'::jsonb,
  add column if not exists phone text,
  add column if not exists whatsapp_number text,
  add column if not exists city text,
  add column if not exists preferred_language text default 'en',
  add column if not exists property_interest text,
  add column if not exists property_type text,
  add column if not exists location_preference text,
  add column if not exists budget_range text,
  add column if not exists budget_numeric numeric,
  add column if not exists bhk text,
  add column if not exists buy_or_rent text default 'buy',
  add column if not exists purchase_timeline text,
  add column if not exists timeline_days integer,
  add column if not exists financing_status text,
  add column if not exists consent_status boolean not null default true,
  add column if not exists consent_timestamp timestamptz default now(),
  add column if not exists consent_method text default 'web_form',
  add column if not exists consent_text_version text default 'v1.0',
  add column if not exists opt_out boolean not null default false,
  add column if not exists assigned_agent_id uuid,
  add column if not exists assigned_team text,
  add column if not exists priority_score integer default 50,
  add column if not exists recovery_score integer default 50,
  add column if not exists recovery_priority text default 'Warm Recovery',
  add column if not exists recovery_breakdown jsonb default '{}'::jsonb,
  add column if not exists leakage_status text default 'Recovered',
  add column if not exists qualification_result text,
  add column if not exists qualification_reason text,
  add column if not exists crm_sync_status text default 'pending' check (crm_sync_status in ('synced', 'pending', 'failed')),
  add column if not exists crm_synced_at timestamptz,
  add column if not exists is_duplicate boolean default false,
  add column if not exists duplicate_of_id uuid references public.leads(id),
  add column if not exists source_campaign_id text,
  add column if not exists source_campaign_name text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists landing_page_url text,
  add column if not exists referrer_url text,
  add column if not exists capture_channel text default 'web_form',
  add column if not exists last_activity_at timestamptz default now(),
  add column if not exists next_action_due_at timestamptz;

-- Create Indexes for fast lookup
create index if not exists idx_leads_workspace_stage on public.leads(workspace_id, stage);
create index if not exists idx_leads_phone on public.leads(workspace_id, phone);
create index if not exists idx_leads_email on public.leads(workspace_id, email_normalized);
create index if not exists idx_leads_assigned_agent on public.leads(workspace_id, assigned_agent_id);
create index if not exists idx_leads_recovery_score on public.leads(workspace_id, recovery_score desc);
create index if not exists idx_leads_leakage_status on public.leads(workspace_id, leakage_status);

-- 2. Lead Notes Table
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_notes_lead on public.lead_notes(lead_id);

-- 3. Lead Activity Logs Table (Immutable Audit Trail)
create table if not exists public.lead_activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  action text not null,
  details text not null,
  metadata jsonb default '{}'::jsonb,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_activity_logs_lead on public.lead_activity_logs(lead_id, created_at desc);

-- 4. Agents & Teams Table
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id),
  name text not null,
  email text not null,
  phone text,
  role text not null default 'closer' check (role in ('closer', 'manager', 'receptionist')),
  availability_status text not null default 'online' check (availability_status in ('online', 'busy', 'offline')),
  active_leads_count integer not null default 0,
  capacity_limit integer not null default 25,
  languages text[] not null default array['en'],
  territories text[] not null default array['all'],
  skills text[] not null default array['general'],
  created_at timestamptz not null default now()
);
create index if not exists idx_agents_workspace on public.agents(workspace_id);

-- 5. Routing Rules Table
create table if not exists public.routing_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  rule_order integer not null default 0,
  conditions jsonb not null default '{}'::jsonb,
  assign_to_type text not null default 'agent' check (assign_to_type in ('agent', 'team', 'round_robin', 'fallback')),
  target_id text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. Property & Inventory Table
create table if not exists public.inventory_properties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  location text not null,
  property_type text not null check (property_type in ('apartment', 'villa', 'plot', 'commercial', 'penthouse')),
  configuration text not null default '3 BHK',
  price_band text not null,
  price_numeric numeric not null default 0,
  availability_status text not null default 'available' check (availability_status in ('available', 'few_units_left', 'sold_out')),
  possession_date text not null default 'Ready to Move',
  amenities text[] default array[]::text[],
  assigned_agent_id uuid references public.agents(id),
  booking_rules text default '24 hours advance notice required.',
  created_at timestamptz not null default now()
);
create index if not exists idx_inventory_workspace on public.inventory_properties(workspace_id);

-- 7. Appointments & Site-Visits Table
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid references public.agents(id),
  property_id uuid references public.inventory_properties(id),
  appointment_type text not null default 'site_visit' check (appointment_type in ('site_visit', 'consultation', 'virtual_meeting')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'visited', 'no_show', 'rescheduled', 'cancelled')),
  booking_source text not null default 'ai_receptionist',
  confirmation_status text not null default 'confirmed',
  reminder_status text not null default 'pending',
  reschedule_count integer not null default 0,
  cancellation_reason text,
  no_show_recovered boolean default false,
  meeting_link text,
  location text,
  notes text,
  crm_sync_status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_appointments_workspace_time on public.appointments(workspace_id, start_time);
create index if not exists idx_appointments_lead on public.appointments(lead_id);

-- 8. Follow-up & No-Show Recovery Sequences Table
create table if not exists public.followup_sequences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  trigger_event text not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 9. CRM Connections & Sync Table
create table if not exists public.crm_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('google_sheets', 'hubspot', 'zoho', 'webhook', 'leadsquared', 'selldo', 'salesforce')),
  name text not null,
  status text not null default 'connected' check (status in ('connected', 'error', 'syncing', 'disconnected')),
  credentials_encrypted text,
  field_mapping jsonb not null default '{}'::jsonb,
  sync_triggers text[] default array['lead_created', 'lead_qualified', 'appointment_booked', 'stage_changed'],
  last_synced_at timestamptz,
  synced_records_count integer not null default 0,
  failed_syncs_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_sync_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid references public.crm_connections(id) on delete cascade,
  lead_id uuid references public.leads(id),
  event_type text not null,
  status text not null check (status in ('success', 'failed', 'retrying')),
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

-- 10. WhatsApp Business Templates & Configuration
create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  category text not null default 'UTILITY' check (category in ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
  language text not null default 'en',
  body_text text not null,
  variables jsonb default '[]'::jsonb,
  approval_status text not null default 'approved' check (approval_status in ('approved', 'pending', 'rejected', 'paused')),
  meta_template_id text,
  created_at timestamptz not null default now()
);

-- 11. Telephony & Missed-Call Events
create table if not exists public.missed_call_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  caller_number text not null,
  call_time timestamptz not null default now(),
  recovery_status text not null default 'pending' check (recovery_status in ('pending', 'recovery_message_sent', 'lead_created', 'callback_scheduled', 'resolved')),
  recovery_channel text default 'whatsapp',
  lead_id uuid references public.leads(id),
  created_at timestamptz not null default now()
);

-- 12. Enable Row Level Security (RLS) across all new tables
alter table public.lead_notes enable row level security;
alter table public.lead_activity_logs enable row level security;
alter table public.agents enable row level security;
alter table public.routing_rules enable row level security;
alter table public.inventory_properties enable row level security;
alter table public.appointments enable row level security;
alter table public.followup_sequences enable row level security;
alter table public.crm_connections enable row level security;
alter table public.crm_sync_logs enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.missed_call_events enable row level security;
