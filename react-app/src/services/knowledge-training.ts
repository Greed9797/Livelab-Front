import type { KnowledgeMaterial } from './knowledge'
import { safeExternalUrl } from './knowledge'
import { asString } from '../utils/format'

export type TrainingRole = 'apresentadora' | 'operacao' | 'comercial' | 'gestor'
export type TrainingLevel = 'iniciante' | 'intermediario' | 'avancado'
export type TrainingTopic = 'live' | 'shop' | 'ads' | 'conteudo' | 'politicas'
export type TrainingPlatform = 'tiktok'
export type TrainingFormat = KnowledgeMaterial['material_type']
export type TrainingOrigin = 'unit' | 'network'
export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed'
export type Freshness = 'novo' | 'atualizado' | null

export const STARTER_TRAIL_ID = 'primeira-live-que-converte'
export const STARTER_TRAIL_TITLE = 'Primeira Live que converte'
const PROGRESS_PREFIX = 'livelab.knowledge.progress.'
const PROGRESS_VERSION = 1

const ROLE_ALIASES: Record<string, TrainingRole> = {
  apresentadora: 'apresentadora',
  apresentador: 'apresentadora',
  operacao: 'operacao',
  operacional: 'operacao',
  comercial: 'comercial',
  gerente_comercial: 'comercial',
  gestor: 'gestor',
  franqueado: 'gestor',
  gerente: 'gestor',
  franqueador_master: 'gestor',
}

const LEVEL_ALIASES: Record<string, TrainingLevel> = {
  iniciante: 'iniciante',
  beginner: 'iniciante',
  intermediario: 'intermediario',
  intermediário: 'intermediario',
  intermediate: 'intermediario',
  avancado: 'avancado',
  avançado: 'avancado',
  advanced: 'avancado',
}

const TOPIC_ALIASES: Record<string, TrainingTopic> = {
  live: 'live',
  shop: 'shop',
  ads: 'ads',
  conteudo: 'conteudo',
  conteúdo: 'conteudo',
  politicas: 'politicas',
  políticas: 'politicas',
  policy: 'politicas',
}

export const ROLE_LABEL: Record<TrainingRole, string> = {
  apresentadora: 'Apresentadora',
  operacao: 'Operação',
  comercial: 'Comercial',
  gestor: 'Gestor',
}

export const LEVEL_LABEL: Record<TrainingLevel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

export const TOPIC_LABEL: Record<TrainingTopic, string> = {
  live: 'Live',
  shop: 'Shop',
  ads: 'Ads',
  conteudo: 'Conteúdo',
  politicas: 'Políticas',
}

export const FORMAT_LABEL: Record<TrainingFormat, string> = {
  playbook: 'Playbook',
  study: 'Estudo',
  video: 'Vídeo',
  document: 'Documento',
  link: 'Link',
}

export interface LearnerLessonState {
  material_id: string
  started_at: string | null
  completed_at: string | null
  last_opened_at: string | null
  bookmarked: boolean
}

export interface LearnerProgressContract {
  version: number
  last_opened_id: string | null
  lessons: Record<string, LearnerLessonState>
}

export interface CatalogLesson {
  id: string
  slug: string
  titulo: string
  excerpt: string
  origin: TrainingOrigin
  material: KnowledgeMaterial
  coverUrl: string | null
  durationMinutes: number | null
  level: TrainingLevel | null
  role: TrainingRole | null
  topic: TrainingTopic | null
  platform: TrainingPlatform | null
  format: TrainingFormat
  objective: string
  prerequisites: string[]
  featured: boolean
  publishedAt: string | null
  updatedAt: string | null
  freshness: Freshness
  displayTags: string[]
}

export interface TrainingModule {
  id: string
  title: string
  lessonIds: string[]
}

export interface TrainingTrail {
  id: string
  title: string
  outcome: string
  modules: TrainingModule[]
  lessonIds: string[]
}

export interface TrainingFilters {
  q: string
  role: TrainingRole | ''
  level: TrainingLevel | ''
  topic: TrainingTopic | ''
  platform: TrainingPlatform | ''
  format: TrainingFormat | ''
  origin: TrainingOrigin | ''
}

export const emptyTrainingFilters: TrainingFilters = {
  q: '',
  role: '',
  level: '',
  topic: '',
  platform: '',
  format: '',
  origin: '',
}

function normalizeToken(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function splitTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim())).map((tag) => tag.trim())
}

function taggedValue(tags: string[], keys: string[]): string | null {
  for (const tag of tags) {
    const [rawKey, ...rest] = tag.split(':')
    if (!rest.length) continue
    const key = normalizeToken(rawKey)
    if (keys.includes(key)) return rest.join(':').trim()
  }
  return null
}

function firstAlias<T extends string>(value: string | null | undefined, aliases: Record<string, T>): T | null {
  if (!value) return null
  return aliases[normalizeToken(value)] ?? null
}

function pickFromTags<T extends string>(tags: string[], aliases: Record<string, T>): T | null {
  for (const tag of tags) {
    const token = normalizeToken(tag.includes(':') ? tag.split(':').slice(1).join(':') : tag)
    if (aliases[token]) return aliases[token]
  }
  return null
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
  if (typeof value === 'string' && value.trim()) return value.split(/\n|;/).map((item) => item.trim()).filter(Boolean)
  return []
}

function optionalPositiveMinutes(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value)
  if (typeof value === 'string' && value.trim()) {
    const match = value.match(/(\d+)/)
    if (!match) return null
    const parsed = Number(match[1])
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

function durationFromTags(tags: string[]): number | null {
  const labeled = taggedValue(tags, ['duracao', 'duration', 'min'])
  const labeledMinutes = optionalPositiveMinutes(labeled)
  if (labeledMinutes) return labeledMinutes
  for (const tag of tags) {
    const match = tag.match(/^(\d+)\s*min/i)
    if (match) return optionalPositiveMinutes(match[1])
  }
  return null
}

function durationFromMarkdown(markdown: unknown): number | null {
  if (typeof markdown !== 'string' || !markdown.trim()) return null
  const words = markdown.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

function parseDate(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function freshnessOf(publishedAt: string | null, updatedAt: string | null, now = Date.now()): Freshness {
  const published = publishedAt ? Date.parse(publishedAt) : Number.NaN
  const updated = updatedAt ? Date.parse(updatedAt) : Number.NaN
  const month = 30 * 24 * 60 * 60 * 1000
  if (Number.isFinite(updated) && Number.isFinite(published) && updated - published > 24 * 60 * 60 * 1000 && now - updated < month) return 'atualizado'
  if (Number.isFinite(published) && now - published < month) return 'novo'
  if (!Number.isFinite(published) && Number.isFinite(updated) && now - updated < month) return 'atualizado'
  return null
}

export function roleFromUserPapel(papel?: string | null): TrainingRole {
  return firstAlias(papel, ROLE_ALIASES) ?? 'apresentadora'
}

export function decodeTrainingMeta(material: KnowledgeMaterial) {
  const tags = splitTags(material.tags)
  const cover = safeExternalUrl(material.cover_image_url) ?? safeExternalUrl(taggedValue(tags, ['capa', 'cover']))
  const durationMinutes = optionalPositiveMinutes(material.duration_minutes)
    ?? durationFromTags(tags)
    ?? durationFromMarkdown(material.content_markdown)
  const level = firstAlias(asString(material.difficulty, ''), LEVEL_ALIASES) ?? pickFromTags(tags, LEVEL_ALIASES)
  const role = firstAlias(asString(material.audience_role, ''), ROLE_ALIASES) ?? pickFromTags(tags, ROLE_ALIASES)
  const topic = firstAlias(asString(material.topic, ''), TOPIC_ALIASES) ?? pickFromTags(tags, TOPIC_ALIASES)
  const platform = normalizeToken(asString(material.platform, '')) === 'tiktok' || tags.some((tag) => normalizeToken(tag).includes('tiktok')) ? 'tiktok' as const : null
  const objectives = stringList(material.objectives)
  const objective = objectives[0] || taggedValue(tags, ['objetivo', 'objective']) || (typeof material.excerpt === 'string' ? material.excerpt.trim() : '')
  const prerequisites = stringList(material.prerequisites)
  const taggedPrereq = taggedValue(tags, ['prereq', 'prerequisito'])
  const featured = material.destaque === true || tags.some((tag) => ['destaque', 'featured', 'livelab'].includes(normalizeToken(tag)))
  const displayTags = tags.filter((tag) => !/^(nivel|level|tema|topic|funcao|role|plataforma|platform|objetivo|objective|duracao|duration|min|capa|cover|prereq|prerequisito):/i.test(tag))
  return {
    coverUrl: cover,
    durationMinutes,
    level,
    role,
    topic,
    platform,
    objective,
    objectives: objectives.length ? objectives : (objective ? [objective] : []),
    prerequisites: prerequisites.length ? prerequisites : (taggedPrereq && taggedPrereq !== 'nenhum' ? [taggedPrereq] : []),
    featured,
    displayTags,
  }
}

export function encodeTrainingTags(input: {
  duration_minutes?: number | null
  difficulty?: string | null
  objectives?: string[] | string | null
  prerequisites?: string[] | string | null
  audience_role?: string | null
  topic?: string | null
  platform?: string | null
  cover_image_url?: string | null
  tags?: string[]
}): string[] {
  const next = splitTags(input.tags).filter((tag) => !/^(nivel|level|tema|topic|funcao|role|plataforma|platform|objetivo|objective|duracao|duration|capa|cover|prereq|prerequisito):/i.test(tag))
  const push = (key: string, value?: string | null) => {
    if (value && value.trim()) next.push(`${key}:${value.trim()}`)
  }
  if (input.duration_minutes && input.duration_minutes > 0) push('duracao', String(Math.round(input.duration_minutes)))
  push('nivel', input.difficulty)
  push('funcao', input.audience_role)
  push('tema', input.topic)
  push('plataforma', input.platform)
  const objective = stringList(input.objectives)[0]
  push('objetivo', objective)
  const prereq = stringList(input.prerequisites)[0]
  push('prereq', prereq)
  if (safeExternalUrl(input.cover_image_url)) push('capa', input.cover_image_url)
  return Array.from(new Set(next))
}

export function toCatalogLesson(material: KnowledgeMaterial, origin: TrainingOrigin): CatalogLesson {
  const meta = decodeTrainingMeta(material)
  const publishedAt = parseDate(material.published_at)
  const updatedAt = parseDate(material.atualizado_em) ?? parseDate(material.updated_at)
  return {
    id: asString(material.id),
    slug: asString(material.slug) || asString(material.id),
    titulo: asString(material.titulo, 'Aula'),
    excerpt: typeof material.excerpt === 'string' ? material.excerpt : '',
    origin,
    material,
    coverUrl: meta.coverUrl,
    durationMinutes: meta.durationMinutes,
    level: meta.level,
    role: meta.role,
    topic: meta.topic,
    platform: meta.platform,
    format: material.material_type,
    objective: meta.objective,
    prerequisites: meta.prerequisites,
    featured: meta.featured,
    publishedAt,
    updatedAt,
    freshness: freshnessOf(publishedAt, updatedAt),
    displayTags: meta.displayTags,
  }
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null
  return minutes === 1 ? '1 min' : `${minutes} min`
}

export function lessonMatchesFilters(lesson: CatalogLesson, filters: TrainingFilters): boolean {
  const query = normalizeToken(filters.q)
  if (query) {
    const haystack = [lesson.titulo, lesson.excerpt, lesson.objective, lesson.displayTags.join(' '), lesson.material.category_name ?? ''].join(' ')
    if (!normalizeToken(haystack).includes(query)) return false
  }
  if (filters.role && lesson.role !== filters.role) return false
  if (filters.level && lesson.level !== filters.level) return false
  if (filters.topic && lesson.topic !== filters.topic) return false
  if (filters.platform && lesson.platform !== filters.platform) return false
  if (filters.format && lesson.format !== filters.format) return false
  if (filters.origin && lesson.origin !== filters.origin) return false
  return true
}

function textScore(lesson: CatalogLesson, words: string[]): number {
  const haystack = normalizeToken([lesson.titulo, lesson.excerpt, lesson.objective, lesson.displayTags.join(' '), lesson.material.category_name ?? ''].join(' '))
  return words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0)
}

export function buildStarterTrail(lessons: CatalogLesson[]): TrainingTrail {
  const published = lessons.filter((lesson) => lesson.material.status === 'published')
  const unused = [...published]
  const take = (id: string, title: string, words: string[], limit: number): TrainingModule => {
    unused.sort((left, right) => textScore(right, words) - textScore(left, words) || left.titulo.localeCompare(right.titulo))
    const picked = unused.splice(0, Math.min(limit, unused.length)).map((lesson) => lesson.id)
    return { id, title, lessonIds: picked }
  }
  const modules = [
    take('preparacao', 'Preparação', ['check', 'prep', 'estoque', 'oferta', 'cabine', 'shop'], 3),
    take('ao-vivo', 'Ao vivo', ['hook', 'cta', 'demo', 'abertura', 'live'], 3),
    take('pos-live', 'Pós-live', ['gmv', 'reten', 'pos', 'analise', 'encerr'], 2),
  ].filter((module) => module.lessonIds.length)
  if (!modules.length && published.length) {
    modules.push({ id: 'inicio', title: 'Comece por aqui', lessonIds: published.slice(0, 8).map((lesson) => lesson.id) })
  }
  return {
    id: STARTER_TRAIL_ID,
    title: STARTER_TRAIL_TITLE,
    outcome: 'Sair da primeira live com oferta clara, ritmo e leitura de resultado.',
    modules,
    lessonIds: modules.flatMap((module) => module.lessonIds),
  }
}

export function recommendLessons(lessons: CatalogLesson[], role: TrainingRole): CatalogLesson[] {
  const published = lessons.filter((lesson) => lesson.material.status === 'published')
  return [...published].sort((left, right) => {
    const leftScore = (left.role === role ? 3 : 0) + (left.featured ? 2 : 0) + (left.topic === 'live' && role === 'apresentadora' ? 1 : 0)
    const rightScore = (right.role === role ? 3 : 0) + (right.featured ? 2 : 0) + (right.topic === 'live' && role === 'apresentadora' ? 1 : 0)
    return rightScore - leftScore || left.titulo.localeCompare(right.titulo)
  }).slice(0, 6)
}

export function featuredLessons(lessons: CatalogLesson[]): CatalogLesson[] {
  const published = lessons.filter((lesson) => lesson.material.status === 'published')
  const curated = published.filter((lesson) => lesson.featured)
  return (curated.length ? curated : published.filter((lesson) => lesson.format === 'video' || lesson.format === 'playbook')).slice(0, 4)
}

export function updateLessons(lessons: CatalogLesson[]): CatalogLesson[] {
  return lessons
    .filter((lesson) => lesson.material.status === 'published' && lesson.freshness)
    .sort((left, right) => Date.parse(right.updatedAt ?? right.publishedAt ?? '') - Date.parse(left.updatedAt ?? left.publishedAt ?? ''))
}

function emptyContract(): LearnerProgressContract {
  return { version: PROGRESS_VERSION, last_opened_id: null, lessons: {} }
}

function lessonState(materialId: string, current?: LearnerLessonState): LearnerLessonState {
  return current ?? { material_id: materialId, started_at: null, completed_at: null, last_opened_at: null, bookmarked: false }
}

export function progressStatus(state?: LearnerLessonState): LessonProgressStatus {
  if (state?.completed_at) return 'completed'
  if (state?.started_at) return 'in_progress'
  return 'not_started'
}

const memoryProgress = new Map<string, string>()

function progressKey(userId: string) {
  return `${PROGRESS_PREFIX}${userId}`
}

function readProgressRaw(userId: string): string | null {
  const key = progressKey(userId)
  if (typeof localStorage !== 'undefined') return localStorage.getItem(key)
  return memoryProgress.get(key) ?? null
}

export function readLearnerProgress(userId: string): LearnerProgressContract {
  if (!userId) return emptyContract()
  try {
    const raw = readProgressRaw(userId)
    if (!raw) return emptyContract()
    const parsed = JSON.parse(raw) as LearnerProgressContract
    if (!parsed || parsed.version !== PROGRESS_VERSION || typeof parsed.lessons !== 'object') return emptyContract()
    return { version: PROGRESS_VERSION, last_opened_id: parsed.last_opened_id ?? null, lessons: parsed.lessons ?? {} }
  } catch {
    return emptyContract()
  }
}

export function writeLearnerProgress(userId: string, contract: LearnerProgressContract) {
  if (!userId) return
  const key = progressKey(userId)
  const value = JSON.stringify({ ...contract, version: PROGRESS_VERSION })
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  else memoryProgress.set(key, value)
}

export function clearLearnerProgress(userId: string) {
  const key = progressKey(userId)
  if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
  memoryProgress.delete(key)
}

function updateLesson(userId: string, materialId: string, patch: (current: LearnerLessonState) => LearnerLessonState, lastOpened = false): LearnerProgressContract {
  const current = readLearnerProgress(userId)
  const next: LearnerProgressContract = {
    ...current,
    last_opened_id: lastOpened ? materialId : current.last_opened_id,
    lessons: { ...current.lessons, [materialId]: patch(lessonState(materialId, current.lessons[materialId])) },
  }
  writeLearnerProgress(userId, next)
  return next
}

export function markLessonOpened(userId: string, materialId: string, at = new Date().toISOString()): LearnerProgressContract {
  return updateLesson(userId, materialId, (current) => ({
    ...current,
    started_at: current.started_at ?? at,
    last_opened_at: at,
  }), true)
}

export function markLessonComplete(userId: string, materialId: string, at = new Date().toISOString()): LearnerProgressContract {
  return updateLesson(userId, materialId, (current) => ({
    ...current,
    started_at: current.started_at ?? at,
    last_opened_at: current.last_opened_at ?? at,
    completed_at: current.completed_at ?? at,
  }))
}

export function toggleLessonBookmark(userId: string, materialId: string): LearnerProgressContract {
  return updateLesson(userId, materialId, (current) => ({ ...current, bookmarked: !current.bookmarked }))
}

export function trailProgress(trail: TrainingTrail, progress: LearnerProgressContract): { completed: number; total: number; percent: number } {
  const total = trail.lessonIds.length
  const completed = trail.lessonIds.filter((id) => progress.lessons[id]?.completed_at).length
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 }
}

export function continueLesson(lessons: CatalogLesson[], trail: TrainingTrail, progress: LearnerProgressContract): CatalogLesson | null {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  if (progress.last_opened_id) {
    const opened = byId.get(progress.last_opened_id)
    if (opened && !progress.lessons[opened.id]?.completed_at) return opened
  }
  const nextRequired = trail.lessonIds.find((id) => !progress.lessons[id]?.completed_at)
  return (nextRequired ? byId.get(nextRequired) : null) ?? lessons.find((lesson) => lesson.material.status === 'published') ?? null
}

export function nextTrailLesson(currentId: string, trail: TrainingTrail, lessons: CatalogLesson[]): CatalogLesson | null {
  const index = trail.lessonIds.indexOf(currentId)
  if (index < 0) return null
  const nextId = trail.lessonIds[index + 1]
  return lessons.find((lesson) => lesson.id === nextId) ?? null
}

export function activeFilterCount(filters: TrainingFilters): number {
  return Number(Boolean(filters.role)) + Number(Boolean(filters.level)) + Number(Boolean(filters.topic)) + Number(Boolean(filters.platform)) + Number(Boolean(filters.format)) + Number(Boolean(filters.origin))
}
