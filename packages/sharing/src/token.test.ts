import { describe, it, expect } from 'vitest'
import { generateToken, hashToken } from './token'

describe('generateToken', () => {
  it('returns a URL-safe base64url string with no padding', () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(token).not.toContain('=')
  })

  it('produces unique tokens', () => {
    expect(generateToken()).not.toBe(generateToken())
  })
})

describe('hashToken', () => {
  it('returns a sha256 hex digest', () => {
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for the same token', () => {
    expect(hashToken('same')).toBe(hashToken('same'))
  })

  it('differs for different tokens', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'))
  })

  it('does not leak the original token', () => {
    const token = generateToken()
    expect(hashToken(token)).not.toContain(token)
  })
})