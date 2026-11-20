import { modules, type ModuleCode } from '../../contracts/src/index'

export interface ModuleDefinition {
  code: ModuleCode
  name: string
  description: string
  state: 'available' | 'planned'
  requiredPermission: string
  navigation: { label: string; href: string }[]
}

export const moduleRegistry: readonly ModuleDefinition[] = modules.map((item) => ({
  ...item,
  requiredPermission: item.code === 'ai_funnel' ? 'funnels.read' : `${item.code}.access`,
  navigation: item.code === 'ai_funnel' ? [{ label: 'Funnels', href: '/funnels' }, { label: 'Leads', href: '/leads' }] : [],
}))

export function resolveEnabledModules(enabled: readonly ModuleCode[]) {
  return moduleRegistry.filter((module) => module.state === 'available' && enabled.includes(module.code))
}
