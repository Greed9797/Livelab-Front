import axios from 'axios'
import { useState } from 'react'
import { ArrowDown, ArrowUp, BookOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { ImagePicker } from '../components/ui/ImagePicker'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { extractErrorMessage } from '../services/api'
import { uploadImageAsset } from '../services/domain'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'
import { asString } from '../utils/format'
import {
  createAdminTrainingLesson, createAdminTrainingTrail, deleteAdminTrainingLesson,
  deleteAdminTrainingTrail, getAdminTrainingTrails, reorderAdminTrainingLessons,
  reorderAdminTrainingTrails, updateAdminTrainingLesson, updateAdminTrainingTrail,
  type TrainingAdminLesson, type TrainingAdminLessonInput, type TrainingAdminTrail,
} from '../services/training'

type TrailDraft = { id?: string; title: string; cover_image_url: string }
type LessonDraft = { id?: string; trail_id: string; title: string; cover_image_url: string; video_provider: 'youtube' | 'panda'; video_input: string; video_library_id: string; existingMaterial?: boolean }
const emptyTrail = (): TrailDraft => ({ title: '', cover_image_url: '' })
const emptyLesson = (trailId: string): LessonDraft => ({ trail_id: trailId, title: '', cover_image_url: '', video_provider: 'youtube', video_input: '', video_library_id: '' })

export function TrainingManagementPage() {
  const user = useCurrentUser()
  const tenantId = user?.tenant_id
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const [trailDraft, setTrailDraft] = useState<TrailDraft | null>(null)
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null)
  const query = useQuery({ queryKey: QK.trainingAdminTrails(tenantId), queryFn: getAdminTrainingTrails, enabled: Boolean(tenantId) })
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['training', tenantId ?? ''] }),
    ])
  }
  const reportError = (error: unknown) => toast.push(extractErrorMessage(error), 'error')
  const saveTrail = useMutation({
    mutationFn: (draft: TrailDraft) => draft.id
      ? updateAdminTrainingTrail(draft.id, { title: draft.title.trim(), cover_image_url: draft.cover_image_url || null })
      : createAdminTrainingTrail({ title: draft.title.trim(), cover_image_url: draft.cover_image_url || null }),
    onSuccess: async () => { setTrailDraft(null); toast.push('Trilha salva.', 'success'); await refresh() },
    onError: reportError,
  })
  const deleteTrail = useMutation({ mutationFn: deleteAdminTrainingTrail, onSuccess: async () => { toast.push('Trilha excluída.', 'success'); await refresh() }, onError: reportError })
  const reorderTrails = useMutation({ mutationFn: reorderAdminTrainingTrails, onSuccess: refresh, onError: reportError })
  const saveLesson = useMutation({
    mutationFn: (draft: LessonDraft) => {
      const details = {
        title: draft.title.trim(), cover_image_url: draft.cover_image_url || null,
      }
      const payload: TrainingAdminLessonInput = {
        ...details,
        video_provider: draft.video_provider, video_input: draft.video_input.trim(),
        video_library_id: draft.video_provider === 'panda' ? draft.video_library_id.trim() || null : null,
      }
      const selectedTrail = query.data?.items.find((trail) => trail.id === draft.trail_id)
      if (draft.id && draft.existingMaterial && !draft.video_input.trim()) {
        return updateAdminTrainingLesson(draft.id, { ...details, trail_id: draft.trail_id })
      }
      return draft.id
        ? updateAdminTrainingLesson(draft.id, { ...payload, trail_id: draft.trail_id })
        : createAdminTrainingLesson(draft.trail_id, { ...payload, sort_order: selectedTrail?.lessons.length ?? 0 })
    },
    onSuccess: async () => { setLessonDraft(null); toast.push('Aula salva.', 'success'); await refresh() },
    onError: reportError,
  })
  const deleteLesson = useMutation({ mutationFn: deleteAdminTrainingLesson, onSuccess: async () => { toast.push('Aula excluída.', 'success'); await refresh() }, onError: reportError })
  const reorderLessons = useMutation({ mutationFn: ({ trailId, ids }: { trailId: string; ids: string[] }) => reorderAdminTrainingLessons(trailId, ids), onSuccess: refresh, onError: reportError })
  const upload = useMutation({
    mutationFn: (file: File) => uploadImageAsset(file, 'treinamentos'),
    onSuccess: (response) => {
      const url = asString(response.url)
      if (!url) { toast.push('O envio não retornou uma URL de imagem.', 'error'); return }
      if (lessonDraft) setLessonDraft((current) => current ? { ...current, cover_image_url: url } : current)
      else setTrailDraft((current) => current ? { ...current, cover_image_url: url } : current)
      toast.push('Imagem enviada.', 'success')
    },
    onError: reportError,
  })

  async function moveTrail(index: number, offset: -1 | 1) {
    const trails = query.data?.items ?? []
    const next = [...trails]
    const target = index + offset
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    await reorderTrails.mutateAsync(next.map((trail) => trail.id))
  }
  async function moveLesson(trail: TrainingAdminTrail, index: number, offset: -1 | 1) {
    const next = [...trail.lessons]
    const target = index + offset
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    await reorderLessons.mutateAsync({ trailId: trail.id, ids: next.map((lesson) => lesson.id) })
  }
  function confirmDeleteTrail(trail: TrainingAdminTrail) {
    if (window.confirm(`Excluir “${trail.title}” e todas as aulas e históricos associados? Os vídeos remotos não serão removidos.`)) deleteTrail.mutate(trail.id)
  }
  function confirmDeleteLesson(lesson: TrainingAdminLesson) {
    if (window.confirm(`Excluir a aula “${lesson.title}” e seu histórico? O vídeo remoto não será removido.`)) deleteLesson.mutate(lesson.id)
  }

  if (query.isLoading) return <LoadingState label="Carregando trilhas de treinamento" />
  if (query.isError && query.data === undefined && axios.isAxiosError(query.error) && query.error.response?.status === 404) {
    return <Card><CardBody><EmptyState title="Gestão de treinamentos aguardando atualização do backend" description="A API de produção ainda não disponibiliza a gestão de trilhas. Tente novamente após a atualização do servidor." /></CardBody></Card>
  }
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
  const trails = query.data?.items ?? []
  const busy = saveTrail.isPending || deleteTrail.isPending || reorderTrails.isPending || saveLesson.isPending || deleteLesson.isPending || reorderLessons.isPending

  return <div className="space-y-6">
    <PageHeader title="Gerenciar treinamentos" subtitle="Organize as trilhas e aulas do catálogo de treinamento." actions={<>
      <Button variant="ghost" onClick={() => navigate('/conhecimento')}>Voltar à Base</Button>
      <Button variant="secondary" onClick={() => navigate('/conhecimento/treinamentos/relatorio')}>Ver relatório</Button>
      <Button icon={Plus} onClick={() => setTrailDraft(emptyTrail())}>Nova trilha</Button>
    </>} />
    {trails.length ? <div className="space-y-4">{trails.map((trail, trailIndex) => <Card key={trail.id}>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {trail.cover_image_url ? <img src={trail.cover_image_url} alt="" className="h-14 w-20 rounded-xl object-cover" /> : <span className="grid h-14 w-20 place-items-center rounded-xl bg-surface-muted text-ink-muted"><BookOpen className="h-5 w-5" /></span>}
            <div className="min-w-0"><h2 className="text-lg font-bold text-ink">{trail.title}</h2><p className="text-sm text-ink-muted">{trail.lessons.length} {trail.lessons.length === 1 ? 'aula' : 'aulas'}</p></div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="icon" aria-label="Mover trilha para cima" disabled={trailIndex === 0 || busy} onClick={() => void moveTrail(trailIndex, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Mover trilha para baixo" disabled={trailIndex === trails.length - 1 || busy} onClick={() => void moveTrail(trailIndex, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label={`Editar ${trail.title}`} onClick={() => setTrailDraft({ id: trail.id, title: trail.title, cover_image_url: trail.cover_image_url ?? '' })}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label={`Excluir ${trail.title}`} disabled={busy} onClick={() => confirmDeleteTrail(trail)}><Trash2 className="h-4 w-4 text-[var(--danger)]" /></Button>
            <Button variant="secondary" icon={Plus} onClick={() => setLessonDraft(emptyLesson(trail.id))}>Nova aula</Button>
          </div>
        </div>
        {trail.lessons.length ? <ol className="divide-y divide-line rounded-xl border border-line">{trail.lessons.map((lesson, index) => <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-3">{lesson.cover_image_url ? <img src={lesson.cover_image_url} alt="" className="h-10 w-14 rounded-lg object-cover" /> : null}<div><p className="font-semibold text-ink">{lesson.title}</p><p className="text-xs text-ink-muted">{lesson.video_provider === 'panda' ? 'Panda Video' : lesson.video_provider === 'youtube' ? 'YouTube' : 'Material existente'}</p></div></div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label={`Mover ${lesson.title} para cima`} disabled={index === 0 || busy} onClick={() => void moveLesson(trail, index, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label={`Mover ${lesson.title} para baixo`} disabled={index === trail.lessons.length - 1 || busy} onClick={() => void moveLesson(trail, index, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label={`Editar ${lesson.title}`} onClick={() => setLessonDraft({ id: lesson.id, trail_id: trail.id, title: lesson.title, cover_image_url: lesson.cover_image_url ?? '', video_provider: lesson.video_provider ?? 'youtube', video_input: lesson.video_url || lesson.video_id || '', video_library_id: lesson.video_library_id ?? '', existingMaterial: !lesson.video_provider })}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label={`Excluir ${lesson.title}`} disabled={busy} onClick={() => confirmDeleteLesson(lesson)}><Trash2 className="h-4 w-4 text-[var(--danger)]" /></Button>
          </div>
        </li>)}</ol> : <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-muted">Esta trilha ainda não tem aulas.</p>}
      </CardBody>
    </Card>)}</div> : <Card><CardBody><EmptyState title="Nenhuma trilha cadastrada" description="Crie uma trilha para organizar as aulas de treinamento." /></CardBody></Card>}

    <Modal open={Boolean(trailDraft)} title={trailDraft?.id ? 'Editar trilha' : 'Nova trilha'} onClose={() => setTrailDraft(null)} closeDisabled={saveTrail.isPending} footer={<><Button variant="secondary" disabled={saveTrail.isPending} onClick={() => setTrailDraft(null)}>Cancelar</Button><Button isLoading={saveTrail.isPending} disabled={!trailDraft?.title.trim()} onClick={() => trailDraft && saveTrail.mutate(trailDraft)}>Salvar trilha</Button></>}>
      {trailDraft ? <div className="space-y-4"><label className="grid gap-2 text-sm font-semibold text-ink">Título<input className="design-input h-11 px-3" value={trailDraft.title} onChange={(event) => setTrailDraft({ ...trailDraft, title: event.target.value })} maxLength={160} autoFocus /></label><ImagePicker label="Capa da trilha" value={trailDraft.cover_image_url} onChange={(value) => setTrailDraft({ ...trailDraft, cover_image_url: value })} onFileSelect={(file) => upload.mutate(file)} isUploading={upload.isPending} /></div> : null}
    </Modal>
    <Modal open={Boolean(lessonDraft)} title={lessonDraft?.id ? 'Editar aula' : 'Nova aula'} subtitle="As aulas seguem esta ordem em todo o treinamento." onClose={() => setLessonDraft(null)} closeDisabled={saveLesson.isPending} footer={<><Button variant="secondary" disabled={saveLesson.isPending} onClick={() => setLessonDraft(null)}>Cancelar</Button><Button isLoading={saveLesson.isPending} disabled={!lessonDraft?.title.trim() || (!lessonDraft.existingMaterial && !lessonDraft.video_input.trim())} onClick={() => lessonDraft && saveLesson.mutate(lessonDraft)}>Salvar aula</Button></>}>
      {lessonDraft ? <div className="space-y-4">
        <label className="grid gap-2 text-sm font-semibold text-ink">Trilha<select className="design-input h-11 px-3" value={lessonDraft.trail_id} onChange={(event) => setLessonDraft({ ...lessonDraft, trail_id: event.target.value })}>{trails.map((trail) => <option key={trail.id} value={trail.id}>{trail.title}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold text-ink">Título<input className="design-input h-11 px-3" value={lessonDraft.title} onChange={(event) => setLessonDraft({ ...lessonDraft, title: event.target.value })} maxLength={160} autoFocus /></label>
        <ImagePicker label="Capa da aula" value={lessonDraft.cover_image_url} onChange={(value) => setLessonDraft({ ...lessonDraft, cover_image_url: value })} onFileSelect={(file) => upload.mutate(file)} isUploading={upload.isPending} />
        <label className="grid gap-2 text-sm font-semibold text-ink">Provedor de vídeo<select className="design-input h-11 px-3" value={lessonDraft.video_provider} onChange={(event) => setLessonDraft({ ...lessonDraft, video_provider: event.target.value as 'youtube' | 'panda' })}><option value="youtube">YouTube</option><option value="panda">Panda Video</option></select></label>
        <label className="grid gap-2 text-sm font-semibold text-ink">{lessonDraft.video_provider === 'youtube' ? 'URL ou ID do vídeo' : 'UUID ou URL de embed do vídeo'}<input className="design-input h-11 px-3" value={lessonDraft.video_input} onChange={(event) => setLessonDraft({ ...lessonDraft, video_input: event.target.value })} placeholder={lessonDraft.video_provider === 'youtube' ? 'https://youtu.be/…' : 'UUID do vídeo ou URL oficial de embed'} /></label>
        {lessonDraft.existingMaterial ? <p className="text-xs text-ink-muted">Deixe o vídeo vazio para preservar o material existente.</p> : null}
        {lessonDraft.video_provider === 'panda' ? <label className="grid gap-2 text-sm font-semibold text-ink">ID da biblioteca Panda<input className="design-input h-11 px-3" value={lessonDraft.video_library_id} onChange={(event) => setLessonDraft({ ...lessonDraft, video_library_id: event.target.value })} placeholder="vz-…" /><span className="text-xs font-normal text-ink-muted">Necessário ao informar somente o UUID. A URL oficial de embed já contém a biblioteca.</span></label> : null}
      </div> : null}
    </Modal>
  </div>
}
