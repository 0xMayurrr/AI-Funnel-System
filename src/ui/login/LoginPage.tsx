import { useState } from 'react'
import { ShieldCheck, Command, ArrowRight, Building2, UserCheck, Sparkles, Check } from 'lucide-react'

export function LoginPage({
  onLoginAsAdmin,
  onLoginAsClient,
  onCustomAuth
}: {
  onLoginAsAdmin: () => void
  onLoginAsClient: () => void
  onCustomAuth?: (email: string, pass: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  return (
    <div className="auth-shell">
      <div className="auth-brand-nav">
        <span className="brand-mark"><Command size={18} strokeWidth={2.5} /></span>
        <span className="brand-title">buildicy</span>
      </div>

      <div className="login-card-container">
        <section className="auth-card modern-login">
          <div className="auth-header-pill">
            <Sparkles size={13} />
            <span>AI FUNNEL SYSTEMS PLATFORM</span>
          </div>

          <h1>Sign in to Buildicy</h1>
          <p>Choose your account type or click below for instant one-click demo login.</p>

          {notice && (
            <div className="toast" style={{ marginBottom: '16px' }}>
              <Check size={14} /> {notice}
            </div>
          )}

          {/* Quick 1-Click Role Login Cards */}
          <div className="quick-persona-grid">
            <button
              type="button"
              className="persona-card admin"
              onClick={() => {
                setNotice('Signing into Agency Back Office...')
                setTimeout(onLoginAsAdmin, 250)
              }}
            >
              <div className="persona-icon admin">
                <Building2 size={20} />
              </div>
              <div className="persona-info">
                <strong>Agency Back Office</strong>
                <small>Full Agency Control (DFY Builder & Setup)</small>
                <code>admin@buildicy.com</code>
              </div>
              <ArrowRight size={16} className="persona-arrow" />
            </button>

            <button
              type="button"
              className="persona-card client"
              onClick={() => {
                setNotice('Opening Prestige Luxury Realty Client Portal...')
                setTimeout(onLoginAsClient, 250)
              }}
            >
              <div className="persona-icon client">
                <UserCheck size={20} />
              </div>
              <div className="persona-info">
                <strong>Client Portal (Prestige Realty)</strong>
                <small>Real Estate Broker Spectator Dashboard</small>
                <code>client@prestigerealty.com</code>
              </div>
              <ArrowRight size={16} className="persona-arrow" />
            </button>
          </div>

          <div className="auth-divider">
            <span>OR SIGN IN WITH EMAIL</span>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault()
              setBusy(true)
              if (onCustomAuth) {
                onCustomAuth(email, password)
              } else if (email.includes('admin')) {
                onLoginAsAdmin()
              } else {
                onLoginAsClient()
              }
              setBusy(false)
            }}
          >
            <label>Work Email
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </label>

            <label>Password
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </label>

            <button type="submit" className="primary-button auth-submit" disabled={busy}>
              Sign In <ArrowRight size={15} />
            </button>
          </form>

          <div className="auth-security-note">
            <ShieldCheck size={13} />
            <span>Multi-tenant workspace isolation & end-to-end encrypted</span>
          </div>
        </section>
      </div>
    </div>
  )
}
