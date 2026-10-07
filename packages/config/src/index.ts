export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  aiProvider: process.env.AI_PROVIDER ?? 'remote',
  aiEndpoint: process.env.AI_ENDPOINT ?? '',
  aiApiKey: process.env.AI_API_KEY ?? '',
  aiModel: process.env.AI_MODEL ?? 'qwen3.8-flash',
  ollamaUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
} as const
