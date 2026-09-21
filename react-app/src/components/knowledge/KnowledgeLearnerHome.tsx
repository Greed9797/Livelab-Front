import { Bookmark, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '../ui/PageHeader'
import { Button } from '../ui/Button'
import { Card, CardBody } from '../ui/Card'
import { EmptyState } from '../ui/States'
import { KnowledgeLessonCard } from './KnowledgeLessonCard'
import {
  FORMAT_LABEL,
  LEVEL_LABEL,
  ROLE_LABEL,
  TOPIC_LABEL,
  activeFilterCount,
  emptyTrainingFilters,
  formatDuration,
  type TrainingFilters,
  type TrainingLevel,
  type TrainingOrigin,
  type TrainingRole,
  type TrainingTopic,
} from '../../services/knowledge-training'
import { safeExternalUrl } from '../../services/knowledge'
import type { TrainingHome, TrainingLesson, TrainingTrail, TrainingUpdate } from '../../services/training'
import { formatDate } from '../../utils/format'

type LearnerTab = 'home' | 'trails' | 'library' | 'updates' | 'saved'

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {action && onAction ? <Button type="button" variant="ghost" onClick={onAction}>{action}</Button> : null}
    </div>
  )
}

function LessonGrid({ lessons, onOpen, onBookmark }: { lessons: TrainingLesson[]; onOpen: (lesson: TrainingLesson) => void; onBookmark: (lesson: TrainingLesson) => void }) {
  if (!lessons.length) return <EmptyState title="Nada neste recorte" description="Ajuste a busca ou os filtros para ver outras aulas." />
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {lessons.map((lesson) => (
        <KnowledgeLessonCard key={lesson.id} lesson={lesson} onOpen={() => onOpen(lesson)} onBookmark={() => onBookmark(lesson)} />
      ))}
    </div>
  )
}

function FilterFields({ filters, onChange }: { filters: TrainingFilters; onChange: (next: TrainingFilters) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="grid gap-1 text-xs font-semibold text-ink-muted">Função
        <select className="design-input h-11 px-3 text-sm" value={filters.role} onChange={(event) => onChange({ ...filters, role: event.target.value as TrainingRole | '' })}>
          <option value="">Todas</option>
          {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink-muted">Nível
        <select className="design-input h-11 px-3 text-sm" value={filters.level} onChange={(event) => onChange({ ...filters, level: event.target.value as TrainingLevel | '' })}>
          <option value="">Todos</option>
          {Object.entries(LEVEL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink-muted">Tema
        <select className="design-input h-11 px-3 text-sm" value={filters.topic} onChange={(event) => onChange({ ...filters, topic: event.target.value as TrainingTopic | '' })}>
          <option value="">Todos</option>
          {Object.entries(TOPIC_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink-muted">Plataforma
        <select className="design-input h-11 px-3 text-sm" value={filters.platform} onChange={(event) => onChange({ ...filters, platform: event.target.value as TrainingFilters['platform'] })}>
          <option value="">Todas</option>
          <option value="tiktok">TikTok</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink-muted">Formato
        <select className="design-input h-11 px-3 text-sm" value={filters.format} onChange={(event) => onChange({ ...filters, format: event.target.value as TrainingFilters['format'] })}>
          <option value="">Todos</option>
          {Object.entries({ ...FORMAT_LABEL, checklist: 'Checklist' }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink-muted">Origem
        <select className="design-input h-11 px-3 text-sm" value={filters.origin} onChange={(event) => onChange({ ...filters, origin: event.target.value as TrainingOrigin | '' })}>
          <option value="">Todas</option>
          <option value="unit">Unidade</option>
          <option value="network">Rede</option>
        </select>
      </label>
    </div>
  )
}

function UpdateCard({ item, onOpen }: { item: TrainingUpdate; onOpen?: () => void }) {
  const actionable = Boolean(item.lesson_id || item.source?.slug)
  const body = (
    <>
      <p className="text-xs font-bold uppercase text-ink-muted">
        {item.kind === 'atualizado' || item.freshness === 'atualizado' ? 'Atualizado' : item.kind === 'atualizacao' ? 'Atualização' : 'Novo'}
        {item.published_at || item.effective_on ? ` · ${formatDate(item.effective_on || item.published_at || undefined)}` : ''}
      </p>
      <p className="mt-1 text-lg font-bold text-ink">{item.title}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]"><span className="font-semibold text-ink">O que mudou:</span> {item.what_changed || 'Revisão publicada na Base.'}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]"><span className="font-semibold text-ink">O que fazer hoje:</span> {item.what_to_do_today || 'Releia a aula ligada e aplique na próxima live.'}</p>
      <p className="mt-2 text-xs text-ink-muted">
        Vigência {formatDate(item.effective_on || item.published_at || undefined)}
        · Função {item.audience_roles?.[0] ? (ROLE_LABEL[item.audience_roles[0] as TrainingRole] || item.audience_roles[0]) : 'equipe'}
      </p>
      {!actionable ? <p className="mt-2 text-xs font-semibold text-ink-muted">Card informativo — sem aula vinculada.</p> : null}
    </>
  )
  if (!actionable) {
    return <div className="rounded-2xl border border-line bg-surface p-4">{body}</div>
  }
  return (
    <button type="button" onClick={onOpen} className="block w-full rounded-2xl border border-line bg-surface p-4 text-left">
      {body}
    </button>
  )
}

function matchesLesson(lesson: TrainingLesson, filters: TrainingFilters, search: string) {
  const query = search.trim().toLowerCase()
  if (query) {
    const haystack = [lesson.title, lesson.excerpt, lesson.outcome, ...(lesson.objectives ?? [])].join(' ').toLowerCase()
    if (!haystack.includes(query)) return false
  }
  if (filters.role && !(lesson.audience_roles ?? []).includes(filters.role) && (lesson.audience_roles ?? []).length) return false
  if (filters.level && lesson.difficulty && lesson.difficulty !== filters.level) return false
  if (filters.topic && !(lesson.topics ?? []).includes(filters.topic)) return false
  if (filters.platform && !(lesson.platforms ?? []).includes(filters.platform)) return false
  if (filters.format && lesson.format && lesson.format !== filters.format) return false
  if (filters.origin === 'unit' && lesson.source?.origin && lesson.source.origin !== 'unidade') return false
  if (filters.origin === 'network' && lesson.source?.origin && lesson.source.origin !== 'rede') return false
  return true
}

export function KnowledgeLearnerHome({
  tab,
  onTab,
  home,
  trails,
  bookmarks,
  manager,
  search,
  onSearch,
  filters,
  onFilters,
  onOpen,
  onOpenPath,
  onBookmark,
  onAdmin,
}: {
  tab: LearnerTab
  onTab: (tab: LearnerTab) => void
  home: TrainingHome
  trails: TrainingTrail[]
  bookmarks: TrainingLesson[]
  manager: boolean
  search: string
  onSearch: (value: string) => void
  filters: TrainingFilters
  onFilters: (next: TrainingFilters) => void
  onOpen: (lesson: TrainingLesson, trailSlug?: string) => void
  onOpenPath: (path: string) => void
  onBookmark: (lesson: TrainingLesson) => void
  onAdmin?: () => void
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const continueLesson = home.continue_learning
  const starter = home.starter_trail || home.start_here
  const catalog = useMemo(() => {
    const byId = new Map<string, TrainingLesson>()
    for (const trail of trails) {
      for (const module of trail.modules ?? []) {
        for (const lesson of module.lessons ?? []) byId.set(lesson.id, { ...lesson, trail: { slug: trail.slug, title: trail.title } })
      }
    }
    for (const lesson of [...home.recommended, ...home.featured]) byId.set(lesson.id, lesson)
    return [...byId.values()]
  }, [home.featured, home.recommended, trails])
  const filtered = catalog.filter((lesson) => matchesLesson(lesson, filters, search))
  const selectedFilters = activeFilterCount(filters)
  const resume = continueLesson || (starter?.modules?.[0]?.lessons?.[0] ?? null)
  const resumeCoverUrl = resume ? safeExternalUrl(resume.cover_image_url) : null
  const roleLabel = ROLE_LABEL[home.audience as TrainingRole] || home.audience

  function openUpdate(item: TrainingUpdate) {
    if (item.lesson_id) {
      onOpen({
        id: item.lesson_id,
        title: item.title,
        progress: { state: 'not_started', started_at: null, last_opened_at: null, completed_at: null },
      }, starter?.slug)
      return
    }
    if (item.official_url) onOpenPath(item.official_url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={home.title || 'Base de treinamento TikTok'}
        subtitle="Aulas curtas para a próxima live: continue de onde parou, siga a trilha inicial e veja o que mudou."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={tab === 'saved' ? 'primary' : 'secondary'} icon={Bookmark} onClick={() => onTab('saved')}>Salvos</Button>
            {manager && onAdmin ? <Button type="button" variant="secondary" onClick={onAdmin}>Administrar Base</Button> : null}
          </div>
        )}
      />
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input aria-label="Buscar aulas e atualizações" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar aulas e atualizações…" className="design-input h-11 w-full pl-10 pr-4" />
      </label>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Seções da Base">
        {([
          ['home', 'Início'],
          ['trails', 'Trilhas'],
          ['library', 'Biblioteca'],
          ['updates', 'Atualizações'],
        ] as const).map(([value, label]) => (
          <Button key={value} type="button" role="tab" aria-selected={tab === value} variant={tab === value ? 'primary' : 'secondary'} onClick={() => onTab(value)}>{label}</Button>
        ))}
      </div>

      {tab === 'home' ? (
        <div className="space-y-8">
          {resume ? (
            <Card>
              <CardBody className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <button type="button" onClick={() => (home.resume.path ? onOpenPath(home.resume.path) : onOpen(resume, starter?.slug))} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-muted lg:max-w-sm">
                  {resumeCoverUrl
                    ? <img src={resumeCoverUrl} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full items-end bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_42%,#1a120e),#1f1814)] p-4 text-sm font-bold text-white">{resume.title}</div>}
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{home.resume.has_started ? 'Continuar aprendendo' : 'Comece aqui'}</p>
                  <h2 className="text-xl font-bold text-ink">{resume.title}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">{resume.outcome || resume.excerpt}</p>
                  <p className="text-sm text-ink-muted">
                    {continueLesson?.trail?.title || starter?.title}
                    {continueLesson?.required_lessons ? ` · ${continueLesson.completed_lessons}/${continueLesson.required_lessons} aulas` : starter?.required_lessons ? ` · ${starter.completed_lessons}/${starter.required_lessons} aulas` : ''}
                    {formatDuration(resume.duration_minutes && resume.duration_minutes > 0 ? resume.duration_minutes : null) ? ` · ${formatDuration(resume.duration_minutes!)}` : ''}
                  </p>
                  <Button type="button" onClick={() => (home.resume.path ? onOpenPath(home.resume.path) : onOpen(resume, starter?.slug))}>
                    {home.resume.has_started ? 'Continuar' : 'Começar'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <EmptyState title="Ainda não há aulas publicadas" description="Quando a trilha inicial for publicada, ela aparece aqui." />
          )}

          <section className="space-y-3">
            <SectionHeader title="Recomendado para você" action="Ver tudo" onAction={() => onTab('library')} />
            <p className="text-sm text-ink-muted">Seleção pela sua função: {roleLabel}. Sem ranking de popularidade.</p>
            <LessonGrid lessons={home.recommended.slice(0, 3)} onOpen={(lesson) => onOpen(lesson, starter?.slug)} onBookmark={onBookmark} />
          </section>

          <section className="space-y-3">
            <SectionHeader title="Trilha essencial" action="Ver todas" onAction={() => onTab('trails')} />
            {starter ? (
              <button type="button" onClick={() => onTab('trails')} className="w-full rounded-2xl border border-line bg-surface p-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
                <p className="text-base font-bold text-ink">{starter.title}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{starter.outcome}</p>
                <p className="mt-2 text-sm text-ink-muted">{starter.module_count ?? starter.modules?.length ?? 0} módulos · {starter.required_lessons ?? starter.lesson_count ?? 0} aulas · {starter.completed_lessons ?? 0}/{starter.required_lessons ?? starter.lesson_count ?? 0}</p>
              </button>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-ink">Explorar</h2>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" icon={SlidersHorizontal} onClick={() => setSheetOpen(true)}>
                  Filtros{selectedFilters ? ` (${selectedFilters})` : ''}
                </Button>
                {selectedFilters ? <Button type="button" variant="ghost" onClick={() => onFilters(emptyTrainingFilters)}>Limpar filtros</Button> : null}
              </div>
            </div>
            <div className="hidden lg:block"><FilterFields filters={filters} onChange={onFilters} /></div>
            <p className="text-sm text-ink-muted" aria-live="polite">{filtered.length} aulas neste recorte</p>
            <LessonGrid lessons={filtered.slice(0, 6)} onOpen={(lesson) => onOpen(lesson, lesson.trail?.slug || starter?.slug)} onBookmark={onBookmark} />
          </section>

          <section className="space-y-3">
            <SectionHeader title="Novidades e atualizações" action="Ver todas" onAction={() => onTab('updates')} />
            {home.updates.length
              ? home.updates.slice(0, 3).map((item) => (
                <UpdateCard key={item.id} item={item} onOpen={() => openUpdate(item)} />
              ))
              : <p className="text-sm text-ink-muted">Nenhuma atualização datada neste mês. Datas vêm de publicação ou revisão real.</p>}
          </section>

          <section className="space-y-3">
            <SectionHeader title="Destaques da LiveLab" />
            <LessonGrid lessons={home.featured} onOpen={(lesson) => onOpen(lesson, starter?.slug)} onBookmark={onBookmark} />
          </section>
        </div>
      ) : null}

      {tab === 'trails' ? (
        <div className="space-y-4">
          {(trails.length ? trails : starter ? [starter] : []).map((trail) => (
            <Card key={trail.id || trail.slug}>
              <CardBody className="space-y-3">
                <h2 className="text-xl font-bold text-ink">{trail.title}</h2>
                <p className="text-sm text-[var(--text-secondary)]">{trail.outcome}</p>
                <p className="text-sm text-ink-muted">{trail.modules?.length ?? 0} módulos · {trail.completed_lessons ?? 0}/{trail.required_lessons ?? trail.lesson_count ?? 0} aulas obrigatórias</p>
                <ol className="space-y-4">
                  {(trail.modules ?? []).map((module) => (
                    <li key={module.id} className="space-y-2">
                      <p className="text-sm font-bold text-ink">{module.title}</p>
                      <LessonGrid lessons={module.lessons} onOpen={(lesson) => onOpen(lesson, trail.slug)} onBookmark={onBookmark} />
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'library' ? (
        <div className="space-y-4">
          <FilterFields filters={filters} onChange={onFilters} />
          <p className="text-sm text-ink-muted" aria-live="polite">{filtered.length} aulas encontradas</p>
          <LessonGrid lessons={filtered} onOpen={(lesson) => onOpen(lesson, lesson.trail?.slug || starter?.slug)} onBookmark={onBookmark} />
        </div>
      ) : null}

      {tab === 'updates' ? (
        <div className="space-y-3">
          {home.updates.length
            ? home.updates.map((item) => (
              <UpdateCard key={item.id} item={item} onOpen={() => openUpdate(item)} />
            ))
            : <EmptyState title="Sem atualizações datadas" description="Materiais sem data de publicação ou revisão não entram como novidade." />}
        </div>
      ) : null}

      {tab === 'saved' ? (
        <LessonGrid lessons={bookmarks} onOpen={(lesson) => onOpen(lesson, lesson.trail?.slug || starter?.slug)} onBookmark={onBookmark} />
      ) : null}

      {sheetOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-label="Filtros">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Fechar filtros" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 space-y-4 rounded-t-3xl border border-line bg-surface p-4 pb-8">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-ink">Filtros {selectedFilters ? `(${selectedFilters})` : ''}</p>
              <Button type="button" size="icon" variant="ghost" aria-label="Fechar filtros" onClick={() => setSheetOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <FilterFields filters={filters} onChange={onFilters} />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onFilters(emptyTrainingFilters)}>Limpar tudo</Button>
              <Button type="button" onClick={() => setSheetOpen(false)}>Ver {filtered.length} aulas</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
