import app from './app.ts'
import { dispatchDueActions } from './dispatch.ts'

type Env = { SUPABASE_URL?:string; SUPABASE_ANON_KEY?:string; SUPABASE_SERVICE_ROLE_KEY?:string; APP_ORIGIN?:string; DEMO_MODE?:string; RESEND_API_KEY?:string; RESEND_FROM_EMAIL?:string; MAX_ACTION_ATTEMPTS?:string }
export default {
  fetch: app.fetch,
  scheduled(_controller:{cron:string;scheduledTime:number},env:Env,ctx:{waitUntil(promise:Promise<unknown>):void}){
    ctx.waitUntil(dispatchDueActions(env).then(result=>console.log(JSON.stringify({event:'scheduled_dispatch',...result}))).catch(error=>console.error(JSON.stringify({event:'scheduled_dispatch_failed',message:error instanceof Error?error.message:'unknown'}))))
  },
}
