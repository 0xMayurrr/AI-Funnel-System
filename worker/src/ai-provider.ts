import type { AIProvider, GenerateRequest, GenerateResult, ProviderCapabilities } from '../../packages/ai-core/src/index.ts'

type CompatibleEnv = { AI_API_URL?: string; AI_API_KEY?: string; AI_PROVIDER_CODE?: string }
type ChatResponse = { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }

/** OpenAI-compatible transport adapter. Business services depend on AIProvider, not this wire format. */
export class OpenAICompatibleProvider implements AIProvider {
  readonly code: string
  constructor(private readonly env: CompatibleEnv) { this.code = env.AI_PROVIDER_CODE || 'openai-compatible' }
  capabilities(_model: string): ProviderCapabilities { return { structuredOutput: true, toolCalling: false } }
  async generate<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>> {
    if (!this.env.AI_API_KEY || !this.env.AI_API_URL) throw new Error('AI provider credentials are not configured.')
    const endpoint = `${this.env.AI_API_URL.replace(/\/$/, '')}/chat/completions`
    const schema = request.outputSchema.toJSONSchema()
    const start = Date.now()
    let lastError: unknown
    for (let attempt = 0; attempt <= request.maxRetries; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST', signal: AbortSignal.timeout(request.timeoutMs),
          headers: { Authorization: `Bearer ${this.env.AI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: request.model, temperature: 0.2, messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: JSON.stringify(request.input) },
          ], response_format: { type: 'json_schema', json_schema: { name: 'buildicy_result', strict: true, schema } } }),
        })
        if (!response.ok) {
          const message = (await response.text()).slice(0,500)
          if (response.status >= 500 || response.status === 429) throw new Error(`AI provider temporary failure (${response.status}).`)
          throw new Error(`AI provider rejected the request (${response.status}): ${message}`)
        }
        const payload = await response.json() as ChatResponse
        const content = payload.choices?.[0]?.message?.content
        if (!content) throw new Error('AI provider returned no structured result.')
        return {
          output: request.outputSchema.parse(JSON.parse(content)), provider: this.code, model: request.model,
          inputTokens: payload.usage?.prompt_tokens, outputTokens: payload.usage?.completion_tokens, latencyMs: Date.now() - start,
        }
      } catch (error) {
        lastError = error
        if (attempt >= request.maxRetries || (error instanceof Error && error.message.includes('rejected the request ('))) break
        await new Promise((resolve) => setTimeout(resolve, Math.min(250 * 2 ** attempt, 2000)))
      }
    }
    throw lastError instanceof Error ? lastError : new Error('AI provider request failed.')
  }
}
