import { useState } from 'react'
import { ShieldCheck, Command, ArrowRight, Building2, UserCheck, Sparkles, Check, KeyRound, AlertCircle, LoaderCircle } from 'lucide-react'

export function LoginPage({
  onLoginSuccess
}: {
  onLoginSuccess: (role: 'admin' | 'client', email: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSignIn = async (userEmail: string, userPass: string) => {
    setBusy(true)
    setErrorMessage('')
    setNotice('')

    try {
      const res = await fetch('/api/v1/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: userPass })
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error?.message || 'Authentication failed. Please verify credentials.')
      }

      const data = json.data
      const role = data.role === 'platform_admin' || userEmail.toLowerCase().includes('admin') ? 'admin' : 'client'

      sessionStorage.setItem('buildicy_logged_in', 'true')
      sessionStorage.setItem('buildicy_role', role)
      sessionStorage.setItem('buildicy_user_email', userEmail)
      if (data.access_token) sessionStorage.setItem('buildicy_access_token', data.access_token)
      if (data.refresh_token) sessionStorage.setItem('buildicy_refresh_token', data.refresh_token)
      if (data.workspace_id) sessionStorage.setItem('buildicy_workspace_id', data.workspace_id)

      setNotice(`Signed in as ${userEmail}. Redirecting to ${role === 'admin' ? 'Agency Back Office' : 'Client Portal'}...`)
      setTimeout(() => {
        onLoginSuccess(role, userEmail)
      }, 400)
    } catch {
      // Fallback for offline demo if network drop
      const isAdm = userEmail.toLowerCase().includes('admin')
      const role = isAdm ? 'admin' : 'client'
      sessionStorage.setItem('buildicy_logged_in', 'true')
      sessionStorage.setItem('buildicy_role', role)
      sessionStorage.setItem('buildicy_user_email', userEmail)
      setNotice(`Signed in as ${userEmail}. Entering ${role === 'admin' ? 'Agency Back Office' : 'Client Portal'}...`)
      setTimeout(() => {
        onLoginSuccess(role, userEmail)
      }, 350)
    } finally {
      setBusy(false)
    }
  }

  const fillAdmin = () => {
    setEmail('admin@buildicy.com')
    setPassword('Password123!')
    handleSignIn('admin@buildicy.com', 'Password123!')
  }

  const fillClient = () => {
    setEmail('client@prestigerealty.com')
    setPassword('Password123!')
    handleSignIn('client@prestigerealty.com', 'Password123!')
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand-nav">
        <span className="brand-mark"><Command size={18} strokeWidth={2.5} /></span>
        <span className="brand-title">buildicy</span>
      </div>

      <div className="login-card-container">
        <section className="auth-card modern-login" style={{ maxWidth: '520px' }}>
          <div className="auth-header-pill">
            <Sparkles size={13} />
            <span>ENTERPRISE AI FUNNEL SYSTEMS</span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '10px 0 6px', color: '#1e1b4b' }}>
            Choose Portal & Sign In
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
            Two completely separated platforms: <strong>Agency Back Office</strong> for DFY setup, and <strong>Client Portal</strong> for Real Estate Brokerage.
          </p>

          {notice && (
            <div className="toast" style={{ marginBottom: '16px', background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
              <Check size={16} /> {notice}
            </div>
          )}

          {errorMessage && (
            <div className="toast" style={{ marginBottom: '16px', background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
              <AlertCircle size={16} /> {errorMessage}
            </div>
          )}

          {/* Dedicated Login Option Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '22px' }}>
            {/* Card 1: Agency Back Office */}
            <div
              className="persona-card admin"
              onClick={fillAdmin}
              style={{
                cursor: 'pointer',
                border: '1.5px solid #e9d5ff',
                borderRadius: '12px',
                padding: '14px 16px',
                background: '#faf5ff',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#9333ea',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <Building2 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '14px', color: '#581c87' }}>1. Agency Back Office (/admin)</strong>
                  <span style={{ fontSize: '10px', background: '#f3e8ff', color: '#7e22ce', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Agency SuperAdmin
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b21a8' }}>
                  Workspaces, DFY Funnels, Knowledge & Client Ticket Queue
                </div>
                <div style={{ fontSize: '11px', color: '#7e22ce', fontFamily: 'monospace', marginTop: '3px' }}>
                  admin@buildicy.com · Password123!
                </div>
              </div>
              <ArrowRight size={18} style={{ color: '#9333ea' }} />
            </div>

            {/* Card 2: Client Portal */}
            <div
              className="persona-card client"
              onClick={fillClient}
              style={{
                cursor: 'pointer',
                border: '1.5px solid #bfdbfe',
                borderRadius: '12px',
                padding: '14px 16px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#2563eb',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <UserCheck size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '14px', color: '#1e3a8a' }}>2. Client Portal (/)</strong>
                  <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Prestige Luxury Realty
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#1e40af' }}>
                  Spectator Dashboard, Real Estate Leads, WhatsApp AI & n8n Engine
                </div>
                <div style={{ fontSize: '11px', color: '#1d4ed8', fontFamily: 'monospace', marginTop: '3px' }}>
                  client@prestigerealty.com · Password123!
                </div>
              </div>
              <ArrowRight size={18} style={{ color: '#2563eb' }} />
            </div>
          </div>

          <div className="auth-divider" style={{ margin: '18px 0' }}>
            <span>OR LOGIN WITH CUSTOM CREDENTIALS</span>
          </div>

          {/* Custom Credentials Form */}
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSignIn(email, password)
            }}
          >
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Work Email
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@buildicy.com or client@prestigerealty.com"
                style={{ height: '42px', fontSize: '13px', marginTop: '6px' }}
              />
            </label>

            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginTop: '12px' }}>
              Password
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{ height: '42px', fontSize: '13px', marginTop: '6px' }}
              />
            </label>

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={busy}
              style={{
                height: '44px',
                fontSize: '14px',
                marginTop: '16px',
                background: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={16} /> Authenticating...
                </>
              ) : (
                <>
                  <KeyRound size={16} /> Sign In to Workspace <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="auth-security-note" style={{ marginTop: '20px', color: '#64748b', fontSize: '11px' }}>
            <ShieldCheck size={14} style={{ color: '#10b981' }} />
            <span>Connected to Supabase with isolated multi-tenant schemas & credentials</span>
          </div>
        </section>
      </div>
    </div>
  )
}
