import { describe, it, expect } from 'vitest'
import { extractMetadata, extractMainContent, sanitizeHtml } from './extractor'

describe('extractMetadata', () => {
  it('extracts title from <title> tag', () => {
    const html = '<html><head><title>Test Article</title></head><body></body></html>'
    expect(extractMetadata(html).title).toBe('Test Article')
  })

  it('extracts author from meta tag', () => {
    const html = '<html><head><meta name="author" content="John Doe"></head><body></body></html>'
    expect(extractMetadata(html).author).toBe('John Doe')
  })

  it('extracts publication date from meta tag', () => {
    const html = '<html><head><meta property="article:published_time" content="2026-01-15"></head><body></body></html>'
    expect(extractMetadata(html).publishedAt).toBe('2026-01-15')
  })

  it('returns undefined for missing metadata', () => {
    const html = '<html><head></head><body></body></html>'
    const result = extractMetadata(html)
    expect(result.title).toBeUndefined()
    expect(result.author).toBeUndefined()
    expect(result.publishedAt).toBeUndefined()
  })
})

describe('extractMainContent', () => {
  it('extracts content from <article> tag', () => {
    const html = '<html><body><article><p>Main content here</p></article></body></html>'
    expect(extractMainContent(html)).toContain('Main content here')
  })

  it('extracts nested article content without truncation', () => {
    const html = '<article><p>Outer</p><article><p>Inner</p></article><p>Tail</p></article>'
    const result = extractMainContent(html)
    expect(result).toContain('Inner')
    expect(result).toContain('Tail')
  })

  it('extracts content from an uppercase <ARTICLE> tag', () => {
    const html = '<ARTICLE><p>Shouted content</p></ARTICLE>'
    expect(extractMainContent(html)).toContain('Shouted content')
  })

  it('extracts content from <main> tag', () => {
    const html = '<html><body><main><p>Primary content</p></main></body></html>'
    expect(extractMainContent(html)).toContain('Primary content')
  })

  it('returns body content when no semantic element exists', () => {
    const html = '<html><body><div><p>Fallback content</p></div></body></html>'
    expect(extractMainContent(html)).toContain('Fallback content')
  })

  it('returns empty string for empty HTML', () => {
    expect(extractMainContent('')).toBe('')
  })
})

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    const html = '<p>Safe</p><script>alert("xss")</script>'
    expect(sanitizeHtml(html)).not.toContain('<script>')
    expect(sanitizeHtml(html)).not.toContain('alert')
  })

  it('removes iframe tags', () => {
    const html = '<p>Safe</p><iframe src="https://evil.com"></iframe>'
    expect(sanitizeHtml(html)).not.toContain('<iframe>')
  })

  it('removes event handler attributes', () => {
    const html = '<p onclick="evil()">Safe</p>'
    expect(sanitizeHtml(html)).not.toContain('onclick')
  })

  it('removes unquoted event handler attributes', () => {
    const html = '<img src=x onclick=alert(1)>'
    expect(sanitizeHtml(html)).not.toContain('onclick')
    expect(sanitizeHtml(html)).not.toContain('alert')
  })

  it('removes javascript: URLs', () => {
    const html = '<a href="javascript:evil()">Link</a>'
    expect(sanitizeHtml(html)).not.toContain('javascript:')
  })

  it('removes unquoted javascript: URLs', () => {
    const html = '<a href=javascript:evil()>Link</a>'
    expect(sanitizeHtml(html)).not.toContain('javascript:')
    expect(sanitizeHtml(html)).not.toContain('evil')
  })

  it('removes unclosed script tags', () => {
    const html = '<p>Safe</p><script src="https://evil.com/x.js">'
    expect(sanitizeHtml(html)).not.toContain('<script')
  })

  it('removes unclosed iframe tags', () => {
    const html = '<iframe src="https://evil.com">'
    expect(sanitizeHtml(html)).not.toContain('<iframe')
  })

  it('handles uppercase dangerous tags', () => {
    const html = '<p>Safe</p><SCRIPT>alert("xss")</SCRIPT>'
    expect(sanitizeHtml(html)).not.toContain('alert')
  })

  it('removes style attributes', () => {
    const html = '<p style="color: red">Safe</p>'
    expect(sanitizeHtml(html)).not.toContain('style=')
  })

  it('removes unquoted style attributes', () => {
    const html = '<p style=color:red>Safe</p>'
    expect(sanitizeHtml(html)).not.toContain('style=')
  })

  it('preserves safe HTML', () => {
    const html = '<p>Hello <strong>world</strong></p>'
    expect(sanitizeHtml(html)).toContain('<strong>world</strong>')
  })
})
