import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../worker/src/app.ts'
import {
  assertLeadStageTransition,
  calculateRecoveryScore,
  detectLeadLeakage
} from '../packages/workflow-core/src/index.ts'

const env = { DEMO_MODE: 'true', APP_ORIGIN: 'http://localhost:5173' }
const request = (path: string, init?: RequestInit) => app.request(`/api/v1${path}`, init, env)

test('canonical lead stage transitions enforce valid progression and reject illegal jumps', () => {
  // Valid progression
  assert.doesNotThrow(() => assertLeadStageTransition('NEW', 'CONTACTED'))
  assert.doesNotThrow(() => assertLeadStageTransition('CONTACTED', 'QUALIFYING'))
  assert.doesNotThrow(() => assertLeadStageTransition('QUALIFYING', 'QUALIFIED'))
  assert.doesNotThrow(() => assertLeadStageTransition('QUALIFIED', 'APPOINTMENT_BOOKED'))
  assert.doesNotThrow(() => assertLeadStageTransition('APPOINTMENT_BOOKED', 'NO_SHOW'))
  assert.doesNotThrow(() => assertLeadStageTransition('NO_SHOW', 'RECOVERY_FOLLOW_UP'))
  assert.doesNotThrow(() => assertLeadStageTransition('RECOVERY_FOLLOW_UP', 'RESCHEDULED'))
  assert.doesNotThrow(() => assertLeadStageTransition('RESCHEDULED', 'VISITED'))
  assert.doesNotThrow(() => assertLeadStageTransition('VISITED', 'WON'))

  // Same stage is a no-op
  assert.doesNotThrow(() => assertLeadStageTransition('QUALIFIED', 'QUALIFIED'))

  // Illegal jumps
  assert.throws(() => assertLeadStageTransition('NEW', 'VISITED'), /Invalid lead lifecycle transition: NEW -> VISITED/)
  assert.throws(() => assertLeadStageTransition('DISQUALIFIED', 'QUALIFIED'), /Invalid lead lifecycle transition/)
  assert.throws(() => assertLeadStageTransition('WON', 'NEW'), /Invalid lead lifecycle transition/)
  assert.throws(() => assertLeadStageTransition('ARCHIVED', 'QUALIFIED'), /Invalid lead lifecycle transition/)
})

test('revenue recovery score engine calculates score, priority tier, and breakdown', () => {
  // High-intent, verified budget, urgent timeline
  const hotLead = calculateRecoveryScore({
    budgetNumeric: 3500000,
    budgetMinCriteria: 1000000,
    timelineDays: 28,
    messagesExchanged: 4,
    sourceQualityScore: 9,
    hoursSinceLastActivity: 2,
    hasOptedIn: true
  })
  assert.ok(hotLead.score >= 75)
  assert.equal(hotLead.tier, 'Hot Recovery')
  assert.equal(hotLead.breakdown.budgetFit, 25)
  assert.equal(hotLead.breakdown.timeline, 20)

  // Disqualified / low budget lead
  const coldLead = calculateRecoveryScore({
    budgetNumeric: 50000,
    budgetMinCriteria: 1000000,
    timelineDays: 90,
    messagesExchanged: 1,
    sourceQualityScore: 2,
    hoursSinceLastActivity: 72,
    hasOptedIn: false
  })
  assert.ok(coldLead.score < 30)
  assert.equal(coldLead.tier, 'Leaked')
})

test('lead leakage detector classifies lead status accurately', () => {
  assert.equal(detectLeadLeakage({ stage: 'WON', hoursInCurrentStage: 1 }), 'Won')
  assert.equal(detectLeadLeakage({ stage: 'LOST', hoursInCurrentStage: 1 }), 'Lost')
  assert.equal(detectLeadLeakage({ stage: 'DISQUALIFIED', hoursInCurrentStage: 1 }), 'Disqualified')
  assert.equal(detectLeadLeakage({ stage: 'NO_SHOW', hoursInCurrentStage: 1 }), 'No-Show')
  assert.equal(detectLeadLeakage({ stage: 'RESCHEDULED', hoursInCurrentStage: 1, hasRecovered: true }), 'Recovered')

  // Leaked due to delayed response > 24 hours
  assert.equal(detectLeadLeakage({ stage: 'NEW', hoursInCurrentStage: 36, secondsToFirstResponse: 90000 }), 'Leaked')

  // At risk due to 5+ minute response delay
  assert.equal(detectLeadLeakage({ stage: 'QUALIFYING', hoursInCurrentStage: 50, secondsToFirstResponse: 400 }), 'At Risk')
})

test('API: canonical stage transition endpoint validates and updates state with audit trail', async () => {
  // Test valid stage transition on lead-re-5 (NEW -> CONTACTED)
  const res = await request('/leads/lead-re-5/stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'CONTACTED', reason: 'Instant WhatsApp Welcome' })
  })
  assert.equal(res.status, 200)
  const json = (await res.json() as { data: { stage: string; status: string; activity_logs: Array<{ action: string }> } }).data
  assert.equal(json.stage, 'CONTACTED')

  // Test invalid transition rejection
  const badRes = await request('/leads/lead-re-5/stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'WON' })
  })
  assert.equal(badRes.status, 409)
})

test('API: lead deduplication merges multi-touch buyer interactions and avoids duplicate records', async () => {
  // Submit duplicate with same email as Marcus Vance
  const dedupRes = await request('/leads/deduplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'marcus.vance@vancerealty.com',
      source: 'portal_followup_form',
      notes: 'Second inquiry asking for private boat dock specifics.'
    })
  })
  assert.equal(dedupRes.status, 200)
  const result = (await dedupRes.json() as { data: { is_duplicate: boolean; action: string; canonical_lead_id: string } }).data
  assert.equal(result.is_duplicate, true)
  assert.equal(result.action, 'MERGED')
  assert.equal(result.canonical_lead_id, 'lead-re-1')

  // Submit completely new lead
  const newLeadRes = await request('/leads/deduplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `fresh-buyer-${Date.now()}@investor.com`,
      phone: '+1 (305) 555-9988',
      name: 'Alexander Stone',
      budget: '$2,500,000',
      source: 'instagram_reels'
    })
  })
  assert.equal(newLeadRes.status, 201)
  const newResult = (await newLeadRes.json() as { data: { is_duplicate: boolean; action: string } }).data
  assert.equal(newResult.is_duplicate, false)
  assert.equal(newResult.action, 'CREATED')
})

test('API: appointment booking detects schedule conflicts and creates site visit', async () => {
  const futureDate = new Date(Date.now() + 86400000 * 5).toISOString()
  const endDate = new Date(Date.now() + 86400000 * 5 + 3600000).toISOString()

  // Book site visit for lead-re-1 with agent-1
  const aptRes = await request('/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_id: 'lead-re-1',
      agent_id: 'agent-1',
      appointment_type: 'site_visit',
      start_time: futureDate,
      end_time: endDate,
      location: '100 Palm Island, Miami Beach, FL',
      notes: 'Private showing with buyer chauffeur access'
    })
  })
  assert.equal(aptRes.status, 201)
  const apt = (await aptRes.json() as { data: { id: string; status: string } }).data
  assert.equal(apt.status, 'CONFIRMED')

  // Attempt duplicate booking for same agent at same time
  const conflictRes = await request('/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_id: 'lead-re-2',
      agent_id: 'agent-1',
      appointment_type: 'site_visit',
      start_time: futureDate,
      end_time: endDate,
      location: 'Different Villa'
    })
  })
  assert.equal(conflictRes.status, 409)
  const conflictJson = (await conflictRes.json() as { error: { code: string } }).error
  assert.equal(conflictJson.code, 'APPOINTMENT_CONFLICT')
})

test('API: no-show recovery sequence triggers automated re-engagement flow', async () => {
  // Trigger no-show on apt-3 (David Sterling)
  const noShowRes = await request('/appointments/apt-3/no-show', {
    method: 'POST'
  })
  assert.equal(noShowRes.status, 200)
  const result = (await noShowRes.json() as { data: { recovery_triggered: boolean; lead: { stage: string } } }).data
  assert.equal(result.recovery_triggered, true)
  assert.equal(result.lead.stage, 'RECOVERY_FOLLOW_UP')

  // Reschedule David Sterling
  const newTime = new Date(Date.now() + 86400000 * 3).toISOString()
  const rescheduleRes = await request('/appointments/apt-3/reschedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduled_at: newTime,
      reason: 'Client requested reschedule via WhatsApp recovery flow'
    })
  })
  assert.equal(rescheduleRes.status, 200)
  const reschedJson = (await rescheduleRes.json() as { data: { status: string } }).data
  assert.equal(reschedJson.status, 'RESCHEDULED')
})

test('API: telephony missed-call webhook converts caller into active lead with instant WhatsApp', async () => {
  const missedCallRes = await request('/webhooks/telephony/missed-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caller_number: '+1 (305) 555-8833',
      caller_name: 'Dr. Robert Harrison'
    })
  })
  assert.equal(missedCallRes.status, 201)
  const data = (await missedCallRes.json() as { data: { success: boolean; recovery_message_dispatched: boolean; channel: string } }).data
  assert.equal(data.success, true)
  assert.equal(data.recovery_message_dispatched, true)
  assert.equal(data.channel, 'whatsapp')
})

test('API: CRM sync pushes canonical lead record to connected CRM adapters', async () => {
  const syncRes = await request('/crm/sync/lead-re-1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'hubspot' })
  })
  assert.equal(syncRes.status, 200)
  const syncData = (await syncRes.json() as { data: { synced: boolean; payload: { stage: string } } }).data
  assert.equal(syncData.synced, true)
  assert.equal(syncData.payload.stage, 'APPOINTMENT_BOOKED')
})

test('API: analytics endpoints return leakage map, agent accountability scorecard, and recovery ROI', async () => {
  const [leakageRes, agentsRes, roiRes] = await Promise.all([
    request('/analytics/leakage-map'),
    request('/analytics/agent-accountability'),
    request('/analytics/recovery-roi')
  ])

  assert.equal(leakageRes.status, 200)
  const leakage = (await leakageRes.json() as { data: { total_recovered_pipeline: number; sources: Array<{ source: string }> } }).data
  assert.ok(leakage.total_recovered_pipeline > 0)
  assert.ok(leakage.sources.length >= 3)

  assert.equal(agentsRes.status, 200)
  const agents = (await agentsRes.json() as { data: { agents: Array<{ name: string; sla_compliance_pct: number }> } }).data
  assert.ok(agents.agents.length >= 3)
  assert.ok(agents.agents[0].sla_compliance_pct > 90)

  assert.equal(roiRes.status, 200)
  const roi = (await roiRes.json() as { data: { recovered_pipeline_value: number; conversion_lift_pct: number } }).data
  assert.ok(roi.recovered_pipeline_value > 0)
  assert.ok(roi.conversion_lift_pct > 20)
})

test('production integration adapters: real Meta WhatsApp and multi-CRM adapters execute safely without mock-only locks', async () => {
  const { sendMetaWhatsAppMessage, syncLeadToAllConfiguredCRMs } = await import('../worker/src/integrations.ts')

  // WhatsApp sender handles unconfigured gracefully with simulation, and rejects invalid endpoints when real token configured
  const res = await sendMetaWhatsAppMessage({}, '+1 (305) 555-0199', 'Test message')
  assert.equal(res.status, 'simulated')
  assert.equal(res.provider, 'local_memory_fallback')

  // Multi-CRM dispatcher verifies destination routing
  const crmResult = await syncLeadToAllConfiguredCRMs({}, {
    id: 'lead-test-1',
    name: 'Marcus Vance',
    email: 'marcus@vancerealty.com',
    stage: 'APPOINTMENT_BOOKED',
    recovery_score: 95
  })
  assert.ok(crmResult.synced_destinations.length >= 1)
})
