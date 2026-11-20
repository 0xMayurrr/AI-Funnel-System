import app from './app.ts'
import { dispatchDueActions } from './dispatch.ts'

const port = Number(process.env.PORT ?? 8787)
const { serve } = await import('@hono/node-server')
serve({ fetch: app.fetch, port }, (info) => console.log(`Buildicy API listening on http://localhost:${info.port}`))
const dispatchEnv={...process.env,SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY,RESEND_API_KEY:process.env.RESEND_API_KEY,RESEND_FROM_EMAIL:process.env.RESEND_FROM_EMAIL}
setInterval(()=>{void dispatchDueActions(dispatchEnv).then(result=>{if(result.claimed)console.log(JSON.stringify({event:'scheduled_dispatch',...result}))}).catch(error=>console.error(JSON.stringify({event:'scheduled_dispatch_failed',message:error instanceof Error?error.message:'unknown'})))},60_000)
