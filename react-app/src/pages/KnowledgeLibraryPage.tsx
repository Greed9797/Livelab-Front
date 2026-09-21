import { Archive, ArrowDown, ArrowUp, BookOpen, Check, Edit3, FolderPlus, Plus, Save, Search, X } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { ErrorState, LoadingState, EmptyState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { KnowledgeLearnerHome } from '../components/knowledge/KnowledgeLearnerHome'
import { getKnowledgeArticle, getKnowledgeArticles, getKnowledgeCategories } from '../services/domain'
import { archiveKnowledgeUnitMaterial, createKnowledgeUnitCategory, createKnowledgeUnitMaterial, getKnowledgeUnitAttachment, getKnowledgeUnitCategories, getKnowledgeUnitCategoriesForManagement, getKnowledgeUnitMaterial, getKnowledgeUnitMaterials, publishKnowledgeUnitMaterial, reorderKnowledgeUnitCategories, safeExternalUrl, updateKnowledgeUnitCategory, updateKnowledgeUnitMaterial, uploadKnowledgeUnitAttachment, type KnowledgeCategory, type KnowledgeMaterial, type KnowledgeMaterialInput } from '../services/knowledge'
import { extractErrorMessage } from '../services/api'
import { asString } from '../utils/format'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'
import { emptyTrainingFilters, type TrainingFilters } from '../services/knowledge-training'
import {
  addTrainingBookmark,
  completeTrainingLesson,
  getTrainingBookmarks,
  getTrainingHome,
  getTrainingLesson,
  getTrainingTrails,
  removeTrainingBookmark,
  startTrainingLesson,
  trainingLessonPath,
  trainingLessonToMaterial,
  type TrainingLesson,
  type TrainingLessonDetail,
  type TrainingUpdate,
} from '../services/training'

const KnowledgeEditor = lazy(() => import('../components/knowledge/KnowledgeEditor').then((module) => ({ default: module.KnowledgeEditor })))
const KnowledgeLessonPage = lazy(() => import('../components/knowledge/KnowledgeLessonPage').then((module) => ({ default: module.KnowledgeLessonPage })))
const MANAGERS = new Set(['franqueador_master', 'franqueado', 'gerente', 'gerente_comercial'])
const TYPE_LABEL: Record<string, string> = { playbook: 'Playbook', study: 'Estudo', video: 'Vídeo', document: 'Documento', link: 'Link' }
const STATUS_LABEL: Record<string, string> = { published: 'Publicado', draft: 'Rascunho', archived: 'Arquivado' }
type LibrarySource = 'all' | 'unit' | 'network'
type LearnerTab = 'home' | 'trails' | 'library' | 'updates' | 'saved'

function isManager(role?: string) { return Boolean(role && MANAGERS.has(role)) }

function staleUpdateForLesson(lesson: TrainingLessonDetail, updates: TrainingUpdate[]): TrainingUpdate | null {
  const lessonStamp = Date.parse(lesson.updated_at || lesson.published_at || '')
  const lessonSlug = lesson.source?.slug
  for (const item of updates) {
    const matches = item.lesson_id === lesson.id || (lessonSlug && item.source?.slug === lessonSlug)
    if (!matches) continue
    const updateStamp = Date.parse(item.published_at || item.effective_on || '')
    if (!Number.isFinite(updateStamp)) continue
    if (!Number.isFinite(lessonStamp) || updateStamp > lessonStamp) return item
  }
  return null
}
function materialRef(material: KnowledgeMaterial) { return asString(material.slug) || asString(material.id) }
function globalType(row: Record<string, unknown>): KnowledgeMaterial['material_type'] {
  if (asString(row.video_provider) && asString(row.video_provider) !== 'none') return 'video'
  if (asString(row.url) || asString(row.external_url)) return 'link'
  if (asString(row.paginas)) return 'document'
  return 'study'
}
function asGlobalMaterial(row: Record<string, unknown>): KnowledgeMaterial {
  return {
    ...row,
    id: asString(row.id),
    titulo: asString(row.titulo ?? row.title, 'Material da rede'),
    slug: asString(row.slug, asString(row.id)),
    excerpt: typeof row.excerpt === 'string' ? row.excerpt : null,
    content_markdown: typeof row.content_markdown === 'string' ? row.content_markdown : null,
    material_type: globalType(row),
    external_url: asString(row.external_url ?? row.url) || null,
    video_url: asString(row.video_url) || null,
    video_provider: asString(row.video_provider, 'none') as KnowledgeMaterial['video_provider'],
    cover_image_url: asString(row.cover_image_url) || null,
    status: asString(row.status, 'published') as KnowledgeMaterial['status'],
    revision: 1,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    published_at: typeof row.published_at === 'string' ? row.published_at : null,
    atualizado_em: typeof row.atualizado_em === 'string' ? row.atualizado_em : typeof row.updated_at === 'string' ? row.updated_at : undefined,
  }
}

function CategoryManager({ open, categories, busy, onClose, onCreate, onUpdate, onToggle, onReorder }: { open: boolean; categories: KnowledgeCategory[]; busy?: boolean; onClose: () => void; onCreate: (name: string) => Promise<void>; onUpdate: (id: string, name: string) => Promise<void>; onToggle: (category: KnowledgeCategory) => Promise<void>; onReorder: (ids: string[]) => Promise<void> }) {
  const [name, setName] = useState(''); const [drafts, setDrafts] = useState<Record<string, string>>({}); const [busyId, setBusyId] = useState('')
  useEffect(() => setDrafts(Object.fromEntries(categories.map((category) => [category.id, category.name]))), [categories])
  async function create() { if (!name.trim()) return; setBusyId('new'); try { await onCreate(name.trim()); setName('') } finally { setBusyId('') } }
  async function update(category: KnowledgeCategory) { const value = drafts[category.id]?.trim(); if (!value || value === category.name) return; setBusyId(category.id); try { await onUpdate(category.id, value) } finally { setBusyId('') } }
  async function toggle(category: KnowledgeCategory) { setBusyId(category.id); try { await onToggle(category) } finally { setBusyId('') } }
  async function move(index: number, delta: number) { const ids = categories.map((category) => category.id); const target = index + delta; if (target < 0 || target >= ids.length) return; [ids[index], ids[target]] = [ids[target], ids[index]]; setBusyId('order'); try { await onReorder(ids) } finally { setBusyId('') } }
  return <Modal open={open} title="Gerenciar categorias" subtitle="Crie, edite, desative ou reorganize os filtros da Base." onClose={onClose} size="lg" footer={<div className="flex justify-end"><Button type="button" variant="ghost" icon={X} onClick={onClose}>Fechar</Button></div>}><div className="space-y-4"><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void create() }}><input aria-label="Nova categoria" className="design-input h-10 min-w-0 flex-1 px-3" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nova categoria" maxLength={120} /><Button type="submit" icon={FolderPlus} isLoading={busyId === 'new'}>Criar</Button></form>{categories.length ? <div className="space-y-2">{categories.map((category, index) => <div key={category.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-muted p-2"><input aria-label={`Nome da categoria ${category.name}`} className="design-input h-9 min-w-0 flex-1 px-2 text-sm" value={drafts[category.id] ?? category.name} onChange={(event) => setDrafts((current) => ({ ...current, [category.id]: event.target.value }))} /><span className="px-1 text-xs text-ink-muted tabular-nums" title="Materiais nesta categoria">{typeof category.article_count === 'number' ? `${category.article_count}` : '—'}</span><Button type="button" size="icon" variant="ghost" aria-label={`Salvar categoria ${category.name}`} onClick={() => void update(category)} disabled={busyId === category.id || busy}><Save className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label={`Mover ${category.name} para cima`} onClick={() => void move(index, -1)} disabled={index === 0 || busyId === 'order' || busy}><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label={`Mover ${category.name} para baixo`} onClick={() => void move(index, 1)} disabled={index === categories.length - 1 || busyId === 'order' || busy}><ArrowDown className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label={category.is_active === false ? `Reativar ${category.name}` : `Desativar ${category.name}`} onClick={() => void toggle(category)} disabled={busyId === category.id || busy}>{category.is_active === false ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</Button></div>)}</div> : <p className="text-sm text-ink-muted">Nenhuma categoria cadastrada. Digite um nome acima e clique em Criar.</p>}</div></Modal>
}

export function KnowledgeLibraryPage() {
  const user = useCurrentUser(); const tenantId = user?.tenant_id; const manager = isManager(user?.papel)
  const navigate = useNavigate()
  const route = useParams<{ trailSlug?: string; lessonId?: string }>()
  const [params, setParams] = useSearchParams()
  const view = params.get('view')
  const tab = (['home', 'trails', 'library', 'updates', 'saved'].includes(view ?? '') ? view : 'home') as LearnerTab
  const admin = view === 'admin' && manager
  const trailSlug = route.trailSlug
  const lessonId = route.lessonId
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categoryOrigin, setCategoryOrigin] = useState<'local' | 'global' | ''>('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState<'published' | 'draft' | 'archived'>('published')
  const [source, setSource] = useState<LibrarySource>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [learnerFilters, setLearnerFilters] = useState<TrainingFilters>(emptyTrainingFilters)
  const articleHeading = useRef<HTMLHeadingElement>(null)
  const saveIdempotencyKeyRef = useRef<string | null>(null)
  const lessonStartedRef = useRef<Set<string>>(new Set())
  const client = useQueryClient()
  const homeRole = learnerFilters.role || undefined
  const articleRef = params.get('material') ?? ''
  const globalArticleRef = params.get('artigo') ?? ''
  const filters = useMemo(() => ({ q: search.trim() || undefined, category_slug: categoryOrigin === 'local' ? category || undefined : undefined, material_type: type || undefined, status: manager && admin ? status : 'published', page: 1, page_size: 48 }), [admin, category, categoryOrigin, manager, search, status, type])
  const catalogTab = !lessonId && (tab === 'trails' || tab === 'library' || Boolean(trailSlug))
  const trainingHome = useQuery({
    queryKey: QK.trainingHome(tenantId, homeRole),
    queryFn: () => getTrainingHome(homeRole ? { role: homeRole } : {}),
    enabled: Boolean(tenantId && !admin && !articleRef && !globalArticleRef),
  })
  const homeHasStarter = Boolean(trainingHome.data?.starter_trail || trainingHome.data?.start_here)
  const trainingTrails = useQuery({ queryKey: QK.trainingTrails(tenantId), queryFn: getTrainingTrails, enabled: Boolean(tenantId && !admin && (catalogTab || (trainingHome.isSuccess && !homeHasStarter))) })
  const trainingBookmarks = useQuery({ queryKey: QK.trainingBookmarks(tenantId, user?.id), queryFn: getTrainingBookmarks, enabled: Boolean(tenantId && !admin && tab === 'saved') })
  const trainingLesson = useQuery({
    queryKey: QK.trainingLesson(tenantId, lessonId ?? ''),
    queryFn: async () => {
      const id = lessonId!
      if (!lessonStartedRef.current.has(id)) {
        await startTrainingLesson(id)
        lessonStartedRef.current.add(id)
      }
      return getTrainingLesson(id, false)
    },
    enabled: Boolean(tenantId && lessonId),
  })
  const categories = useQuery({ queryKey: QK.knowledgeUnitCategories(tenantId), queryFn: manager ? getKnowledgeUnitCategoriesForManagement : getKnowledgeUnitCategories, enabled: Boolean(tenantId && (admin || editorOpen || categoryModalOpen)) })
  const materials = useQuery({ queryKey: QK.knowledgeUnitMaterials(tenantId, filters), queryFn: () => getKnowledgeUnitMaterials(filters), enabled: Boolean(tenantId && (admin || articleRef)) })
  const globalCategories = useQuery({ queryKey: QK.knowledgeGlobalCategories(tenantId), queryFn: getKnowledgeCategories, enabled: Boolean(tenantId && admin) })
  const globalFilters = useMemo(() => ({ q: search.trim() || undefined, category_slug: categoryOrigin === 'global' ? category || undefined : undefined }), [category, categoryOrigin, search])
  const globalArticles = useQuery({ queryKey: QK.knowledgeGlobalArticles(tenantId, globalFilters), queryFn: () => getKnowledgeArticles(globalFilters), enabled: Boolean(tenantId && admin && source !== 'unit') })
  const detail = useQuery({ queryKey: QK.knowledgeUnitMaterial(tenantId, articleRef), queryFn: () => getKnowledgeUnitMaterial(articleRef), enabled: Boolean(tenantId && articleRef) })
  const globalDetail = useQuery({ queryKey: QK.knowledgeGlobalArticle(tenantId, globalArticleRef), queryFn: () => getKnowledgeArticle(globalArticleRef), enabled: Boolean(tenantId && globalArticleRef) })
  const editDetail = useQuery({ queryKey: QK.knowledgeUnitMaterial(tenantId, editingId), queryFn: () => getKnowledgeUnitMaterial(editingId), enabled: Boolean(tenantId && editingId && editorOpen) })
  const createCategory = useMutation({ mutationFn: (name: string) => createKnowledgeUnitCategory({ name }), onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitCategories(tenantId) }) } })
  const editCategory = useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => updateKnowledgeUnitCategory(id, { name }), onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitCategories(tenantId) }) } })
  const toggleCategory = useMutation({ mutationFn: (category: KnowledgeCategory) => updateKnowledgeUnitCategory(category.id, { is_active: category.is_active === false }), onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitCategories(tenantId) }) } })
  const reorderCategories = useMutation({ mutationFn: reorderKnowledgeUnitCategories, onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitCategories(tenantId) }) } })
  function ensureSaveIdempotencyKey() {
    if (!saveIdempotencyKeyRef.current) {
      saveIdempotencyKeyRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`
    }
    return saveIdempotencyKeyRef.current
  }

  function resetSaveIdempotencyKey() {
    saveIdempotencyKeyRef.current = null
  }

  const saveMaterial = useMutation({
    mutationFn: async ({ payload, attachment }: { payload: KnowledgeMaterialInput; attachment: File | null }) => {
      const saved = editingId
        ? await updateKnowledgeUnitMaterial(editingId, { ...payload, expected_revision: editDetail.data?.revision ?? 1 })
        : await createKnowledgeUnitMaterial(payload, ensureSaveIdempotencyKey())
      let attachmentError: string | undefined
      if (attachment) {
        try { await uploadKnowledgeUnitAttachment(saved.id, attachment) }
        catch (error) { attachmentError = extractErrorMessage(error) }
      }
      return { material: { ...saved, video_url: payload.video_url }, attachmentError }
    },
    onSuccess: ({ material }) => {
      resetSaveIdempotencyKey()
      void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterials(tenantId) })
      void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterial(tenantId, materialRef(material)) })
    },
  })
  const statusAction = useMutation({ mutationFn: ({ id, action, revision }: { id: string; action: 'publish' | 'archive'; revision: number }) => action === 'publish' ? publishKnowledgeUnitMaterial(id, revision) : archiveKnowledgeUnitMaterial(id, revision), onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterials(tenantId) }); void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterial(tenantId, articleRef) }) } })
  const completeLesson = useMutation({
    mutationFn: completeTrainingLesson,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['training'] })
    },
  })
  const toggleBookmark = useMutation({
    mutationFn: async (lesson: TrainingLesson) => {
      if (lesson.bookmarked) await removeTrainingBookmark(lesson.id)
      else await addTrainingBookmark(lesson.id)
    },
    onSuccess: () => { void client.invalidateQueries({ queryKey: ['training'] }) },
  })
  const sourceRef = trainingLesson.data?.source
  const lessonInlineMaterial = trainingLesson.data ? trainingLessonToMaterial(trainingLesson.data) : null
  const unitSource = useQuery({
    queryKey: QK.knowledgeUnitMaterial(tenantId, sourceRef?.slug || sourceRef?.id || ''),
    queryFn: () => getKnowledgeUnitMaterial(sourceRef?.slug || sourceRef?.id || ''),
    enabled: Boolean(tenantId && !lessonInlineMaterial && sourceRef && (sourceRef.kind === 'unit_material' || sourceRef.origin === 'unidade')),
  })
  const networkSource = useQuery({
    queryKey: QK.knowledgeGlobalArticle(tenantId, sourceRef?.slug || sourceRef?.id || ''),
    queryFn: () => getKnowledgeArticle(sourceRef?.slug || sourceRef?.id || ''),
    enabled: Boolean(tenantId && !lessonInlineMaterial && sourceRef && (sourceRef.kind === 'network_article' || sourceRef.origin === 'rede')),
  })
  const rows = materials.data?.items ?? []
  const categoryRows = categories.data ?? []
  const globalRows = (globalArticles.data ?? []).map(asGlobalMaterial)
  const globalCategoryRows = globalCategories.data ?? []
  const visibleGlobalRows = type ? globalRows.filter((material) => material.material_type === type) : globalRows
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of rows) {
      const slug = asString(row.category_slug)
      if (!slug || slug === '—') continue
      counts.set(slug, (counts.get(slug) ?? 0) + 1)
    }
    return counts
  }, [rows])

  function setView(next: string) {
    setParams((current) => {
      const paramsNext = new URLSearchParams(current)
      if (next === 'home') paramsNext.delete('view')
      else paramsNext.set('view', next)
      return paramsNext
    })
  }
  function openLocal(material: KnowledgeMaterial) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('artigo')
      next.set('material', materialRef(material))
      return next
    })
  }
  function openGlobal(material: KnowledgeMaterial) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('material')
      next.set('artigo', materialRef(material))
      return next
    })
  }
  function openTrainingLesson(lesson: TrainingLesson, slug?: string) {
    const path = lesson.resume_path || (slug || trailSlug ? trainingLessonPath(slug || trailSlug || 'primeira-live-que-converte', lesson.id) : null)
    if (path) navigate(path)
  }
  function closeLesson() {
    if (lessonId) {
      navigate(trailSlug ? `/conhecimento/trilhas/${trailSlug}` : '/conhecimento')
      return
    }
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('material')
      next.delete('artigo')
      return next
    })
  }
  function openNew() { resetSaveIdempotencyKey(); setEditingId(''); setEditorOpen(true) }
  function openEdit(material: KnowledgeMaterial) {
    resetSaveIdempotencyKey()
    setEditingId(materialRef(material))
    setEditorOpen(true)
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('material')
      next.delete('artigo')
      return next
    })
  }
  function closeEditor() { resetSaveIdempotencyKey(); setEditorOpen(false); setEditingId('') }
  const openAttachment = useCallback(async (materialId: string, attachment: { id: string }) => {
    const result = await getKnowledgeUnitAttachment(materialId, attachment.id)
    if (!safeExternalUrl(result.url)) throw new Error('Link do PDF indisponível')
    window.open(result.url, '_blank', 'noopener,noreferrer')
  }, [])

  useEffect(() => {
    if ((articleRef && detail.isSuccess) || (globalArticleRef && globalDetail.isSuccess) || (lessonId && trainingLesson.isSuccess)) articleHeading.current?.focus()
  }, [articleRef, detail.isSuccess, globalArticleRef, globalDetail.isSuccess, lessonId, trainingLesson.isSuccess])

  const localCategoryRows = categoryRows.filter((item) => item.is_active !== false)
  const editor = manager && editorOpen ? (
    editingId
      ? editDetail.isLoading
        ? <LoadingState label="Abrindo editor" />
        : editDetail.data
          ? <Suspense fallback={<LoadingState label="Carregando editor" />}><KnowledgeEditor open material={editDetail.data} categories={localCategoryRows} onClose={closeEditor} onSave={(payload, attachment) => saveMaterial.mutateAsync({ payload, attachment })} /></Suspense>
          : null
      : <Suspense fallback={<LoadingState label="Carregando editor" />}><KnowledgeEditor open categories={localCategoryRows} onClose={closeEditor} onSave={(payload, attachment) => saveMaterial.mutateAsync({ payload, attachment })} /></Suspense>
  ) : null
  const categoryModal = manager ? (
    <CategoryManager
      open={categoryModalOpen}
      categories={categoryRows}
      busy={createCategory.isPending || editCategory.isPending || toggleCategory.isPending || reorderCategories.isPending}
      onClose={() => setCategoryModalOpen(false)}
      onCreate={async (name) => { await createCategory.mutateAsync(name) }}
      onUpdate={async (id, name) => { await editCategory.mutateAsync({ id, name }) }}
      onToggle={async (item) => { await toggleCategory.mutateAsync(item) }}
      onReorder={async (ids) => { await reorderCategories.mutateAsync(ids) }}
    />
  ) : null

  if (!tenantId) return <ErrorState message="Não foi possível identificar a unidade desta sessão." />
  if (lessonId) {
    if (trainingLesson.isLoading) return <LoadingState label="Abrindo aula" />
    if (trainingLesson.isError || !trainingLesson.data) return <ErrorState message={extractErrorMessage(trainingLesson.error)} onRetry={() => void trainingLesson.refetch()} />
    const sourceMaterial = lessonInlineMaterial ?? (
      sourceRef?.kind === 'unit_material' || sourceRef?.origin === 'unidade'
        ? unitSource.data
        : networkSource.data ? asGlobalMaterial(networkSource.data) : undefined
    )
    const staleUpdate = trainingHome.data
      ? staleUpdateForLesson(trainingLesson.data, trainingHome.data.updates)
      : null
    const staleBanner = staleUpdate ? {
      title: staleUpdate.title,
      onOpen: () => {
        if (staleUpdate.lesson_id) navigate(trainingLessonPath(trainingLesson.data.trail.slug, staleUpdate.lesson_id))
        else if (staleUpdate.official_url) navigate(staleUpdate.official_url)
      },
    } : null
    return (
      <>
        <Suspense fallback={<LoadingState label="Abrindo aula" />}>
          <KnowledgeLessonPage
            lesson={trainingLesson.data}
            material={sourceMaterial}
            manager={manager && (sourceRef?.kind === 'unit_material' || sourceRef?.origin === 'unidade')}
            headingRef={articleHeading}
            staleUpdate={staleBanner}
            onBack={closeLesson}
            onOpen={(id) => navigate(trainingLessonPath(trainingLesson.data.trail.slug, id))}
            onEdit={sourceRef?.kind === 'unit_material' || sourceRef?.origin === 'unidade'
              ? () => openEdit({
                id: sourceRef?.id || trainingLesson.data.id,
                titulo: trainingLesson.data.title,
                slug: asString(sourceRef?.slug) || asString(sourceRef?.id) || trainingLesson.data.id,
                material_type: 'study',
                status: 'published',
                revision: 1,
              })
              : undefined}
            onCopyLink={async () => { await navigator.clipboard.writeText(window.location.href) }}
            onComplete={() => completeLesson.mutateAsync(trainingLesson.data.id)}
            onFollowResume={(path) => navigate(path)}
            onBookmark={() => { void toggleBookmark.mutateAsync(trainingLesson.data) }}
            onOpenAttachment={sourceRef?.kind === 'unit_material' || sourceRef?.origin === 'unidade' ? (id, attachment) => { void openAttachment(id, attachment) } : undefined}
          />
        </Suspense>
        {editor}
        {categoryModal}
      </>
    )
  }
  if (articleRef || globalArticleRef) {
    if (articleRef && detail.isLoading) return <div className="space-y-5"><LoadingState label="Abrindo material" /></div>
    if (globalArticleRef && globalDetail.isLoading) return <div className="space-y-5"><LoadingState label="Abrindo material da rede" /></div>
    if (articleRef && (detail.isError || !detail.data)) return <ErrorState message={extractErrorMessage(detail.error)} onRetry={() => void detail.refetch()} />
    if (globalArticleRef && (globalDetail.isError || !globalDetail.data)) return <ErrorState message={extractErrorMessage(globalDetail.error)} onRetry={() => void globalDetail.refetch()} />
    const adminMaterial = articleRef ? detail.data : asGlobalMaterial(globalDetail.data!)
    if (adminMaterial) {
      return (
        <div className="space-y-5">
          <Button type="button" variant="ghost" onClick={closeLesson}>Voltar à Base</Button>
          <Suspense fallback={<LoadingState label="Abrindo material" />}>
            <KnowledgeLessonPage
              lesson={{
                id: adminMaterial.id,
                title: adminMaterial.titulo,
                excerpt: adminMaterial.excerpt,
                progress: { state: 'not_started', started_at: null, last_opened_at: null, completed_at: null },
                trail: { slug: trailSlug || 'administrar', title: articleRef ? 'Base da unidade' : 'Biblioteca da rede' },
                module: { title: adminMaterial.category_name || 'Material' },
                resume_path: window.location.pathname,
                outline: [],
                source: { kind: articleRef ? 'unit_material' : 'network_article', id: adminMaterial.id, slug: adminMaterial.slug, origin: articleRef ? 'unidade' : 'rede' },
              }}
              material={adminMaterial}
              manager={Boolean(articleRef && manager)}
              headingRef={articleHeading}
              onBack={closeLesson}
              onOpen={() => undefined}
              onEdit={articleRef ? () => openEdit(adminMaterial) : undefined}
              onCopyLink={articleRef ? async () => { await navigator.clipboard.writeText(window.location.href) } : undefined}
              onComplete={async () => ({
                lesson_id: adminMaterial.id,
                started_at: null,
                last_opened_at: null,
                completed_at: null,
                next_lesson_id: null,
                resume_path: null,
              })}
              onBookmark={() => undefined}
              onOpenAttachment={articleRef ? (id, attachment) => { void openAttachment(id, attachment) } : undefined}
            />
          </Suspense>
          {editor}
          {categoryModal}
        </div>
      )
    }
  }
  if (admin && (categories.isLoading || (source !== 'network' && materials.isLoading) || (source !== 'unit' && globalArticles.isLoading))) return <LoadingState label="Carregando a Base da unidade" />
  if (!admin && trainingHome.isLoading) return <LoadingState label="Carregando a Base de treinamento" />
  if (admin && categories.isError) return <ErrorState message={extractErrorMessage(categories.error)} onRetry={() => void categories.refetch()} />
  if (admin && materials.isError) return <ErrorState message={extractErrorMessage(materials.error)} onRetry={() => void materials.refetch()} />
  if (admin && globalArticles.isError) return <ErrorState message={extractErrorMessage(globalArticles.error)} onRetry={() => void globalArticles.refetch()} />
  if (!admin && trainingHome.isError) return <ErrorState message={extractErrorMessage(trainingHome.error)} onRetry={() => void trainingHome.refetch()} />
  if (!admin && trainingTrails.isError && catalogTab && !homeHasStarter) return <ErrorState message={extractErrorMessage(trainingTrails.error)} onRetry={() => void trainingTrails.refetch()} />

  if (!admin) {
    if (!trainingHome.data) return <LoadingState label="Carregando a Base de treinamento" />
    return (
      <>
        <KnowledgeLearnerHome
          tab={trailSlug && !lessonId ? 'trails' : tab}
          onTab={(next) => {
            if (trailSlug) navigate(next === 'home' ? '/conhecimento' : `/conhecimento?view=${next}`)
            else setView(next)
          }}
          home={trainingHome.data}
          trails={trainingTrails.data?.items ?? (trainingHome.data.starter_trail ? [trainingHome.data.starter_trail] : trainingHome.data.start_here ? [trainingHome.data.start_here] : [])}
          bookmarks={trainingBookmarks.data?.items ?? []}
          manager={manager}
          search={search}
          onSearch={setSearch}
          filters={learnerFilters}
          onFilters={setLearnerFilters}
          onOpen={openTrainingLesson}
          onOpenPath={(path) => navigate(path)}
          onBookmark={(lesson) => { void toggleBookmark.mutateAsync(lesson) }}
          onAdmin={manager ? () => navigate('/conhecimento?view=admin') : undefined}
        />
        {editor}
        {categoryModal}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrar Base"
        subtitle="Biblioteca interna: criação, categorias, status e origem. A home da aprendiz fica em Base de treinamento TikTok."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/conhecimento')}>Voltar ao treinamento</Button>
            <Button type="button" icon={Plus} onClick={openNew}>Novo material</Button>
          </div>
        )}
      />
      <div className="flex flex-wrap items-center gap-2" aria-label="Origem dos materiais">
        <Button type="button" aria-pressed={source === 'all'} variant={source === 'all' ? 'primary' : 'secondary'} onClick={() => setSource('all')}>Todas as bibliotecas</Button>
        <Button type="button" aria-pressed={source === 'unit'} variant={source === 'unit' ? 'primary' : 'secondary'} onClick={() => setSource('unit')}>Base da unidade</Button>
        <Button type="button" aria-pressed={source === 'network'} variant={source === 'network' ? 'primary' : 'secondary'} onClick={() => setSource('network')}>Biblioteca da rede</Button>
      </div>
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input aria-label="Buscar materiais" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, resumo ou tag" className="design-input h-11 w-full pl-10 pr-4" />
            </label>
            <select aria-label="Filtrar por tipo" className="design-input h-11 px-3 sm:w-44" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select aria-label="Filtrar por status" className="design-input h-11 px-3 sm:w-40" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="published">Publicados</option>
              <option value="draft">Rascunhos</option>
              <option value="archived">Arquivados</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" aria-pressed={!category} variant={category ? 'secondary' : 'primary'} onClick={() => { setCategory(''); setCategoryOrigin('') }}>Todas</Button>
            {localCategoryRows.map((item) => {
              const count = typeof item.article_count === 'number' ? item.article_count : categoryCounts.get(item.slug)
              return <Button key={`local-${item.id}`} type="button" aria-pressed={categoryOrigin === 'local' && category === item.slug} variant={categoryOrigin === 'local' && category === item.slug ? 'primary' : 'secondary'} onClick={() => { setCategory(item.slug); setCategoryOrigin('local') }}>Unidade: {item.name}{typeof count === 'number' ? ` (${count})` : ''}</Button>
            })}
            {globalCategoryRows.map((item) => {
              const slug = asString(item.slug)
              return <Button key={`global-${item.id}`} type="button" aria-pressed={categoryOrigin === 'global' && category === slug} variant={categoryOrigin === 'global' && category === slug ? 'primary' : 'secondary'} onClick={() => { setCategory(slug); setCategoryOrigin('global') }}>Rede: {asString(item.nome ?? item.name)}</Button>
            })}
            <Button type="button" variant="secondary" icon={FolderPlus} onClick={() => setCategoryModalOpen(true)}>Gerenciar categorias</Button>
          </div>
        </CardBody>
      </Card>
      {source !== 'network' ? (
        <MaterialSection
          title="Base da unidade"
          description="Materiais criados e mantidos pela gestão desta unidade."
          rows={rows}
          manager={manager}
          onOpen={openLocal}
          onEdit={openEdit}
          onStatus={(material, action) => void statusAction.mutateAsync({ id: material.id, action, revision: material.revision })}
          emptyTitle={manager ? 'Nenhum material neste filtro' : 'A Base da unidade ainda está vazia'}
          emptyDescription={manager ? 'Crie um material para organizar o conhecimento da unidade.' : 'Quando a gestão publicar materiais, eles aparecerão aqui.'}
        />
      ) : null}
      {source !== 'unit' ? (
        <MaterialSection
          title="Biblioteca da rede"
          description="Referências globais publicadas para as unidades. A edição permanece exclusiva da administração da rede."
          rows={visibleGlobalRows}
          manager={false}
          onOpen={openGlobal}
          emptyTitle="Nenhum material da rede encontrado"
          emptyDescription="Ajuste a busca ou aguarde novas publicações da administração."
        />
      ) : null}
      {editor}
      {categoryModal}
    </div>
  )
}

function MaterialSection({ title, description, rows, manager, onOpen, onEdit, onStatus, emptyTitle, emptyDescription }: { title: string; description: string; rows: KnowledgeMaterial[]; manager: boolean; onOpen: (material: KnowledgeMaterial) => void; onEdit?: (material: KnowledgeMaterial) => void; onStatus?: (material: KnowledgeMaterial, action: 'publish' | 'archive') => void; emptyTitle: string; emptyDescription: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-base font-bold text-ink">{title}</p>
            <p className="mt-1 text-sm text-ink-muted">{description}</p>
          </div>
          <Badge tone={manager ? 'info' : 'neutral'}>{manager ? 'Gestão: edição e publicação' : 'Somente publicados'}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {rows.length ? rows.map((material) => (
          <div key={material.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface-muted/50 p-4 transition hover:bg-surface-muted">
            <button type="button" onClick={() => onOpen(material)} className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
              <span className="min-w-0">
                <span className="block font-bold text-ink">{material.titulo}</span>
                {material.excerpt ? <span className="mt-1 block text-sm text-ink-muted">{material.excerpt}</span> : null}
                <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span>{material.category_name || 'Sem categoria'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{TYPE_LABEL[material.material_type] || 'Material'}</span>
                  {manager && material.status !== 'published' ? <><span aria-hidden="true">·</span><span>{STATUS_LABEL[material.status] || material.status}</span></> : null}
                </span>
              </span>
            </button>
            {manager && onEdit && onStatus ? (
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${material.titulo}`} onClick={() => onEdit(material)}><Edit3 className="h-4 w-4" /></Button>
                {material.status === 'published'
                  ? <Button type="button" variant="ghost" size="icon" aria-label={`Arquivar ${material.titulo}`} onClick={() => onStatus(material, 'archive')}><Archive className="h-4 w-4" /></Button>
                  : <Button type="button" variant="ghost" size="icon" aria-label={`Publicar ${material.titulo}`} onClick={() => onStatus(material, 'publish')}><BookOpen className="h-4 w-4" /></Button>}
              </div>
            ) : null}
          </div>
        )) : <EmptyState title={emptyTitle} description={emptyDescription} />}
      </CardBody>
    </Card>
  )
}
