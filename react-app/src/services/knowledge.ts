import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from './api'
import type { JsonRecord } from '../types/models'

export type KnowledgeMaterialType = 'playbook' | 'study' | 'video' | 'document' | 'link'
export type KnowledgeMaterialStatus = 'draft' | 'published' | 'archived'

export interface KnowledgeCategory extends JsonRecord {
  id: string
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  sort_order?: number
}

export interface KnowledgeAttachment extends JsonRecord {
  id: string
  filename: string
  mime_type: 'application/pdf'
  byte_size: number
  url?: string
  expires_in?: number
}

export interface KnowledgeMaterial extends JsonRecord {
  id: string
  titulo: string
  slug: string
  excerpt?: string | null
  content_markdown?: string | null
  material_type: KnowledgeMaterialType
  external_url?: string | null
  video_provider?: 'youtube' | 'panda' | 'none'
  video_id?: string | null
  video_url?: string | null
  tags?: string[]
  status: KnowledgeMaterialStatus
  revision: number
  category_id?: string | null
  category_name?: string | null
  category_slug?: string | null
  atualizado_em?: string
  published_at?: string | null
  attachments?: KnowledgeAttachment[]
}

export interface KnowledgeMaterialList {
  items: KnowledgeMaterial[]
  page: number
  page_size: number
  has_more: boolean
}

export interface KnowledgeMaterialInput {
  titulo: string
  category_id?: string | null
  excerpt?: string | null
  content_markdown?: string | null
  material_type?: KnowledgeMaterialType
  external_url?: string | null
  video_provider?: 'youtube' | 'panda' | 'none'
  video_url?: string | null
  tags?: string[]
  status?: KnowledgeMaterialStatus
}

export function getKnowledgeArticle(slugOrId: string) {
  return apiGet<JsonRecord>(`/knowledge/articles/${encodeURIComponent(slugOrId)}`)
}

export function getKnowledgeUnitCategories() {
  return apiGet<KnowledgeCategory[]>('/knowledge/unit/categories')
}

export function getKnowledgeUnitMaterials(params: Record<string, unknown> = {}) {
  return apiGet<KnowledgeMaterialList>('/knowledge/unit/materials', params)
}

export function getKnowledgeUnitMaterial(slugOrId: string) {
  return apiGet<KnowledgeMaterial>(`/knowledge/unit/materials/${encodeURIComponent(slugOrId)}`)
}

export function createKnowledgeUnitCategory(payload: { name: string; description?: string | null; icon?: string | null; sort_order?: number }) {
  return apiPost<KnowledgeCategory>('/knowledge/unit/categories', payload)
}

export function updateKnowledgeUnitCategory(id: string, payload: Partial<{ name: string; description: string | null; icon: string | null; sort_order: number }>) {
  return apiPatch<KnowledgeCategory>(`/knowledge/unit/categories/${encodeURIComponent(id)}`, payload)
}

export function deleteKnowledgeUnitCategory(id: string) {
  return apiDelete(`/knowledge/unit/categories/${encodeURIComponent(id)}`)
}

export function createKnowledgeUnitMaterial(payload: KnowledgeMaterialInput, idempotencyKey: string) {
  return apiPost<KnowledgeMaterial>('/knowledge/unit/materials', payload, { headers: { 'Idempotency-Key': idempotencyKey } })
}

export function updateKnowledgeUnitMaterial(id: string, payload: KnowledgeMaterialInput & { expected_revision: number }) {
  return apiPatch<KnowledgeMaterial>(`/knowledge/unit/materials/${encodeURIComponent(id)}`, payload)
}

export function publishKnowledgeUnitMaterial(id: string, expected_revision: number) {
  return apiPost<KnowledgeMaterial>(`/knowledge/unit/materials/${encodeURIComponent(id)}/publish`, { expected_revision })
}

export function archiveKnowledgeUnitMaterial(id: string, expected_revision: number) {
  return apiPost<KnowledgeMaterial>(`/knowledge/unit/materials/${encodeURIComponent(id)}/archive`, { expected_revision })
}

export function uploadKnowledgeUnitAttachment(id: string, file: File) {
  return apiUpload<KnowledgeAttachment>(`/knowledge/unit/materials/${encodeURIComponent(id)}/attachments`, file)
}

export function getKnowledgeUnitAttachment(id: string, attachmentId: string) {
  return apiGet<KnowledgeAttachment>(`/knowledge/unit/materials/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`)
}

export function videoUrlFromKnowledgeMaterial(material: Pick<KnowledgeMaterial, 'video_provider' | 'video_id' | 'video_url'>): string | null {
  if (safeExternalUrl(material.video_url)) return safeExternalUrl(material.video_url)
  if (!material.video_id || material.video_provider === 'none') return null
  if (material.video_provider === 'youtube') return `https://www.youtube.com/watch?v=${encodeURIComponent(material.video_id)}`
  if (material.video_provider === 'panda') return `https://player-vz-${encodeURIComponent(material.video_id)}.tv.pandavideo.com.br/embed/`
  return null
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
