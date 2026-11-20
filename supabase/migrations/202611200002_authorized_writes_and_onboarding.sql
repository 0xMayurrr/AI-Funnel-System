create or replace function public.has_workspace_permission(target_workspace uuid, required_permission text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.workspace_memberships m join public.role_permissions rp on rp.role_id=m.role_id where m.workspace_id=target_workspace and m.profile_id=(select auth.uid()) and m.status='active' and rp.permission_code=required_permission)
$$;
revoke all on function public.has_workspace_permission(uuid,text) from public;
grant execute on function public.has_workspace_permission(uuid,text) to authenticated;

create or replace function public.create_workspace(workspace_name text, workspace_slug text)
returns uuid language plpgsql security definer set search_path='' as $$
declare new_workspace uuid; owner_role uuid; actor uuid := auth.uid();
begin
  if actor is null then raise exception 'authentication required' using errcode='28000'; end if;
  if length(trim(workspace_name)) < 2 or length(workspace_name) > 120 then raise exception 'invalid workspace name' using errcode='22023'; end if;
  if workspace_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(workspace_slug) > 80 then raise exception 'invalid workspace slug' using errcode='22023'; end if;
  if not exists(select 1 from public.profiles p where p.id=actor) then
    insert into public.profiles(id,display_name) values(actor,coalesce((select raw_user_meta_data->>'name' from auth.users where id=actor),'')) on conflict do nothing;
  end if;
  select id into owner_role from public.roles where code='workspace_owner';
  insert into public.workspaces(name,slug) values(trim(workspace_name),workspace_slug) returning id into new_workspace;
  insert into public.workspace_memberships(workspace_id,profile_id,role_id) values(new_workspace,actor,owner_role);
  insert into public.workspace_modules(workspace_id,module_code,enabled) values(new_workspace,'ai_funnel',true);
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id) values(new_workspace,actor,'workspace.created','workspace',new_workspace);
  return new_workspace;
end $$;
revoke all on function public.create_workspace(text,text) from public;
grant execute on function public.create_workspace(text,text) to authenticated;

create or replace function public.create_funnel(selected_workspace uuid, funnel_name text, funnel_slug text, page_content jsonb, fields jsonb)
returns public.funnels language plpgsql security definer set search_path='' as $$
declare wid uuid := selected_workspace; made public.funnels%rowtype; made_form uuid; field_item jsonb;
begin
  if wid is null or not public.has_workspace_permission(wid,'funnels.manage') then raise exception 'funnel permission required' using errcode='42501'; end if;
  if not exists(select 1 from public.workspace_modules wm join public.module_catalog mc on mc.code=wm.module_code where wm.workspace_id=wid and wm.module_code='ai_funnel' and wm.enabled and mc.lifecycle='available') then raise exception 'AI Funnel System is not enabled' using errcode='42501'; end if;
  if jsonb_typeof(fields)<>'array' or jsonb_array_length(fields)>30 then raise exception 'invalid form fields' using errcode='22023'; end if;
  insert into public.funnels(workspace_id,name,slug,created_by) values(wid,trim(funnel_name),funnel_slug,auth.uid()) returning * into made;
  insert into public.funnel_pages(workspace_id,funnel_id,version,content) values(wid,made.id,1,page_content);
  insert into public.forms(workspace_id,funnel_id,name) values(wid,made.id,'Enquiry form') returning id into made_form;
  for field_item in select value from jsonb_array_elements(fields) loop
    insert into public.form_fields(workspace_id,form_id,field_key,label,field_type,required,position,validation)
    values(wid,made_form,field_item->>'key',field_item->>'label',field_item->>'type',coalesce((field_item->>'required')::boolean,false),coalesce((field_item->>'position')::integer,0),coalesce(field_item->'validation','{}'::jsonb));
  end loop;
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id) values(wid,auth.uid(),'funnel.created','funnel',made.id);
  return made;
end $$;
revoke all on function public.create_funnel(uuid,text,text,jsonb,jsonb) from public;
grant execute on function public.create_funnel(uuid,text,text,jsonb,jsonb) to authenticated;

create or replace function public.publish_funnel(target_id uuid, should_publish boolean default true)
returns public.funnels language plpgsql security definer set search_path='' as $$
declare wid uuid; current_funnel public.funnels%rowtype;
begin
  select workspace_id into wid from public.funnels where id=target_id;
  if wid is null or not public.has_workspace_permission(wid,'funnels.manage') then raise exception 'funnel permission required' using errcode='42501'; end if;
  if should_publish and not exists(select 1 from public.forms fm join public.form_fields ff on ff.form_id=fm.id where fm.workspace_id=wid and fm.funnel_id=target_id) then raise exception 'funnel must have form fields before publishing' using errcode='22023'; end if;
  update public.funnels set status=case when should_publish then 'published' else 'inactive' end,
    published_version=case when should_publish then coalesce(published_version,1) else published_version end
    where id=target_id returning * into current_funnel;
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id) values(wid,auth.uid(),case when should_publish then 'funnel.published' else 'funnel.deactivated' end,'funnel',target_id);
  return current_funnel;
end $$;
revoke all on function public.publish_funnel(uuid,boolean) from public;
grant execute on function public.publish_funnel(uuid,boolean) to authenticated;

create or replace function public.get_public_funnel(requested_slug text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare f public.funnels%rowtype; page jsonb; selected_form_id uuid; field_list jsonb;
begin
  select * into f from public.funnels where slug=requested_slug and status='published' limit 1;
  if f.id is null then raise exception 'funnel not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.workspace_modules where workspace_id=f.workspace_id and module_code='ai_funnel' and enabled) then raise exception 'funnel module disabled' using errcode='P0002'; end if;
  select content into page from public.funnel_pages where workspace_id=f.workspace_id and funnel_id=f.id and version=coalesce(f.published_version,1);
  select id into selected_form_id from public.forms where workspace_id=f.workspace_id and funnel_id=f.id limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('key',field_key,'label',label,'type',field_type,'required',required,'position',position,'validation',validation) order by position),'[]'::jsonb)
    into field_list from public.form_fields ff where ff.workspace_id=f.workspace_id and ff.form_id=selected_form_id;
  return jsonb_build_object('name',f.name,'slug',f.slug,'headline',coalesce(page->>'headline',f.name),'description',coalesce(page->>'description','Tell us about your business.'),'fields',field_list);
end $$;
revoke all on function public.get_public_funnel(text) from public;
grant execute on function public.get_public_funnel(text) to anon,authenticated;

create table public.public_intake_limits (
  window_start timestamptz not null, funnel_id uuid not null references public.funnels(id) on delete cascade,
  ip_fingerprint text not null, requests integer not null default 0,
  primary key(window_start,funnel_id,ip_fingerprint)
);
alter table public.public_intake_limits enable row level security;

create or replace function public.submit_public_funnel(requested_slug text, submitted_answers jsonb, consented boolean, request_fingerprint text, request_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.funnels%rowtype; fm public.forms%rowtype; fld record; created_lead uuid; submission uuid; now_window timestamptz; person_name text; person_email text; person_company text; person_phone text; prior_count integer; field_value jsonb; normalized_answers jsonb:='{}'::jsonb; maximum_length integer;
begin
  if not consented then raise exception 'consent is required' using errcode='22023'; end if;
  if jsonb_typeof(submitted_answers) <> 'object' or octet_length(submitted_answers::text)>16000 then raise exception 'invalid submission' using errcode='22023'; end if;
  select * into f from public.funnels where slug=requested_slug and status='published' limit 1;
  if f.id is null then raise exception 'funnel not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.workspace_modules where workspace_id=f.workspace_id and module_code='ai_funnel' and enabled) then raise exception 'funnel module disabled' using errcode='P0002'; end if;
  select * into fm from public.forms where workspace_id=f.workspace_id and funnel_id=f.id limit 1;
  if fm.id is null then raise exception 'form unavailable' using errcode='P0002'; end if;
  for fld in select field_key,field_type,required,validation from public.form_fields where workspace_id=f.workspace_id and form_id=fm.id loop
    field_value:=submitted_answers->fld.field_key;
    if fld.required and (field_value is null or (fld.field_type='checkbox' and field_value<>'true'::jsonb) or (fld.field_type<>'checkbox' and nullif(trim(field_value #>> '{}'),'') is null)) then raise exception 'required field missing: %',fld.field_key using errcode='22023'; end if;
    if field_value is null then continue; end if;
    if fld.field_type='checkbox' and jsonb_typeof(field_value)<>'boolean' then raise exception 'invalid checkbox value: %',fld.field_key using errcode='22023'; end if;
    if fld.field_type<>'checkbox' and jsonb_typeof(field_value)<>'string' then raise exception 'invalid field value: %',fld.field_key using errcode='22023'; end if;
    maximum_length:=nullif(fld.validation->>'maxLength','')::integer;
    if maximum_length is not null and length(field_value #>> '{}')>maximum_length then raise exception 'field value too long: %',fld.field_key using errcode='22023'; end if;
    if fld.field_type='email' and (field_value #>> '{}') !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'invalid email field: %',fld.field_key using errcode='22023'; end if;
    if fld.field_type='select' and jsonb_typeof(fld.validation->'options')='array' and not exists(select 1 from jsonb_array_elements_text(fld.validation->'options') as options(value) where options.value=field_value #>> '{}') then raise exception 'invalid selection: %',fld.field_key using errcode='22023'; end if;
    normalized_answers:=normalized_answers||jsonb_build_object(fld.field_key,field_value);
  end loop;
  now_window := date_trunc('minute',now());
  insert into public.public_intake_limits(window_start,funnel_id,ip_fingerprint,requests) values(now_window,f.id,coalesce(request_fingerprint,'unknown'),1)
    on conflict(window_start,funnel_id,ip_fingerprint) do update set requests=public.public_intake_limits.requests+1 returning requests into prior_count;
  if prior_count > 12 then raise exception 'submission rate limit exceeded' using errcode='54000'; end if;
  if request_key is not null and length(request_key)>200 then raise exception 'idempotency key too long' using errcode='22023'; end if;
  if request_key is not null and exists(select 1 from public.form_submissions s where s.workspace_id=f.workspace_id and s.idempotency_key=request_key) then return jsonb_build_object('message','Thanks — your enquiry has been received.'); end if;
  person_name := trim(coalesce(normalized_answers->>'name','')); person_email := lower(trim(coalesce(normalized_answers->>'email',''))); person_company := trim(coalesce(normalized_answers->>'company','')); person_phone:=trim(coalesce(normalized_answers->>'phone',''));
  if length(person_name)<2 or length(person_name)>120 or person_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'invalid contact details' using errcode='22023'; end if;
  select id into created_lead from public.leads where workspace_id=f.workspace_id and email_normalized=person_email limit 1;
  if created_lead is null then insert into public.leads(workspace_id,name,email_normalized,phone_normalized,company,source,communication_preferences) values(f.workspace_id,person_name,person_email,nullif(person_phone,''),person_company,f.slug,jsonb_build_object('email_consent',true,'opted_out',false)) returning id into created_lead; end if;
  insert into public.form_submissions(workspace_id,funnel_id,form_id,lead_id,answers,consent_snapshot,idempotency_key) values(f.workspace_id,f.id,fm.id,created_lead,normalized_answers,jsonb_build_object('consented',true,'captured_at',now()),request_key) returning id into submission;
  insert into public.lead_activities(workspace_id,lead_id,activity_type,details) values(f.workspace_id,created_lead,'funnel.submitted',jsonb_build_object('funnel_id',f.id,'submission_id',submission));
  return jsonb_build_object('receipt',submission,'message','Thanks — your enquiry has been received.');
end $$;
revoke all on function public.submit_public_funnel(text,jsonb,boolean,text,text) from public;
grant execute on function public.submit_public_funnel(text,jsonb,boolean,text,text) to service_role;

do $$
declare item record;
begin
  for item in select * from (values
    ('workspace_memberships','members.manage'),('workspace_modules','modules.manage'),('funnels','funnels.manage'),('funnel_pages','funnels.manage'),('forms','funnels.manage'),('form_fields','funnels.manage'),
    ('leads','leads.manage'),('form_submissions','leads.manage'),('lead_activities','leads.manage'),('qualification_rules','funnels.manage'),('scoring_rules','funnels.manage'),('qualification_results','leads.manage'),
    ('followup_sequences','workflows.manage'),('followup_steps','workflows.manage'),('workflow_executions','workflows.manage'),('scheduled_actions','workflows.manage'),
    ('booking_configs','workspace.manage'),('booking_requests','leads.manage'),('appointments','leads.manage'),('integration_connections','integrations.manage'),('ai_configurations','workspace.manage'),('ai_prompt_versions','workspace.manage'),('ai_usage_records','workspace.read'),('notifications','leads.manage'),('idempotency_keys','leads.manage')
  ) as p(tbl,perm) loop
    execute format('create policy tenant_insert on public.%I for insert to authenticated with check (public.has_workspace_permission(workspace_id,%L))',item.tbl,item.perm);
    execute format('create policy tenant_update on public.%I for update to authenticated using (public.has_workspace_permission(workspace_id,%L)) with check (public.has_workspace_permission(workspace_id,%L))',item.tbl,item.perm,item.perm);
    execute format('create policy tenant_delete on public.%I for delete to authenticated using (public.has_workspace_permission(workspace_id,%L))',item.tbl,item.perm);
  end loop;
end $$;
revoke all on public.public_intake_limits from anon,authenticated,public;
