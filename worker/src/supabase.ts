import type { Context } from 'hono'

export type SupabaseEnv = { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string; DEMO_MODE?: string }
export type PrivilegedEnv = SupabaseEnv & { SUPABASE_SERVICE_ROLE_KEY?:string }
export type WorkspaceActor = { userId: string; workspaceId: string; role: string; accessToken: string }
export class SupabaseHttpError extends Error {
  constructor(message: string, readonly status: number, readonly code = 'SUPABASE_ERROR') { super(message); this.name = 'SupabaseHttpError' }
}

export const configured = (env?: SupabaseEnv) => Boolean(env?.SUPABASE_URL && env?.SUPABASE_ANON_KEY)
const base = (env: SupabaseEnv) => env.SUPABASE_URL!.replace(/\/$/, '')
const headers = (env: SupabaseEnv, token?: string, json = false) => ({ apikey: env.SUPABASE_ANON_KEY!, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}) })

export async function supabaseAuth(env: SupabaseEnv, action: 'password' | 'signup' | 'refresh', body: unknown) {
  const endpoint = action === 'password' ? '/auth/v1/token?grant_type=password' : action === 'refresh' ? '/auth/v1/token?grant_type=refresh_token' : '/auth/v1/signup'
  const response = await fetch(`${base(env)}${endpoint}`, { method: 'POST', headers: headers(env, undefined, true), body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new SupabaseHttpError(String(payload.msg ?? payload.message ?? payload.error_description ?? 'Authentication failed.'), response.status, String(payload.error_code ?? payload.code ?? 'AUTH_FAILED'))
  return payload
}

export async function supabaseRequest<T>(env: SupabaseEnv, token: string | undefined, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base(env)}${path}`, { ...init, headers: { ...headers(env, token, init?.body !== undefined), ...init?.headers } })
  const raw = await response.text()
  const payload = raw ? JSON.parse(raw) as unknown : null
  if (!response.ok) {
    const detail = payload as { message?: string; details?: string; code?: string } | null
    throw new SupabaseHttpError(detail?.message ?? detail?.details ?? 'Database request failed.', response.status, detail?.code)
  }
  return payload as T
}

/** Privileged calls are used only for narrowly scoped service functions from the server. */
export async function supabaseServiceRequest<T>(env:PrivilegedEnv,path:string,init?:RequestInit):Promise<T>{
  if(!env.SUPABASE_SERVICE_ROLE_KEY)throw new SupabaseHttpError('Server service credential is not configured.',503,'SERVICE_NOT_CONFIGURED')
  const key=env.SUPABASE_SERVICE_ROLE_KEY
  const response=await fetch(`${base(env)}${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers}})
  const raw=await response.text();const payload=raw?JSON.parse(raw) as unknown:null
  if(!response.ok){const detail=payload as {message?:string;details?:string;code?:string}|null;throw new SupabaseHttpError(detail?.message??detail?.details??'Privileged database operation failed.',response.status,detail?.code)}
  return payload as T
}

export async function workspaceActor(c: Context<{ Bindings: SupabaseEnv }>, permission?: string, moduleCode?: string): Promise<WorkspaceActor> {
  const env = c.env
  const authorization = c.req.header('Authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new SupabaseHttpError('Sign in to continue.', 401, 'AUTH_REQUIRED')
  const user = await supabaseRequest<{ id: string }>(env, token, '/auth/v1/user')
  const memberships = await supabaseRequest<Array<{ workspace_id: string; role_id: string; status: string; roles?: { code: string } | { code: string }[] }>>(env, token, `/rest/v1/workspace_memberships?select=workspace_id,role_id,status,roles!workspace_memberships_role_id_fkey(code)&profile_id=eq.${encodeURIComponent(user.id)}&status=eq.active&order=created_at.asc`)
  const requestedWorkspace = c.req.header('X-Workspace-Id')
  const membership = requestedWorkspace ? memberships.find((item) => item.workspace_id === requestedWorkspace) : memberships.length === 1 ? memberships[0] : undefined
  if (!membership) throw new SupabaseHttpError(memberships.length > 1 ? 'Select a workspace to continue.' : 'Create a workspace to continue.', 403, memberships.length > 1 ? 'WORKSPACE_REQUIRED' : 'WORKSPACE_MISSING')
  const roles = Array.isArray(membership.roles) ? membership.roles[0] : membership.roles
  const role = roles?.code ?? 'unknown'
  if (moduleCode) {
    const enabled = await supabaseRequest<Array<{enabled:boolean}>>(env, token, `/rest/v1/workspace_modules?select=enabled&workspace_id=eq.${membership.workspace_id}&module_code=eq.${encodeURIComponent(moduleCode)}&enabled=eq.true`)
    if (!enabled.length) throw new SupabaseHttpError('This service module is not enabled for the workspace.',403,'MODULE_DISABLED')
  }
  if (permission) {
    const grants = await supabaseRequest<Array<{ permission_code: string }>>(env, token, `/rest/v1/role_permissions?select=permission_code&role_id=eq.${encodeURIComponent(membership.role_id)}`)
    if (!grants.some((item) => item.permission_code === permission)) throw new SupabaseHttpError('Your workspace role does not allow this action.', 403, 'PERMISSION_DENIED')
  }
  return { userId: user.id, workspaceId: membership.workspace_id, role, accessToken: token }
}

export function query(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, String(value))
  return params.toString()
}
