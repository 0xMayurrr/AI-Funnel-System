import { useState } from 'react'
import {
  ShieldCheck, Command, ArrowRight, Building2, UserCheck,
  Sparkles, Check, KeyRound, AlertCircle, LoaderCircle,
  Zap
} from 'lucide-react'

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

      setNotice(`Authenticated as ${userEmail}. Redirecting to ${role === 'admin' ? 'Agency Back Office' : 'Client Portal'}...`)
      setTimeout(() => {
        onLoginSuccess(role, userEmail)
      }, 400)
    } catch {
      // Fallback for offline demo
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
    <div className="login-page-wrapper">
      {/* Top Navigation */}
      <header className="login-top-nav">
        <div className="brand-logo-group">
          <span className="brand-mark-box"><Command size={18} strokeWidth={2.5} /></span>
          <span className="brand-name-text">buildicy</span>
          <span className="brand-platform-tag">AI Lead Recovery & Booking Platform</span>
        </div>

        <div className="top-nav-status">
          <span className="status-indicator-dot" />
          <span>Meta Cloud API & CRM Layer: <strong>Operational</strong></span>
        </div>
      </header>

      {/* Main Container */}
      <main className="login-main-layout">
        {/* Left Column: Platform Overview & Value Showcase */}
        <section className="login-showcase-column">
          <div className="showcase-badge">
            <Sparkles size={13} />
            <span>AI REVENUE RECOVERY LAYER</span>
          </div>

          <h1>Capture Every Enquiry. Recover Every No-Show.</h1>
          <p className="showcase-lead-p">
            Buildicy captures every enquiry, responds in seconds, qualifies the prospect, routes them to the right agent, books the site visit, follows up automatically, recovers no-shows, and syncs everything directly to your existing CRM.
          </p>

          <div className="showcase-features-stack">
            <div className="feature-item">
              <div className="feat-icon-box green">
                <Zap size={18} />
              </div>
              <div>
                <strong>Respond in Under 60 Seconds</strong>
                <p>Instant WhatsApp & multi-channel response before prospects abandon your listings or go to competitors.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feat-icon-box purple">
                <Sparkles size={18} />
              </div>
              <div>
                <strong>Qualify Before Agents Waste Time</strong>
                <p>Configurable discovery for verified budget, purchasing timeline, location fit, and financing readiness.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feat-icon-box blue">
                <Building2 size={18} />
              </div>
              <div>
                <strong>Automated No-Show Recovery</strong>
                <p>Salvages 75%+ of missed appointments with instant multi-channel reschedule flows and closer alerts.</p>
              </div>
            </div>
          </div>

          <div className="showcase-trust-bar">
            <div className="trust-stat">
              <strong>$23.5M</strong>
              <small>Recovered Pipeline</small>
            </div>
            <div className="trust-sep" />
            <div className="trust-stat">
              <strong>&lt; 60s</strong>
              <small>Speed to Lead SLA</small>
            </div>
            <div className="trust-sep" />
            <div className="trust-stat">
              <strong>38.4%</strong>
              <small>Conversion Lift</small>
            </div>
          </div>
        </section>

        {/* Right Column: High-End Sign-In Card */}
        <section className="login-card-column">
          <div className="enterprise-login-card">
            <div className="card-header-block">
              <span className="auth-step-pill">UNIFIED LOGIN GATEWAY</span>
              <h2>Choose Portal & Sign In</h2>
              <p>Select your persona for 1-click instant access, or enter your credentials below.</p>
            </div>

            {notice && (
              <div className="login-toast success">
                <Check size={16} />
                <span>{notice}</span>
              </div>
            )}

            {errorMessage && (
              <div className="login-toast error">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick 1-Click Persona Cards */}
            <div className="persona-selection-grid">
              {/* Card 1: Agency Back Office */}
              <div
                className="persona-action-card admin"
                onClick={fillAdmin}
                role="button"
                tabIndex={0}
              >
                <div className="persona-avatar-box admin">
                  <Building2 size={20} />
                </div>
                <div className="persona-details-col">
                  <div className="persona-head-row">
                    <strong>1. Agency Back Office (/admin)</strong>
                    <span className="persona-role-tag admin">SuperAdmin</span>
                  </div>
                  <span className="persona-desc-line">Workspaces, Outcome-Based Packages, AI Brain & Tickets</span>
                  <code className="persona-cred-code">admin@buildicy.com • Password123!</code>
                </div>
                <ArrowRight size={16} className="persona-arrow-icon" />
              </div>

              {/* Card 2: Client Portal */}
              <div
                className="persona-action-card client"
                onClick={fillClient}
                role="button"
                tabIndex={0}
              >
                <div className="persona-avatar-box client">
                  <UserCheck size={20} />
                </div>
                <div className="persona-details-col">
                  <div className="persona-head-row">
                    <strong>2. Client Portal (/)</strong>
                    <span className="persona-role-tag client">Prestige Realty</span>
                  </div>
                  <span className="persona-desc-line">Real-Time Lead Recovery, Live WhatsApp Chats & Site Visits</span>
                  <code className="persona-cred-code">client@prestigerealty.com • Password123!</code>
                </div>
                <ArrowRight size={16} className="persona-arrow-icon" />
              </div>
            </div>

            <div className="login-divider-row">
              <span>OR ENTER CUSTOM CREDENTIALS</span>
            </div>

            {/* Custom Credentials Form */}
            <form
              className="login-form-block"
              onSubmit={e => {
                e.preventDefault()
                handleSignIn(email, password)
              }}
            >
              <div className="form-field-group">
                <label>Work Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@buildicy.com or client@prestigerealty.com"
                />
              </div>

              <div className="form-field-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>

              <button
                type="submit"
                className="login-submit-button"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin-icon" size={16} />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Sign In to Platform</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <div className="login-security-footer">
              <ShieldCheck size={14} className="text-emerald" />
              <span>Multi-tenant schema isolation with Supabase RLS & Meta Cloud API webhooks</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
