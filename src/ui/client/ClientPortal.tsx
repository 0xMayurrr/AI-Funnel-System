import { useState } from 'react'
import {
  LayoutDashboard, Workflow, Users, Filter, Command,
  Bell, Search, ArrowRight, ExternalLink, Sparkles,
  X, CheckCircle2, SlidersHorizontal,
  FileText, MessageSquare, Calendar, Clock,
  RefreshCw, Database
} from 'lucide-react'
import { RevenueTrendChart, AcquisitionSourcesDonut, MiniBars } from '../components/Charts'
import { ClientWorkflowJourney } from './ClientWorkflowJourney'
import { WhatsAppChatPanel } from './WhatsAppChatPanel'

export type CanonicalLeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFYING'
  | 'QUALIFIED'
  | 'DISQUALIFIED'
  | 'NURTURE'
  | 'APPOINTMENT_BOOKED'
  | 'REMINDED'
  | 'VISITED'
  | 'NO_SHOW'
  | 'RECOVERY_FOLLOW_UP'
  | 'RESCHEDULED'
  | 'WON'
  | 'LOST'
  | 'ARCHIVED'

export type RecoveryPriorityTier = 'Hot Recovery' | 'Warm Recovery' | 'Nurture' | 'Leaked' | 'Disqualified'
export type LeakageStatus = 'Recovered' | 'At Risk' | 'Leaked' | 'No-Show' | 'Disqualified' | 'Nurture' | 'Won' | 'Lost'

export type ClientLead = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  service: string
  budget: string
  budget_numeric?: number
  location?: string
  property_type?: string
  timeline?: string
  status: 'new' | 'qualified' | 'unqualified' | 'contacted' | 'booked'
  stage: CanonicalLeadStage
  recovery_score: number
  recovery_priority: RecoveryPriorityTier
  recovery_breakdown: Record<string, number>
  leakage_status: LeakageStatus
  source: string
  created_at: string
  verifiedBuyer: boolean
  assigned_agent_name?: string
  crm_sync_status?: 'synced' | 'pending' | 'failed'
  duplicate_count?: number
  activity_logs?: Array<{ id: string; action: string; details: string; created_at: string; actor: string }>
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

type AppointmentViewItem = {
  id: string
  lead_id: string
  lead_name: string
  agent_name: string
  property_title: string
  scheduled_at: string
  status: 'CONFIRMED' | 'NO_SHOW' | 'COMPLETED' | 'RESCHEDULED'
  location: string
  notes?: string
}

const initialLeads: ClientLead[] = [
  {
    id: 'lead-re-1',
    name: 'Marcus Vance',
    email: 'marcus.vance@vancerealty.com',
    phone: '+1 (305) 555-0144',
    company: 'Vance Luxury Estates',
    service: 'Looking to buy a 4-bedroom beachfront villa in Miami. Budget approved up to $3.5M. Ready to close within 30 days.',
    budget: '$3,500,000 (Liquid Cash)',
    budget_numeric: 3500000,
    location: 'Biscayne Island, Miami',
    property_type: 'villa',
    timeline: 'Within 30 days',
    status: 'booked',
    stage: 'APPOINTMENT_BOOKED',
    recovery_score: 95,
    recovery_priority: 'Hot Recovery',
    recovery_breakdown: { intent: 25, budgetFit: 25, timeline: 20, engagement: 15, sourceQuality: 10, followUpGap: 5 },
    leakage_status: 'Recovered',
    source: 'Meta Ads (Instagram)',
    created_at: '2 hours ago',
    verifiedBuyer: true,
    assigned_agent_name: 'Christian Sterling',
    crm_sync_status: 'synced',
    duplicate_count: 0,
    activity_logs: [
      { id: 'act-1', action: 'APPOINTMENT_BOOKED', details: 'VIP Site Visit scheduled for Thursday at 11:00 AM with Christian Sterling.', created_at: '2026-11-21T18:00:00Z', actor: 'Buildicy AI Concierge' },
      { id: 'act-2', action: 'CRM_SYNCED', details: 'Synced lead record to Google Sheets and HubSpot Real Estate Pipeline.', created_at: '2026-11-21T18:05:00Z', actor: 'CRM Sync Adapter' },
      { id: 'act-3', action: 'LEAD_QUALIFIED', details: 'AI verified $3.5M purchasing budget and 30-day timeline. Score: 95/100.', created_at: '2026-11-21T17:40:00Z', actor: 'AI Qualification Engine' }
    ]
  },
  {
    id: 'lead-re-2',
    name: 'Sophia Martinez',
    email: 'smartinez@skylineholdings.io',
    phone: '+1 (305) 555-0166',
    company: 'Skyline Commercial Holdings',
    service: 'Seeking a 12-unit multi-family apartment complex for 1031 tax exchange. Capital ready: $4.2M.',
    budget: '$4,200,000 (1031 Exchange)',
    budget_numeric: 4200000,
    location: 'Brickell Financial District, Miami',
    property_type: 'commercial',
    timeline: '28-day 1031 deadline',
    status: 'booked',
    stage: 'APPOINTMENT_BOOKED',
    recovery_score: 96,
    recovery_priority: 'Hot Recovery',
    recovery_breakdown: { intent: 25, budgetFit: 25, timeline: 20, engagement: 15, sourceQuality: 10, followUpGap: 5 },
    leakage_status: 'Recovered',
    source: 'Portal Inquiries',
    created_at: '5 hours ago',
    verifiedBuyer: true,
    assigned_agent_name: 'Elena Vance',
    crm_sync_status: 'synced',
    duplicate_count: 0,
    activity_logs: [
      { id: 'act-4', action: 'APPOINTMENT_BOOKED', details: 'Reserved 15-minute briefing with Commercial Director Elena Vance.', created_at: '2026-11-21T15:00:00Z', actor: 'Buildicy AI Concierge' },
      { id: 'act-5', action: 'PORTFOLIO_SENT', details: 'Confidential Offering Memorandum dispatched to smartinez@skylineholdings.io.', created_at: '2026-11-21T14:45:00Z', actor: 'AI Document Delivery' }
    ]
  },
  {
    id: 'lead-re-3',
    name: 'David Sterling',
    email: 'd.sterling@sterlinginvestments.net',
    phone: '+1 (305) 555-0177',
    company: 'Sterling Capital',
    service: 'Interested in downtown penthouse listings under $2M. Pre-approved mortgage letter in hand.',
    budget: '$1,800,000 (JPMorgan Chase)',
    budget_numeric: 1800000,
    location: 'Downtown Miami',
    property_type: 'penthouse',
    timeline: '45 days',
    status: 'contacted',
    stage: 'NO_SHOW',
    recovery_score: 78,
    recovery_priority: 'Hot Recovery',
    recovery_breakdown: { intent: 25, budgetFit: 20, timeline: 15, engagement: 10, sourceQuality: 8, followUpGap: 0 },
    leakage_status: 'No-Show',
    source: 'Website Form',
    created_at: '18 hours ago',
    verifiedBuyer: true,
    assigned_agent_name: 'Julian Ross',
    crm_sync_status: 'synced',
    duplicate_count: 0,
    activity_logs: [
      { id: 'act-6', action: 'NO_SHOW_DETECTED', details: 'Buyer did not arrive for Friday 6:30 PM showing. Triggered No-Show Recovery Engine.', created_at: '2026-11-21T18:35:00Z', actor: 'No-Show Monitor' },
      { id: 'act-7', action: 'RECOVERY_MESSAGE_SENT', details: 'Sent warm WhatsApp reschedule invite: "Hi David, we missed you today at Penthouse #48. Would tomorrow work to reschedule?"', created_at: '2026-11-21T18:40:00Z', actor: 'AI Recovery Agent' }
    ]
  },
  {
    id: 'lead-re-4',
    name: 'Elena Rostova',
    email: 'elena.rostova@gmail.com',
    phone: '+1 (305) 555-0188',
    company: 'First Time Homebuyer',
    service: 'Looking for 1-bed condo rentals under $1,200/mo. Student visa.',
    budget: '$1,200/mo (Rental)',
    budget_numeric: 1200,
    location: 'Downtown Miami',
    property_type: 'apartment',
    timeline: 'Immediate',
    status: 'unqualified',
    stage: 'DISQUALIFIED',
    recovery_score: 22,
    recovery_priority: 'Disqualified',
    recovery_breakdown: { intent: 10, budgetFit: 2, timeline: 5, engagement: 4, sourceQuality: 1, followUpGap: 0 },
    leakage_status: 'Disqualified',
    source: 'Google Ads',
    created_at: '1 day ago',
    verifiedBuyer: false,
    crm_sync_status: 'synced',
    duplicate_count: 0,
    activity_logs: [
      { id: 'act-8', action: 'DISQUALIFIED', details: 'Inquiry seeks rental under $1,200/mo. Politely redirected without wasting broker time.', created_at: '2026-11-20T12:00:00Z', actor: 'Buildicy AI Receptionist' }
    ]
  },
  {
    id: 'lead-re-5',
    name: 'Jonathan Hayes',
    email: 'jhayes@apexproperties.org',
    phone: '+1 (305) 555-0199',
    company: 'Apex Realty Partners',
    service: 'Commercial office floor space acquisition (10,000 sq ft). Budget: $50k/mo lease.',
    budget: '$50,000/mo (Lease)',
    budget_numeric: 50000,
    location: 'South Beach, Miami',
    property_type: 'commercial',
    timeline: 'Q3 occupancy',
    status: 'new',
    stage: 'QUALIFYING',
    recovery_score: 68,
    recovery_priority: 'Warm Recovery',
    recovery_breakdown: { intent: 20, budgetFit: 20, timeline: 10, engagement: 8, sourceQuality: 8, followUpGap: 2 },
    leakage_status: 'At Risk',
    source: 'Portal Inquiries',
    created_at: '2 days ago',
    verifiedBuyer: false,
    assigned_agent_name: 'Elena Vance',
    crm_sync_status: 'pending',
    duplicate_count: 0,
    activity_logs: [
      { id: 'act-9', action: 'QUALIFYING', details: 'Commercial space inquiry received. Awaiting client lease commencement date.', created_at: '2026-11-19T10:00:00Z', actor: 'Buildicy AI Concierge' }
    ]
  },
  {
    id: 'lead-re-6',
    name: 'Priya Sharma',
    email: 'psharma@apextech.com',
    phone: '+1 (305) 555-0122',
    company: 'Apex Technologies',
    service: 'Inbound missed call after-hours. AI Receptionist sent instant WhatsApp greeting in 12s.',
    budget: '$2,400,000 (Pre-Approved)',
    budget_numeric: 2400000,
    location: 'Palm Beach Waterfront',
    property_type: 'villa',
    timeline: '60 days',
    status: 'contacted',
    stage: 'CONTACTED',
    recovery_score: 84,
    recovery_priority: 'Hot Recovery',
    recovery_breakdown: { intent: 25, budgetFit: 20, timeline: 15, engagement: 12, sourceQuality: 8, followUpGap: 4 },
    leakage_status: 'Recovered',
    source: 'Missed Calls (Telephony)',
    created_at: '3 hours ago',
    verifiedBuyer: true,
    assigned_agent_name: 'Christian Sterling',
    crm_sync_status: 'synced',
    duplicate_count: 0,
    activity_logs: [
      { id: 'act-10', action: 'MISSED_CALL_RECOVERED', details: 'Missed call from +1 (305) 555-0122 converted to active WhatsApp conversation in 12 seconds.', created_at: '2026-11-21T16:00:00Z', actor: 'Telephony Recovery Layer' },
      { id: 'act-11', action: 'CALLBACK_TASK_CREATED', details: 'Priority callback task assigned to Christian Sterling.', created_at: '2026-11-21T16:01:00Z', actor: 'Routing Engine' }
    ]
  }
]

const initialAppointments: AppointmentViewItem[] = [
  {
    id: 'apt-1',
    lead_id: 'lead-re-1',
    lead_name: 'Marcus Vance',
    agent_name: 'Christian Sterling',
    property_title: 'Biscayne Waterfront Villa ($3.5M)',
    scheduled_at: 'Thursday, Nov 27 · 11:00 AM',
    status: 'CONFIRMED',
    location: '4400 Biscayne Island Way, Miami, FL',
    notes: 'VIP Security Gate Pass generated. Chauffeur clearance provided.'
  },
  {
    id: 'apt-2',
    lead_id: 'lead-re-2',
    lead_name: 'Sophia Martinez',
    agent_name: 'Elena Vance',
    property_title: 'Brickell Multi-Family Complex (12 Units)',
    scheduled_at: 'Wednesday, Nov 26 · 2:00 PM',
    status: 'CONFIRMED',
    location: 'Prestige Realty HQ - Suite 2400, Brickell, Miami',
    notes: '1031 Exchange Escrow & rent roll review.'
  },
  {
    id: 'apt-3',
    lead_id: 'lead-re-3',
    lead_name: 'David Sterling',
    agent_name: 'Julian Ross',
    property_title: 'Downtown Sky Penthouse #48 ($1.8M)',
    scheduled_at: 'Yesterday · 6:30 PM (Twilight Tour)',
    status: 'NO_SHOW',
    location: '900 Biscayne Blvd, Penthouse 48, Miami, FL',
    notes: 'Client missed showing. Automated WhatsApp recovery sequence dispatched.'
  }
]

export function ClientPortal({
  onSignOut
}: {
  onSignOut: () => void
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'appointments' | 'workflow' | 'funnels'>('overview')
  const [leadsList, setLeadsList] = useState<ClientLead[]>(initialLeads)
  const [appointmentsList, setAppointmentsList] = useState<AppointmentViewItem[]>(initialAppointments)
  const [searchQuery, setSearchQuery] = useState('')
  const [leadFilter, setLeadFilter] = useState<'all' | 'hot' | 'booked' | 'noshow' | 'atrisk' | 'disqualified'>('all')
  const [selectedLeadId, setSelectedLeadId] = useState<string>('lead-re-1')
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [overrideStatus, setOverrideStatus] = useState<'qualified' | 'disqualified' | 'nurture'>('qualified')
  const [overrideReason, setOverrideReason] = useState('')
  const [actionSuccessNotice, setActionSuccessNotice] = useState('')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestCategory, setRequestCategory] = useState<'landing_page' | 'ai_channels' | 'funnel_questions'>('landing_page')
  const [requestPriority, setRequestPriority] = useState<'normal' | 'urgent'>('normal')
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDesc, setRequestDesc] = useState('')
  const [requestSuccess, setRequestSuccess] = useState('')

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

  const selectedLead = leadsList.find(l => l.id === selectedLeadId) ?? leadsList[0]

  const filteredLeads = leadsList.filter(l => {
    let matchesFilter = true
    if (leadFilter === 'hot') matchesFilter = l.recovery_priority === 'Hot Recovery'
    else if (leadFilter === 'booked') matchesFilter = l.stage === 'APPOINTMENT_BOOKED'
    else if (leadFilter === 'noshow') matchesFilter = l.stage === 'NO_SHOW' || l.stage === 'RECOVERY_FOLLOW_UP'
    else if (leadFilter === 'atrisk') matchesFilter = l.leakage_status === 'At Risk'
    else if (leadFilter === 'disqualified') matchesFilter = l.stage === 'DISQUALIFIED'

    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery)
    return matchesFilter && matchesSearch
  })

  // Trigger CRM Sync
  const handleCrmSync = async (leadId: string) => {
    try {
      await fetch(`/api/v1/crm/sync/${leadId}`, { method: 'POST' })
      setLeadsList(prev => prev.map(l => l.id === leadId ? { ...l, crm_sync_status: 'synced' } : l))
      setActionSuccessNotice(`Lead synced successfully to connected CRMs (Google Sheets & HubSpot)!`)
      setTimeout(() => setActionSuccessNotice(''), 4000)
    } catch {
      setActionSuccessNotice(`Lead marked as synced in local memory!`)
      setTimeout(() => setActionSuccessNotice(''), 3000)
    }
  }

  // Handle Manual Qualification Override
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch(`/api/v1/leads/${selectedLead.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: overrideStatus,
          reason: overrideReason,
          operator: 'Prestige Principal Broker'
        })
      })
      setLeadsList(prev => prev.map(l => {
        if (l.id !== selectedLead.id) return l
        const newStage: CanonicalLeadStage = overrideStatus === 'qualified' ? 'QUALIFIED' : overrideStatus === 'disqualified' ? 'DISQUALIFIED' : 'NURTURE'
        const newPriority: RecoveryPriorityTier = overrideStatus === 'qualified' ? 'Hot Recovery' : overrideStatus === 'disqualified' ? 'Disqualified' : 'Nurture'
        return {
          ...l,
          stage: newStage,
          recovery_priority: newPriority,
          status: overrideStatus === 'qualified' ? 'qualified' : overrideStatus === 'disqualified' ? 'unqualified' : 'contacted'
        }
      }))
      setShowOverrideModal(false)
      setOverrideReason('')
      setActionSuccessNotice(`Manual qualification override applied! Lead status updated to ${overrideStatus.toUpperCase()}.`)
      setTimeout(() => setActionSuccessNotice(''), 4000)
    } catch {
      setShowOverrideModal(false)
    }
  }

  // Mark Tour as Visited
  const handleMarkVisited = async (aptId: string) => {
    try {
      await fetch(`/api/v1/appointments/${aptId}/visited`, { method: 'POST' })
    } catch {
      // offline fallback
    }
    setAppointmentsList(prev => prev.map(a => a.id === aptId ? { ...a, status: 'COMPLETED' } : a))
    setLeadsList(prev => prev.map(l => l.id === selectedLead.id ? { ...l, stage: 'VISITED' } : l))
    setActionSuccessNotice('Site visit completed! Tour marked as attended by buyer.')
    setTimeout(() => setActionSuccessNotice(''), 4000)
  }

  // Trigger No-Show Recovery Sequence
  const handleTriggerNoShow = async (aptId: string) => {
    try {
      await fetch(`/api/v1/appointments/${aptId}/no-show`, { method: 'POST' })
    } catch {
      // offline fallback
    }
    setAppointmentsList(prev => prev.map(a => a.id === aptId ? { ...a, status: 'NO_SHOW' } : a))
    setLeadsList(prev => prev.map(l => l.id === selectedLead.id ? { ...l, stage: 'RECOVERY_FOLLOW_UP', leakage_status: 'No-Show' } : l))
    setActionSuccessNotice('Buyer marked as NO-SHOW. Multi-channel WhatsApp recovery flow dispatched immediately!')
    setTimeout(() => setActionSuccessNotice(''), 4000)
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
          description: `[Priority: ${requestPriority.toUpperCase()}] ${requestDesc}`,
          priority: requestPriority === 'urgent' ? 'urgent' : 'high'
        })
      })
      setRequestSuccess('Change request submitted! Buildicy Back Office team has received your ticket.')
      setTimeout(() => {
        setShowRequestModal(false)
        setRequestSuccess('')
        setRequestTitle('')
        setRequestDesc('')
      }, 1800)
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
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#fff',
            borderRadius: '10px',
            width: '38px',
            height: '38px',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>
            P
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Prestige Luxury Realty
              </span>
              <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                REVENUE RECOVERY LAYER ACTIVE
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              AI Lead Recovery & Booking Platform · Synced above Google Sheets & HubSpot CRM
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '5px 12px',
            borderRadius: '20px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>Speed SLA: &lt; 60s (Live)</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            padding: '5px 12px',
            borderRadius: '20px'
          }}>
            <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>client@prestigerealty.com</span>
            <span style={{ fontSize: '10px', background: '#bfdbfe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>BROKER</span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="secondary-button"
            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px' }}
          >
            Sign out
          </button>
        </div>
      </header>

      {actionSuccessNotice && (
        <div style={{
          background: '#dcfce7',
          color: '#15803d',
          padding: '10px 24px',
          fontSize: '13px',
          fontWeight: 600,
          borderBottom: '1px solid #bbf7d0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span><CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px' }} /> {actionSuccessNotice}</span>
          <button type="button" onClick={() => setActionSuccessNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d' }}><X size={14} /></button>
        </div>
      )}

      <div className="client-body-layout">
        {/* Modern Sidebar */}
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
              <span>Revenue Overview</span>
            </button>

            <button
              type="button"
              className={`client-nav-btn ${activeTab === 'leads' ? 'active' : ''}`}
              onClick={() => setActiveTab('leads')}
            >
              <Users size={18} />
              <span>Leads & WhatsApp</span>
              <span className="count-badge">{leadsList.length}</span>
            </button>

            <button
              type="button"
              className={`client-nav-btn ${activeTab === 'appointments' ? 'active' : ''}`}
              onClick={() => setActiveTab('appointments')}
            >
              <Calendar size={18} />
              <span>Site Visits & Tours</span>
              <span className="active-tag" style={{ background: '#fef3c7', color: '#92400e' }}>{appointmentsList.length}</span>
            </button>

            <button
              type="button"
              className={`client-nav-btn ${activeTab === 'workflow' ? 'active' : ''}`}
              onClick={() => setActiveTab('workflow')}
            >
              <Workflow size={18} />
              <span>Strategy & Journey</span>
              <span className="active-tag" style={{ background: '#dcfce7', color: '#15803d' }}>LIVE</span>
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
                <small>Full Growth Engine</small>
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
          {/* Topbar */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', marginRight: '8px' }}>
                <Database size={14} className="text-blue" />
                <span>Synced: <strong>Google Sheets & HubSpot</strong></span>
              </div>
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
            {/* TAB 1: REVENUE OVERVIEW & RECOVERY ROI */}
            {activeTab === 'overview' && (
              <div>
                {/* Section Header */}
                <div className="section-head-row">
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                      Revenue Recovery Dashboard
                    </h1>
                    <p style={{ color: '#64748b', margin: 0 }}>
                      Real-time recovered pipeline value, speed-to-lead SLA, and closer accountability scorecard.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleCrmSync('lead-re-1')}
                    >
                      <RefreshCw size={13} /> Sync CRM Now
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setShowRequestModal(true)}
                    >
                      <Sparkles size={14} /> Request Customization
                    </button>
                  </div>
                </div>

                {/* 4 Outcome-Based Recovery KPI Cards */}
                <div className="modern-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div className="modern-kpi-card">
                    <div className="kpi-info-col">
                      <span className="kpi-label">Attributed Recovered Pipeline</span>
                      <strong className="kpi-val" style={{ color: '#16a34a' }}>$23.5M</strong>
                      <span className="kpi-change green">↑ 38.4% conversion lift</span>
                    </div>
                    <div className="kpi-chart-col">
                      <MiniBars color="#16a34a" values={[5, 8, 12, 16, 20, 24, 28]} />
                    </div>
                  </div>

                  <div className="modern-kpi-card">
                    <div className="kpi-info-col">
                      <span className="kpi-label">Speed-to-Lead Response SLA</span>
                      <strong className="kpi-val">48 sec</strong>
                      <span className="kpi-change blue">100% under 60-second rule</span>
                    </div>
                    <div className="kpi-chart-col">
                      <MiniBars color="#2563eb" values={[6, 4, 3, 5, 4, 3, 2]} />
                    </div>
                  </div>

                  <div className="modern-kpi-card">
                    <div className="kpi-info-col">
                      <span className="kpi-label">Qualified Site Visits Booked</span>
                      <strong className="kpi-val">34 tours</strong>
                      <span className="kpi-change green">Verified $1M+ criteria</span>
                    </div>
                    <div className="kpi-chart-col">
                      <MiniBars color="#10b981" values={[3, 5, 8, 12, 14, 18, 22]} />
                    </div>
                  </div>

                  <div className="modern-kpi-card">
                    <div className="kpi-info-col">
                      <span className="kpi-label">No-Show Recovery Rate</span>
                      <strong className="kpi-val">75.0%</strong>
                      <span className="kpi-change orange">9 of 12 salvaged</span>
                    </div>
                    <div className="kpi-chart-col">
                      <MiniBars color="#f59e0b" values={[4, 5, 7, 8, 9, 10, 11]} />
                    </div>
                  </div>
                </div>

                {/* Lead Leakage Map: Sources Funnel & Pipeline Recovery */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', margin: '20px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                        Lead Leakage Detector & Multi-Source Funnel
                      </h3>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Enquiries captured across Meta Ads, Portals, WhatsApp Click-to-Chat, and Missed Calls — salvaged from leakage.
                      </p>
                    </div>
                    <span style={{ fontSize: '12px', background: '#ecfdf5', color: '#065f46', padding: '4px 12px', borderRadius: '20px', fontWeight: 700 }}>
                      ✓ Zero Unhandled Leads
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                    {[
                      { source: 'Meta Ads (Instagram)', total: 42, responded60: '98%', leaked: '2', recovered: '$8.4M', badge: 'High Intent' },
                      { source: 'Portal Inquiries', total: 28, responded60: '93%', leaked: '1', recovered: '$5.2M', badge: '1031 Exchange' },
                      { source: 'WhatsApp Click-to-Chat', total: 19, responded60: '100%', leaked: '0', recovered: '$6.1M', badge: 'Fastest Closer' },
                      { source: 'Missed Calls (Telephony)', total: 14, responded60: '93%', leaked: '1', recovered: '$3.8M', badge: 'After-Hours' }
                    ].map((src, i) => (
                      <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>{src.source}</strong>
                          <span style={{ fontSize: '10px', background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                            {src.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                          {src.recovered}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span>Total Inbound: <strong>{src.total} prospects</strong></span>
                          <span>Speed SLA (&lt;60s): <strong style={{ color: '#16a34a' }}>{src.responded60}</strong></span>
                          <span>Leaked / Prevented: <strong style={{ color: '#ea580c' }}>{src.leaked} rescued</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Closer Accountability Scorecard */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', margin: '20px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                        Closer Accountability Scorecard
                      </h3>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Tracking response time, site visits handled, and SLA compliance across your closing team.
                      </p>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '10px 14px' }}>Closer</th>
                        <th style={{ padding: '10px 14px' }}>Role / Specialization</th>
                        <th style={{ padding: '10px 14px' }}>Active Leads</th>
                        <th style={{ padding: '10px 14px' }}>Avg Response Time</th>
                        <th style={{ padding: '10px 14px' }}>Site Visits Booked</th>
                        <th style={{ padding: '10px 14px' }}>SLA Compliance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Christian Sterling', role: 'Senior Closer - Luxury Residential', active: 3, response: '1.8 min', tours: 14, sla: '98.5%' },
                        { name: 'Elena Vance', role: 'Commercial & 1031 Exchange Lead', active: 2, response: '2.4 min', tours: 9, sla: '96.0%' },
                        { name: 'Julian Ross', role: 'Residential Specialist', active: 5, response: '4.1 min', tours: 11, sla: '91.2%' }
                      ].map((closer, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{closer.name}</td>
                          <td style={{ padding: '12px 14px', color: '#64748b' }}>{closer.role}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{closer.active} assigned</td>
                          <td style={{ padding: '12px 14px', color: '#16a34a', fontWeight: 600 }}>{closer.response}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 800, color: '#2563eb' }}>{closer.tours} tours</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '11px' }}>
                              {closer.sla}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2-Column Section: Charts */}
                <div className="charts-double-grid">
                  <RevenueTrendChart total="$23.5M" growth="↑ 38.4% recovered pipeline" />
                  <AcquisitionSourcesDonut />
                </div>
              </div>
            )}

            {/* TAB 2: LEADS & WHATSAPP LIVE CONVERSATION */}
            {activeTab === 'leads' && (
              <div className="leads-chat-layout">
                {/* Left Leads Column */}
                <div className="leads-list-panel">
                  <div className="panel-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Lead Pipeline</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>Canonical stages & recovery scores.</p>
                      </div>
                      <span className="live-inquiries-badge">
                        <span className="pulse-emerald-dot" /> {filteredLeads.length} Leads
                      </span>
                    </div>

                    {/* Search Bar */}
                    <div className="leads-search-input-box">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Search buyer name, budget, phone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} className="clear-search-btn">
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Filter Chips */}
                    <div className="leads-filter-tabs">
                      <button
                        type="button"
                        className={`filter-chip ${leadFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setLeadFilter('all')}
                      >
                        All ({leadsList.length})
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${leadFilter === 'hot' ? 'active' : ''}`}
                        onClick={() => setLeadFilter('hot')}
                      >
                        Hot ({leadsList.filter(l => l.recovery_priority === 'Hot Recovery').length})
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${leadFilter === 'booked' ? 'active' : ''}`}
                        onClick={() => setLeadFilter('booked')}
                      >
                        Tours ({leadsList.filter(l => l.stage === 'APPOINTMENT_BOOKED').length})
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${leadFilter === 'noshow' ? 'active' : ''}`}
                        onClick={() => setLeadFilter('noshow')}
                      >
                        No-Shows ({leadsList.filter(l => l.stage === 'NO_SHOW' || l.stage === 'RECOVERY_FOLLOW_UP').length})
                      </button>
                    </div>
                  </div>

                  <div className="leads-items-container">
                    {filteredLeads.map(lead => (
                      <div
                        key={lead.id}
                        className={`lead-item-card ${lead.id === selectedLeadId ? 'selected' : ''}`}
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        <div className="lead-item-avatar-col">
                          <div className={`lead-avatar ${lead.stage === 'APPOINTMENT_BOOKED' ? 'booked' : lead.stage === 'NO_SHOW' ? 'unqualified' : 'qualified'}`}>
                            {lead.name.slice(0, 2).toUpperCase()}
                            <span className="online-pip" />
                          </div>
                        </div>

                        <div className="lead-item-content">
                          <div className="lead-item-top">
                            <strong className="lead-name-text">
                              {lead.name}
                              {lead.verifiedBuyer && (
                                <span title="Verified $1M+ Buyer">
                                  <CheckCircle2 size={12} className="text-emerald" />
                                </span>
                              )}
                            </strong>
                            <span className="lead-time-stamp">{lead.created_at}</span>
                          </div>

                          <div className="lead-phone-line">
                            <span>{lead.phone}</span>
                            <span style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              fontWeight: 700,
                              background: lead.recovery_score >= 75 ? '#dcfce7' : lead.recovery_score >= 50 ? '#fef3c7' : '#fee2e2',
                              color: lead.recovery_score >= 75 ? '#15803d' : lead.recovery_score >= 50 ? '#b45309' : '#b91c1c'
                            }}>
                              Score: {lead.recovery_score}
                            </span>
                          </div>

                          <div style={{ margin: '4px 0', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '9px', background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              {lead.stage}
                            </span>
                            <span style={{ fontSize: '9px', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              {lead.source}
                            </span>
                          </div>

                          <small className="lead-service-snippet">{lead.service.slice(0, 68)}...</small>

                          <div className="lead-budget-tag">
                            <span>{lead.budget}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredLeads.length === 0 && (
                      <div className="empty-leads-search">
                        <p>No inquiries found matching "{searchQuery}".</p>
                        <button type="button" onClick={() => { setSearchQuery(''); setLeadFilter('all') }}>Reset filters</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Chat + Lead Detail Drawer */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Lead Action Control Ribbon */}
                  <div style={{
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {selectedLead.name}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 700
                      }}>
                        Stage: {selectedLead.stage}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Closer: <strong>{selectedLead.assigned_agent_name ?? 'Unassigned'}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() => handleCrmSync(selectedLead.id)}
                        title="Sync canonical record to HubSpot & Google Sheets"
                      >
                        <Database size={12} /> Sync CRM
                      </button>
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() => setShowOverrideModal(true)}
                        title="Manually override AI qualification"
                      >
                        <SlidersHorizontal size={12} /> Override
                      </button>
                      {selectedLead.stage === 'APPOINTMENT_BOOKED' && (
                        <>
                          <button
                            type="button"
                            className="primary-button small"
                            style={{ background: '#16a34a', borderColor: '#16a34a' }}
                            onClick={() => handleMarkVisited('apt-1')}
                          >
                            Mark Visited
                          </button>
                          <button
                            type="button"
                            className="secondary-button small"
                            style={{ color: '#dc2626' }}
                            onClick={() => handleTriggerNoShow('apt-1')}
                          >
                            Mark No-Show
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Split: WhatsApp Chat Panel */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <WhatsAppChatPanel
                      lead={{
                        id: selectedLead.id,
                        name: selectedLead.name,
                        email: selectedLead.email,
                        phone: selectedLead.phone,
                        company: selectedLead.company,
                        service: selectedLead.service,
                        budget: selectedLead.budget,
                        status: selectedLead.status,
                        source: selectedLead.source,
                        created_at: selectedLead.created_at,
                        verifiedBuyer: selectedLead.verifiedBuyer
                      }}
                      onRequestAgencyChange={() => setShowRequestModal(true)}
                    />
                  </div>

                  {/* Recovery Score & Activity Audit Bar at Bottom */}
                  <div style={{
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: '#64748b'
                  }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span>Intent: <strong>{selectedLead.recovery_breakdown?.intent ?? 25}/25</strong></span>
                      <span>Budget Fit: <strong>{selectedLead.recovery_breakdown?.budgetFit ?? 25}/25</strong></span>
                      <span>Timeline: <strong>{selectedLead.recovery_breakdown?.timeline ?? 20}/20</strong></span>
                      <span>Engagement: <strong>{selectedLead.recovery_breakdown?.engagement ?? 15}/15</strong></span>
                      <span>Source: <strong>{selectedLead.recovery_breakdown?.sourceQuality ?? 10}/10</strong></span>
                    </div>
                    <div>
                      <span>CRM Status: <strong style={{ color: selectedLead.crm_sync_status === 'synced' ? '#16a34a' : '#d97706' }}>{selectedLead.crm_sync_status?.toUpperCase() ?? 'SYNCED'}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SITE VISITS & APPOINTMENTS */}
            {activeTab === 'appointments' && (
              <div>
                <div className="section-head-row">
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                      Site Visits & Private Walkthroughs
                    </h1>
                    <p style={{ color: '#64748b', margin: 0 }}>
                      Confirmed VIP property tours with conflict prevention and automated no-show recovery.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setShowRequestModal(true)}
                  >
                    <Calendar size={14} /> Schedule New Tour
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '20px 0' }}>
                  {appointmentsList.map(apt => (
                    <div key={apt.id} style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      padding: '20px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: apt.status === 'CONFIRMED' ? '#dcfce7' : apt.status === 'NO_SHOW' ? '#fee2e2' : '#f1f5f9',
                          color: apt.status === 'CONFIRMED' ? '#15803d' : apt.status === 'NO_SHOW' ? '#b91c1c' : '#475569'
                        }}>
                          {apt.status === 'NO_SHOW' ? 'NO-SHOW (RECOVERING)' : apt.status}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          <Clock size={12} style={{ display: 'inline', marginRight: '3px', verticalAlign: '-1px' }} />
                          {apt.scheduled_at}
                        </span>
                      </div>

                      <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                        {apt.property_title}
                      </h3>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748b' }}>
                        Buyer: <strong>{apt.lead_name}</strong> · Closer: <strong>{apt.agent_name}</strong>
                      </p>

                      <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', fontSize: '11px', color: '#475569', marginBottom: '14px' }}>
                        <div><strong>Location:</strong> {apt.location}</div>
                        {apt.notes && <div style={{ marginTop: '4px' }}><strong>Notes:</strong> {apt.notes}</div>}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {apt.status === 'CONFIRMED' && (
                          <>
                            <button
                              type="button"
                              className="primary-button small"
                              style={{ flex: 1, background: '#16a34a', borderColor: '#16a34a' }}
                              onClick={() => handleMarkVisited(apt.id)}
                            >
                              Mark Visited
                            </button>
                            <button
                              type="button"
                              className="secondary-button small"
                              style={{ flex: 1, color: '#dc2626' }}
                              onClick={() => handleTriggerNoShow(apt.id)}
                            >
                              No-Show Recovery
                            </button>
                          </>
                        )}
                        {apt.status === 'NO_SHOW' && (
                          <div style={{ width: '100%', fontSize: '11px', color: '#b91c1c', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px', textAlign: 'center', fontWeight: 600 }}>
                            ⚡ Automated Recovery Flow Sent via WhatsApp
                          </div>
                        )}
                        {apt.status === 'COMPLETED' && (
                          <div style={{ width: '100%', fontSize: '11px', color: '#15803d', background: '#dcfce7', padding: '6px 10px', borderRadius: '6px', textAlign: 'center', fontWeight: 600 }}>
                            ✓ Tour Completed
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: AUTONOMOUS AI LEAD JOURNEY & WORKFLOW */}
            {activeTab === 'workflow' && (
              <div>
                <ClientWorkflowJourney onRequestChange={() => setShowRequestModal(true)} />
              </div>
            )}

            {/* TAB 5: CAMPAIGN FUNNELS */}
            {activeTab === 'funnels' && (
              <div>
                <div className="section-head-row">
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>Campaign Landing Pages</h1>
                    <p style={{ color: '#64748b', margin: 0 }}>Done-for-you lead capture funnels managed by Buildicy Back Office.</p>
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

      {/* Manual Qualification Override Modal */}
      {showOverrideModal && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowOverrideModal(false) }}>
          <section className="modal" role="dialog" aria-modal="true" style={{ maxWidth: '440px' }}>
            <div className="modal-heading">
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Manual Qualification Override</h2>
              <button className="icon-btn" onClick={() => setShowOverrideModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveOverride} style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Target Qualification Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    className={`cat-pill ${overrideStatus === 'qualified' ? 'active' : ''}`}
                    onClick={() => setOverrideStatus('qualified')}
                  >
                    Qualified
                  </button>
                  <button
                    type="button"
                    className={`cat-pill ${overrideStatus === 'disqualified' ? 'active' : ''}`}
                    onClick={() => setOverrideStatus('disqualified')}
                  >
                    Disqualified
                  </button>
                  <button
                    type="button"
                    className={`cat-pill ${overrideStatus === 'nurture' ? 'active' : ''}`}
                    onClick={() => setOverrideStatus('nurture')}
                  >
                    Nurture
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Mandatory Audit Reason
                </label>
                <textarea
                  required
                  rows={3}
                  className="premium-modal-textarea"
                  placeholder="Explain why you are overriding the AI qualification decision..."
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                />
              </div>

              <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="secondary-button" onClick={() => setShowOverrideModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Override
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Client Change Request Modal */}
      {showRequestModal && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowRequestModal(false) }}>
          <section className="modal premium-request-modal" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="premium-modal-badge">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>Request Agency Customization</h2>
                  <small style={{ color: '#64748b' }}>Delivered directly to Buildicy Agency Back Office</small>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowRequestModal(false)}><X size={18} /></button>
            </div>

            {requestSuccess ? (
              <div className="toast" style={{ margin: '18px 0', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                <CheckCircle2 size={16} /> {requestSuccess}
              </div>
            ) : (
              <form onSubmit={handleSubmitChangeRequest} style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                    Request Category
                  </label>
                  <div className="category-pills-row">
                    <button
                      type="button"
                      className={`cat-pill ${requestCategory === 'landing_page' ? 'active' : ''}`}
                      onClick={() => setRequestCategory('landing_page')}
                    >
                      <FileText size={13} /> Landing Page & Copy
                    </button>
                    <button
                      type="button"
                      className={`cat-pill ${requestCategory === 'ai_channels' ? 'active' : ''}`}
                      onClick={() => setRequestCategory('ai_channels')}
                    >
                      <MessageSquare size={13} /> WhatsApp AI Criteria
                    </button>
                    <button
                      type="button"
                      className={`cat-pill ${requestCategory === 'funnel_questions' ? 'active' : ''}`}
                      onClick={() => setRequestCategory('funnel_questions')}
                    >
                      <SlidersHorizontal size={13} /> Form Questionnaire
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                    Request Title
                  </label>
                  <input
                    required
                    className="premium-modal-input"
                    placeholder="e.g. Update Biscayne Villa listing price to $3.5M reserve"
                    value={requestTitle}
                    onChange={e => setRequestTitle(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                    Detailed Requirements
                  </label>
                  <textarea
                    required
                    className="premium-modal-textarea"
                    rows={4}
                    placeholder="Describe the exact criteria, prompt adjustments, or design tweaks you would like our agency team to deploy..."
                    value={requestDesc}
                    onChange={e => setRequestDesc(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Turnaround Priority:</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`priority-chip ${requestPriority === 'normal' ? 'active' : ''}`}
                      onClick={() => setRequestPriority('normal')}
                    >
                      Standard (24h)
                    </button>
                    <button
                      type="button"
                      className={`priority-chip urgent ${requestPriority === 'urgent' ? 'active' : ''}`}
                      onClick={() => setRequestPriority('urgent')}
                    >
                      ⚡ Urgent (4h SLA)
                    </button>
                  </div>
                </div>

                <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="secondary-button" onClick={() => setShowRequestModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-button">
                    Submit Ticket <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
