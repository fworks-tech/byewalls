export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeoutMs = 10_000, signal, ...fetchOptions } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}