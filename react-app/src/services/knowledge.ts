import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { apiGet } from './api'
import type { JsonRecord } from '../types/models'

export function getKnowledgeArticle(slugOrId: string) {
  return apiGet<JsonRecord>(`/knowledge/articles/${encodeURIComponent(slugOrId)}`)
}

export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch { return null }
}

export function sanitizeKnowledgeMarkdown(markdown: unknown): string {
  const html = marked.parse(typeof markdown === 'string' ? markdown : '', { async: false }) as string
  if (typeof document === 'undefined' || typeof DOMPurify.sanitize !== 'function') return ''
  const config = {
    ALLOWED_TAGS: ['a', 'p', 'br', 'strong', 'em', 'b', 'i', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  }
  const fragment = DOMPurify.sanitize(html, { ...config, RETURN_DOM_FRAGMENT: true }) as unknown as DocumentFragment
  fragment.querySelectorAll('a').forEach((anchor) => {
    const href = safeExternalUrl(anchor.getAttribute('href'))
    if (!href) {
      anchor.removeAttribute('href')
      anchor.removeAttribute('target')
      anchor.removeAttribute('rel')
      return
    }
    anchor.setAttribute('href', href)
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noopener noreferrer')
  })
  const container = document.createElement('div')
  container.append(fragment)
  return container.innerHTML
}
