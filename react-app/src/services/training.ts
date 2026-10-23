import { apiDelete, apiGet, apiPatch, apiPost } from './api'
import type { KnowledgeAttachment, KnowledgeMaterial, KnowledgeMaterialType } from './knowledge'

export type TrainingProgressState = 'not_started' | 'in_progress' | 'completed'

export interface TrainingLessonProgress {
  state: TrainingProgressState
  started_at: string | null
  last_opened_at: string | null
  completed_at: string | null
  watched_percent?: number | null
  last_position_seconds?: number
  duration_seconds?: number | null
  position_revision?: number
  video_version?: number
  completion_source?: 'legacy' | 'watched' | null
}

export interface TrainingSourceRef {
  kind?: string
  id?: string
  slug?: string | null
  origin?: 'unidade' | 'rede' | string
}

export interface TrainingLesson {
  id: string
  title: string
  excerpt?: string | null
  outcome?: string | null
  duration_minutes?: number | null
  difficulty?: string | null
  format?: string | null
  audience_roles?: string[]
  topics?: string[]
  platforms?: string[]
  objectives?: string[]
  prerequisites?: string[]
  cover_image_url?: string | null
  featured?: boolean
  required?: boolean
  freshness?: 'novo' | 'atualizado' | null
  published_at?: string | null
  updated_at?: string | null
  source?: TrainingSourceRef | null
  content_available?: boolean
  progress: TrainingLessonProgress
  bookmarked?: boolean
  module_id?: string
  sort_order?: number
  next_lesson_id?: string | null
  position_label?: string | null
  trail?: { id?: string; slug: string; title: string }
  module?: { id?: string; title?: string; sort_order?: number }
  resume_path?: string | null
  progress_pct?: number
  completed_lessons?: number
  required_lessons?: number
  content_markdown?: string | null
  body?: string | null
  body_markdown?: string | null
  video_url?: string | null
  video_provider?: 'youtube' | 'panda' | 'none' | string | null
  video_id?: string | null
  video_library_id?: string | null
  video_version?: number
  embed_url?: string | null
  external_url?: string | null
  attachments?: KnowledgeAttachment[]
}

export interface TrainingModule {
  id: string
  title: string
  sort_order?: number
  lessons: TrainingLesson[]
}

export interface TrainingTrail {
  id: string
  slug: string
  title: string
  cover_image_url?: string | null
  outcome?: string | null
  audience_roles?: string[]
  topics?: string[]
  difficulty?: string | null
  duration_minutes?: number | null
  featured?: boolean
  module_count?: number
  lesson_count?: number
  required_lessons?: number
  completed_lessons?: number
  progress_pct?: number
  resume_path?: string | null
  ordered_lessons?: TrainingLesson[]
  modules: TrainingModule[]
}

export interface TrainingResume {
  has_started: boolean
  lesson_id: string | null
  trail_slug: string | null
  path: string | null
}

export interface TrainingUpdate {
  kind: string
  id: string
  title: string
  what_changed?: string | null
  what_to_do_today?: string | null
  effective_on?: string | null
  audience_roles?: string[]
  topics?: string[]
  official_url?: string | null
  lesson_id?: string | null
  source?: TrainingSourceRef | null
  published_at?: string | null
  freshness?: 'novo' | 'atualizado' | null
}

export interface TrainingHome {
  title: string
  audience: string
  resume: TrainingResume
  continue_learning: TrainingLesson | null
  start_here: TrainingTrail | null
  recommended: TrainingLesson[]
  featured: TrainingLesson[]
  starter_trail: TrainingTrail | null
  updates: TrainingUpdate[]
}

export interface TrainingLessonDetail extends TrainingLesson {
  trail: { id?: string; slug: string; title: string }
  module: { id?: string; title?: string; sort_order?: number }
  resume_path: string
  outline: TrainingModule[]
  ordered_lessons?: TrainingLesson[]
}

export interface TrainingProgressResponse {
  audience: string
  last_lesson: {
    id: string
    title: string
    state: TrainingProgressState
    started_at: string | null
    last_opened_at: string | null
    completed_at: string | null
    resume_path: string | null
  } | null
  items: Array<{ lesson_id: string; started_at: string | null; last_opened_at: string | null; completed_at: string | null }>
}

export interface TrainingCompleteResponse {
  lesson_id: string
  started_at: string | null
  last_opened_at: string | null
  completed_at: string | null
  next_lesson_id: string | null
  resume_path: string | null
}

export interface TrainingHomeFilters {
  role?: string
  level?: string
  topic?: string
  platform?: string
  format?: string
}

export interface TrainingAdminLesson {
  id: string
  title: string
  cover_image_url?: string | null
  video_provider: 'youtube' | 'panda'
  video_id?: string | null
  video_library_id?: string | null
  video_url?: string | null
  video_version?: number
  global_position?: number
  sort_order?: number
}

export interface TrainingAdminTrail {
  id: string
  slug: string
  title: string
  cover_image_url?: string | null
  sort_order?: number
  lessons: TrainingAdminLesson[]
}

export interface TrainingReportRow {
  user_id: string
  user_name: string
  user_email?: string | null
  trail_id: string
  trail_title: string
  lesson_id: string
  lesson_title: string
  state: TrainingProgressState
  watched_percent: number | null
  completed_at: string | null
  completion_source: 'legacy' | 'watched' | null
}

export interface TrainingReportResponse {
  items: TrainingReportRow[]
  page: number
  page_size: number
  has_more: boolean
  users: Array<{ id: string; nome: string }>
  trails: Array<{ id: string; title: string }>
}

export interface TrainingProgressInput {
  video_version: number
  duration_seconds: number
  last_position_seconds: number
  position_revision: number
  intervals: Array<[number, number]>
  playback_started: true
}

export interface TrainingProgressSaveResponse extends TrainingLessonProgress {
  lesson_id: string
  state: TrainingProgressState
  position_accepted?: boolean
}

export function trainingLessonPath(trailSlug: string, lessonId: string) {
  return `/conhecimento/trilhas/${trailSlug}/aulas/${lessonId}`
}

const MATERIAL_TYPES = new Set<KnowledgeMaterialType>(['playbook', 'study', 'video', 'document', 'link'])

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function asVideoProvider(value: unknown): KnowledgeMaterial['video_provider'] {
  if (value === 'youtube' || value === 'panda' || value === 'none') return value
  return 'none'
}

/** Maps a training lesson payload to a reader material when the API already includes body/video. */
export function trainingLessonToMaterial(lesson: TrainingLesson): KnowledgeMaterial | null {
  const content_markdown = firstText(lesson.content_markdown, lesson.body_markdown, lesson.body)
  const video_url = firstText(lesson.video_url, lesson.embed_url)
  const video_id = firstText(lesson.video_id)
  const external_url = firstText(lesson.external_url)
  const attachments = Array.isArray(lesson.attachments) && lesson.attachments.length ? lesson.attachments : undefined
  const video_provider = asVideoProvider(lesson.video_provider)
  if (!content_markdown && !video_url && !video_id && video_provider === 'none' && !external_url && !attachments) return null
  const format = lesson.format
  const material_type = format && MATERIAL_TYPES.has(format as KnowledgeMaterialType)
    ? format as KnowledgeMaterialType
    : (video_url || video_id || video_provider !== 'none' ? 'video' : 'study')
  return {
    id: lesson.source?.id || lesson.id,
    titulo: lesson.title,
    slug: (typeof lesson.source?.slug === 'string' && lesson.source.slug) || lesson.id,
    excerpt: lesson.excerpt ?? null,
    content_markdown,
    material_type,
    external_url,
    video_provider,
    video_id,
    video_library_id: lesson.video_library_id ?? null,
    video_version: lesson.video_version,
    video_url,
    status: 'published',
    revision: 1,
    cover_image_url: lesson.cover_image_url ?? null,
    duration_minutes: lesson.duration_minutes ?? null,
    attachments,
  }
}

export function getTrainingHome(filters: TrainingHomeFilters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => Boolean(value)))
  return apiGet<TrainingHome>('/training/home', params)
}

export function getTrainingTrails() {
  return apiGet<{ items: TrainingTrail[] }>('/training/trails')
}

export function getTrainingTrail(slug: string) {
  return apiGet<TrainingTrail>(`/training/trails/${encodeURIComponent(slug)}`)
}

export function getTrainingStarter() {
  return apiGet<TrainingTrail>('/training/starter')
}

export function getTrainingLesson(id: string, start = false) {
  return apiGet<TrainingLessonDetail>(`/training/lessons/${encodeURIComponent(id)}`, start ? { start: 'true' } : { start: 'false' })
}

export function startTrainingLesson(id: string) {
  return apiPost<{ lesson_id: string; started_at: string | null; last_opened_at: string | null; completed_at: string | null }>(`/training/lessons/${encodeURIComponent(id)}/start`)
}

export function completeTrainingLesson(id: string) {
  return apiPost<TrainingCompleteResponse>(`/training/lessons/${encodeURIComponent(id)}/complete`)
}

export function getTrainingProgress() {
  return apiGet<TrainingProgressResponse>('/training/progress')
}

export function getTrainingBookmarks() {
  return apiGet<{ items: TrainingLesson[] }>('/training/bookmarks')
}

export function addTrainingBookmark(lessonId: string) {
  return apiPost<{ lesson_id: string; bookmarked: true }>('/training/bookmarks', { lesson_id: lessonId })
}

export function removeTrainingBookmark(lessonId: string) {
  return apiDelete<void>(`/training/bookmarks/${encodeURIComponent(lessonId)}`)
}

export function getAdminTrainingTrails() {
  return apiGet<{ items: TrainingAdminTrail[] }>('/training/admin/trails')
}

export function createAdminTrainingTrail(payload: { title: string; cover_image_url?: string | null; sort_order?: number }) {
  return apiPost<TrainingAdminTrail>('/training/admin/trails', payload)
}

export function updateAdminTrainingTrail(id: string, payload: { title?: string; cover_image_url?: string | null; sort_order?: number }) {
  return apiPatch<TrainingAdminTrail>(`/training/admin/trails/${encodeURIComponent(id)}`, payload)
}

export function deleteAdminTrainingTrail(id: string) {
  return apiDelete<void>(`/training/admin/trails/${encodeURIComponent(id)}`)
}

export function reorderAdminTrainingTrails(ids: string[]) {
  return apiPost<void>('/training/admin/trails/reorder', { ids })
}

export interface TrainingAdminLessonInput {
  trail_id?: string
  title: string
  cover_image_url?: string | null
  video_provider: 'youtube' | 'panda'
  video_input: string
  video_library_id?: string | null
  sort_order?: number
}

export function createAdminTrainingLesson(trailId: string, payload: TrainingAdminLessonInput) {
  return apiPost<TrainingAdminLesson>(`/training/admin/trails/${encodeURIComponent(trailId)}/lessons`, payload)
}

export function updateAdminTrainingLesson(id: string, payload: Partial<TrainingAdminLessonInput>) {
  return apiPatch<TrainingAdminLesson>(`/training/admin/lessons/${encodeURIComponent(id)}`, payload)
}

export function deleteAdminTrainingLesson(id: string) {
  return apiDelete<void>(`/training/admin/lessons/${encodeURIComponent(id)}`)
}

export function reorderAdminTrainingLessons(trailId: string, ids: string[]) {
  return apiPost<void>(`/training/admin/trails/${encodeURIComponent(trailId)}/lessons/reorder`, { ids })
}

export function getTrainingReport(params: { user_id?: string; trail_id?: string; page?: number; page_size?: number } = {}) {
  return apiGet<TrainingReportResponse>('/training/reports', params)
}

export function saveTrainingProgress(lessonId: string, payload: TrainingProgressInput) {
  return apiPost<TrainingProgressSaveResponse>(`/training/lessons/${encodeURIComponent(lessonId)}/progress`, payload)
}

export function formatWatchedPercent(value: number | null | undefined) {
  return value == null ? 'Não medido' : `${Math.round(value)}%`
}
