import { Eye, FilePlus2, Link2, Save, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { UnsavedChangesNotice } from '../ui/UnsavedChangesNotice'
import { extractErrorMessage } from '../../services/api'
import { videoUrlFromKnowledgeMaterial, type KnowledgeCategory, type KnowledgeMaterial, type KnowledgeMaterialInput, type KnowledgeMaterialStatus, type KnowledgeMaterialType } from '../../services/knowledge'
import { sanitizeKnowledgeMarkdown } from '../../services/knowledge-markdown'
import { decodeTrainingMeta, encodeTrainingTags } from '../../services/knowledge-training'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'

const TYPES: Array<[KnowledgeMaterialType, string]> = [
  ['playbook', 'Playbook'],
  ['study', 'Estudo'],
  ['video', 'Vídeo'],
  ['document', 'Documento'],
  ['link', 'Link'],
]

const initialDraft: KnowledgeMaterialInput = {
  titulo: '',
  excerpt: '',
  content_markdown: '',
  material_type: 'playbook',
  video_provider: 'none',
  video_url: null,
  external_url: null,
  tags: [],
  status: 'draft',
}

function formFromMaterial(material?: KnowledgeMaterial | null): KnowledgeMaterialInput {
  if (!material) return { ...initialDraft }
  const meta = decodeTrainingMeta(material)
  return {
    titulo: material.titulo ?? '',
    category_id: material.category_id ?? null,
    excerpt: material.excerpt ?? '',
    content_markdown: material.content_markdown ?? '',
    material_type: material.material_type ?? 'playbook',
    external_url: material.external_url ?? null,
    video_provider: material.video_provider ?? 'none',
    // O backend persiste video_id/provedor e pode omitir a URL original no
    // detalhe. Reconstituímos uma URL canônica para não apagar o vídeo ao salvar.
    video_url: videoUrlFromKnowledgeMaterial(material),
    tags: meta.displayTags,
    status: material.status ?? 'draft',
    cover_image_url: meta.coverUrl,
    duration_minutes: meta.durationMinutes,
    difficulty: meta.level,
    objectives: meta.objectives,
    prerequisites: meta.prerequisites,
    audience_role: meta.role,
    topic: meta.topic,
    platform: meta.platform,
  }
}

function formSignature(form: KnowledgeMaterialInput, file: File | null) {
  return JSON.stringify({ ...form, tags: [...(form.tags ?? [])].sort(), file: file ? `${file.name}:${file.size}:${file.lastModified}` : null })
}

function insertMarkdown(value: string, selectionStart: number, selectionEnd: number, before: string, after = before) {
  const selected = value.slice(selectionStart, selectionEnd) || 'texto'
  return {
    value: `${value.slice(0, selectionStart)}${before}${selected}${after}${value.slice(selectionEnd)}`,
    start: selectionStart + before.length,
    end: selectionStart + before.length + selected.length,
  }
}

export interface KnowledgeEditorProps {
  open: boolean
  material?: KnowledgeMaterial | null
  categories: KnowledgeCategory[]
  onClose: () => void
  onSave: (payload: KnowledgeMaterialInput, attachment: File | null) => Promise<{ material: KnowledgeMaterial; attachmentError?: string }>
}

export function KnowledgeEditor({ open, material, categories, onClose, onSave }: KnowledgeEditorProps) {
  const [form, setForm] = useState<KnowledgeMaterialInput>(() => formFromMaterial(material))
  const [file, setFile] = useState<File | null>(null)
  const [baseline, setBaseline] = useState(() => formSignature(formFromMaterial(material), null))
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const dirty = useMemo(() => formSignature(form, file) !== baseline, [baseline, file, form])
  const guard = useUnsavedChanges({ open, dirty, busy: saving, onClose })

  useEffect(() => {
    if (!open) return
    const next = formFromMaterial(material)
    setForm(next)
    setFile(null)
    setBaseline(formSignature(next, null))
    setError('')
    setPreview(false)
  }, [material, open])

  function update<K extends keyof KnowledgeMaterialInput>(key: K, value: KnowledgeMaterialInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const result = await onSave({
        ...form,
        titulo: form.titulo.trim(),
        excerpt: form.excerpt?.trim() || null,
        content_markdown: form.content_markdown?.trim() || null,
        external_url: form.external_url?.trim() || null,
        video_url: form.video_url?.trim() || null,
        tags: encodeTrainingTags({
          ...form,
          tags: (form.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
        }),
        cover_image_url: form.cover_image_url?.trim() || null,
        duration_minutes: form.duration_minutes && form.duration_minutes > 0 ? form.duration_minutes : null,
        difficulty: form.difficulty || null,
        objectives: form.objectives,
        prerequisites: form.prerequisites,
        audience_role: form.audience_role || null,
        topic: form.topic || null,
        platform: form.platform || null,
      }, file)
      const next = formFromMaterial(result.material)
      setForm(next)
      setFile(null)
      setBaseline(formSignature(next, null))
      if (result.attachmentError) {
        setError(result.attachmentError)
        return
      }
      onClose()
    } catch (saveError) {
      setError(extractErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  function toolbar(before: string, after = before) {
    const textarea = document.getElementById('knowledge-markdown') as HTMLTextAreaElement | null
    if (!textarea) return
    const next = insertMarkdown(form.content_markdown ?? '', textarea.selectionStart, textarea.selectionEnd, before, after)
    update('content_markdown', next.value)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(next.start, next.end)
    })
  }

  return (
    <Modal open={open} title={material ? 'Editar material' : 'Novo material'} subtitle="A biblioteca da unidade fica disponível apenas para equipe interna e apresentadoras." onClose={guard.requestClose} closeDisabled={guard.busy} size="xl" footer={(
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" icon={X} onClick={guard.requestClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" form="knowledge-editor-form" icon={Save} isLoading={saving}>Salvar material</Button>
      </div>
    )}>
      <form id="knowledge-editor-form" className="space-y-5" onSubmit={submit}>
        <UnsavedChangesNotice guard={guard} />
        {error ? <p role="alert" className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-ink">{error}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">Título<input className="design-input h-11 px-3" value={form.titulo} onChange={(event) => update('titulo', event.target.value)} required maxLength={240} /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">Tipo<select className="design-input h-11 px-3" value={form.material_type} onChange={(event) => update('material_type', event.target.value as KnowledgeMaterialType)}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">Categoria<select className="design-input h-11 px-3" value={form.category_id ?? ''} onChange={(event) => update('category_id', event.target.value || null)}><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">Resumo<textarea className="design-input min-h-20 px-3 py-2" value={form.excerpt ?? ''} onChange={(event) => update('excerpt', event.target.value)} maxLength={500} /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">Tags<span className="text-xs font-normal text-ink-muted">Separe por vírgulas</span><input className="design-input h-11 px-3" value={(form.tags ?? []).join(', ')} onChange={(event) => update('tags', event.target.value.split(','))} /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">Duração (min)<input className="design-input h-11 px-3" type="number" min={1} inputMode="numeric" value={form.duration_minutes ?? ''} onChange={(event) => update('duration_minutes', event.target.value ? Number(event.target.value) : null)} /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">Nível<select className="design-input h-11 px-3" value={form.difficulty ?? ''} onChange={(event) => update('difficulty', event.target.value || null)}><option value="">Não informado</option><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option></select></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">Função<select className="design-input h-11 px-3" value={form.audience_role ?? ''} onChange={(event) => update('audience_role', event.target.value || null)}><option value="">Não informado</option><option value="apresentadora">Apresentadora</option><option value="operacao">Operação</option><option value="comercial">Comercial</option><option value="gestor">Gestor</option></select></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">Tema<select className="design-input h-11 px-3" value={form.topic ?? ''} onChange={(event) => update('topic', event.target.value || null)}><option value="">Não informado</option><option value="live">Live</option><option value="shop">Shop</option><option value="ads">Ads</option><option value="conteudo">Conteúdo</option><option value="politicas">Políticas</option></select></label>
          <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">Objetivo da aula<input className="design-input h-11 px-3" value={typeof form.objectives === 'string' ? form.objectives : (form.objectives ?? []).join('; ')} onChange={(event) => update('objectives', event.target.value ? [event.target.value] : [])} maxLength={240} /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">URL da capa<input className="design-input h-11 px-3" type="url" inputMode="url" placeholder="https://" value={form.cover_image_url ?? ''} onChange={(event) => update('cover_image_url', event.target.value || null)} /></label>
        </div>
        {form.material_type === 'link' ? <label className="grid gap-2 text-sm font-semibold text-ink">URL do material<input className="design-input h-11 px-3" type="url" inputMode="url" placeholder="https://" value={form.external_url ?? ''} onChange={(event) => update('external_url', event.target.value)} required /></label> : null}
        {form.material_type === 'video' ? <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-ink">Provedor<select className="design-input h-11 px-3" value={form.video_provider ?? 'none'} onChange={(event) => update('video_provider', event.target.value as KnowledgeMaterialInput['video_provider'])}><option value="none">Escolha</option><option value="youtube">YouTube</option><option value="panda">Panda Video</option></select></label><label className="grid gap-2 text-sm font-semibold text-ink">URL do vídeo<input className="design-input h-11 px-3" type="url" inputMode="url" placeholder="https://" value={form.video_url ?? ''} onChange={(event) => update('video_url', event.target.value)} required /></label></div> : null}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="knowledge-markdown" className="text-sm font-semibold text-ink">Conteúdo em Markdown</label><Button type="button" variant="secondary" icon={Eye} onClick={() => setPreview((value) => !value)}>{preview ? 'Editar texto' : 'Pré-visualizar'}</Button></div>
          {preview ? <article aria-label="Prévia do material" className="mt-2 min-h-48 rounded-xl border border-line bg-surface-muted p-4 text-sm leading-7 text-ink [&_a]:text-brand [&_a]:underline [&_h1]:mt-5 [&_h1]:text-2xl [&_h2]:mt-5 [&_h2]:text-xl [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-surface [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: sanitizeKnowledgeMarkdown(form.content_markdown) }} /> : <><div className="mt-2 flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-line bg-surface-muted p-2"><Button type="button" size="icon" variant="ghost" aria-label="Negrito" title="Negrito" onClick={() => toolbar('**')}>B</Button><Button type="button" size="icon" variant="ghost" aria-label="Itálico" title="Itálico" onClick={() => toolbar('*')}>I</Button><Button type="button" size="icon" variant="ghost" aria-label="Título" title="Título" onClick={() => toolbar('## ', '')}>H</Button><Button type="button" size="icon" variant="ghost" aria-label="Lista" title="Lista" onClick={() => toolbar('- ', '')}>•</Button><Button type="button" size="icon" variant="ghost" aria-label="Link" title="Link" onClick={() => toolbar('[', '](https://)')}><Link2 className="h-4 w-4" /></Button></div><textarea id="knowledge-markdown" className="design-input min-h-56 w-full rounded-t-none px-3 py-3 font-mono text-sm" value={form.content_markdown ?? ''} onChange={(event) => update('content_markdown', event.target.value)} placeholder="Escreva o playbook em Markdown..." /></>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-ink">Status<select className="design-input h-11 px-3" value={form.status} onChange={(event) => update('status', event.target.value as KnowledgeMaterialStatus)}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">Anexo PDF <span className="text-xs font-normal text-ink-muted">Até 10 MB; o upload só ocorre ao salvar um material.</span><input className="design-input h-11 px-3 py-2 text-sm" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        </div>
        <p className="flex items-start gap-2 text-xs text-ink-muted"><FilePlus2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />O servidor valida o conteúdo e as URLs. Scripts, HTML ativo e embeds arbitrários são bloqueados.</p>
      </form>
    </Modal>
  )
}
