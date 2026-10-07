import type { AIProvider } from './index'
import { buildSummaryPrompt } from './prompt'

const MAX_INPUT_CHARS = 8000
const REQUEST_TIMEOUT_MS = 30_000
const MAX_OUTPUT_TOKENS = 1000

export type SummaryResult = {
  text: string
  inputTokens?: number
  outputTokens?: number
}

export class RemoteAIProvider implements AIProvider {
  constructor(private readonly endpoint: string) {}

  async summarize(input: { title?: string; content: string }): Promise<SummaryResult> {
    if (input.content.length > MAX_INPUT_CHARS) {
      throw new Error(`Input too long: ${input.content.length} chars (max ${MAX_INPUT_CHARS})`)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.title, content: input.content }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`AI provider unavailable: ${response.status}`)
      }

      const data = await response.json() as { summary?: string; inputTokens?: number; outputTokens?: number }
      if (!data.summary) {
        throw new Error('AI provider returned no summary')
      }

      return { text: data.summary, inputTokens: data.inputTokens, outputTokens: data.outputTokens }
    } finally {
      clearTimeout(timeout)
    }
  }
}

export class OllamaProvider implements AIProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly model = 'llama3.2',
  ) {}

  async summarize(input: { title?: string; content: string }): Promise<SummaryResult> {
    if (input.content.length > MAX_INPUT_CHARS) {
      throw new Error(`Input too long: ${input.content.length} chars (max ${MAX_INPUT_CHARS})`)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: buildSummaryPrompt(input),
          stream: false,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Ollama unavailable: ${response.status}`)
      }

      const data = await response.json() as { response?: string }
      if (!data.response) {
        throw new Error('Ollama returned no response')
      }

      return { text: data.response }
    } finally {
      clearTimeout(timeout)
    }
  }
}

export class ZenAIProvider implements AIProvider {
  private readonly endpoint = 'https://opencode.ai/zen/v1/messages'

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async summarize(input: { title?: string; content: string }): Promise<SummaryResult> {
    if (input.content.length > MAX_INPUT_CHARS) {
      throw new Error(`Input too long: ${input.content.length} chars (max ${MAX_INPUT_CHARS})`)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{
            role: 'user',
            content: buildSummaryPrompt(input),
          }],
          max_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Zen AI unavailable: ${response.status}`)
      }

      const data = await response.json() as {
        content?: Array<{ type: string; text?: string }>
        usage?: { input_tokens?: number; output_tokens?: number }
      }

      const text = data.content?.find((c) => c.type === 'text')?.text
      if (!text) {
        throw new Error('Zen AI returned no summary')
      }

      return {
        text,
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}

export interface AIProviderOptions {
  provider?: 'remote' | 'ollama' | 'opencode'
  endpoint?: string
  apiKey?: string
  model?: string
  ollamaUrl?: string
}

export function createAIProvider(options: AIProviderOptions): AIProvider {
  switch (options.provider) {
    case 'ollama':
      return new OllamaProvider(options.ollamaUrl ?? 'http://localhost:11434')
    case 'opencode':
      if (!options.apiKey) {
        throw new Error('AI_API_KEY is required for the OpenCode provider')
      }
      return new ZenAIProvider(options.apiKey, options.model ?? 'qwen3.8-flash')
    default:
      if (!options.endpoint) {
        throw new Error('AI_ENDPOINT is required for the remote provider')
      }
      return new RemoteAIProvider(options.endpoint)
  }
}
