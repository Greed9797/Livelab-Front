import { Bookmark } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { safeExternalUrl } from '../../services/knowledge'
import { FORMAT_LABEL, LEVEL_LABEL, TOPIC_LABEL, formatDuration } from '../../services/knowledge-training'
import type { TrainingLesson } from '../../services/training'
import clsx from 'clsx'

const FORMAT_FALLBACK: Record<string, string> = { ...FORMAT_LABEL, checklist: 'Checklist' }

function originBadge(lesson: TrainingLesson) {
  if (lesson.content_available === false || !lesson.source?.origin) return 'Conteúdo pendente'
  return lesson.source.origin === 'unidade' ? 'Unidade' : 'Rede'
}

function Cover({ lesson }: { lesson: TrainingLesson }) {
  const coverUrl = safeExternalUrl(lesson.cover_image_url)
  if (coverUrl) {
    return <img src={coverUrl} alt="" className="h-full w-full object-cover" />
  }
  return (
    <div className="flex h-full w-full items-end bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_42%,#1a120e),#1f1814)] p-3">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-white/90">{FORMAT_FALLBACK[lesson.format ?? ''] || 'Aula'}</span>
    </div>
  )
}

function statusLabel(state?: string) {
  if (state === 'completed') return 'Concluída'
  if (state === 'in_progress') return 'Em andamento'
  return 'Não iniciada'
}

export function KnowledgeLessonCard({
  lesson,
  onOpen,
  onBookmark,
}: {
  lesson: TrainingLesson
  onOpen: () => void
  onBookmark?: () => void
}) {
  const duration = formatDuration(lesson.duration_minutes && lesson.duration_minutes > 0 ? lesson.duration_minutes : null)
  const status = lesson.progress?.state ?? 'not_started'
  const progressPct = typeof lesson.progress_pct === 'number' ? lesson.progress_pct : null
  const topic = lesson.topics?.[0]
  const objective = lesson.objectives?.[0] || lesson.outcome || lesson.excerpt || 'Aula da Base de treinamento TikTok.'
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button type="button" onClick={onOpen} className="block w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
        <div className="relative aspect-video bg-surface-muted">
          <Cover lesson={lesson} />
          {lesson.freshness ? (
            <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              {lesson.freshness === 'novo' ? 'Novo' : 'Atualizado'}
            </span>
          ) : null}
        </div>
        <div className="space-y-2 p-4">
          <p className="text-base font-bold text-ink">{lesson.title}</p>
          <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">{objective}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            {duration ? <span>{duration}</span> : null}
            {lesson.difficulty ? <span>{LEVEL_LABEL[lesson.difficulty as keyof typeof LEVEL_LABEL] || lesson.difficulty}</span> : null}
            {topic ? <span>{TOPIC_LABEL[topic as keyof typeof TOPIC_LABEL] || topic}</span> : null}
            <span>{FORMAT_FALLBACK[lesson.format ?? ''] || 'Aula'}</span>
            <Badge tone="neutral">{originBadge(lesson)}</Badge>
          </div>
          <p className="text-xs font-semibold text-ink" aria-live="polite">{statusLabel(status)}</p>
          {progressPct !== null ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
            </div>
          ) : null}
        </div>
      </button>
      {onBookmark ? (
        <div className="flex justify-end border-t border-line px-2 py-1">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
            aria-label={lesson.bookmarked ? `Remover ${lesson.title} dos salvos` : `Salvar ${lesson.title}`}
            aria-pressed={Boolean(lesson.bookmarked)}
            onClick={onBookmark}
          >
            <Bookmark className={clsx('h-4 w-4', lesson.bookmarked && 'fill-current text-brand')} />
          </button>
        </div>
      ) : null}
    </article>
  )
}
