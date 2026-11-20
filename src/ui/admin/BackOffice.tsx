import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Sparkles, Plus, Check, X, CheckCircle2
} from 'lucide-react'

type WorkspaceItem = {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended'
  package_code: string
  package_name: string
  member_count: number
  modules: { ai_funnel: boolean; lead_concierge: boolean; growth_engine: boolean }
  created_at: string
}

type AdminOverview = {
  workspaces: number
  active_workspaces: number
  leads: number
  pending_actions: number
  failed_actions: number
  ai_calls_24h: number
  recent_errors: Array<unknown>
}

type ChangeRequest = {
  id: string
  workspace_id: string
  category: string
  title: string
  description: string
  priority: string
  status: 'pending' | 'in_progress' | 'completed' | 'declined'
  admin_notes?: string
  created_at: string
}

type KnowledgeDoc = {
  id: string
  title: string
  content: string
  approved: boolean
  source_type: string
  created_at: string
}

export function BackOffice({
  onSwitchToClient,
  onSignOut
}: {
  onSwitchToClient: () => void
  onSignOut: () => void
}) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'workspaces' | 'queue' | 'knowledge'>('workspaces')
  const [showCreateWs, setShowCreateWs] = useState(false)
  const [wsName, setWsName] = useState('')
  const [wsSlug, setWsSlug] = useState('')
  const [setupFunnelWs, setSetupFunnelWs] = useState<WorkspaceItem | null>(null)
  const [funnelName, setFunnelName] = useState('Miami Luxury Waterfront Villa Funnel')
  const [funnelSlug, setFunnelSlug] = useState('luxury-villa-inquiry')
  const [funnelHeadline, setFunnelHeadline] = useState('Exclusive Waterfront & Off-Market Luxury Properties')
  const [funnelDesc, setFunnelDesc] = useState('Tell us your acquisition criteria. Our AI broker will verify your criteria and schedule a private VIP tour.')
  const [notice, setNotice] = useState('')

  // Back Office Data
  const overview = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => fetch('/api/v1/admin/overview').then(r => r.json()).then(d => d.data as AdminOverview)
  })

  const workspaces = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: () => fetch('/api/v1/admin/workspaces').then(r => r.json()).then(d => d.data as WorkspaceItem[])
  })

  const changeRequests = useQuery({
    queryKey: ['admin-change-requests'],
    queryFn: () => fetch('/api/v1/change-requests').then(r => r.json()).then(d => d.data as ChangeRequest[])
  })

  const knowledgeDocs = useQuery({
    queryKey: ['admin-knowledge'],
    queryFn: () => fetch('/api/v1/knowledge').then(r => r.json()).then(d => d.data as KnowledgeDoc[])
  })

  // Create Workspace Mutation
  const createWsMutation = useMutation({
    mutationFn: () => fetch('/api/v1/admin/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: wsName, slug: wsSlug || wsName.toLowerCase().replace(/[^a-z0-9]/g, '-') })
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-workspaces'] })
      qc.invalidateQueries({ queryKey: ['admin-overview'] })
      setShowCreateWs(false)
      setWsName('')
      setWsSlug('')
      setNotice('New client workspace created and ready for DFY setup!')
    }
  })

  // Setup Funnel Mutation
  const setupFunnelMutation = useMutation({
    mutationFn: (wsId: string) => fetch(`/api/v1/admin/workspaces/${wsId}/funnels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: funnelName,
        slug: funnelSlug,
        headline: funnelHeadline,
        description: funnelDesc,
        publishImmediately: true,
        fields: [
          { key: 'name', label: 'Full Legal Name', type: 'text', required: true, position: 0 },
          { key: 'email', label: 'Direct Email', type: 'email', required: true, position: 1 },
          { key: 'phone', label: 'WhatsApp / Mobile Number', type: 'phone', required: true, position: 2 },
          { key: 'budget_range', label: 'Purchasing Budget', type: 'select', required: true, position: 3 },
          { key: 'service', label: 'Property Criteria', type: 'textarea', required: true, position: 4 },
          { key: 'consent', label: 'I agree to be contacted via WhatsApp.', type: 'checkbox', required: true, position: 5 }
        ]
      })
    }),
    onSuccess: () => {
      qc.invalidateQueries()
      setSetupFunnelWs(null)
      setNotice('Done-For-You Funnel published live on the web!')
    }
  })

  // Change Request Status Mutation
  const updateCrStatus = async (id: string, status: ChangeRequest['status']) => {
    await fetch(`/api/v1/change-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    qc.invalidateQueries({ queryKey: ['admin-change-requests'] })
    setNotice(`Ticket marked as ${status.toUpperCase()}!`)
  }

  // Toggle Module
  const toggleModule = async (wsId: string, mod: string, curVal: boolean) => {
    await fetch(`/api/v1/admin/workspaces/${wsId}/modules/${mod}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !curVal })
    })
    qc.invalidateQueries({ queryKey: ['admin-workspaces'] })
  }

  // Change Package
  const updatePackage = async (wsId: string, code: string) => {
    await fetch(`/api/v1/admin/workspaces/${wsId}/package`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    qc.invalidateQueries({ queryKey: ['admin-workspaces'] })
  }

  return (
    <div className="admin-shell">
      {/* Top Demo Switcher Bar */}
      <div className="demo-role-switcher-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="live-pulse-dot" style={{ backgroundColor: '#a855f7' }} />
          <span>Agency Back Office: <strong>Buildicy SuperAdmin</strong> (DFY Workspaces, Funnels & AI Brain)</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="role-switch-btn active">Agency Back Office</button>
          <button type="button" className="role-switch-btn" onClick={onSwitchToClient}>
            Switch to Client Portal ➔
          </button>
        </div>
      </div>

      <div className="admin-content-container">
        {/* Back Office Top Header */}
        <div className="admin-top-banner">
          <div>
            <h1>Buildicy Back Office</h1>
            <p>Deploy client funnels, assign growth packages, and resolve client DFY tickets.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowCreateWs(true)}
            >
              <Plus size={16} /> New Client Workspace
            </button>
            <button type="button" className="secondary-button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>

        {notice && (
          <div className="toast" style={{ marginBottom: '18px' }}>
            <Check size={16} /> {notice}
            <button onClick={() => setNotice('')}><X size={14} /></button>
          </div>
        )}

        {/* 4 Back Office KPI Cards */}
        <div className="modern-kpi-grid">
          <div className="modern-kpi-card">
            <span className="kpi-label">Active Client Workspaces</span>
            <strong className="kpi-val">{overview.data?.workspaces ?? 1}</strong>
            <span className="kpi-change green">All client tenants isolated</span>
          </div>

          <div className="modern-kpi-card">
            <span className="kpi-label">Cross-Platform Leads</span>
            <strong className="kpi-val">{overview.data?.leads ?? 5}</strong>
            <span className="kpi-change blue">Miami Waterfront & Penthouses</span>
          </div>

          <div className="modern-kpi-card">
            <span className="kpi-label">Pending Client Tickets</span>
            <strong className="kpi-val">{overview.data?.pending_actions ?? 2}</strong>
            <span className="kpi-change orange">DFY Agency Queue</span>
          </div>

          <div className="modern-kpi-card">
            <span className="kpi-label">OpenAI Brain Latency</span>
            <strong className="kpi-val">1.2s</strong>
            <span className="kpi-change green">gpt-4o-mini active</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tab-row">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'workspaces' ? 'active' : ''}`}
            onClick={() => setActiveTab('workspaces')}
          >
            🏢 Client Workspaces & Packages ({workspaces.data?.length ?? 1})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            📥 DFY Agency Change Requests Queue ({changeRequests.data?.length ?? 2})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveTab('knowledge')}
          >
            🧠 AI Knowledge Base & Rules Engine
          </button>
        </div>

        {/* TAB 1: CLIENT WORKSPACES */}
        {activeTab === 'workspaces' && (
          <div className="admin-workspaces-stack">
            {(workspaces.data ?? []).map(ws => (
              <div key={ws.id} className="panel admin-ws-card">
                <div className="admin-ws-top">
                  <div className="ws-brand-title">
                    <span className="ws-badge-avatar">{ws.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{ws.name}</strong>
                      <span className="ws-slug">app.buildicy.com/{ws.slug} · {ws.member_count} active seats</span>
                    </div>
                  </div>

                  <div className="ws-actions-top">
                    <select
                      className="status-select"
                      value={ws.package_code}
                      onChange={e => updatePackage(ws.id, e.target.value)}
                    >
                      <option value="starter">Starter Package</option>
                      <option value="growth">Growth Package (DFY)</option>
                      <option value="custom">Custom Enterprise</option>
                    </select>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setSetupFunnelWs(ws)}
                    >
                      <Sparkles size={14} /> Setup Funnel (DFY)
                    </button>
                  </div>
                </div>

                {/* Modules Toggles */}
                <div className="ws-modules-grid">
                  <label className="ws-mod-pill">
                    <input
                      type="checkbox"
                      checked={ws.modules?.ai_funnel}
                      onChange={() => toggleModule(ws.id, 'ai_funnel', ws.modules?.ai_funnel)}
                    />
                    <span>AI Funnel System <strong>(Active)</strong></span>
                  </label>

                  <label className="ws-mod-pill">
                    <input
                      type="checkbox"
                      checked={ws.modules?.growth_engine}
                      onChange={() => toggleModule(ws.id, 'growth_engine', ws.modules?.growth_engine)}
                    />
                    <span>n8n Workflow Growth Engine <strong>(Active)</strong></span>
                  </label>

                  <label className="ws-mod-pill">
                    <input
                      type="checkbox"
                      checked={ws.modules?.lead_concierge}
                      onChange={() => toggleModule(ws.id, 'lead_concierge', ws.modules?.lead_concierge)}
                    />
                    <span>WhatsApp Concierge <strong>(Active)</strong></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: DFY AGENCY CHANGE REQUESTS QUEUE */}
        {activeTab === 'queue' && (
          <div className="panel" style={{ padding: '20px' }}>
            <div className="panel-header" style={{ padding: '0 0 16px' }}>
              <div>
                <h2>Client Customization & Channel Requests Queue</h2>
                <p>Landing page tweaks, questionnaire changes, and WhatsApp numbers requested by clients.</p>
              </div>
            </div>

            <table className="admin-cr-table">
              <thead>
                <tr>
                  <th>Client / Workspace</th>
                  <th>Category & Request</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Agency Actions</th>
                </tr>
              </thead>
              <tbody>
                {(changeRequests.data ?? []).map(cr => (
                  <tr key={cr.id}>
                    <td>
                      <strong>Prestige Luxury Realty</strong><br />
                      <small style={{ color: '#888' }}>{new Date(cr.created_at).toLocaleDateString()}</small>
                    </td>
                    <td>
                      <span className="cr-category">{cr.category}</span>
                      <strong style={{ display: 'block', margin: '4px 0 2px' }}>{cr.title}</strong>
                      <span style={{ color: '#666', fontSize: '10px' }}>{cr.description}</span>
                    </td>
                    <td>
                      <span className={`cr-priority ${cr.priority}`}>{cr.priority}</span>
                    </td>
                    <td>
                      <span className={`cr-status ${cr.status}`}>{cr.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {cr.status === 'pending' && (
                          <button
                            type="button"
                            className="secondary-button small"
                            onClick={() => updateCrStatus(cr.id, 'in_progress')}
                          >
                            Start Work
                          </button>
                        )}
                        {cr.status !== 'completed' && (
                          <button
                            type="button"
                            className="primary-button small"
                            style={{ height: '28px', fontSize: '9px' }}
                            onClick={() => updateCrStatus(cr.id, 'completed')}
                          >
                            <CheckCircle2 size={12} /> Mark Live & Done
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: AI KNOWLEDGE BASE & RULES ENGINE */}
        {activeTab === 'knowledge' && (
          <div className="panel" style={{ padding: '20px' }}>
            <div className="panel-header" style={{ padding: '0 0 16px' }}>
              <div>
                <h2>Approved Business Knowledge Base</h2>
                <p>These documents teach OpenAI GPT-4o how to qualify buyer budgets ($1M+ minimum) and property criteria.</p>
              </div>
              <span className="settings-state" style={{ color: '#10b981', background: '#ecfdf5' }}>
                <i /> Server provider ready: OpenAI API Connected
              </span>
            </div>

            <div className="knowledge-cards-stack">
              {(knowledgeDocs.data ?? []).map(doc => (
                <div key={doc.id} className="knowledge-item-card">
                  <div className="k-head">
                    <strong>{doc.title}</strong>
                    <span className="approved-pill">Approved for AI Context</span>
                  </div>
                  <p className="k-content">{doc.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Setup Funnel Modal */}
      {setupFunnelWs && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSetupFunnelWs(null) }}>
          <section className="modal modal-wide" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <span className="modal-icon"><Sparkles size={18} /></span>
              <button className="icon-btn" onClick={() => setSetupFunnelWs(null)}><X size={18} /></button>
            </div>
            <h2>Setup & Publish Funnel for {setupFunnelWs.name}</h2>
            <p>Done-For-You Agency setup: Automatically creates the public landing page, connects the AI qualification rules, and links their booking calendar.</p>

            <form onSubmit={e => { e.preventDefault(); setupFunnelMutation.mutate(setupFunnelWs.id) }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>Funnel Name
                  <input required value={funnelName} onChange={e => setFunnelName(e.target.value)} />
                </label>
                <label>Public URL Slug
                  <input required value={funnelSlug} onChange={e => setFunnelSlug(e.target.value)} />
                </label>
              </div>

              <label>Landing Page Headline
                <input required value={funnelHeadline} onChange={e => setFunnelHeadline(e.target.value)} />
              </label>

              <label>Short Description
                <textarea rows={2} required value={funnelDesc} onChange={e => setFunnelDesc(e.target.value)} />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setSetupFunnelWs(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={setupFunnelMutation.isPending}>
                  {setupFunnelMutation.isPending ? 'Publishing...' : 'Publish Funnel Live ➔'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateWs && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowCreateWs(false) }}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <span className="modal-icon"><Users size={18} /></span>
              <button className="icon-btn" onClick={() => setShowCreateWs(false)}><X size={18} /></button>
            </div>
            <h2>Create New Client Workspace</h2>
            <p>Add a new company or client. A private workspace will be created with isolated tenant data.</p>

            <form onSubmit={e => { e.preventDefault(); createWsMutation.mutate() }}>
              <label>Client / Business Name
                <input
                  required
                  placeholder="e.g. Acme Capital Partners"
                  value={wsName}
                  onChange={e => setWsName(e.target.value)}
                />
              </label>

              <label>Workspace URL Slug
                <input
                  placeholder="e.g. acme-capital"
                  value={wsSlug}
                  onChange={e => setWsSlug(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowCreateWs(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={createWsMutation.isPending}>
                  {createWsMutation.isPending ? 'Creating...' : 'Create Workspace ➔'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
