import { useState } from 'react'
import {
  Sparkles, MessageSquare, CheckCircle2,
  Clock, Check, X, Play, Calendar, Zap, UserCheck,
  Smartphone, SlidersHorizontal, Building2, FileText,
  ShieldCheck, AlertCircle, RefreshCw
} from 'lucide-react'

export type JourneyStage = {
  id: string
  number: number
  title: string
  subtitle: string
  badge: string
  badgeColor: 'blue' | 'green' | 'purple' | 'amber'
  icon: typeof Sparkles
  sla: string
  metrics: { volume: string; rate: string; avgSpeed: string }
  businessSummary: string
  businessRules: string[]
  sampleMessage?: {
    sender: string
    channel: string
    text: string
  }
  vipOutcome: string
  subThresholdOutcome?: string
}

export function ClientWorkflowJourney({ onRequestChange }: { onRequestChange?: () => void }) {
  const [selectedStage, setSelectedStage] = useState<JourneyStage | null>(null)
  const [simulatingScenario, setSimulatingScenario] = useState<'vip' | 'rental' | null>(null)
  const [simulationStep, setSimulationStep] = useState<number>(0)
  const [simulationLog, setSimulationLog] = useState<string | null>(null)

  const stages: JourneyStage[] = [
    {
      id: 'stage-intake',
      number: 1,
      title: 'Multi-Channel Lead Capture',
      subtitle: 'Captures and syncs inbound buyers across all your marketing channels',
      badge: 'Always On • Real-Time Sync',
      badgeColor: 'blue',
      icon: Smartphone,
      sla: 'Instant (< 0.1s)',
      metrics: { volume: '42 Enquiries', rate: '100% Ingested', avgSpeed: '45ms' },
      businessSummary:
        'Every prospect who submits your luxury villa landing page, sends an Instagram DM, or scans a property signboard QR code is instantly synchronized into your private Prestige Realty workspace with zero manual data entry.',
      businessRules: [
        'Supported: Instagram Ads, Meta Lead Forms, Web Capture, WhatsApp Cloud',
        'Automatic deduplication against existing clients and leads',
        'TCPA & GDPR affirmative consent verification enforced before messaging',
        'Instant timestamping & acquisition source attribution'
      ],
      sampleMessage: {
        sender: 'Inbound Prospect (Marcus Vance)',
        channel: 'Instagram Ad / Villa Landing Page',
        text: 'Inquired about 4-Bed Waterfront Villa: "Pre-approved $3.5M cash budget, looking to close within 30 days. Need private tour."'
      },
      vipOutcome: 'Captured with verified email, phone number, and acquisition source.'
    },
    {
      id: 'stage-greeting',
      number: 2,
      title: 'Instant 24/7 Concierge Outreach',
      subtitle: 'Sends verified luxury broker greeting to engage buyers within seconds',
      badge: 'Speed-to-Lead Guarantee',
      badgeColor: 'green',
      icon: Zap,
      sla: 'Under 15 Seconds',
      metrics: { volume: '42 Contacted', rate: '99.4% Delivery', avgSpeed: '12s' },
      businessSummary:
        'Speed is everything in high-ticket real estate. Your AI Concierge reaches out via verified WhatsApp within seconds of form submission, greeting the prospect in Prestige Luxury Realty’s signature executive voice while their buying intent is at its peak.',
      businessRules: [
        'Personalized greeting using the prospect’s first name and requested property',
        'Tone: Ultra-luxury, discreet, professional South Florida estate broker',
        '24/7 coverage: responds instantly even on weekends and late evenings',
        'Prompts buyer for criteria clarification: target closing date & financing status'
      ],
      sampleMessage: {
        sender: 'Prestige AI Broker Concierge',
        channel: 'WhatsApp Business (Verified)',
        text: 'Hi Marcus, thank you for inquiring about our Biscayne Bay Waterfront Villa collection! I have confirmed your request. Our private listings currently range from $3.2M to $8.5M. Are you looking to purchase with cash or pre-approved financing?'
      },
      vipOutcome: 'Immediate contact established; buyer is actively engaged in conversation.'
    },
    {
      id: 'stage-qualification',
      number: 3,
      title: 'AI Qualification & Criteria Check',
      subtitle: 'Filters serious high-net-worth buyers from casual browsers and rentals',
      badge: 'AI Brain (GPT-4o)',
      badgeColor: 'purple',
      icon: Sparkles,
      sla: 'Under 2 Seconds',
      metrics: { volume: '42 Screened', rate: '88% Qualified', avgSpeed: '1.4s' },
      businessSummary:
        'The AI Brain cross-references the conversation against Prestige Luxury Realty’s custom qualification criteria. It verifies purchase readiness, investment budget, and closing timeline so your brokers only spend time on high-margin opportunities.',
      businessRules: [
        'Minimum Purchase Budget: $1,000,000 (disqualifies sub-$1M inquiries from sales desk)',
        'Proof of Funds / Financing: Pre-approved letter or verified liquid cash',
        'Purchase Horizon: Ready to inspect and close within 30 to 60 days',
        'Strict Protection: Casual renters under $5k/mo are gracefully redirected to the leasing desk'
      ],
      sampleMessage: {
        sender: 'AI Lead Evaluation Report',
        channel: 'Internal Qualification Scorecard',
        text: 'Marcus Vance evaluated: Budget $3.5M (PASS), Horizon 30 days (PASS), Intent Purchase (PASS). Overall Score: 95/100 (HIGH-VALUE BUYER).'
      },
      vipOutcome: 'Promoted to VIP Qualified Lead with high priority alert dispatched to Senior Broker.',
      subThresholdOutcome: 'Politely provided general market report without scheduling agent time.'
    },
    {
      id: 'stage-booking',
      number: 4,
      title: 'VIP Tour Booking & Broker Handoff',
      subtitle: 'Schedules private showing on your calendar and delivers property dossier',
      badge: 'Automated Booking',
      badgeColor: 'amber',
      icon: Calendar,
      sla: 'Under 1 Minute',
      metrics: { volume: '18 VIP Tours', rate: '42.8% Conversion', avgSpeed: '28s' },
      businessSummary:
        'Once qualified, the AI seamlessly offers your custom booking calendar, schedules the private chauffeur walkthrough, delivers the listing brochure PDF, and alerts your lead broker with full dossier notes.',
      businessRules: [
        'Sends verified Calendly VIP Walkthrough calendar link',
        'Dispatches exclusive property dossier and gate access info via WhatsApp',
        'Direct SMS / Email notification sent to Broker with full buyer profile',
        'Syncs scheduled walkthrough with Google / Outlook calendar'
      ],
      sampleMessage: {
        sender: 'Prestige AI Broker Concierge',
        channel: 'WhatsApp Business',
        text: 'Splendid! I have reserved Thursday at 11:00 AM for your private walkthrough of the Biscayne Villa. Our senior broker Christian Sterling will host you. I’ve sent the private gate code and PDF dossier to your email.'
      },
      vipOutcome: 'Walkthrough confirmed on broker calendar with full prospect dossier.'
    }
  ]

  const runSimulation = (scenario: 'vip' | 'rental') => {
    setSimulatingScenario(scenario)
    setSimulationStep(1)
    setSimulationLog(null)

    setTimeout(() => {
      setSimulationStep(2)
    }, 900)

    setTimeout(() => {
      setSimulationStep(3)
    }, 1800)

    setTimeout(() => {
      setSimulationStep(4)
      if (scenario === 'vip') {
        setSimulationLog(
          '✅ VIP Buyer Simulation Complete: Marcus Vance ($3.5M Budget) successfully qualified! WhatsApp tour scheduled for Thursday 11:00 AM with Senior Broker Christian Sterling. Calendar invite and PDF brochure sent.'
        )
      } else {
        setSimulationLog(
          'ℹ️ Courtesy Flow Simulation Complete: Elena Rostova ($1,200/mo rental) recognized as below $1M purchase threshold. Politely sent self-serve rental directory link. Broker schedule protected.'
        )
      }
    }, 2800)
  }

  const resetSimulation = () => {
    setSimulatingScenario(null)
    setSimulationStep(0)
    setSimulationLog(null)
  }

  return (
    <div className="client-journey-wrapper">
      {/* Executive Header */}
      <div className="client-journey-header">
        <div className="journey-title-block">
          <div className="journey-status-pill">
            <span className="live-pulse-dot" />
            <span>FULLY MANAGED AI LEAD PIPELINE</span>
          </div>
          <h2>Prestige Luxury Realty — Autonomous Lead Journey</h2>
          <p>
            Spectator overview of how Buildicy AI captures, qualifies, and schedules VIP buyers on autopilot for your brokerage.
          </p>
        </div>

        <div className="journey-header-actions">
          <div className="simulation-dropdown-wrap">
            <button
              type="button"
              className="secondary-button simulation-trigger-btn"
              onClick={() => runSimulation(simulatingScenario === 'vip' ? 'rental' : 'vip')}
              disabled={simulationStep > 0 && simulationStep < 4}
            >
              <Play size={13} />
              {simulatingScenario && simulationStep < 4
                ? `Running Step ${simulationStep} of 4...`
                : 'Simulate Lead Journey'}
            </button>
          </div>

          {onRequestChange && (
            <button type="button" className="primary-button" onClick={onRequestChange}>
              <SlidersHorizontal size={13} />
              Request Agency Change ➔
            </button>
          )}
        </div>
      </div>

      {/* Interactive Simulation Banner */}
      {simulatingScenario && (
        <div className="simulation-banner">
          <div className="simulation-banner-top">
            <div className="sim-badge">
              <RefreshCw size={13} className={simulationStep < 4 ? 'spin-icon' : ''} />
              <span>
                {simulatingScenario === 'vip'
                  ? 'Testing Scenario A: $3.5M Cash Luxury Buyer (Marcus Vance)'
                  : 'Testing Scenario B: $1,200/mo Rental Inquiry (Elena Rostova)'}
              </span>
            </div>
            <div className="sim-switcher">
              <button
                type="button"
                className={`sim-switch-btn ${simulatingScenario === 'vip' ? 'active' : ''}`}
                onClick={() => runSimulation('vip')}
                disabled={simulationStep > 0 && simulationStep < 4}
              >
                Test High-Value Buyer ($3.5M)
              </button>
              <button
                type="button"
                className={`sim-switch-btn ${simulatingScenario === 'rental' ? 'active' : ''}`}
                onClick={() => runSimulation('rental')}
                disabled={simulationStep > 0 && simulationStep < 4}
              >
                Test Sub-Threshold Rental
              </button>
              <button type="button" className="sim-close-btn" onClick={resetSimulation}>
                <X size={14} />
              </button>
            </div>
          </div>

          {simulationLog && (
            <div className={`sim-result-toast ${simulatingScenario === 'vip' ? 'success' : 'info'}`}>
              {simulatingScenario === 'vip' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{simulationLog}</span>
            </div>
          )}
        </div>
      )}

      {/* Customer Journey Stepper Grid */}
      <div className="journey-canvas">
        <div className="journey-stages-grid">
          {stages.map((stage) => {
            const isSimActive = simulationStep === stage.number
            const isSimDone = simulationStep > stage.number
            const IconComponent = stage.icon

            return (
              <div
                key={stage.id}
                className={`journey-stage-card ${isSimActive ? 'sim-active' : ''} ${isSimDone ? 'sim-done' : ''}`}
                onClick={() => setSelectedStage(stage)}
              >
                <div className="stage-top-meta">
                  <span className="stage-step-num">STAGE 0{stage.number}</span>
                  <span className={`stage-badge-pill ${stage.badgeColor}`}>{stage.badge}</span>
                </div>

                <div className="stage-icon-row">
                  <div className={`stage-icon-box ${stage.badgeColor}`}>
                    <IconComponent size={18} />
                  </div>
                  <div className="stage-heading-text">
                    <h4>{stage.title}</h4>
                    <span className="stage-sla-tag">
                      <Clock size={11} /> SLA: {stage.sla}
                    </span>
                  </div>
                </div>

                <p className="stage-desc-preview">{stage.subtitle}</p>

                <div className="stage-kpi-row">
                  <div className="stage-kpi-cell">
                    <small>Throughput</small>
                    <strong>{stage.metrics.volume}</strong>
                  </div>
                  <div className="stage-kpi-cell">
                    <small>Efficiency</small>
                    <strong>{stage.metrics.rate}</strong>
                  </div>
                  <div className="stage-kpi-cell">
                    <small>Response</small>
                    <strong>{stage.metrics.avgSpeed}</strong>
                  </div>
                </div>

                <div className="stage-card-footer">
                  <span className="inspect-link">
                    View Business Rules & Script ➔
                  </span>
                  {isSimActive && <span className="sim-pulse-indicator">Processing...</span>}
                  {isSimDone && (
                    <span className="sim-completed-check">
                      <Check size={12} /> Passed
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Client Executive Summary Bar */}
        <div className="journey-guarantee-strip">
          <div className="guarantee-item">
            <ShieldCheck size={16} className="text-emerald" />
            <div>
              <strong>100% White-Glove DFY Management</strong>
              <span>Rules, integrations, and AI prompts are maintained 24/7 by Buildicy Agency.</span>
            </div>
          </div>
          <div className="guarantee-item">
            <Clock size={16} className="text-indigo" />
            <div>
              <strong>Under 15s Speed-To-Lead SLA</strong>
              <span>Guarantees your luxury leads never cool down or look elsewhere.</span>
            </div>
          </div>
          <div className="guarantee-item">
            <UserCheck size={16} className="text-purple" />
            <div>
              <strong>Broker Time Protection</strong>
              <span>Only pre-screened buyers with verified $1M+ budgets reach your agents.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Detail Drawer / Modal for the Client */}
      {selectedStage && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedStage(null)
          }}
        >
          <section className="modal journey-detail-modal" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <div className="modal-title-with-badge">
                <span className={`stage-icon-box ${selectedStage.badgeColor}`}>
                  <selectedStage.icon size={20} />
                </span>
                <div>
                  <span className="stage-step-tag">STAGE 0{selectedStage.number} • {selectedStage.badge}</span>
                  <h2>{selectedStage.title}</h2>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedStage(null)}>
                <X size={18} />
              </button>
            </div>

            <p className="modal-lead-summary">{selectedStage.businessSummary}</p>

            {/* Performance KPIs */}
            <div className="journey-modal-stats">
              <div className="jm-stat">
                <small>Monthly Volume</small>
                <strong>{selectedStage.metrics.volume}</strong>
              </div>
              <div className="jm-stat">
                <small>Average Speed</small>
                <strong>{selectedStage.metrics.avgSpeed}</strong>
              </div>
              <div className="jm-stat">
                <small>Success Rate</small>
                <strong>{selectedStage.metrics.rate}</strong>
              </div>
              <div className="jm-stat">
                <small>Client SLA</small>
                <strong>{selectedStage.sla}</strong>
              </div>
            </div>

            {/* Active Business Rules */}
            <div className="modal-section-box">
              <div className="section-box-header">
                <FileText size={15} />
                <strong>Active Brokerage Business Rules</strong>
              </div>
              <ul className="business-rules-list">
                {selectedStage.businessRules.map((rule, idx) => (
                  <li key={idx}>
                    <CheckCircle2 size={14} className="text-emerald" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sample Message / Output Preview */}
            {selectedStage.sampleMessage && (
              <div className="modal-section-box">
                <div className="section-box-header">
                  <MessageSquare size={15} />
                  <strong>Client Communication Preview ({selectedStage.sampleMessage.channel})</strong>
                </div>
                <div className="sample-message-bubble">
                  <div className="sample-msg-head">
                    <strong>{selectedStage.sampleMessage.sender}</strong>
                    <span className="sample-msg-tag">{selectedStage.sampleMessage.channel}</span>
                  </div>
                  <p className="sample-msg-text">"{selectedStage.sampleMessage.text}"</p>
                </div>
              </div>
            )}

            {/* Smart Branching Outcomes */}
            <div className="outcomes-grid">
              <div className="outcome-card vip">
                <div className="outcome-head">
                  <CheckCircle2 size={14} />
                  <strong>VIP Qualified Outcome</strong>
                </div>
                <p>{selectedStage.vipOutcome}</p>
              </div>
              {selectedStage.subThresholdOutcome && (
                <div className="outcome-card fallback">
                  <div className="outcome-head">
                    <AlertCircle size={14} />
                    <strong>Sub-Threshold Protection</strong>
                  </div>
                  <p>{selectedStage.subThresholdOutcome}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                <Building2 size={14} />
                <span>Customized for Prestige Luxury Realty</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {onRequestChange && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setSelectedStage(null)
                      onRequestChange()
                    }}
                  >
                    Request Rule Adjustment
                  </button>
                )}
                <button type="button" className="primary-button" onClick={() => setSelectedStage(null)}>
                  Done
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
