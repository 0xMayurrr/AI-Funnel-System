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
