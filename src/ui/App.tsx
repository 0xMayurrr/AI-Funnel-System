import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Command, Check, LockKeyhole, ArrowRight, LoaderCircle, Sparkles } from 'lucide-react'
import { LoginPage } from './login/LoginPage'
import { ClientPortal } from './client/ClientPortal'
import { BackOffice as BackOfficeView } from './admin/BackOffice'

type FunnelField = { key: string; label: string; type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox'; required: boolean; position: number; validation?: Record<string, unknown> }

export const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const token = sessionStorage.getItem('buildicy_access_token')
  const request = (authToken: string | null) => fetch(`/api/v1${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...(sessionStorage.getItem('buildicy_workspace_id') ? { 'X-Workspace-Id': sessionStorage.getItem('buildicy_workspace_id')! } : {}), ...init?.headers } })
  let response = await request(token)
  if (response.status === 401 && sessionStorage.getItem('buildicy_refresh_token') && path !== '/auth/refresh') {
    const refreshed = await fetch('/api/v1/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: sessionStorage.getItem('buildicy_refresh_token') }) })
    if (refreshed.ok) {
      const data = (await refreshed.json()).data
      sessionStorage.setItem('buildicy_access_token', data.access_token)
      if (data.refresh_token) sessionStorage.setItem('buildicy_refresh_token', data.refresh_token)
      response = await request(data.access_token)
    }
  }
  const payload = await response.json()
  if (!response.ok) { const error = new Error(payload.error?.message ?? 'The request could not be completed.') as Error & { code?: string; status?: number }; error.code = payload.error?.code; error.status = response.status; throw error }
  return payload.data as T
}

export default function App() {
  if (window.location.pathname.startsWith('/public/')) {
    return <PublicFunnel slug={window.location.pathname.split('/')[2] ?? ''} />
  }

  const isBackOfficeRoute = window.location.pathname === '/admin' || window.location.search.includes('view=admin')
  const isLoginRoute = window.location.pathname === '/login'

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('buildicy_logged_in') === 'true'
  })

  const [currentRole, setCurrentRole] = useState<'client' | 'admin'>(() => {
    const stored = sessionStorage.getItem('buildicy_role') as 'client' | 'admin' | null
    if (stored) return stored
    if (isBackOfficeRoute) return 'admin'
    return 'client'
  })

  const handleLoginSuccess = (role: 'admin' | 'client') => {
    setCurrentRole(role)
    setIsLoggedIn(true)
    if (role === 'admin') {
      window.history.replaceState(null, '', '/admin')
    } else {
      window.history.replaceState(null, '', '/')
    }
  }

  const handleSignOut = () => {
    sessionStorage.removeItem('buildicy_logged_in')
    sessionStorage.removeItem('buildicy_role')
    sessionStorage.removeItem('buildicy_user_email')
    sessionStorage.removeItem('buildicy_access_token')
    sessionStorage.removeItem('buildicy_refresh_token')
    sessionStorage.removeItem('buildicy_workspace_id')
    setIsLoggedIn(false)
    window.history.replaceState(null, '', '/login')
  }

  if (!isLoggedIn || isLoginRoute) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  if (currentRole === 'admin') {
    return <BackOfficeView onSignOut={handleSignOut} />
  }

  return <ClientPortal onSignOut={handleSignOut} />
}

function PublicFunnel({ slug }: { slug: string }) {
  const funnel = useQuery({ queryKey: ['public-funnel', slug], queryFn: () => api<{ name: string; slug: string; headline: string; description: string; fields: FunnelField[] }>(`/public/funnels/${encodeURIComponent(slug)}`), enabled: Boolean(slug) })
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (slug) {
      fetch(`/api/v1/public/funnels/${encodeURIComponent(slug)}/views`, { method: 'POST' }).catch(() => { })
    }
  }, [slug])

  const send = useMutation({ mutationFn: () => api('/public/funnels/' + encodeURIComponent(slug) + '/submissions', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ answers: form, consent: form.consent === true }) }), onSuccess: () => setSubmitted(true), onError: (reason: Error) => setError(reason.message) })
  if (funnel.isLoading) return <div className="public-loading"><LoaderCircle className="spin" size={22} /><span>Loading enquiry page…</span></div>
  if (funnel.isError || !funnel.data) return <div className="public-loading"><span>This enquiry page is unavailable.</span><a href="/">Return to Buildicy</a></div>
  const fields = funnel.data.fields.slice().sort((a, b) => a.position - b.position)
  const setValue = (key: string, value: string | boolean) => setForm(previous => ({ ...previous, [key]: value }))
  return <div className="public-shell"><header className="public-header"><a className="brand public-brand" href="/"><span className="brand-mark"><Command size={17} /></span><span>buildicy</span></a><span>Enquiry form</span></header><main className="public-main"><div className="public-copy"><span className="public-overline"><Sparkles size={14} /> BUILDICY GROWTH SYSTEMS</span><h1>{funnel.data.headline}</h1><p>{funnel.data.description}</p><div className="public-assurance"><span><Check size={15} /> Thoughtful, human follow-up</span><span><Check size={15} /> Your details stay private</span></div></div><section className="public-form-card">{submitted ? <div className="public-success"><span><Check size={22} /></span><h2>Thanks for reaching out.</h2><p>Your enquiry is with our team. We’ll review it and follow up soon.</p></div> : <><div className="public-form-heading"><h2>Tell us about your business</h2><p>Share a few details and we’ll take it from here.</p></div><form onSubmit={event => { event.preventDefault(); setError(''); send.mutate() }}>{fields.map(field => field.type === 'checkbox' ? <label className="consent-label" key={field.key}><input type="checkbox" required={field.required} checked={form[field.key] === true} onChange={event => setValue(field.key, event.target.checked)} /><span>{field.label}</span></label> : <label key={field.key}>{field.label}{!field.required && <span className="optional-label"> OPTIONAL</span>}{field.type === 'textarea' ? <textarea required={field.required} maxLength={Number(field.validation?.maxLength ?? 1200)} rows={3} value={String(form[field.key] ?? '')} onChange={event => setValue(field.key, event.target.value)} /> : <input autoComplete={field.key === 'name' ? 'name' : field.key === 'email' ? 'email' : field.key === 'company' ? 'organization' : 'off'} type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'} required={field.required} maxLength={Number(field.validation?.maxLength ?? (field.key === 'email' ? 254 : 300))} value={String(form[field.key] ?? '')} onChange={event => setValue(field.key, event.target.value)} />}</label>)}{error && <div className="form-error">{error}</div>}<button className="primary-button public-submit" disabled={send.isPending}>{send.isPending && <LoaderCircle className="spin" size={15} />} Send enquiry <ArrowRight size={15} /></button><span className="privacy-note"><LockKeyhole size={12} /> Your information is handled securely.</span></form></>}</section></main><footer className="public-footer">© Buildicy · Systems that turn enquiries into conversations</footer></div>
}
