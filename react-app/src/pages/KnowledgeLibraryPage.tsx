import { Archive, ArrowDown, ArrowUp, BookOpen, Check, ChevronLeft, Edit3, ExternalLink, FilePlus2, FileText, FolderPlus, Link2, Play, Plus, Save, Search, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { ErrorState, LoadingState, EmptyState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { getKnowledgeArticle, getKnowledgeArticles, getKnowledgeCategories } from '../services/domain'
import { archiveKnowledgeUnitMaterial, createKnowledgeUnitCategory, createKnowledgeUnitMaterial, getKnowledgeUnitAttachment, getKnowledgeUnitCategories, getKnowledgeUnitCategoriesForManagement, getKnowledgeUnitMaterial, getKnowledgeUnitMaterials, publishKnowledgeUnitMaterial, reorderKnowledgeUnitCategories, safeExternalUrl, sanitizeKnowledgeMarkdown, updateKnowledgeUnitCategory, updateKnowledgeUnitMaterial, uploadKnowledgeUnitAttachment, videoUrlFromKnowledgeMaterial, type KnowledgeCategory, type KnowledgeMaterial, type KnowledgeMaterialInput } from '../services/knowledge'
import { extractErrorMessage } from '../services/api'
import { asString } from '../utils/format'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'

const KnowledgeEditor = lazy(() => import('../components/knowledge/KnowledgeEditor').then((module) => ({ default: module.KnowledgeEditor })))
const MANAGERS = new Set(['franqueador_master', 'franqueado', 'gerente', 'gerente_comercial'])
const TYPE_LABEL: Record<string, string> = { playbook: 'Playbook', study: 'Estudo', video: 'Vídeo', document: 'Documento', link: 'Link' }
const STATUS_LABEL: Record<string, string> = { published: 'Publicado', draft: 'Rascunho', archived: 'Arquivado' }
type LibrarySource = 'all' | 'unit' | 'network'

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
    material_type: globalType(row),
    external_url: asString(row.external_url ?? row.url) || null,
    video_url: asString(row.video_url) || null,
    video_provider: asString(row.video_provider, 'none') as KnowledgeMaterial['video_provider'],
    status: asString(row.status, 'published') as KnowledgeMaterial['status'],
    revision: 1,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
  }
}
function MaterialIcon({ type }: { type: string }) {
  if (type === 'video') return <Play aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
  if (type === 'link') return <Link2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
  if (type === 'document') return <FilePlus2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
  return <FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
}
function AttachmentLink({ materialId, attachment }: { materialId: string; attachment: { id: string; filename?: string; original_name?: string } }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const filename = attachment.filename || attachment.original_name || 'PDF do material'
  async function open() {
    setLoading(true); setError('')
    try { const result = await getKnowledgeUnitAttachment(materialId, attachment.id); if (!safeExternalUrl(result.url)) throw new Error('Link do PDF indisponível'); window.open(result.url, '_blank', 'noopener,noreferrer') } catch (downloadError) { setError(extractErrorMessage(downloadError)) } finally { setLoading(false) }
  }
  return <div><Button type="button" variant="secondary" size="icon" aria-label={`Abrir PDF ${filename}`} title={filename} onClick={() => void open()} disabled={loading}>{loading ? <span className="text-xs">…</span> : <FileText className="h-4 w-4" />}</Button><span className="ml-2 text-xs text-ink-muted">{filename}</span>{error ? <span className="ml-2 text-xs text-[var(--danger)]">{error}</span> : null}</div>
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
  const [params, setParams] = useSearchParams(); const [search, setSearch] = useState(''); const [category, setCategory] = useState(''); const [categoryOrigin, setCategoryOrigin] = useState<'local' | 'global' | ''>(''); const [type, setType] = useState(''); const [status, setStatus] = useState<'published' | 'draft' | 'archived'>('published'); const [source, setSource] = useState<LibrarySource>('all'); const [editorOpen, setEditorOpen] = useState(false); const [editingId, setEditingId] = useState(''); const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const articleHeading = useRef<HTMLHeadingElement>(null); const client = useQueryClient(); const articleRef = params.get('material') ?? ''; const globalArticleRef = params.get('artigo') ?? ''
  const filters = useMemo(() => ({ q: search.trim() || undefined, category_slug: categoryOrigin === 'local' ? category || undefined : undefined, material_type: type || undefined, status: manager ? status : 'published', page: 1, page_size: 48 }), [category, categoryOrigin, manager, search, status, type])
  const categories = useQuery({ queryKey: QK.knowledgeUnitCategories(tenantId), queryFn: manager ? getKnowledgeUnitCategoriesForManagement : getKnowledgeUnitCategories, enabled: Boolean(tenantId) })
  const materials = useQuery({ queryKey: QK.knowledgeUnitMaterials(tenantId, filters), queryFn: () => getKnowledgeUnitMaterials(filters), enabled: Boolean(tenantId && source !== 'network') })
  const globalCategories = useQuery({ queryKey: QK.knowledgeGlobalCategories(tenantId), queryFn: getKnowledgeCategories, enabled: Boolean(tenantId && source !== 'unit') })
  const globalFilters = useMemo(() => ({ q: search.trim() || undefined, category_slug: categoryOrigin === 'global' ? category || undefined : undefined }), [category, categoryOrigin, search])
  const globalArticles = useQuery({ queryKey: QK.knowledgeGlobalArticles(tenantId, globalFilters), queryFn: () => getKnowledgeArticles(globalFilters), enabled: Boolean(tenantId && source !== 'unit') })
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
        try {
          await uploadKnowledgeUnitAttachment(saved.id, attachment)
        } catch (error) {
          attachmentError = extractErrorMessage(error)
        }
      }
      return { material: { ...saved, video_url: payload.video_url }, attachmentError }
    },
    onSuccess: ({ material }) => {
      void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterials(tenantId) })
      void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterial(tenantId, materialRef(material)) })
    },
  })
  const statusAction = useMutation({ mutationFn: ({ id, action, revision }: { id: string; action: 'publish' | 'archive'; revision: number }) => action === 'publish' ? publishKnowledgeUnitMaterial(id, revision) : archiveKnowledgeUnitMaterial(id, revision), onSuccess: () => { void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterials(tenantId) }); void client.invalidateQueries({ queryKey: QK.knowledgeUnitMaterial(tenantId, articleRef) }) } })
  const rows = materials.data?.items ?? []; const categoryRows = categories.data ?? []; const globalRows = (globalArticles.data ?? []).map(asGlobalMaterial); const globalCategoryRows = globalCategories.data ?? []
  const visibleGlobalRows = type ? globalRows.filter((material) => material.material_type === type) : globalRows
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of rows) {
      const slug = asString(row.category_slug)
      if (!slug) continue
      counts.set(slug, (counts.get(slug) ?? 0) + 1)
    }
    return counts
  }, [rows])
  function openLocal(material: KnowledgeMaterial) { setParams((current) => { const next = new URLSearchParams(current); next.delete('artigo'); next.set('material', materialRef(material)); return next }) }
  function openGlobal(material: KnowledgeMaterial) { setParams((current) => { const next = new URLSearchParams(current); next.delete('material'); next.set('artigo', materialRef(material)); return next }) }
  function closeLocal() { setParams((current) => { const next = new URLSearchParams(current); next.delete('material'); return next }) }
  function closeGlobal() { setParams((current) => { const next = new URLSearchParams(current); next.delete('artigo'); return next }) }
  function openNew() { setEditingId(''); setEditorOpen(true) }
  function openEdit(material: KnowledgeMaterial) { setEditingId(materialRef(material)); setEditorOpen(true); setParams((current) => { const next = new URLSearchParams(current); next.delete('material'); next.delete('artigo'); return next }) }
  function closeEditor() { setEditorOpen(false); setEditingId('') }
  useEffect(() => { if ((articleRef && detail.isSuccess) || (globalArticleRef && globalDetail.isSuccess)) articleHeading.current?.focus() }, [articleRef, detail.isSuccess, globalArticleRef, globalDetail.isSuccess])
  if (!tenantId) return <ErrorState message="Não foi possível identificar a unidade desta sessão." />
  if (globalArticleRef) {
    if (globalDetail.isLoading) return <div className="space-y-5"><Button type="button" variant="ghost" icon={ChevronLeft} onClick={closeGlobal}>Voltar à Base</Button><LoadingState label="Abrindo material da rede" /></div>
    if (globalDetail.isError || !globalDetail.data) return <div className="space-y-5"><Button type="button" variant="ghost" icon={ChevronLeft} onClick={closeGlobal}>Voltar à Base</Button><ErrorState message={extractErrorMessage(globalDetail.error)} onRetry={() => void globalDetail.refetch()} /></div>
    return <GlobalReader material={asGlobalMaterial(globalDetail.data)} headingRef={articleHeading} onBack={closeGlobal} />
  }
  if (articleRef) {
    if (detail.isLoading) return <div className="space-y-5"><Button type="button" variant="ghost" icon={ChevronLeft} onClick={closeLocal}>Voltar à Base</Button><LoadingState label="Abrindo material" /></div>
    if (detail.isError || !detail.data) return <div className="space-y-5"><Button type="button" variant="ghost" icon={ChevronLeft} onClick={closeLocal}>Voltar à Base</Button><ErrorState message={extractErrorMessage(detail.error)} onRetry={() => void detail.refetch()} /></div>
    return <LocalReader material={detail.data} manager={manager} headingRef={articleHeading} onBack={closeLocal} onEdit={() => openEdit(detail.data!)} onOpenCategory={(slug) => { closeLocal(); if (slug) { setCategory(slug); setCategoryOrigin('local'); setSource('unit') } }} />
  }
  if (categories.isLoading || (source !== 'network' && materials.isLoading) || (source !== 'unit' && globalArticles.isLoading)) return <LoadingState label="Carregando a Base da unidade" />
  if (categories.isError) return <ErrorState message={extractErrorMessage(categories.error)} onRetry={() => void categories.refetch()} />
  if (materials.isError) return <ErrorState message={extractErrorMessage(materials.error)} onRetry={() => void materials.refetch()} />
  if (globalArticles.isError) return <ErrorState message={extractErrorMessage(globalArticles.error)} onRetry={() => void globalArticles.refetch()} />
  const localCategoryRows = categoryRows.filter((item) => item.is_active !== false)
  return <div className="space-y-6"><PageHeader title="Base da unidade" subtitle="Biblioteca interna com materiais da unidade e referências publicadas pela rede." actions={manager ? <Button type="button" icon={Plus} onClick={openNew}>Novo material</Button> : undefined} /><div className="flex flex-wrap items-center gap-2" aria-label="Origem dos materiais"><Button type="button" aria-pressed={source === 'all'} variant={source === 'all' ? 'primary' : 'secondary'} onClick={() => setSource('all')}>Todas as bibliotecas</Button><Button type="button" aria-pressed={source === 'unit'} variant={source === 'unit' ? 'primary' : 'secondary'} onClick={() => setSource('unit')}>Base da unidade</Button><Button type="button" aria-pressed={source === 'network'} variant={source === 'network' ? 'primary' : 'secondary'} onClick={() => setSource('network')}>Biblioteca da rede</Button></div><Card><CardBody className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative block min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /><input aria-label="Buscar materiais" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, resumo ou tag" className="design-input h-11 w-full pl-10 pr-4" /></label><select aria-label="Filtrar por tipo" className="design-input h-11 px-3 sm:w-44" value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos os tipos</option>{Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{manager ? <select aria-label="Filtrar por status" className="design-input h-11 px-3 sm:w-40" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="published">Publicados</option><option value="draft">Rascunhos</option><option value="archived">Arquivados</option></select> : null}</div><div className="flex flex-wrap items-center gap-2"><Button type="button" aria-pressed={!category} variant={category ? 'secondary' : 'primary'} onClick={() => { setCategory(''); setCategoryOrigin('') }}>Todas</Button>{localCategoryRows.map((item) => { const count = typeof item.article_count === 'number' ? item.article_count : categoryCounts.get(item.slug); return <Button key={`local-${item.id}`} type="button" aria-pressed={categoryOrigin === 'local' && category === item.slug} variant={categoryOrigin === 'local' && category === item.slug ? 'primary' : 'secondary'} onClick={() => { setCategory(item.slug); setCategoryOrigin('local') }}>Unidade: {item.name}{typeof count === 'number' ? ` (${count})` : ''}</Button> })}{globalCategoryRows.map((item) => { const slug = asString(item.slug); return <Button key={`global-${item.id}`} type="button" aria-pressed={categoryOrigin === 'global' && category === slug} variant={categoryOrigin === 'global' && category === slug ? 'primary' : 'secondary'} onClick={() => { setCategory(slug); setCategoryOrigin('global') }}>Rede: {asString(item.nome ?? item.name)}</Button> })}{manager ? <Button type="button" variant="secondary" icon={FolderPlus} onClick={() => setCategoryModalOpen(true)}>Gerenciar categorias</Button> : null}</div></CardBody></Card>{source !== 'network' ? <MaterialSection title="Base da unidade" description="Materiais criados e mantidos pela gestão desta unidade." rows={rows} manager={manager} onOpen={openLocal} onEdit={openEdit} onStatus={(material, action) => void statusAction.mutateAsync({ id: material.id, action, revision: material.revision })} emptyTitle={manager ? 'Nenhum material neste filtro' : 'A Base da unidade ainda está vazia'} emptyDescription={manager ? 'Crie um material para organizar o conhecimento da unidade.' : 'Quando a gestão publicar materiais, eles aparecerão aqui.'} /> : null}{source !== 'unit' ? <MaterialSection title="Biblioteca da rede" description="Referências globais publicadas para as unidades. A edição permanece exclusiva da administração da rede." rows={visibleGlobalRows} manager={false} onOpen={openGlobal} emptyTitle="Nenhum material da rede encontrado" emptyDescription="Ajuste a busca ou aguarde novas publicações da administração." /> : null}{manager && editorOpen && (editingId ? editDetail.isLoading ? <LoadingState label="Abrindo editor" /> : editDetail.data ? <Suspense fallback={<LoadingState label="Carregando editor" />}><KnowledgeEditor open material={editDetail.data} categories={localCategoryRows} onClose={closeEditor} onSave={(payload, attachment) => saveMaterial.mutateAsync({ payload, attachment })} /></Suspense> : null : <Suspense fallback={<LoadingState label="Carregando editor" />}><KnowledgeEditor open categories={localCategoryRows} onClose={closeEditor} onSave={(payload, attachment) => saveMaterial.mutateAsync({ payload, attachment })} /></Suspense>)}{manager ? <CategoryManager open={categoryModalOpen} categories={categoryRows} busy={createCategory.isPending || editCategory.isPending || toggleCategory.isPending || reorderCategories.isPending} onClose={() => setCategoryModalOpen(false)} onCreate={async (name) => { await createCategory.mutateAsync(name) }} onUpdate={async (id, name) => { await editCategory.mutateAsync({ id, name }) }} onToggle={async (category) => { await toggleCategory.mutateAsync(category) }} onReorder={async (ids) => { await reorderCategories.mutateAsync(ids) }} /> : null}</div>
}

function MaterialSection({ title, description, rows, manager, onOpen, onEdit, onStatus, emptyTitle, emptyDescription }: { title: string; description: string; rows: KnowledgeMaterial[]; manager: boolean; onOpen: (material: KnowledgeMaterial) => void; onEdit?: (material: KnowledgeMaterial) => void; onStatus?: (material: KnowledgeMaterial, action: 'publish' | 'archive') => void; emptyTitle: string; emptyDescription: string }) {
  return <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-base font-bold text-ink">{title}</p><p className="mt-1 text-sm text-ink-muted">{description}</p></div><Badge tone={manager ? 'info' : 'neutral'}>{manager ? 'Gestão: edição e publicação' : 'Somente publicados'}</Badge></div></CardHeader><CardBody className="space-y-3">{rows.length ? rows.map((material) => <div key={material.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface-muted/50 p-4 transition hover:bg-surface-muted"><button type="button" onClick={() => onOpen(material)} className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"><MaterialIcon type={material.material_type} /><span className="min-w-0"><span className="block font-bold text-ink">{material.titulo}</span>{material.excerpt ? <span className="mt-1 block text-sm text-ink-muted">{material.excerpt}</span> : null}<span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted"><span>{material.category_name || 'Sem categoria'}</span><span aria-hidden="true">·</span><span>{TYPE_LABEL[material.material_type] || 'Material'}</span>{manager && material.status !== 'published' ? <><span aria-hidden="true">·</span><span>{STATUS_LABEL[material.status] || material.status}</span></> : null}</span></span></button>{manager && onEdit && onStatus ? <div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Editar ${material.titulo}`} onClick={() => onEdit(material)}><Edit3 className="h-4 w-4" /></Button>{material.status === 'published' ? <Button type="button" variant="ghost" size="icon" aria-label={`Arquivar ${material.titulo}`} onClick={() => onStatus(material, 'archive')}><Archive className="h-4 w-4" /></Button> : <Button type="button" variant="ghost" size="icon" aria-label={`Publicar ${material.titulo}`} onClick={() => onStatus(material, 'publish')}><BookOpen className="h-4 w-4" /></Button>}</div> : null}</div>) : <EmptyState title={emptyTitle} description={emptyDescription} />}</CardBody></Card>
}

function LocalReader({ material, manager, headingRef, onBack, onEdit, onOpenCategory }: { material: KnowledgeMaterial; manager: boolean; headingRef: React.RefObject<HTMLHeadingElement | null>; onBack: () => void; onEdit: () => void; onOpenCategory?: (slug: string) => void }) {
  const [copied, setCopied] = useState(false)
  const source = safeExternalUrl(material.external_url)
  const video = videoUrlFromKnowledgeMaterial(material)
  const html = sanitizeKnowledgeMarkdown(material.content_markdown)
  const rawAttachments = material.attachments ?? material.anexos
  const attachments = Array.isArray(rawAttachments) ? rawAttachments : []
  const categorySlug = asString(material.category_slug)
  const categoryLabel = material.category_name || 'Sem categoria'
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  const categoryNode = categorySlug && onOpenCategory ? (
    <button type="button" className="text-brand underline-offset-2 hover:underline" onClick={() => onOpenCategory(categorySlug)}>
      {categoryLabel}
    </button>
  ) : (
    categoryLabel
  )
  return (
    <div className="space-y-5">
      <Button type="button" variant="ghost" icon={ChevronLeft} onClick={onBack}>Voltar à Base</Button>
      <Card className="max-w-4xl">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {categoryNode}
                {' · '}
                {TYPE_LABEL[material.material_type] || 'Material'}
              </p>
              <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold text-ink">{material.titulo}</h1>
              <p className="mt-2 text-sm text-ink-muted">{material.excerpt || ''}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" icon={Link2} onClick={() => void copyLink()}>
                {copied ? 'Link copiado' : 'Copiar link'}
              </Button>
              {manager ? <Button type="button" variant="secondary" icon={Edit3} onClick={onEdit}>Editar</Button> : null}
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            {source ? <a className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-muted" href={source} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Abrir material</a> : null}
            {video ? <a className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-muted" href={video} target="_blank" rel="noopener noreferrer"><Play className="h-4 w-4" />Abrir vídeo</a> : null}
            {attachments.map((attachment) => <AttachmentLink key={attachment.id} materialId={material.id} attachment={attachment} />)}
          </div>
          {html ? (
            <article className="mt-6 break-words text-sm leading-7 text-ink [&_a]:text-brand [&_a]:underline [&_h1]:mt-6 [&_h1]:text-2xl [&_h2]:mt-6 [&_h2]:text-xl [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-surface-muted [&_pre]:p-3 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <EmptyState title={source || video || attachments.length ? 'Acesse o material pelos links acima' : 'Conteúdo ainda não disponível'} />
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function GlobalReader({ material, headingRef, onBack }: { material: KnowledgeMaterial; headingRef: React.RefObject<HTMLHeadingElement | null>; onBack: () => void }) {
  const source = safeExternalUrl(material.external_url); const video = safeExternalUrl(material.video_url); const html = sanitizeKnowledgeMarkdown(material.content_markdown)
  return <div className="space-y-5"><Button type="button" variant="ghost" icon={ChevronLeft} onClick={onBack}>Voltar à Base</Button><Card className="max-w-4xl"><CardHeader><p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Biblioteca da rede · {TYPE_LABEL[material.material_type] || 'Material'}</p><h1 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold text-ink">{material.titulo}</h1><p className="mt-2 text-sm text-ink-muted">{material.excerpt || ''}</p></CardHeader><CardBody><div className="flex flex-wrap gap-2">{source ? <a className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-muted" href={source} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Abrir material</a> : null}{video ? <a className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-muted" href={video} target="_blank" rel="noopener noreferrer"><Play className="h-4 w-4" />Abrir vídeo</a> : null}</div>{html ? <article className="mt-6 break-words text-sm leading-7 text-ink [&_a]:text-brand [&_a]:underline [&_h1]:mt-6 [&_h1]:text-2xl [&_h2]:mt-6 [&_h2]:text-xl [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-surface-muted [&_pre]:p-3 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: html }} /> : <EmptyState title={source || video ? 'Acesse o material pelos links acima' : 'Conteúdo ainda não disponível'} />}</CardBody></Card></div>
}
