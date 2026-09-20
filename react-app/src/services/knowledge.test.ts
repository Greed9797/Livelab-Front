import { describe, expect, it } from 'vitest'
import { knowledgeVideoEmbed, safeExternalUrl, videoUrlFromKnowledgeMaterial } from './knowledge'
import { sanitizeKnowledgeMarkdown } from './knowledge-markdown'

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

  it('builds only supported provider links from stored video ids', () => {
    expect(videoUrlFromKnowledgeMaterial({ video_provider: 'youtube', video_id: 'abc123', video_url: null })).toBe('https://www.youtube.com/watch?v=abc123')
    expect(videoUrlFromKnowledgeMaterial({ video_provider: 'panda', video_id: 'panda123', video_url: null })).toContain('panda123')
    expect(videoUrlFromKnowledgeMaterial({ video_provider: 'none', video_id: 'abc123', video_url: null })).toBeNull()
  })

  it('builds allowlisted embeds without a custom player protocol', () => {
    expect(knowledgeVideoEmbed({ video_provider: 'youtube', video_id: 'abc123', video_url: null })).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/abc123',
      watchUrl: 'https://www.youtube.com/watch?v=abc123',
    })
    expect(knowledgeVideoEmbed({ video_provider: 'panda', video_id: 'panda123', video_url: null })?.embedUrl).toBe('https://player.pandavideo.com.br/embed/?v=panda123')
    expect(knowledgeVideoEmbed({ video_provider: 'none', video_id: 'abc123', video_url: 'javascript:alert(1)' })).toBeNull()
  })
})
