const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

const BLOCKED_HOSTNAMES = ['localhost', 'metadata.google.internal']

export function isPrivateIp(hostname: string): boolean {
  return PRIVATE_IP_RANGES.some((range) => range.test(hostname))
}

export function isBlockedHost(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) return true
  if (isPrivateIp(hostname)) return true
  return false
}

export function isValidPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
