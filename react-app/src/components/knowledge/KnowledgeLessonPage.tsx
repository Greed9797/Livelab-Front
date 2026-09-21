import { Bookmark, Check, ChevronLeft, Edit3, ExternalLink, Link2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../ui/Toast'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/States'
import { KnowledgeVideoEmbed } from './KnowledgeVideoEmbed'
import { safeExternalUrl, type KnowledgeAttachment, type KnowledgeMaterial } from '../../services/knowledge'
import { sanitizeKnowledgeMarkdown } from '../../services/knowledge-markdown'
import { FORMAT_LABEL, LEVEL_LABEL, TOPIC_LABEL, formatDuration } from '../../services/knowledge-training'
import type { TrainingCompleteResponse, TrainingLesson, TrainingLessonDetail } from '../../services/training'
import { formatDate } from '../../utils/format'
import clsx from 'clsx'

export function KnowledgeLessonPage({
  lesson,
  material,
  manager,
  headingRef,
  staleUpdate,
  onBack,
  onOpen,
  onEdit,
  onCopyLink,
  onComplete,
  onFollowResume,
  onBookmark,
  onOpenAttachment,
}: {
  lesson: TrainingLessonDetail
  material?: KnowledgeMaterial | null
  manager: boolean
  headingRef: React.RefObject<HTMLHeadingElement | null>
  staleUpdate?: { title: string; onOpen: () => void } | null
  onBack: () => void
  onOpen: (lessonId: string) => void
  onEdit?: () => void
  onCopyLink?: () => Promise<void> | void
  onComplete: () => Promise<TrainingCompleteResponse>
  onFollowResume?: (path: string) => void
  onBookmark: () => void
  onOpenAttachment?: (materialId: string, attachment: { id: string }) => void
}) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [resumePath, setResumePath] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const source = material ? safeExternalUrl(material.external_url) : null
  const html = sanitizeKnowledgeMarkdown(material?.content_markdown)
  const rawAttachments = material?.attachments ?? material?.anexos
  const attachments = Array.isArray(rawAttachments) ? rawAttachments as KnowledgeAttachment[] : []
  const hasVideo = Boolean(
    material && (
      (material.video_provider && material.video_provider !== 'none')
      || material.video_url
      || material.video_id
    ),
  )
  const reserveVideo = !hasVideo && (lesson.format === 'video' || Boolean(lesson.video_url || lesson.video_id || (lesson.video_provider && lesson.video_provider !== 'none')))
  const nextId = lesson.next_lesson_id
  const next = nextId ? lesson.outline.flatMap((module) => module.lessons).find((item) => item.id === nextId) : null
  const status = lesson.progress?.state ?? 'not_started'
  const objectives = lesson.objectives?.length ? lesson.objectives : (lesson.outcome ? [lesson.outcome] : [])
  const topic = lesson.topics?.[0]
  const completedRequired = lesson.outline.flatMap((module) => module.lessons).filter((item) => item.required !== false && item.progress?.state === 'completed').length
  const requiredTotal = lesson.outline.flatMap((module) => module.lessons).filter((item) => item.required !== false).length

  async function copy() {
    if (!onCopyLink) return
    await onCopyLink()
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function handleComplete() {
    if (status === 'completed' || completing) return
    setCompleting(true)
    try {
      const result = await onComplete()
      toast.push('Aula marcada como concluída.', 'success')
      if (result.resume_path) setResumePath(result.resume_path)
    } catch {
      toast.push('Não foi possível concluir a aula.', 'error')
    } finally {
      setCompleting(false)
    }
  }

  function originBadge() {
    if (lesson.content_available === false || !lesson.source?.origin) return 'Conteúdo pendente'
    return lesson.source.origin === 'unidade' ? 'Unidade' : 'Rede'
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" icon={ChevronLeft} onClick={onBack}>Voltar à trilha</Button>
        <p className="text-sm text-ink-muted">
          {lesson.trail.title}
          {lesson.module?.title ? ` / ${lesson.module.title}` : ''}
          {lesson.position_label ? ` / ${lesson.position_label}` : ''}
        </p>
      </div>
      <Card className="max-w-4xl">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {FORMAT_LABEL[lesson.format as keyof typeof FORMAT_LABEL] || lesson.format || 'Aula'}
                {topic ? ` · ${TOPIC_LABEL[topic as keyof typeof TOPIC_LABEL] || topic}` : ''}
              </p>
              <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold text-ink">{lesson.title}</h1>
              <p className="mt-2 text-sm text-ink-muted">
                {[
                  formatDuration(lesson.duration_minutes && lesson.duration_minutes > 0 ? lesson.duration_minutes : null),
                  lesson.difficulty ? (LEVEL_LABEL[lesson.difficulty as keyof typeof LEVEL_LABEL] || lesson.difficulty) : null,
                  lesson.updated_at || lesson.published_at ? `Atualizado em ${formatDate(lesson.updated_at || lesson.published_at || undefined)}` : null,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" icon={Bookmark} aria-pressed={Boolean(lesson.bookmarked)} onClick={onBookmark}>
                {lesson.bookmarked ? 'Salvo' : 'Salvar'}
              </Button>
              {onCopyLink ? <Button type="button" variant="secondary" icon={Link2} onClick={() => void copy()}>{copied ? 'Link copiado' : 'Copiar link'}</Button> : null}
              {manager && onEdit ? <Button type="button" variant="secondary" icon={Edit3} onClick={onEdit}>Editar</Button> : null}
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {staleUpdate ? (
            <div role="status" className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-ink">
              Há uma atualização mais recente sobre este tema.{' '}
              <button type="button" className="font-semibold text-brand underline-offset-2 hover:underline" onClick={staleUpdate.onOpen}>
                Ver {staleUpdate.title}
              </button>
            </div>
          ) : null}
          {hasVideo && material ? <KnowledgeVideoEmbed material={material} /> : reserveVideo ? <div className="aspect-video overflow-hidden rounded-2xl border border-line bg-black" aria-hidden /> : null}
          {source ? (
            <a className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-muted" href={source} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />Abrir material
            </a>
          ) : null}
          {attachments.length && onOpenAttachment && material ? (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <Button key={attachment.id} type="button" variant="secondary" onClick={() => onOpenAttachment(material.id, attachment)}>
                  {attachment.filename || attachment.original_name || 'PDF do material'}
                </Button>
              ))}
            </div>
          ) : null}
          <section>
            <h2 className="text-sm font-bold text-ink">O que você vai aprender</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-[var(--text-secondary)]">
              {objectives.length ? objectives.map((item) => <li key={item}>{item}</li>) : <li>Aplicar este material na próxima live ou operação.</li>}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-bold text-ink">Antes de começar</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-[var(--text-secondary)]">
              {lesson.prerequisites?.length ? lesson.prerequisites.map((item) => <li key={item}>{item}</li>) : <li>Nenhum pré-requisito.</li>}
            </ul>
          </section>
          {html ? (
            <article className="break-words text-sm leading-7 text-ink [&_a]:text-brand [&_a]:underline [&_h1]:mt-6 [&_h1]:text-2xl [&_h2]:mt-6 [&_h2]:text-xl [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-surface-muted [&_pre]:p-3 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <EmptyState title={source || attachments.length ? 'Use o vídeo ou os recursos acima' : 'Conteúdo ainda não disponível'} />
          )}
          <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted" aria-live="polite">
              {status === 'completed' ? 'Aula concluída' : 'Conclusão é explícita — abrir não marca como feita.'}
              {requiredTotal ? ` · Trilha ${completedRequired}/${requiredTotal}` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={status === 'completed' ? 'secondary' : 'primary'} icon={Check} onClick={() => void handleComplete()} disabled={status === 'completed' || completing} isLoading={completing}>
                {status === 'completed' ? 'Concluída' : 'Marcar como concluída'}
              </Button>
              {resumePath ? <Button type="button" variant="secondary" onClick={() => onFollowResume?.(resumePath)}>Ir para a próxima</Button> : null}
              {!resumePath && next ? <Button type="button" variant="secondary" onClick={() => onOpen(next.id)}>Próxima: {next.title}</Button> : null}
            </div>
          </div>
          {lesson.outline.length ? (
            <details className="rounded-2xl border border-line bg-surface-muted/40 p-4">
              <summary className="cursor-pointer text-sm font-bold text-ink">Sumário da trilha</summary>
              <ol className="mt-3 space-y-3">
                {lesson.outline.map((item) => (
                  <li key={item.id}>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{item.title}</p>
                    <ul className="mt-1 space-y-1">
                      {item.lessons.map((entry: TrainingLesson) => (
                        <li key={entry.id}>
                          <button type="button" className={clsx('text-left text-sm underline-offset-2 hover:underline', entry.id === lesson.id ? 'font-bold text-ink' : 'text-[var(--text-secondary)]')} onClick={() => onOpen(entry.id)}>
                            {entry.title}
                            <span className="ml-2 text-xs text-ink-muted">
                              {entry.progress?.state === 'completed' ? 'concluída' : entry.progress?.state === 'in_progress' ? 'em andamento' : 'não iniciada'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
          <Badge tone="neutral">{originBadge()}</Badge>
        </CardBody>
      </Card>
    </div>
  )
}
