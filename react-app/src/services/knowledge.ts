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
  is_active?: boolean
  /** Present when API returns counts (Back #15+); UI falls back to client tally when absent. */
  article_count?: number
}

export interface KnowledgeAttachment extends JsonRecord {
  id: string
  filename?: string
  original_name?: string
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
  cover_image_url?: string | null
  duration_minutes?: number | null
  difficulty?: string | null
  objectives?: string[] | string | null
  prerequisites?: string[] | string | null
  audience_role?: string | null
  topic?: string | null
  platform?: string | null
  destaque?: boolean
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
  cover_image_url?: string | null
  duration_minutes?: number | null
  difficulty?: string | null
  objectives?: string[] | string | null
  prerequisites?: string[] | string | null
  audience_role?: string | null
  topic?: string | null
  platform?: string | null
}

export function getKnowledgeArticle(slugOrId: string) {
  return apiGet<JsonRecord>(`/knowledge/articles/${encodeURIComponent(slugOrId)}`)
}

export function getKnowledgeUnitCategories() {
  return apiGet<KnowledgeCategory[]>('/knowledge/unit/categories')
}

export function getKnowledgeUnitCategoriesForManagement() {
  return apiGet<KnowledgeCategory[]>('/knowledge/unit/categories', { include_inactive: 'true' })
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

export function updateKnowledgeUnitCategory(id: string, payload: Partial<{ name: string; description: string | null; icon: string | null; sort_order: number; is_active: boolean }>) {
  return apiPatch<KnowledgeCategory>(`/knowledge/unit/categories/${encodeURIComponent(id)}`, payload)
}

export function reorderKnowledgeUnitCategories(ids: string[]) {
  return apiPost<void>('/knowledge/unit/categories/reorder', { ids })
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
  if (material.video_provider === 'panda') return `https://panda.video/${encodeURIComponent(material.video_id)}`
  return null
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])
const PANDA_HOSTS = new Set(['panda.video', 'www.panda.video', 'player.pandavideo.com.br', 'www.player.pandavideo.com.br'])

function hostnameOf(value: string): string | null {
  const href = safeExternalUrl(value)
  if (!href) return null
  try { return new URL(href).hostname.toLowerCase() } catch { return null }
}

export function youtubeIdFromUrl(value: unknown): string | null {
  const href = safeExternalUrl(value)
  if (!href) return null
  try {
    const url = new URL(href)
    const host = url.hostname.toLowerCase()
    if (!YOUTUBE_HOSTS.has(host)) return null
    if (host === 'youtu.be') return url.pathname.replace(/^\//, '').split('/')[0] || null
    const fromQuery = url.searchParams.get('v')
    if (fromQuery) return fromQuery
    const parts = url.pathname.split('/').filter(Boolean)
    const embedAt = parts.indexOf('embed')
    if (embedAt >= 0) return parts[embedAt + 1] || null
    return null
  } catch { return null }
}

export function pandaIdFromUrl(value: unknown): string | null {
  const href = safeExternalUrl(value)
  if (!href) return null
  try {
    const url = new URL(href)
    const host = url.hostname.toLowerCase()
    if (!PANDA_HOSTS.has(host)) return null
    const fromQuery = url.searchParams.get('v')
    if (fromQuery) return fromQuery
    const parts = url.pathname.split('/').filter(Boolean)
    return parts[0] && parts[0] !== 'embed' ? parts[0] : parts[1] || null
  } catch { return null }
}

export interface KnowledgeVideoEmbed {
  provider: 'youtube' | 'panda'
  embedUrl: string
  watchUrl: string
}

export function knowledgeVideoEmbed(material: Pick<KnowledgeMaterial, 'video_provider' | 'video_id' | 'video_url'>): KnowledgeVideoEmbed | null {
  const watchUrl = videoUrlFromKnowledgeMaterial(material)
  const youtubeId = material.video_provider === 'youtube' && material.video_id
    ? material.video_id
    : youtubeIdFromUrl(material.video_url) ?? (watchUrl ? youtubeIdFromUrl(watchUrl) : null)
  if (youtubeId && /^[A-Za-z0-9_-]{6,}$/.test(youtubeId)) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`,
      watchUrl: watchUrl ?? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`,
    }
  }
  const pandaId = material.video_provider === 'panda' && material.video_id
    ? material.video_id
    : pandaIdFromUrl(material.video_url) ?? (watchUrl ? pandaIdFromUrl(watchUrl) : null)
  if (pandaId && /^[A-Za-z0-9_-]{6,}$/.test(pandaId)) {
    const existing = safeExternalUrl(material.video_url)
    const existingHost = existing ? hostnameOf(existing) : null
    const embedUrl = existing && existingHost && PANDA_HOSTS.has(existingHost) && existing.includes('embed')
      ? existing
      : `https://player.pandavideo.com.br/embed/?v=${encodeURIComponent(pandaId)}`
    return {
      provider: 'panda',
      embedUrl,
      watchUrl: watchUrl ?? `https://panda.video/${encodeURIComponent(pandaId)}`,
    }
  }
  return null
}

export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch { return null }
}
