import { Archive, ArrowDown, ArrowUp, BookOpen, Check, Edit3, FolderPlus, Plus, Save, Search, X } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { ErrorState, LoadingState, EmptyState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { KnowledgeLearnerHome } from '../components/knowledge/KnowledgeLearnerHome'
import { KnowledgeLessonPage } from '../components/knowledge/KnowledgeLessonPage'
import { getKnowledgeArticle, getKnowledgeArticles, getKnowledgeCategories } from '../services/domain'
import { archiveKnowledgeUnitMaterial, createKnowledgeUnitCategory, createKnowledgeUnitMaterial, getKnowledgeUnitAttachment, getKnowledgeUnitCategories, getKnowledgeUnitCategoriesForManagement, getKnowledgeUnitMaterial, getKnowledgeUnitMaterials, publishKnowledgeUnitMaterial, reorderKnowledgeUnitCategories, safeExternalUrl, updateKnowledgeUnitCategory, updateKnowledgeUnitMaterial, uploadKnowledgeUnitAttachment, type KnowledgeCategory, type KnowledgeMaterial, type KnowledgeMaterialInput } from '../services/knowledge'
import { extractErrorMessage } from '../services/api'
import { asString } from '../utils/format'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'
import { useLearnerProgress } from '../hooks/useLearnerProgress'
import {
  buildStarterTrail,
  continueLesson,
  emptyTrainingFilters,
  roleFromUserPapel,
  toCatalogLesson,
  updateLessons,
  type CatalogLesson,
  type TrainingFilters,
} from '../services/knowledge-training'

const KnowledgeEditor = lazy(() => import('../components/knowledge/KnowledgeEditor').then((module) => ({ default: module.KnowledgeEditor })))
const MANAGERS = new Set(['franqueador_master', 'franqueado', 'gerente', 'gerente_comercial'])
const TYPE_LABEL: Record<string, string> = { playbook: 'Playbook', study: 'Estudo', video: 'Vídeo', document: 'Documento', link: 'Link' }
const STATUS_LABEL: Record<string, string> = { published: 'Publicado', draft: 'Rascunho', archived: 'Arquivado' }
type LibrarySource = 'all' | 'unit' | 'network'
type LearnerTab = 'home' | 'trails' | 'library' | 'updates' | 'saved'

function isManager(role?: string) { return Boolean(role && MANAGERS.has(role)) }
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
  const [params, setParams] = useSearchParams()
  const view = params.get('view')
  const tab = (['home', 'trails', 'library', 'updates', 'saved'].includes(view ?? '') ? view : 'home') as LearnerTab
  const admin = view === 'admin' && manager
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
  const client = useQueryClient()
  const articleRef = params.get('material') ?? ''
  const globalArticleRef = params.get('artigo') ?? ''
  const learner = useLearnerProgress(user?.id)
  const role = roleFromUserPapel(user?.papel)
  const filters = useMemo(() => ({ q: search.trim() || undefined, category_slug: categoryOrigin === 'local' ? category || undefined : undefined, material_type: type || undefined, status: manager && admin ? status : 'published', page: 1, page_size: 48 }), [admin, category, categoryOrigin, manager, search, status, type])
  const categories = useQuery({ queryKey: QK.knowledgeUnitCategories(tenantId), queryFn: manager ? getKnowledgeUnitCategoriesForManagement : getKnowledgeUnitCategories, enabled: Boolean(tenantId) })
  const materials = useQuery({ queryKey: QK.knowledgeUnitMaterials(tenantId, filters), queryFn: () => getKnowledgeUnitMaterials(filters), enabled: Boolean(tenantId && (admin ? source !== 'network' : true)) })
  const globalCategories = useQuery({ queryKey: QK.knowledgeGlobalCategories(tenantId), queryFn: getKnowledgeCategories, enabled: Boolean(tenantId && (admin ? source !== 'unit' : true)) })
  const globalFilters = useMemo(() => ({ q: search.trim() || undefined, category_slug: categoryOrigin === 'global' ? category || undefined : undefined }), [category, categoryOrigin, search])
  const globalArticles = useQuery({ queryKey: QK.knowledgeGlobalArticles(tenantId, globalFilters), queryFn: () => getKnowledgeArticles(globalFilters), enabled: Boolean(tenantId && (admin ? source !== 'unit' : true)) })
  const detail = useQuery({ queryKey: QK.knowledgeUnitMaterial(tenantId, articleRef), queryFn: () => getKnowledgeUnitMaterial(articleRef), enabled: Boolean(tenantId && articleRef) })
  const globalDetail = useQuery({ queryKey: QK.knowledgeGlobalArticle(tenantId, globalArticleRef), queryFn: () => getKnowledgeArticle(globalArticleRef), enabled: Boolean(tenantId && globalArticleRef) })
  const editDetail = useQuery({ queryKey: QK.knowledgeUnitMaterial(tenantId, editingId), queryFn: () => getKnowledgeUnitMaterial(editingId), enabled: Boolean(tenantId && editingId && editorOpen) })
  const createCategory = useMutation({ mutationFn: (name: string) => createKnowledgeUnitCategory({ name }), onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitCategories(tenantId) }) } })
  const editCategory = useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => updateKnowledgeUnitCategory(id, { name }), onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitCategories(tenantId) }) } })
  const toggleCategory = useMutation({ mutationFn: (category: KnowledgeCategory) => updateKnowledgeUnitCategory(category.id, { is_active: category.is_active === false }), onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitCategories(tenantId) }) } })
  const reorderCategories = useMutation({ mutationFn: reorderKnowledgeUnitCategories, onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitCategories(tenantId) }) } })
  const saveMaterial = useMutation({
    mutationFn: async ({ payload, attachment }: { payload: KnowledgeMaterialInput; attachment: File | null }) => {
      const saved = editingId
        ? await updateKnowledgeUnitMaterial(editingId, { ...payload, expected_revision: editDetail.data?.revision ?? 1 })
        : await createKnowledgeUnitMaterial(payload, crypto.randomUUID())
      let attachmentError: string | undefined
      if (attachment) {
        try { await uploadKnowledgeUnitAttachment(saved.id, attachment) }
        catch (error) { attachmentError = extractErrorMessage(error) }
      }
      return { material: { ...saved, video_url: payload.video_url }, attachmentError }
    },
    onSuccess: ({ material }) => {
      void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterials(tenantId) })
      void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterial(tenantId, materialRef(material)) })
    },
  })
  const statusAction = useMutation({ mutationFn: ({ id, action, revision }: { id: string; action: 'publish' | 'archive'; revision: number }) => action === 'publish' ? publishKnowledgeUnitMaterial(id, revision) : archiveKnowledgeUnitMaterial(id, revision), onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterials(tenantId) }); void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterial(tenantId, articleRef) }) } })
  const rows = materials.data?.items ?? []
  const categoryRows = categories.data ?? []
  const globalRows = (globalArticles.data ?? []).map(asGlobalMaterial)
  const globalCategoryRows = globalCategories.data ?? []
  const visibleGlobalRows = type ? globalRows.filter((material) => material.material_type === type) : globalRows
  const catalog = useMemo<CatalogLesson[]>(() => [
    ...rows.map((material) => toCatalogLesson(material, 'unit')),
    ...globalRows.map((material) => toCatalogLesson(material, 'network')),
  ], [globalRows, rows])
  const published = useMemo(() => catalog.filter((lesson) => lesson.material.status === 'published'), [catalog])
  const trail = useMemo(() => buildStarterTrail(published), [published])
  const resume = useMemo(() => continueLesson(published, trail, learner.progress), [learner.progress, published, trail])
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
  function openLesson(lesson: CatalogLesson) {
    if (lesson.origin === 'network') openGlobal(lesson.material)
    else openLocal(lesson.material)
  }
  function closeLesson() {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('material')
      next.delete('artigo')
      return next
    })
  }
  function openNew() { setEditingId(''); setEditorOpen(true) }
  function openEdit(material: KnowledgeMaterial) {
    setEditingId(materialRef(material))
    setEditorOpen(true)
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('material')
      next.delete('artigo')
      return next
    })
  }
  function closeEditor() { setEditorOpen(false); setEditingId('') }
  const openAttachment = useCallback(async (materialId: string, attachment: { id: string }) => {
    const result = await getKnowledgeUnitAttachment(materialId, attachment.id)
    if (!safeExternalUrl(result.url)) throw new Error('Link do PDF indisponível')
    window.open(result.url, '_blank', 'noopener,noreferrer')
  }, [])

  useEffect(() => {
    if ((articleRef && detail.isSuccess) || (globalArticleRef && globalDetail.isSuccess)) articleHeading.current?.focus()
  }, [articleRef, detail.isSuccess, globalArticleRef, globalDetail.isSuccess])

  const currentLesson = useMemo(() => {
    if (articleRef && detail.data) return toCatalogLesson(detail.data, 'unit')
    if (globalArticleRef && globalDetail.data) return toCatalogLesson(asGlobalMaterial(globalDetail.data), 'network')
    return null
  }, [articleRef, detail.data, globalArticleRef, globalDetail.data])
  const staleUpdate = useMemo(() => {
    if (!currentLesson?.topic) return null
    return updateLessons(published).find((lesson) => lesson.topic === currentLesson.topic && lesson.id !== currentLesson.id) ?? null
  }, [currentLesson, published])

  if (!tenantId) return <ErrorState message="Não foi possível identificar a unidade desta sessão." />
  if (articleRef || globalArticleRef) {
    if (articleRef && detail.isLoading) return <div className="space-y-5"><LoadingState label="Abrindo material" /></div>
    if (globalArticleRef && globalDetail.isLoading) return <div className="space-y-5"><LoadingState label="Abrindo material da rede" /></div>
    if (articleRef && (detail.isError || !detail.data)) return <ErrorState message={extractErrorMessage(detail.error)} onRetry={() => void detail.refetch()} />
    if (globalArticleRef && (globalDetail.isError || !globalDetail.data)) return <ErrorState message={extractErrorMessage(globalDetail.error)} onRetry={() => void globalDetail.refetch()} />
    if (currentLesson) {
      return (
        <KnowledgeLessonPage
          lesson={currentLesson}
          catalog={published}
          trail={trail}
          progress={learner.progress}
          state={learner.progress.lessons[currentLesson.id]}
          manager={manager && currentLesson.origin === 'unit'}
          headingRef={articleHeading}
          staleUpdate={staleUpdate}
          onBack={closeLesson}
          onOpen={openLesson}
          onEdit={currentLesson.origin === 'unit' ? () => openEdit(currentLesson.material) : undefined}
          onCopyLink={currentLesson.origin === 'unit' ? async () => { await navigator.clipboard.writeText(window.location.href) } : undefined}
          onComplete={() => learner.completeLesson(currentLesson.id)}
          onBookmark={() => learner.bookmarkLesson(currentLesson.id)}
          onOpened={() => learner.openLesson(currentLesson.id)}
          onOpenAttachment={currentLesson.origin === 'unit' ? (id, attachment) => { void openAttachment(id, attachment) } : undefined}
        />
      )
    }
  }
  if (categories.isLoading || materials.isLoading || globalArticles.isLoading) return <LoadingState label="Carregando a Base de treinamento" />
  if (categories.isError) return <ErrorState message={extractErrorMessage(categories.error)} onRetry={() => void categories.refetch()} />
  if (materials.isError) return <ErrorState message={extractErrorMessage(materials.error)} onRetry={() => void materials.refetch()} />
  if (globalArticles.isError) return <ErrorState message={extractErrorMessage(globalArticles.error)} onRetry={() => void globalArticles.refetch()} />

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

  if (!admin) {
    return (
      <>
        <KnowledgeLearnerHome
          tab={tab}
          onTab={setView}
          catalog={catalog}
          published={published}
          trail={trail}
          continueLesson={resume}
          progress={learner.progress}
          role={role}
          manager={manager}
          search={search}
          onSearch={setSearch}
          filters={learnerFilters}
          onFilters={setLearnerFilters}
          onOpen={openLesson}
          onBookmark={(lesson) => learner.bookmarkLesson(lesson.id)}
          onAdmin={manager ? () => setView('admin') : undefined}
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
            <Button type="button" variant="ghost" onClick={() => setView('home')}>Voltar ao treinamento</Button>
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
