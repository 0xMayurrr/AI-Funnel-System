create or replace function public.claim_due_actions(batch_size integer default 25)
returns setof public.scheduled_actions language plpgsql security definer set search_path='' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'scheduler credential required' using errcode='42501'; end if;
  return query
    with due as (
      select id from public.scheduled_actions
      where state in ('pending','retry') and run_at<=now()
      order by run_at for update skip locked limit greatest(1,least(batch_size,100))
    )
    update public.scheduled_actions a set state='running',attempts=a.attempts+1
    from due where a.id=due.id returning a.*;
end $$;
revoke all on function public.claim_due_actions(integer) from public,anon,authenticated;
grant execute on function public.claim_due_actions(integer) to service_role;
create index if not exists scheduled_action_execution on public.scheduled_actions(workspace_id,execution_id,state);
create index if not exists workflow_sequence_state on public.workflow_executions(workspace_id,sequence_id,state);
