import type { CanonicalLeadStage, LeakageStatus, RecoveryPriorityTier } from '../../contracts/src/index.ts'

export type WorkflowState = 'pending' | 'running' | 'succeeded' | 'retry' | 'failed' | 'cancelled'
export type WorkflowTransition = { from: WorkflowState; to: WorkflowState }

const allowed: readonly WorkflowTransition[] = [
  { from: 'pending', to: 'running' }, { from: 'retry', to: 'running' },
  { from: 'running', to: 'succeeded' }, { from: 'running', to: 'retry' },
  { from: 'running', to: 'failed' }, { from: 'pending', to: 'cancelled' },
  { from: 'retry', to: 'cancelled' },
]

export function assertWorkflowTransition(from: WorkflowState, to: WorkflowState) {
  if (!allowed.some((transition) => transition.from === from && transition.to === to)) {
    throw new Error(`Invalid workflow transition: ${from} -> ${to}`)
  }
}

// Canonical Lead Lifecycle Transitions
const allowedLeadTransitions: Record<CanonicalLeadStage, CanonicalLeadStage[]> = {
  NEW: ['CONTACTED', 'DISQUALIFIED', 'ARCHIVED'],
  CONTACTED: ['QUALIFYING', 'QUALIFIED', 'DISQUALIFIED', 'NURTURE', 'ARCHIVED'],
  QUALIFYING: ['QUALIFIED', 'DISQUALIFIED', 'NURTURE', 'CONTACTED', 'ARCHIVED'],
  QUALIFIED: ['APPOINTMENT_BOOKED', 'NURTURE', 'DISQUALIFIED', 'ARCHIVED'],
  DISQUALIFIED: ['ARCHIVED'],
  NURTURE: ['QUALIFYING', 'QUALIFIED', 'DISQUALIFIED', 'ARCHIVED'],
  APPOINTMENT_BOOKED: ['REMINDED', 'VISITED', 'NO_SHOW', 'RESCHEDULED', 'LOST', 'ARCHIVED'],
  REMINDED: ['VISITED', 'NO_SHOW', 'RESCHEDULED', 'LOST', 'ARCHIVED'],
  VISITED: ['WON', 'LOST', 'NURTURE', 'ARCHIVED'],
  NO_SHOW: ['RECOVERY_FOLLOW_UP', 'RESCHEDULED', 'LOST', 'ARCHIVED'],
  RECOVERY_FOLLOW_UP: ['RESCHEDULED', 'APPOINTMENT_BOOKED', 'NURTURE', 'LOST', 'ARCHIVED'],
  RESCHEDULED: ['REMINDED', 'VISITED', 'NO_SHOW', 'LOST', 'ARCHIVED'],
  WON: ['ARCHIVED'],
  LOST: ['ARCHIVED'],
  ARCHIVED: []
}

export function assertLeadStageTransition(from: CanonicalLeadStage, to: CanonicalLeadStage) {
  if (from === to) return
  const validTargets = allowedLeadTransitions[from] ?? []
  if (!validTargets.includes(to)) {
    throw new Error(`Invalid lead lifecycle transition: ${from} -> ${to}`)
  }
}

// Revenue Recovery Score Engine
export interface LeadScoreInput {
  budgetNumeric?: number
  budgetMinCriteria?: number
  timelineDays?: number
  messagesExchanged?: number
  sourceQualityScore?: number
  hoursSinceLastActivity?: number
  hasOptedIn?: boolean
}

export function calculateRecoveryScore(input: LeadScoreInput): { score: number; tier: RecoveryPriorityTier; breakdown: Record<string, number> } {
  let budgetScore = 0
  if (input.budgetNumeric && input.budgetMinCriteria) {
    budgetScore = input.budgetNumeric >= input.budgetMinCriteria ? 25 : Math.round((input.budgetNumeric / input.budgetMinCriteria) * 20)
  } else {
    budgetScore = 15
  }

  let timelineScore = 10
  if (input.timelineDays !== undefined) {
    if (input.timelineDays <= 30) timelineScore = 20
    else if (input.timelineDays <= 60) timelineScore = 15
    else timelineScore = 8
  }

  const engagementScore = Math.min(15, (input.messagesExchanged ?? 1) * 4)
  const sourceScore = Math.min(10, input.sourceQualityScore ?? 7)
  const intentScore = input.hasOptedIn ? 25 : 10

  let followUpGapBonus = 5
  if ((input.hoursSinceLastActivity ?? 0) > 48) {
    followUpGapBonus = 0
  } else if ((input.hoursSinceLastActivity ?? 0) > 24) {
    followUpGapBonus = 2
  }

  const rawScore = intentScore + budgetScore + timelineScore + engagementScore + sourceScore + followUpGapBonus
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))

  let tier: RecoveryPriorityTier = 'Nurture'
  if (score >= 75) tier = 'Hot Recovery'
  else if (score >= 50) tier = 'Warm Recovery'
  else if (score < 30) tier = 'Leaked'

  return {
    score,
    tier,
    breakdown: {
      intent: intentScore,
      budgetFit: budgetScore,
      timeline: timelineScore,
      engagement: engagementScore,
      sourceQuality: sourceScore,
      followUpGap: followUpGapBonus
    }
  }
}

// Lead Leakage Detector
export function detectLeadLeakage(params: {
  stage: CanonicalLeadStage
  secondsToFirstResponse?: number
  hoursInCurrentStage: number
  appointmentStatus?: 'none' | 'booked' | 'completed' | 'no_show'
  hasRecovered?: boolean
}): LeakageStatus {
  if (params.stage === 'WON') return 'Won'
  if (params.stage === 'LOST') return 'Lost'
  if (params.stage === 'DISQUALIFIED') return 'Disqualified'
  if (params.hasRecovered || params.stage === 'RESCHEDULED') return 'Recovered'
  if (params.appointmentStatus === 'no_show' || params.stage === 'NO_SHOW') return 'No-Show'

  if ((params.secondsToFirstResponse ?? 0) > 86400 || (params.stage === 'NEW' && params.hoursInCurrentStage > 24)) {
    return 'Leaked'
  }

  if ((params.secondsToFirstResponse ?? 0) > 300 || (params.stage === 'QUALIFYING' && params.hoursInCurrentStage > 48)) {
    return 'At Risk'
  }

  if (params.stage === 'NURTURE') return 'Nurture'
  return 'Recovered'
}
