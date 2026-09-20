import { Bookmark, Check, ChevronLeft, Edit3, ExternalLink, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/States'
import { KnowledgeVideoEmbed } from './KnowledgeVideoEmbed'
import { safeExternalUrl, sanitizeKnowledgeMarkdown, type KnowledgeAttachment } from '../../services/knowledge'
import {
  FORMAT_LABEL,
  LEVEL_LABEL,
  TOPIC_LABEL,
  formatDuration,
  nextTrailLesson,
  progressStatus,
  trailProgress,
  type CatalogLesson,
  type LearnerLessonState,
  type LearnerProgressContract,
  type TrainingTrail,
} from '../../services/knowledge-training'
import { formatDate } from '../../utils/format'
import clsx from 'clsx'

function AttachmentLink({ materialId, attachment, onOpen }: { materialId: string; attachment: { id: string; filename?: string; original_name?: string }; onOpen: (materialId: string, attachment: { id: string }) => void }) {
  const filename = attachment.filename || attachment.original_name || 'PDF do material'
  return (
    <Button type="button" variant="secondary" onClick={() => onOpen(materialId, attachment)}>
      {filename}
    </Button>
  )
}

export function KnowledgeLessonPage({
  lesson,
  catalog,
  trail,
  progress,
  state,
  manager,
  headingRef,
  staleUpdate,
  onBack,
  onOpen,
  onEdit,
  onCopyLink,
  onComplete,
  onBookmark,
  onOpened,
  onOpenAttachment,
}: {
  lesson: CatalogLesson
  catalog: CatalogLesson[]
  trail: TrainingTrail
  progress: LearnerProgressContract
  state?: LearnerLessonState
  manager: boolean
  headingRef: React.RefObject<HTMLHeadingElement | null>
  staleUpdate?: CatalogLesson | null
  onBack: () => void
  onOpen: (lesson: CatalogLesson) => void
  onEdit?: () => void
  onCopyLink?: () => Promise<void> | void
  onComplete: () => void
  onBookmark: () => void
  onOpened: () => void
  onOpenAttachment?: (materialId: string, attachment: { id: string }) => void
}) {
  const [copied, setCopied] = useState(false)
  const material = lesson.material
  const source = safeExternalUrl(material.external_url)
  const html = sanitizeKnowledgeMarkdown(material.content_markdown)
  const rawAttachments = material.attachments ?? material.anexos
  const attachments = Array.isArray(rawAttachments) ? rawAttachments as KnowledgeAttachment[] : []
  const trailIndex = trail.lessonIds.indexOf(lesson.id)
  const next = nextTrailLesson(lesson.id, trail, catalog)
  const trailState = trailProgress(trail, progress)
  const status = progressStatus(state)
  const module = trail.modules.find((item) => item.lessonIds.includes(lesson.id))
  const objectives = lesson.objective ? [lesson.objective] : []
  const updatedLabel = lesson.updatedAt || lesson.publishedAt

  useEffect(() => { onOpened() }, [lesson.id]) // open creates started_at once per aula, not on every parent render

  async function copy() {
    if (!onCopyLink) return
    await onCopyLink()
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" icon={ChevronLeft} onClick={onBack}>Voltar à trilha</Button>
        {trailIndex >= 0 ? (
          <p className="text-sm text-ink-muted">
            {trail.title}
            {module ? ` / ${module.title}` : ''}
            {` / Aula ${trailIndex + 1} de ${trail.lessonIds.length}`}
          </p>
        ) : <p className="text-sm text-ink-muted">Material rápido</p>}
      </div>
      <Card className="max-w-4xl">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {FORMAT_LABEL[lesson.format]}
                {lesson.topic ? ` · ${TOPIC_LABEL[lesson.topic]}` : ''}
              </p>
              <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold text-ink">{lesson.titulo}</h1>
              <p className="mt-2 text-sm text-ink-muted">
                {[formatDuration(lesson.durationMinutes), lesson.level ? LEVEL_LABEL[lesson.level] : null, updatedLabel ? `Atualizado em ${formatDate(updatedLabel)}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" icon={Bookmark} aria-pressed={Boolean(state?.bookmarked)} onClick={onBookmark}>
                {state?.bookmarked ? 'Salvo' : 'Salvar'}
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
              <button type="button" className="font-semibold text-brand underline-offset-2 hover:underline" onClick={() => onOpen(staleUpdate)}>
                Ver {staleUpdate.titulo}
              </button>
            </div>
          ) : null}
          <KnowledgeVideoEmbed material={material} />
          {source ? (
            <a className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-muted" href={source} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />Abrir material
            </a>
          ) : null}
          {attachments.length && onOpenAttachment ? (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <AttachmentLink key={attachment.id} materialId={material.id} attachment={attachment} onOpen={onOpenAttachment} />
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
              {lesson.prerequisites.length ? lesson.prerequisites.map((item) => <li key={item}>{item}</li>) : <li>Nenhum pré-requisito.</li>}
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
              {trail.lessonIds.length ? ` · Trilha ${trailState.completed}/${trailState.total}` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={status === 'completed' ? 'secondary' : 'primary'} icon={Check} onClick={onComplete} disabled={status === 'completed'}>
                {status === 'completed' ? 'Concluída' : 'Marcar como concluída'}
              </Button>
              {next ? <Button type="button" variant="secondary" onClick={() => onOpen(next)}>Próxima: {next.titulo}</Button> : null}
            </div>
          </div>
          {trail.lessonIds.length ? (
            <details className="rounded-2xl border border-line bg-surface-muted/40 p-4">
              <summary className="cursor-pointer text-sm font-bold text-ink">Sumário da trilha</summary>
              <ol className="mt-3 space-y-3">
                {trail.modules.map((item) => (
                  <li key={item.id}>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{item.title}</p>
                    <ul className="mt-1 space-y-1">
                      {item.lessonIds.map((id) => {
                        const entry = catalog.find((row) => row.id === id)
                        if (!entry) return null
                        const entryStatus = progressStatus(progress.lessons[id])
                        return (
                          <li key={id}>
                            <button type="button" className={clsx('text-left text-sm underline-offset-2 hover:underline', id === lesson.id ? 'font-bold text-ink' : 'text-[var(--text-secondary)]')} onClick={() => onOpen(entry)}>
                              {entry.titulo}
                              <span className="ml-2 text-xs text-ink-muted">
                                {entryStatus === 'completed' ? 'concluída' : entryStatus === 'in_progress' ? 'em andamento' : 'não iniciada'}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
          <Badge tone="neutral">{lesson.origin === 'network' ? 'Rede' : 'Unidade'}</Badge>
        </CardBody>
      </Card>
    </div>
  )
}
