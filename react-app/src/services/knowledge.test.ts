import { describe, expect, it } from 'vitest'
import { safeExternalUrl, sanitizeKnowledgeMarkdown } from './knowledge'

describe('knowledge external URLs', () => {
  it('allows only absolute HTTP(S) links', () => {
    expect(safeExternalUrl('https://example.com/manual')).toBe('https://example.com/manual')
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('data:text/html,x')).toBeNull()
    expect(safeExternalUrl('/relative')).toBeNull()
  })

  it('fails closed when no browser DOM is available', () => {
    expect(sanitizeKnowledgeMarkdown('<script>alert(1)</script><p>Seguro</p>')).toBe('')
  })
})
