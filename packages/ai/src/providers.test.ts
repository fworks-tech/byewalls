import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RemoteAIProvider, OllamaProvider, ZenAIProvider, createAIProvider } from './providers'
import { buildSummaryPrompt } from './prompt'

describe('RemoteAIProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('summarizes content successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ summary: 'Test summary', inputTokens: 100, outputTokens: 50 }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const provider = new RemoteAIProvider('https://api.example.com/v1/summarize')
    const result = await provider.summarize({ title: 'Test', content: 'Long content' })

    expect(result.text).toBe('Test summary')
    expect(result.inputTokens).toBe(100)
    expect(result.outputTokens).toBe(50)
  })

  it('handles provider timeout', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn().mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')))
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    const provider = new RemoteAIProvider('https://api.example.com/v1/summarize')
    const promise = provider.summarize({ content: 'Test' })
    vi.advanceTimersByTime(30_000)
    await expect(promise).rejects.toThrow('aborted')
    vi.useRealTimers()
  })

  it('handles provider unavailability', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    })
    vi.stubGlobal('fetch', mockFetch)

    const provider = new RemoteAIProvider('https://api.example.com/v1/summarize')
    await expect(provider.summarize({ content: 'Test' })).rejects.toThrow('unavailable')
  })

  it('enforces input token limit', async () => {
    const longContent = 'x'.repeat(9000)
    const provider = new RemoteAIProvider('https://api.example.com/v1/summarize')
    await expect(provider.summarize({ content: longContent })).rejects.toThrow('too long')
  })
})

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('summarizes content via Ollama API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Ollama summary' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const provider = new OllamaProvider('http://localhost:11434')
    const result = await provider.summarize({ title: 'Test', content: 'Content' })

    expect(result.text).toBe('Ollama summary')
  })

  it('handles Ollama unavailability', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('connection refused'))
    vi.stubGlobal('fetch', mockFetch)

    const provider = new OllamaProvider('http://localhost:11434')
    await expect(provider.summarize({ content: 'Test' })).rejects.toThrow()
  })
})

describe('ZenAIProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('summarizes content via Zen Anthropic endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Zen summary' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const provider = new ZenAIProvider('test-api-key', 'qwen3.8-flash')
    const result = await provider.summarize({ title: 'Test', content: 'Content' })

    expect(result.text).toBe('Zen summary')
    expect(result.inputTokens).toBe(100)
    expect(result.outputTokens).toBe(50)
  })

  it('handles Zen API unavailability', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })
    vi.stubGlobal('fetch', mockFetch)

    const provider = new ZenAIProvider('test-api-key', 'qwen3.8-flash')
    await expect(provider.summarize({ content: 'Test' })).rejects.toThrow('unavailable')
  })

  it('enforces input token limit', async () => {
    const longContent = 'x'.repeat(9000)
    const provider = new ZenAIProvider('test-api-key', 'qwen3.8-flash')
    await expect(provider.summarize({ content: longContent })).rejects.toThrow('too long')
  })
})

describe('createAIProvider', () => {
  it('creates the OpenCode provider with a default model', () => {
    const provider = createAIProvider({ provider: 'opencode', apiKey: 'key' })
    expect(provider).toBeInstanceOf(ZenAIProvider)
  })

  it('requires an API key for the OpenCode provider', () => {
    expect(() => createAIProvider({ provider: 'opencode' })).toThrow('AI_API_KEY')
  })

  it('creates the Ollama provider', () => {
    expect(createAIProvider({ provider: 'ollama' })).toBeInstanceOf(OllamaProvider)
  })

  it('requires an endpoint for the remote provider', () => {
    expect(() => createAIProvider({})).toThrow('AI_ENDPOINT')
  })
})

describe('buildSummaryPrompt', () => {
  it('includes the title and content', () => {
    const prompt = buildSummaryPrompt({ title: 'Hello', content: 'Body text' })
    expect(prompt).toContain('Title: Hello')
    expect(prompt).toContain('Body text')
  })

  it('falls back to Untitled when no title is given', () => {
    expect(buildSummaryPrompt({ content: 'Body' })).toContain('Title: Untitled')
  })
})
