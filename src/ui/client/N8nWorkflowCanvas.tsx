import { useState } from 'react'
import {
  Sparkles, MessageSquare, CheckCircle2, ArrowRight,
  Split, Clock, Check, X, Code, Play
} from 'lucide-react'

type WorkflowNode = {
  id: string
  title: string
  subtitle: string
  type: 'trigger' | 'action' | 'ai' | 'condition' | 'branch'
  status: 'active' | 'success' | 'running'
  icon: typeof Sparkles
  badge: string
  stats: { executions: number; avgTime: string; successRate: string }
  config: Record<string, unknown>
}

export function N8nWorkflowCanvas({ onRequestChange }: { onRequestChange?: () => void }) {
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const nodes: WorkflowNode[] = [
    {
      id: 'node-trigger',
      title: 'Meta / IG Ad & Web Form',
      subtitle: 'Triggers on incoming buyer enquiry or WhatsApp text',
      type: 'trigger',
      status: 'active',
      icon: MessageSquare,
      badge: 'Webhook Active',
      stats: { executions: 42, avgTime: '45ms', successRate: '100%' },
      config: {
        endpoint: 'https://api.buildicy.com/v1/public/funnels/luxury-villa-inquiry/submissions',
        supportedChannels: ['Meta Lead Ads', 'Instagram DM', 'WhatsApp Business Cloud', 'Public Funnel']
      }
    },
    {
      id: 'node-greeting',
      title: 'Instant WhatsApp Auto-Greeting',
      subtitle: 'Sends verified broker confirmation within 15 seconds',
      type: 'action',
      status: 'success',
      icon: MessageSquare,
      badge: 'Delay: 0s',
      stats: { executions: 42, avgTime: '210ms', successRate: '98.5%' },
      config: {
        template: 'Hi {{name}}, thanks for requesting details on our luxury Miami listings! Our AI broker will verify your criteria.',
        channel: 'WhatsApp'
      }
    },
    {
      id: 'node-ai',
      title: 'OpenAI GPT-4o Qualification',
      subtitle: 'Evaluates budget ($1M+ minimum), POF & timeline',
      type: 'ai',
      status: 'success',
      icon: Sparkles,
      badge: 'OpenAI gpt-4o-mini',
      stats: { executions: 42, avgTime: '1.2s', successRate: '100%' },
      config: {
        model: 'gpt-4o-mini',
        knowledgeBase: 'Prestige Realty High Net Worth Guidelines',
        minBudget: '$1,000,000',
        confidenceThreshold: '65%'
      }
    },
    {
      id: 'node-condition',
      title: 'Is Budget >= $1,000,000 & POF?',
      subtitle: 'Splits verified high-net-worth buyers from rentals',
      type: 'condition',
      status: 'active',
      icon: Split,
      badge: 'Rule Filter',
      stats: { executions: 42, avgTime: '10ms', successRate: '100%' },
      config: {
        criteria: 'lead.budget >= 1000000 && lead.intent == "purchase"'
      }
    }
  ]

  const runTestSimulation = () => {
    setTesting(true)
    setTestResult(null)
    setTimeout(() => {
      setTesting(false)
      setTestResult('Workflow executed successfully: Marcus Vance ($3.5M budget) classified as QUALIFIED. WhatsApp tour proposed for Thursday 11:00 AM.')
    }, 1200)
  }

  return (
    <div className="n8n-wrapper">
      {/* Top Banner & Control Bar */}
      <div className="n8n-topbar">
        <div className="n8n-title-area">
          <div className="n8n-pill">LIVE n8n ENGINE</div>
          <h2>Autonomous Real Estate AI Pipeline</h2>
          <p>Visual automated multi-channel sequence powered by OpenAI & WhatsApp.</p>
        </div>
        <div className="n8n-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={runTestSimulation}
            disabled={testing}
          >
            <Play size={13} /> {testing ? 'Testing Flow...' : 'Test Run Workflow'}
          </button>
          {onRequestChange && (
            <button type="button" className="primary-button" onClick={onRequestChange}>
              Request Agency Change ➔
            </button>
          )}
        </div>
      </div>

      {testResult && (
        <div className="toast" style={{ margin: '14px 24px 0' }}>
          <Check size={16} /> {testResult}
          <button onClick={() => setTestResult(null)}><X size={14} /></button>
        </div>
      )}

      {/* Visual Canvas */}
      <div className="n8n-canvas">
        <div className="n8n-flow-row">
          {/* Node 1: Trigger */}
          <div className="n8n-node-card trigger" onClick={() => setSelectedNode(nodes[0])}>
            <div className="node-badge trigger">TRIGGER</div>
            <div className="node-icon-title">
              <span className="node-icon-box trigger"><MessageSquare size={16} /></span>
              <div>
                <h4>{nodes[0].title}</h4>
                <small>{nodes[0].subtitle}</small>
              </div>
            </div>
            <div className="node-foot">
              <span className="live-dot" /> <strong>{nodes[0].stats.executions} Leads Intake</strong>
            </div>
          </div>

          {/* Animated Connecting Line */}
          <div className="n8n-arrow-connector">
            <span className="pulse-dot" />
            <ArrowRight size={18} />
          </div>

          {/* Node 2: WhatsApp Greeting */}
          <div className="n8n-node-card action" onClick={() => setSelectedNode(nodes[1])}>
            <div className="node-badge action">WHATSAPP ACTION</div>
            <div className="node-icon-title">
              <span className="node-icon-box action"><MessageSquare size={16} /></span>
              <div>
                <h4>{nodes[1].title}</h4>
                <small>{nodes[1].subtitle}</small>
              </div>
            </div>
            <div className="node-foot">
              <span className="live-dot" /> <strong>Auto-sent &lt; 15s</strong>
            </div>
          </div>

          {/* Animated Connecting Line */}
          <div className="n8n-arrow-connector">
            <span className="pulse-dot" />
            <ArrowRight size={18} />
          </div>

          {/* Node 3: AI Qualification */}
          <div className="n8n-node-card ai" onClick={() => setSelectedNode(nodes[2])}>
            <div className="node-badge ai">AI BRAIN (GPT-4o)</div>
            <div className="node-icon-title">
              <span className="node-icon-box ai"><Sparkles size={16} /></span>
              <div>
                <h4>{nodes[2].title}</h4>
                <small>{nodes[2].subtitle}</small>
              </div>
            </div>
            <div className="node-foot">
              <span className="live-dot" /> <strong>$1M+ Check Verified</strong>
            </div>
          </div>

          {/* Animated Connecting Line */}
          <div className="n8n-arrow-connector">
            <span className="pulse-dot" />
            <ArrowRight size={18} />
          </div>

          {/* Node 4: Split Decision Branch */}
          <div className="n8n-node-card condition" onClick={() => setSelectedNode(nodes[3])}>
            <div className="node-badge condition">DECISION ROUTER</div>
            <div className="node-icon-title">
              <span className="node-icon-box condition"><Split size={16} /></span>
              <div>
                <h4>{nodes[3].title}</h4>
                <small>{nodes[3].subtitle}</small>
              </div>
            </div>
            <div className="node-branch-outputs">
              <div className="branch-true">
                <CheckCircle2 size={12} />
                <span><strong>TRUE (≥ $1M):</strong> Schedule VIP Walkthrough + Send Portfolio PDF</span>
              </div>
              <div className="branch-false">
                <X size={12} />
                <span><strong>FALSE (&lt; $1M):</strong> Auto-Referral / Polite Courtesy Decline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Execution Bar */}
        <div className="n8n-canvas-footer">
          <div className="canvas-stat">
            <Clock size={14} />
            <span>Average Total Pipeline Latency: <strong>1.45 seconds</strong></span>
          </div>
          <div className="canvas-stat">
            <CheckCircle2 size={14} style={{ color: '#10b981' }} />
            <span>Success Rate Today: <strong>100% (42/42 runs succeeded)</strong></span>
          </div>
          <div className="canvas-stat">
            <Code size={14} />
            <span>Managed by Buildicy Back Office (DFY Service)</span>
          </div>
        </div>
      </div>

      {/* Node Inspector Modal */}
      {selectedNode && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedNode(null) }}>
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <span className="modal-icon"><selectedNode.icon size={18} /></span>
              <button className="icon-btn" onClick={() => setSelectedNode(null)}><X size={18} /></button>
            </div>
            <h2>{selectedNode.title}</h2>
            <p>{selectedNode.subtitle}</p>

            <div className="inspector-kv-grid">
              <div className="kv-box">
                <small>Execution Count</small>
                <strong>{selectedNode.stats.executions} runs</strong>
              </div>
              <div className="kv-box">
                <small>Average Latency</small>
                <strong>{selectedNode.stats.avgTime}</strong>
              </div>
              <div className="kv-box">
                <small>Success Rate</small>
                <strong>{selectedNode.stats.successRate}</strong>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <strong>Node Configuration & Payload:</strong>
              <pre className="json-preview">{JSON.stringify(selectedNode.config, null, 2)}</pre>
            </div>

            <div className="modal-actions">
              <button type="button" className="primary-button" onClick={() => setSelectedNode(null)}>
                Close Inspector
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
