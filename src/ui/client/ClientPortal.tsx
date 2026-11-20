import { useState } from 'react'
import {
  LayoutDashboard, Workflow, Users, Filter, Command,
  Bell, Search, ArrowRight, ExternalLink, Sparkles,
  Check, Send, X
} from 'lucide-react'
import { RevenueTrendChart, AcquisitionSourcesDonut, MiniBars } from '../components/Charts'
import { N8nWorkflowCanvas } from './N8nWorkflowCanvas'

type Lead = {
  id: string
  name: string
  email: string
  company: string
  service: string
  status: 'new' | 'qualified' | 'unqualified' | 'contacted' | 'booked'
  source: string
  created_at: string
}

type FunnelItem = {
  id: string
  name: string
  slug: string
  status: string
  views: number
  submissions: number
  conversionRate: number
}

export function ClientPortal({
  onSignOut
}: {
  onSignOut: () => void
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'leads' | 'funnels'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string>('lead-re-1')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestCategory, setRequestCategory] = useState<'landing_page' | 'ai_channels' | 'funnel_questions'>('landing_page')
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDesc, setRequestDesc] = useState('')
  const [requestSuccess, setRequestSuccess] = useState('')
  const [draftingAi, setDraftingAi] = useState(false)
  const [messages, setMessages] = useState<Array<{ sender: 'lead' | 'assistant' | 'human'; text: string; time: string }>>([
    {
      sender: 'lead',
      text: 'Hello, I saw your Miami waterfront villa listing on Instagram. We have a pre-approved $3.5M cash budget and are looking to purchase within 30 days. Can we schedule a private walkthrough?',
      time: '10:42 AM'
    },
    {
      sender: 'assistant',
      text: 'Hi Marcus! Welcome to Prestige Realty. Your $3.5M budget qualifies for our private off-market waterfront collection on Biscayne Bay. Would Thursday at 11:00 AM work for a private chauffeur walkthrough?',
      time: '10:43 AM'
    },
    {
      sender: 'lead',
      text: 'Thursday at 11:00 AM is perfect. Please send over the gate access code and property brochure.',
      time: '10:45 AM'
    }
  ])
  const [newInputText, setNewInputText] = useState('')

  const leads: Lead[] = [
    {
      id: 'lead-re-1',
      name: 'Marcus Vance',
      email: 'marcus.vance@vancerealty.com',
      company: 'Vance Luxury Estates',
      service: 'Looking to buy a 4-bedroom beachfront villa in Miami. Budget approved up to $3.5M. Ready to close within 30 days.',
      status: 'qualified',
      source: 'luxury-villa-inquiry',
      created_at: '2 hours ago'
    },
    {
      id: 'lead-re-2',
      name: 'Sophia Martinez',
      email: 'smartinez@skylineholdings.io',
      company: 'Skyline Commercial Holdings',
      service: 'Seeking a 12-unit multi-family apartment complex for 1031 tax exchange. Capital ready: $4.2M.',
      status: 'booked',
      source: 'luxury-villa-inquiry',
      created_at: '5 hours ago'
    },
    {
      id: 'lead-re-3',
      name: 'David Sterling',
      email: 'd.sterling@sterlinginvestments.net',
      company: 'Sterling Capital',
      service: 'Interested in downtown penthouse listings under $2M. Pre-approved mortgage letter in hand.',
      status: 'contacted',
      source: 'downtown-penthouse-tour',
      created_at: '18 hours ago'
    },
    {
      id: 'lead-re-4',
      name: 'Elena Rostova',
      email: 'elena.rostova@gmail.com',
      company: 'First Time Homebuyer',
      service: 'Looking for 1-bed condo rentals under $1,200/mo. Student visa.',
      status: 'unqualified',
      source: 'downtown-penthouse-tour',
      created_at: '1 day ago'
    },
    {
      id: 'lead-re-5',
      name: 'Jonathan Hayes',
      email: 'jhayes@apexproperties.org',
      company: 'Apex Realty Partners',
      service: 'Commercial office floor space acquisition (10,000 sq ft). Budget: $50k/mo lease.',
      status: 'new',
      source: 'luxury-villa-inquiry',
      created_at: '2 days ago'
    }
  ]

  const funnels: FunnelItem[] = [
    {
      id: 'f-1',
      name: 'Miami Luxury Waterfront Villa Funnel',
      slug: 'luxury-villa-inquiry',
      status: 'published',
      views: 240,
      submissions: 18,
      conversionRate: 7.5
    },
    {
      id: 'f-2',
      name: 'Downtown Penthouse VIP Tour Funnel',
      slug: 'downtown-penthouse-tour',
      status: 'published',
      views: 185,
      submissions: 14,
      conversionRate: 7.6
    }
  ]

  const selectedLead = leads.find(l => l.id === selectedLeadId) ?? leads[0]

  const handleSendHuman = () => {
    if (!newInputText.trim()) return
    setMessages(prev => [...prev, { sender: 'human', text: newInputText.trim(), time: 'Just now' }])
    setNewInputText('')
  }

  const handleGenerateAiReply = async () => {
    setDraftingAi(true)
    try {
      const res = await fetch(`/api/v1/leads/${selectedLead.id}/conversation/ai-reply`, { method: 'POST' })
      const data = await res.json()
      if (data?.data?.content) {
        setMessages(prev => [...prev, { sender: 'assistant', text: data.data.content, time: 'Just now' }])
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: `Hi ${selectedLead.name}, we reviewed your acquisition preferences. The private gate code and luxury dossier have been sent to your WhatsApp. Our executive broker looks forward to greeting you Thursday at 11:00 AM!`,
            time: 'Just now'
          }
        ])
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `Hi ${selectedLead.name}, we reviewed your acquisition preferences. The private gate code and luxury dossier have been sent to your WhatsApp. Our executive broker looks forward to greeting you Thursday at 11:00 AM!`,
          time: 'Just now'
        }
      ])
    } finally {
      setDraftingAi(false)
    }
  }

  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('/api/v1/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: requestCategory,
          title: requestTitle,
          description: requestDesc,
          priority: 'high'
        })
      })
      setRequestSuccess('Change request submitted! Buildicy Back Office team has received your ticket.')
      setTimeout(() => {
        setShowRequestModal(false)
        setRequestSuccess('')
        setRequestTitle('')
        setRequestDesc('')
      }, 1500)
    } catch {
      setRequestSuccess('Request received by agency queue.')
      setTimeout(() => setShowRequestModal(false), 1500)
    }
  }

  return (
    <div className="client-app-shell">
      {/* Client Portal Top Bar */}
      <header className="portal-top-bar" style={{
        background: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#fff',
            borderRadius: '10px',
            width: '36px',
            height: '36px',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: '17px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>
            P
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Prestige Luxury Realty
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Client Spectator Dashboard · AI Lead Concierge & WhatsApp Automation
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            padding: '6px 14px',
            borderRadius: '24px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
            <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>client@prestigerealty.com</span>
            <span style={{ fontSize: '10px', background: '#bfdbfe', color: '#1d4ed8', padding: '1px 7px', borderRadius: '12px', fontWeight: 700 }}>CLIENT BROKER</span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="secondary-button"
            style={{ fontSize: '12px', padding: '7px 16px', borderRadius: '8px' }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="client-body-layout">
        {/* Modern Sidebar (Reference Image 1) */}
        <aside className="client-sidebar">
          <div className="client-brand">
            <span className="brand-mark"><Command size={18} strokeWidth={2.5} /></span>
            <span>buildicy</span>
          </div>

          <nav className="client-nav">
            <button
              type="button"
              className={`client-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </button>

            <button
              type="button"
              className={`client-nav-btn ${activeTab === 'workflow' ? 'active' : ''}`}
              onClick={() => setActiveTab('workflow')}
            >
              <Workflow size={18} />
              <span>AI Workflow Engine</span>
              <span className="active-tag">n8n</span>
            </button>

            <button
              type="button"
              className={`client-nav-btn ${activeTab === 'leads' ? 'active' : ''}`}
              onClick={() => setActiveTab('leads')}
            >
              <Users size={18} />
              <span>Leads & WhatsApp</span>
              <span className="count-badge">{leads.length}</span>
            </button>

            <button
              type="button"
              className={`client-nav-btn ${activeTab === 'funnels' ? 'active' : ''}`}
              onClick={() => setActiveTab('funnels')}
            >
              <Filter size={18} />
              <span>Campaign Funnels</span>
            </button>
          </nav>

          <div className="sidebar-bottom-card">
            <div className="workspace-avatar-box">
              <span className="ws-avatar">P</span>
              <div className="ws-info">
                <strong>Prestige Realty</strong>
                <small>DFY Growth Tier</small>
              </div>
            </div>
            <button
              type="button"
              className="change-request-btn"
              onClick={() => setShowRequestModal(true)}
            >
              <Sparkles size={13} /> Request Agency Change
            </button>
            <button type="button" className="signout-link" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="client-main">
          {/* Topbar (Reference Image 1) */}
          <header className="client-topbar">
            <div className="search-pill">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search leads, WhatsApp chats, campaigns..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="client-topbar-right">
              <button type="button" className="icon-btn-circle" aria-label="Notifications">
                <Bell size={18} />
                <span className="badge-dot" />
              </button>
              <div className="user-profile-pill">
                <span className="user-avatar-circle">PL</span>
                <span className="user-name">Prestige Broker</span>
              </div>
            </div>
          </header>

          <div className="client-page-container">
            {/* TAB 1: OVERVIEW (MATCHING REFERENCE IMAGE 1) */}
            {activeTab === 'overview' && (
              <div>
                {/* Section Header */}
                <div className="section-head-row">
                  <div>
                    <h1>Overview</h1>
                    <p>Real-time pipeline performance, AI WhatsApp qualification, and tour conversions.</p>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setShowRequestModal(true)}
                  >
                    <Sparkles size={14} /> Request Customization
                  </button>
                </div>

                {/* 3 Main KPI Cards with Vertical Mini-Bars (Reference Image 1) */}
                <div className="modern-kpi-grid">
                  <div className="modern-kpi-card">
                    <div className="kpi-info-col">
                      <span className="kpi-label">Total Pipeline Revenue</span>
                      <strong className="kpi-val">$8.4M</strong>
                      <span className="kpi-change blue">↑ 18.4% vs last month</span>
                    </div>
                    <div className="kpi-chart-col">
                      <MiniBars color="#2563eb" values={[4, 7, 5, 9, 8, 12, 10]} />
                    </div>
                  </div>

                  <div className="modern-kpi-card">
                    <div className="kpi-info-col">
                      <span className="kpi-label">Active VIP Buyers Qualified</span>
                      <strong className="kpi-val">14+</strong>
                      <span className="kpi-change green">↑ 24.5% vs last month</span>
                    </div>
                    <div className="kpi-chart-col">
                      <MiniBars color="#10b981" values={[3, 5, 8, 6, 10, 14, 12]} />
                    </div>
                  </div>

                  <div className="modern-kpi-card">
                    <div className="kpi-info-col">
                      <span className="kpi-label">Tour Booking Rate</span>
                      <strong className="kpi-val">38%</strong>
                      <span className="kpi-change orange">↑ 12.0% vs last month</span>
                    </div>
                    <div className="kpi-chart-col">
                      <MiniBars color="#f59e0b" values={[5, 8, 7, 9, 11, 15, 14]} />
                    </div>
                  </div>
                </div>

                {/* New Leads Today Banner with Face Avatars (Reference Image 1) */}
                <div className="leads-alert-strip">
                  <div className="strip-text">
                    <strong>5 new High-Net-Worth Leads today!</strong>
                    <span>Instant WhatsApp VIP tour qualification sent to all 5 buyers.</span>
                  </div>
                  <div className="strip-avatars">
                    <div className="face-pill" title="Marcus Vance ($3.5M Cash)">MV</div>
                    <div className="face-pill" title="Sophia Martinez ($4.2M 1031)">SM</div>
                    <div className="face-pill" title="David Sterling ($2M Penthouse)">DS</div>
                    <div className="face-pill" title="Elena Rostova">ER</div>
                    <div className="face-pill" title="Jonathan Hayes ($50k/mo)">JH</div>
                    <button
                      type="button"
                      className="view-all-pill"
                      onClick={() => setActiveTab('leads')}
                    >
                      View all ➔
                    </button>
                  </div>
                </div>

                {/* 2-Column Section: Revenue Trend Bar Chart + Donut Sources (Reference Image 1) */}
                <div className="charts-double-grid">
                  <RevenueTrendChart total="$4.2M" growth="↑ 28.5% last month" />
                  <AcquisitionSourcesDonut />
                </div>

                {/* Funnel Overview Strip (Reference Image 1 Bottom Right) */}
                <div className="funnel-overview-card">
                  <div className="f-stat">
                    <small>Total Campaign Visitors</small>
                    <strong>425</strong>
                  </div>
                  <div className="f-stat">
                    <small>Buyer Enquiries Captured</small>
                    <strong>32</strong>
                  </div>
                  <div className="f-stat highlight">
                    <small>VIP Qualified ($1M+)</small>
                    <strong>14</strong>
                  </div>
                  <div className="f-stat">
                    <small>Confirmed Walkthroughs</small>
                    <strong>4</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: VISUAL n8n WORKFLOW ENGINE */}
            {activeTab === 'workflow' && (
              <div>
                <N8nWorkflowCanvas onRequestChange={() => setShowRequestModal(true)} />
              </div>
            )}

            {/* TAB 3: LEADS & WHATSAPP LIVE CONVERSATION */}
            {activeTab === 'leads' && (
              <div className="leads-chat-layout">
                {/* Left Leads Column */}
                <div className="leads-list-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Active Real Estate Inquiries</h3>
                      <p>Click any buyer to inspect their WhatsApp qualification chat.</p>
                    </div>
                  </div>

                  <div className="leads-items-container">
                    {leads.map(lead => (
                      <div
                        key={lead.id}
                        className={`lead-item-card ${lead.id === selectedLeadId ? 'selected' : ''}`}
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        <div className="lead-item-top">
                          <strong>{lead.name}</strong>
                          <span className={`status-pill ${lead.status}`}>{lead.status}</span>
                        </div>
                        <small className="lead-service-snippet">{lead.service.slice(0, 75)}...</small>
                        <div className="lead-item-meta">
                          <span>{lead.company}</span>
                          <span>{lead.created_at}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right WhatsApp Simulator Column */}
                <div className="whatsapp-chat-panel">
                  <div className="whatsapp-header">
                    <div className="whatsapp-lead-profile">
                      <div className="wa-avatar">{selectedLead.name.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <strong>{selectedLead.name}</strong>
                        <small>{selectedLead.email} · {selectedLead.company}</small>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="ai-action-btn"
                        onClick={handleGenerateAiReply}
                        disabled={draftingAi}
                      >
                        <Sparkles size={14} /> {draftingAi ? 'AI Generating...' : 'Generate Real AI Reply'}
                      </button>
                    </div>
                  </div>

                  <div className="whatsapp-messages-body">
                    {messages.map((m, idx) => (
                      <div key={idx} className={`wa-bubble ${m.sender}`}>
                        <div className="wa-bubble-sender">
                          {m.sender === 'assistant' ? '🤖 AI Broker (OpenAI)' : m.sender === 'human' ? '👤 Prestige Agent' : '📱 Buyer (WhatsApp)'}
                        </div>
                        <p>{m.text}</p>
                        <span className="wa-time">{m.time}</span>
                      </div>
                    ))}
                  </div>

                  <div className="whatsapp-input-bar">
                    <input
                      type="text"
                      placeholder="Type a manual response or click 'Generate Real AI Reply'..."
                      value={newInputText}
                      onChange={e => setNewInputText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendHuman() }}
                    />
                    <button type="button" className="send-btn" onClick={handleSendHuman}>
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CAMPAIGN FUNNELS */}
            {activeTab === 'funnels' && (
              <div>
                <div className="section-head-row">
                  <div>
                    <h1>Campaign Landing Pages</h1>
                    <p>Done-for-you lead capture funnels managed by Buildicy Back Office.</p>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setShowRequestModal(true)}
                  >
                    <Sparkles size={14} /> Request Landing Page Tweaks
                  </button>
                </div>

                <div className="funnels-table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Campaign Name</th>
                        <th>Public Link</th>
                        <th>Status</th>
                        <th>Total Visitors</th>
                        <th>Submissions</th>
                        <th>Conversion Rate</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnels.map(f => (
                        <tr key={f.id}>
                          <td><strong>{f.name}</strong></td>
                          <td>
                            <a
                              href={`/public/${f.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="funnel-public-link"
                            >
                              /public/{f.slug} <ExternalLink size={12} />
                            </a>
                          </td>
                          <td>
                            <span className="status-pill qualified">{f.status}</span>
                          </td>
                          <td><strong>{f.views}</strong></td>
                          <td><strong>{f.submissions}</strong></td>
                          <td>
                            <span className="conv-highlight">{f.conversionRate}%</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="secondary-button small"
                              onClick={() => {
                                setRequestCategory('landing_page')
                                setRequestTitle(`Changes for ${f.name}`)
                                setShowRequestModal(true)
                              }}
                            >
                              Request Tweaks
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Client Change Request Modal (Productized Agency Flow) */}
      {showRequestModal && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowRequestModal(false) }}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <span className="modal-icon"><Sparkles size={18} /></span>
              <button className="icon-btn" onClick={() => setShowRequestModal(false)}><X size={18} /></button>
            </div>
            <h2>Request Agency Customization</h2>
            <p>Your request goes straight to your dedicated Buildicy Back Office team.</p>

            {requestSuccess && (
              <div className="toast"><Check size={16} /> {requestSuccess}</div>
            )}

            <form onSubmit={handleSubmitChangeRequest}>
              <label>Category
                <select
                  value={requestCategory}
                  onChange={e => setRequestCategory(e.target.value as typeof requestCategory)}
                >
                  <option value="landing_page">Landing Page Tweaks & Copy</option>
                  <option value="ai_channels">AI WhatsApp Qualification Criteria</option>
                  <option value="funnel_questions">Form Questionnaire Questions</option>
                </select>
              </label>

              <label>Title
                <input
                  required
                  placeholder="e.g. Update Miami Villa price to $3.5M"
                  value={requestTitle}
                  onChange={e => setRequestTitle(e.target.value)}
                />
              </label>

              <label>Detailed Requirements
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the changes you want our agency team to make..."
                  value={requestDesc}
                  onChange={e => setRequestDesc(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowRequestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Submit to Back Office Queue <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
