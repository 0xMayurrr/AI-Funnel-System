create or replace function public.update_lead_status(selected_workspace uuid, target_lead uuid, requested_status text)
returns public.leads language plpgsql security definer set search_path='' as $$
declare changed public.leads%rowtype;
begin
  if requested_status not in ('new','qualified','unqualified','contacted','booked') then raise exception 'invalid lead status' using errcode='22023'; end if;
  if not public.has_workspace_permission(selected_workspace,'leads.manage') then raise exception 'lead permission required' using errcode='42501'; end if;
  update public.leads set status=requested_status,updated_at=now() where id=target_lead and workspace_id=selected_workspace returning * into changed;
  if changed.id is null then raise exception 'lead not found' using errcode='P0002'; end if;
  insert into public.lead_activities(workspace_id,lead_id,activity_type,details,created_by) values(selected_workspace,target_lead,'lead.status_changed',jsonb_build_object('status',requested_status),auth.uid());
  return changed;
end $$;
revoke all on function public.update_lead_status(uuid,uuid,text) from public;
grant execute on function public.update_lead_status(uuid,uuid,text) to authenticated;

create or replace function public.save_funnel_config(selected_workspace uuid,target_funnel uuid,new_name text,page_content jsonb,fields jsonb)
returns public.funnels language plpgsql security definer set search_path='' as $$
declare current_funnel public.funnels%rowtype; selected_form uuid; next_version integer; field_item jsonb;
begin
  if not public.has_workspace_permission(selected_workspace,'funnels.manage') then raise exception 'funnel permission required' using errcode='42501'; end if;
  if not exists(select 1 from public.workspace_modules where workspace_id=selected_workspace and module_code='ai_funnel' and enabled) then raise exception 'AI Funnel System is not enabled' using errcode='42501'; end if;
  select * into current_funnel from public.funnels where id=target_funnel and workspace_id=selected_workspace for update;
  if current_funnel.id is null then raise exception 'funnel not found' using errcode='P0002'; end if;
  if jsonb_typeof(fields)<>'array' or jsonb_array_length(fields)>30 then raise exception 'invalid form fields' using errcode='22023'; end if;
  select id into selected_form from public.forms where workspace_id=selected_workspace and funnel_id=target_funnel limit 1;
  select coalesce(max(version),0)+1 into next_version from public.funnel_pages where workspace_id=selected_workspace and funnel_id=target_funnel;
  insert into public.funnel_pages(workspace_id,funnel_id,version,content) values(selected_workspace,target_funnel,next_version,page_content);
  delete from public.form_fields where workspace_id=selected_workspace and form_id=selected_form;
  for field_item in select value from jsonb_array_elements(fields) loop
    insert into public.form_fields(workspace_id,form_id,field_key,label,field_type,required,position,validation)
    values(selected_workspace,selected_form,field_item->>'key',field_item->>'label',field_item->>'type',coalesce((field_item->>'required')::boolean,false),coalesce((field_item->>'position')::integer,0),coalesce(field_item->'validation','{}'::jsonb));
  end loop;
  update public.funnels set name=trim(new_name),status='draft' where id=target_funnel returning * into current_funnel;
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id) values(selected_workspace,auth.uid(),'funnel.updated','funnel',target_funnel);
  return current_funnel;
end $$;
revoke all on function public.save_funnel_config(uuid,uuid,text,jsonb,jsonb) from public;
grant execute on function public.save_funnel_config(uuid,uuid,text,jsonb,jsonb) to authenticated;

create or replace function public.publish_funnel(target_id uuid, should_publish boolean default true)
returns public.funnels language plpgsql security definer set search_path='' as $$
declare wid uuid; current_funnel public.funnels%rowtype; version_to_publish integer;
begin
  select workspace_id into wid from public.funnels where id=target_id;
  if wid is null or not public.has_workspace_permission(wid,'funnels.manage') then raise exception 'funnel permission required' using errcode='42501'; end if;
  if should_publish and not exists(select 1 from public.forms fm join public.form_fields ff on ff.form_id=fm.id where fm.workspace_id=wid and fm.funnel_id=target_id) then raise exception 'funnel must have form fields before publishing' using errcode='22023'; end if;
  if should_publish and not exists(select 1 from public.workspace_modules where workspace_id=wid and module_code='ai_funnel' and enabled) then raise exception 'AI Funnel System is not enabled' using errcode='42501'; end if;
  select max(version) into version_to_publish from public.funnel_pages where workspace_id=wid and funnel_id=target_id;
  update public.funnels set status=case when should_publish then 'published' else 'inactive' end,
    published_version=case when should_publish then version_to_publish else published_version end
    where id=target_id returning * into current_funnel;
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id) values(wid,auth.uid(),case when should_publish then 'funnel.published' else 'funnel.deactivated' end,'funnel',target_id);
  return current_funnel;
end $$;
revoke all on function public.publish_funnel(uuid,boolean) from public;
grant execute on function public.publish_funnel(uuid,boolean) to authenticated;

create or replace function public.save_booking_link(selected_workspace uuid, target_url text)
returns public.booking_configs language plpgsql security definer set search_path='' as $$
declare saved public.booking_configs%rowtype;
begin
  if not public.has_workspace_permission(selected_workspace,'workspace.manage') then raise exception 'workspace permission required' using errcode='42501'; end if;
  if target_url !~ '^https://[^[:space:]]+$' or length(target_url)>2048 then raise exception 'booking URL must use HTTPS' using errcode='22023'; end if;
  select * into saved from public.booking_configs where workspace_id=selected_workspace and provider='external_link' limit 1;
  if saved.id is null then insert into public.booking_configs(workspace_id,provider,booking_url,active) values(selected_workspace,'external_link',target_url,true) returning * into saved;
  else update public.booking_configs set booking_url=target_url,active=true where id=saved.id returning * into saved; end if;
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id) values(selected_workspace,auth.uid(),'booking.link_updated','booking_config',saved.id);
  return saved;
end $$;
revoke all on function public.save_booking_link(uuid,text) from public;
grant execute on function public.save_booking_link(uuid,text) to authenticated;

create or replace function public.request_booking(selected_workspace uuid,target_lead uuid)
returns public.booking_requests language plpgsql security definer set search_path='' as $$
declare config_id uuid; requested public.booking_requests%rowtype;
begin
  if not public.has_workspace_permission(selected_workspace,'leads.manage') then raise exception 'lead permission required' using errcode='42501'; end if;
  if not exists(select 1 from public.leads where id=target_lead and workspace_id=selected_workspace) then raise exception 'lead not found' using errcode='P0002'; end if;
  select id into config_id from public.booking_configs where workspace_id=selected_workspace and active order by id limit 1;
  if config_id is null then raise exception 'booking link is not configured' using errcode='P0002'; end if;
  insert into public.booking_requests(workspace_id,lead_id,booking_config_id,status) values(selected_workspace,target_lead,config_id,'requested') returning * into requested;
  insert into public.lead_activities(workspace_id,lead_id,activity_type,details,created_by) values(selected_workspace,target_lead,'booking.requested',jsonb_build_object('request_id',requested.id),auth.uid());
  return requested;
end $$;
revoke all on function public.request_booking(uuid,uuid) from public;
grant execute on function public.request_booking(uuid,uuid) to authenticated;

create or replace function public.create_followup_sequence(selected_workspace uuid,sequence_name text,steps jsonb,activate boolean)
returns public.followup_sequences language plpgsql security definer set search_path='' as $$
declare made public.followup_sequences%rowtype; item jsonb; next_version integer;
begin
  if not public.has_workspace_permission(selected_workspace,'workflows.manage') then raise exception 'workflow permission required' using errcode='42501'; end if;
  if jsonb_typeof(steps)<>'array' or jsonb_array_length(steps)<1 or jsonb_array_length(steps)>1000 then raise exception 'invalid step collection' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(steps) as x(value) where value->>'action_type' not in ('email','internal_notification')) then raise exception 'unsupported follow-up action' using errcode='22023'; end if;
  select coalesce(max(version),0)+1 into next_version from public.followup_sequences where workspace_id=selected_workspace and name=trim(sequence_name);
  insert into public.followup_sequences(workspace_id,name,status,version) values(selected_workspace,trim(sequence_name),case when activate then 'active' else 'draft' end,next_version) returning * into made;
  for item in select value from jsonb_array_elements(steps) loop
    insert into public.followup_steps(workspace_id,sequence_id,position,action_type,delay_config,config)
    values(selected_workspace,made.id,(item->>'position')::integer,item->>'action_type',coalesce(item->'delay_config','{}'::jsonb),coalesce(item->'config','{}'::jsonb));
  end loop;
  insert into public.activity_logs(workspace_id,actor_profile_id,event_type,target_type,target_id) values(selected_workspace,auth.uid(),'followup.sequence_created','followup_sequence',made.id);
  return made;
end $$;
revoke all on function public.create_followup_sequence(uuid,text,jsonb,boolean) from public;
grant execute on function public.create_followup_sequence(uuid,text,jsonb,boolean) to authenticated;

-- New submissions start the first step of active sequences in the durable scheduler.
create or replace function public.schedule_followup_for_submission()
returns trigger language plpgsql security definer set search_path='' as $$
declare seq record; step public.followup_steps%rowtype; execution_id uuid; delay_minutes double precision;
begin
  for seq in select id from public.followup_sequences where workspace_id=new.workspace_id and status='active' loop
    select * into step from public.followup_steps where workspace_id=new.workspace_id and sequence_id=seq.id order by position limit 1;
    if step.id is null then continue; end if;
    delay_minutes := coalesce((step.delay_config->>'minutes')::double precision,0);
    insert into public.workflow_executions(workspace_id,lead_id,sequence_id,state,idempotency_key)
    values(new.workspace_id,new.lead_id,seq.id,'pending','submission:'||new.id::text||':sequence:'||seq.id::text)
    on conflict(workspace_id,idempotency_key) do nothing returning id into execution_id;
    if execution_id is not null then
      insert into public.scheduled_actions(workspace_id,execution_id,run_at,state,idempotency_key,payload)
      values(new.workspace_id,execution_id,now()+make_interval(mins=>delay_minutes),'pending','execution:'||execution_id::text||':step:'||step.id::text,jsonb_build_object('step_id',step.id,'lead_id',new.lead_id,'sequence_id',seq.id));
    end if;
  end loop;
  return new;
end $$;
create trigger form_submission_schedule_followups after insert on public.form_submissions for each row execute function public.schedule_followup_for_submission();
