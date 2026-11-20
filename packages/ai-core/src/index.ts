import { z } from 'zod'

export interface ProviderCapabilities {
  structuredOutput: boolean
  toolCalling: boolean
  maxContextTokens?: number
}

export interface GenerateRequest<T> {
  model: string
  systemPrompt: string
  input: unknown
  outputSchema: z.ZodType<T>
  timeoutMs: number
  maxRetries: number
}

export interface GenerateResult<T> {
  output: T
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
  latencyMs: number
}

export interface AIProvider {
  readonly code: string
  capabilities(model: string): ProviderCapabilities
  generate<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>>
}

export class AIUnavailableError extends Error {
  constructor(message = 'AI provider is not configured') { super(message); this.name = 'AIUnavailableError' }
}

/** Provider-neutral validation and capability gate. No concrete provider is enabled by default. */
export async function generateValidated<T>(provider: AIProvider, request: GenerateRequest<T>) {
  if (!provider.capabilities(request.model).structuredOutput) throw new AIUnavailableError('Selected model cannot satisfy the structured output requirement')
  const result = await provider.generate(request)
  return { ...result, output: request.outputSchema.parse(result.output) }
}
