export interface AIProvider {
  summarize(input: {
    title?: string
    content: string
  }): Promise<{
    text: string
    inputTokens?: number
    outputTokens?: number
  }>
}

export { RemoteAIProvider, OllamaProvider, ZenAIProvider, createAIProvider } from './providers'
export type { AIProviderOptions, SummaryResult } from './providers'
export { buildSummaryPrompt } from './prompt'
