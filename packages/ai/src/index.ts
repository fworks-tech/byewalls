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
