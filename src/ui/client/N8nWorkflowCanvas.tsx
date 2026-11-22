import { ClientWorkflowJourney } from './ClientWorkflowJourney'

export function N8nWorkflowCanvas({ onRequestChange }: { onRequestChange?: () => void }) {
  return <ClientWorkflowJourney onRequestChange={onRequestChange} />
}
