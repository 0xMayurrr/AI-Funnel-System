import test from 'node:test'
import assert from 'node:assert/strict'
import { assertWorkflowTransition } from '../packages/workflow-core/src/index.ts'
import { moduleRegistry, resolveEnabledModules } from '../packages/platform/src/modules.ts'

test('workflow state transitions allow retry and reject terminal-state resurrection', () => {
  assert.doesNotThrow(()=>assertWorkflowTransition('running','retry'))
  assert.doesNotThrow(()=>assertWorkflowTransition('retry','running'))
  assert.throws(()=>assertWorkflowTransition('succeeded','running'),/Invalid workflow transition/)
})

test('module registry enables only registered and available modules', () => {
  assert.deepEqual(resolveEnabledModules(['ai_funnel','lead_concierge']).map(item=>item.code),['ai_funnel'])
  assert.equal(moduleRegistry.find(item=>item.code==='growth_engine')?.state,'planned')
})
