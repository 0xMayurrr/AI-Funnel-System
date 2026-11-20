import { ResendEmailProvider } from './email-provider.ts'
import type { SupabaseEnv } from './supabase.ts'

type DispatchEnv=SupabaseEnv & {SUPABASE_SERVICE_ROLE_KEY?:string;RESEND_API_KEY?:string;RESEND_FROM_EMAIL?:string;MAX_ACTION_ATTEMPTS?:string}
type Action={id:string;workspace_id:string;execution_id:string;attempts:number;idempotency_key:string;payload:Record<string,string>}
type DbLead={id:string;name:string;email_normalized:string|null;company:string;communication_preferences:Record<string,unknown>}
type Step={id:string;position:number;action_type:string;delay_config:{minutes?:number};config:{subject?:string;body?:string}}

const root=(env:DispatchEnv)=>env.SUPABASE_URL!.replace(/\/$/,'')
async function db<T>(env:DispatchEnv,path:string,init?:RequestInit):Promise<T>{
  const key=env.SUPABASE_SERVICE_ROLE_KEY!
  const response=await fetch(`${root(env)}${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers}})
  const raw=await response.text();const payload=raw?JSON.parse(raw):null
  if(!response.ok) throw Object.assign(new Error((payload as {message?:string})?.message??'Scheduler database operation failed.'),{status:response.status})
  return payload as T
}
const escapeHtml=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')
const format=(value:string,lead:DbLead)=>value.replaceAll('{{name}}',lead.name).replaceAll('{{company}}',lead.company??'').replaceAll('{{email}}',lead.email_normalized??'')

export async function dispatchDueActions(env:DispatchEnv){
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY) return {claimed:0,completed:0,failed:0,skipped:'scheduler credentials not configured'}
  const maxAttempts=Math.max(1,Math.min(20,Number(env.MAX_ACTION_ATTEMPTS??5)))
  const actions=await db<Action[]>(env,'/rest/v1/rpc/claim_due_actions',{method:'POST',body:JSON.stringify({batch_size:25})})
  let completed=0,failed=0
  for(const action of actions){
    try{
      const leadRows=await db<DbLead[]>(env,`/rest/v1/leads?select=id,name,email_normalized,company,communication_preferences&id=eq.${action.payload.lead_id}&workspace_id=eq.${action.workspace_id}&limit=1`)
      const lead=leadRows[0]
      if(!lead) throw Object.assign(new Error('Lead record was removed.'),{permanent:true})
      const preferences=lead.communication_preferences??{}
      if(preferences.email_consent!==true||preferences.opted_out===true){
        await settle(env,action,'cancelled','consent_revoked')
        continue
      }
      const sequenceRows=await db<Array<{id:string;status:string}>>(env,`/rest/v1/followup_sequences?select=id,status&id=eq.${action.payload.sequence_id}&workspace_id=eq.${action.workspace_id}&limit=1`)
      if(sequenceRows[0]?.status!=='active'){
        await settle(env,action,'cancelled','sequence_inactive')
        continue
      }
      const steps=await db<Step[]>(env,`/rest/v1/followup_steps?select=id,position,action_type,delay_config,config&id=eq.${action.payload.step_id}&workspace_id=eq.${action.workspace_id}&limit=1`)
      const step=steps[0]
      if(!step) throw Object.assign(new Error('Follow-up step no longer exists.'),{permanent:true})
      let providerReference='internal'
      if(step.action_type==='email'){
        if(!env.RESEND_API_KEY||!env.RESEND_FROM_EMAIL) throw Object.assign(new Error('Email delivery credentials are not configured.'),{transient:true})
        if(!lead.email_normalized) throw Object.assign(new Error('Lead has no email address.'),{permanent:true})
        const subject=format(step.config.subject??'',lead)
        const body=format(step.config.body??'',lead)
        if(!subject.trim()||!body.trim()) throw Object.assign(new Error('Email subject or body is blank.'),{permanent:true})
        const provider=new ResendEmailProvider(env.RESEND_API_KEY,env.RESEND_FROM_EMAIL)
        const result=await provider.send({from:env.RESEND_FROM_EMAIL,to:lead.email_normalized,subject,text:body,html:`<p>${escapeHtml(body).replaceAll('\n','<br/>')}</p>`,idempotencyKey:action.idempotency_key})
        providerReference=result.providerReference
      } else if(step.action_type!=='internal_notification') throw Object.assign(new Error('Unsupported follow-up action.'),{permanent:true})
      await db(env,'/rest/v1/notifications',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({workspace_id:action.workspace_id,lead_id:lead.id,channel:step.action_type==='email'?'email':'internal',status:'sent',idempotency_key:action.idempotency_key,provider_reference:providerReference})})
      await db(env,`/rest/v1/scheduled_actions?id=eq.${action.id}&workspace_id=eq.${action.workspace_id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({state:'succeeded'})})
      const nextRows=await db<Step[]>(env,`/rest/v1/followup_steps?select=id,position,action_type,delay_config,config&workspace_id=eq.${action.workspace_id}&sequence_id=eq.${action.payload.sequence_id}&position=gt.${step.position}&order=position.asc&limit=1`)
      const next=nextRows[0]
      if(next){
        const executionRows=await db<Array<{id:string}>>(env,`/rest/v1/workflow_executions?id=eq.${action.execution_id}&workspace_id=eq.${action.workspace_id}&select=id`)
        const delay=Math.max(0,Number(next.delay_config?.minutes??0))
        await db(env,'/rest/v1/scheduled_actions',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({workspace_id:action.workspace_id,execution_id:executionRows[0]?.id,run_at:new Date(Date.now()+delay*60000).toISOString(),state:'pending',idempotency_key:`execution:${action.execution_id}:step:${next.id}`,payload:{step_id:next.id,lead_id:lead.id,sequence_id:action.payload.sequence_id}})})
        await db(env,`/rest/v1/workflow_executions?id=eq.${action.execution_id}&workspace_id=eq.${action.workspace_id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({state:'pending',updated_at:new Date().toISOString()})})
      }else await db(env,`/rest/v1/workflow_executions?id=eq.${action.execution_id}&workspace_id=eq.${action.workspace_id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({state:'succeeded',updated_at:new Date().toISOString()})})
      completed+=1
    }catch(error){
      const failure=error as {message?:string;transient?:boolean;permanent?:boolean;status?:number}
      const transient=failure.transient??(failure.status===429||(failure.status??0)>=500)
      const willRetry=transient&&!failure.permanent&&action.attempts<maxAttempts
      const delay=Math.min(60,2**Math.min(action.attempts,6))
      await db(env,`/rest/v1/scheduled_actions?id=eq.${action.id}&workspace_id=eq.${action.workspace_id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({state:willRetry?'retry':'failed',run_at:willRetry?new Date(Date.now()+delay*60000).toISOString():undefined,payload:{...action.payload,last_error:String(failure.message??'delivery_failed').slice(0,300)}})})
      await db(env,`/rest/v1/workflow_executions?id=eq.${action.execution_id}&workspace_id=eq.${action.workspace_id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({state:willRetry?'retry':'failed',error_code:String(failure.status??'delivery_failed'),updated_at:new Date().toISOString()})})
      failed+=1
    }
  }
  return {claimed:actions.length,completed,failed}
}

async function settle(env:DispatchEnv,action:Action,state:'cancelled',reason:string){
  await db(env,`/rest/v1/scheduled_actions?id=eq.${action.id}&workspace_id=eq.${action.workspace_id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({state,payload:{...action.payload,cancel_reason:reason}})})
  await db(env,`/rest/v1/workflow_executions?id=eq.${action.execution_id}&workspace_id=eq.${action.workspace_id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({state,updated_at:new Date().toISOString()})})
}
