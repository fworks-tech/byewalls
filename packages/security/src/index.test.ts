import { describe, it, expect } from 'vitest'
import { isPrivateIp, isValidPublicUrl, isBlockedHost } from './index'

describe('isPrivateIp', () => {
  it('blocks localhost', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true)
  })

  it('blocks private ranges', () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true)
    expect(isPrivateIp('192.168.1.1')).toBe(true)
    expect(isPrivateIp('172.16.0.1')).toBe(true)
  })

  it('allows public IPs', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false)
  })
})

describe('isValidPublicUrl', () => {
  it('accepts http and https', () => {
    expect(isValidPublicUrl('https://example.com')).toBe(true)
    expect(isValidPublicUrl('http://example.com')).toBe(true)
  })

  it('rejects other protocols', () => {
    expect(isValidPublicUrl('ftp://example.com')).toBe(false)
    expect(isValidPublicUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects invalid URLs', () => {
    expect(isValidPublicUrl('not-a-url')).toBe(false)
  })
})

describe('isBlockedHost', () => {
  it('blocks cloud metadata endpoints', () => {
    expect(isBlockedHost('169.254.169.254')).toBe(true)
    expect(isBlockedHost('169.254.169.255')).toBe(true)
  })

  it('blocks localhost', () => {
    expect(isBlockedHost('127.0.0.1')).toBe(true)
    expect(isBlockedHost('localhost')).toBe(true)
  })

  it('blocks private ranges', () => {
    expect(isBlockedHost('10.0.0.1')).toBe(true)
    expect(isBlockedHost('192.168.1.1')).toBe(true)
  })

  it('allows public hosts', () => {
    expect(isBlockedHost('8.8.8.8')).toBe(false)
    expect(isBlockedHost('example.com')).toBe(false)
  })
})
