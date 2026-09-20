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
  featuredLessons,
  formatDuration,
  lessonMatchesFilters,
  recommendLessons,
  trailProgress,
  updateLessons,
  type CatalogLesson,
  type LearnerProgressContract,
  type TrainingFilters,
  type TrainingLevel,
  type TrainingOrigin,
  type TrainingRole,
  type TrainingTopic,
  type TrainingTrail,
} from '../../services/knowledge-training'
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

function LessonGrid({ lessons, progress, onOpen, onBookmark }: { lessons: CatalogLesson[]; progress: LearnerProgressContract; onOpen: (lesson: CatalogLesson) => void; onBookmark: (lesson: CatalogLesson) => void }) {
  if (!lessons.length) return <EmptyState title="Nada neste recorte" description="Ajuste a busca ou os filtros para ver outras aulas." />
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {lessons.map((lesson) => (
        <KnowledgeLessonCard
          key={`${lesson.origin}-${lesson.id}`}
          lesson={lesson}
          state={progress.lessons[lesson.id]}
          onOpen={() => onOpen(lesson)}
          onBookmark={() => onBookmark(lesson)}
        />
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
          {Object.entries(FORMAT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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

export function KnowledgeLearnerHome({
  tab,
  onTab,
  catalog,
  published,
  trail,
  continueLesson,
  progress,
  role,
  manager,
  search,
  onSearch,
  filters,
  onFilters,
  onOpen,
  onBookmark,
  onAdmin,
}: {
  tab: LearnerTab
  onTab: (tab: LearnerTab) => void
  catalog: CatalogLesson[]
  published: CatalogLesson[]
  trail: TrainingTrail
  continueLesson: CatalogLesson | null
  progress: LearnerProgressContract
  role: TrainingRole
  manager: boolean
  search: string
  onSearch: (value: string) => void
  filters: TrainingFilters
  onFilters: (next: TrainingFilters) => void
  onOpen: (lesson: CatalogLesson) => void
  onBookmark: (lesson: CatalogLesson) => void
  onAdmin?: () => void
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const hasHistory = Boolean(progress.last_opened_id || Object.values(progress.lessons).some((item) => item.started_at))
  const recommended = useMemo(() => recommendLessons(published, role), [published, role])
  const featured = useMemo(() => featuredLessons(published), [published])
  const updates = useMemo(() => updateLessons(published), [published])
  const filtered = useMemo(() => published.filter((lesson) => lessonMatchesFilters(lesson, { ...filters, q: search })), [filters, published, search])
  const saved = published.filter((lesson) => progress.lessons[lesson.id]?.bookmarked)
  const trailState = trailProgress(trail, progress)
  const trailLessons = trail.lessonIds.map((id) => published.find((lesson) => lesson.id === id)).filter((lesson): lesson is CatalogLesson => Boolean(lesson))
  const quick = published.filter((lesson) => !trail.lessonIds.includes(lesson.id)).slice(0, 6)
  const selectedFilters = activeFilterCount(filters)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Base de treinamento TikTok"
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
          {continueLesson ? (
            <Card>
              <CardBody className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <button type="button" onClick={() => onOpen(continueLesson)} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-muted lg:max-w-sm">
                  {continueLesson.coverUrl
                    ? <img src={continueLesson.coverUrl} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full items-end bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_42%,#1a120e),#1f1814)] p-4 text-sm font-bold text-white">{continueLesson.titulo}</div>}
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{hasHistory ? 'Continuar aprendendo' : 'Comece aqui'}</p>
                  <h2 className="text-xl font-bold text-ink">{continueLesson.titulo}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">{continueLesson.objective || continueLesson.excerpt}</p>
                  <p className="text-sm text-ink-muted">
                    {trail.title}
                    {trailState.total ? ` · ${trailState.completed}/${trailState.total} aulas` : ''}
                    {formatDuration(continueLesson.durationMinutes) ? ` · ${formatDuration(continueLesson.durationMinutes)}` : ''}
                  </p>
                  <Button type="button" onClick={() => onOpen(continueLesson)}>{hasHistory ? 'Continuar' : 'Começar'}</Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <EmptyState title="Ainda não há aulas publicadas" description="Quando a gestão publicar materiais, a trilha inicial aparece aqui." />
          )}

          <section className="space-y-3">
            <SectionHeader title="Recomendado para você" action="Ver tudo" onAction={() => onTab('library')} />
            <p className="text-sm text-ink-muted">Seleção pela sua função: {ROLE_LABEL[role]}. Sem ranking de popularidade.</p>
            <LessonGrid lessons={recommended.slice(0, 3)} progress={progress} onOpen={onOpen} onBookmark={onBookmark} />
          </section>

          <section className="space-y-3">
            <SectionHeader title="Trilha essencial" action="Ver todas" onAction={() => onTab('trails')} />
            <button type="button" onClick={() => onTab('trails')} className="w-full rounded-2xl border border-line bg-surface p-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
              <p className="text-base font-bold text-ink">{trail.title}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{trail.outcome}</p>
              <p className="mt-2 text-sm text-ink-muted">{trail.modules.length} módulos · {trailState.total} aulas · {trailState.completed}/{trailState.total}</p>
            </button>
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
            <LessonGrid lessons={filtered.slice(0, 6)} progress={progress} onOpen={onOpen} onBookmark={onBookmark} />
          </section>

          <section className="space-y-3">
            <SectionHeader title="Novidades e atualizações" action="Ver todas" onAction={() => onTab('updates')} />
            {updates.length ? updates.slice(0, 3).map((lesson) => (
              <button key={lesson.id} type="button" onClick={() => onOpen(lesson)} className="block w-full rounded-2xl border border-line bg-surface p-4 text-left">
                <p className="text-xs font-bold uppercase text-ink-muted">{lesson.freshness === 'novo' ? 'Novo' : 'Atualizado'} · {formatDate(lesson.updatedAt || lesson.publishedAt || undefined)}</p>
                <p className="mt-1 font-bold text-ink">{lesson.titulo}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{lesson.objective || lesson.excerpt}</p>
                <p className="mt-2 text-xs text-ink-muted">{lesson.role ? ROLE_LABEL[lesson.role] : 'Equipe'} · vigência {formatDate(lesson.publishedAt || lesson.updatedAt || undefined)}</p>
              </button>
            )) : <p className="text-sm text-ink-muted">Nenhuma atualização datada neste mês. Datas vêm de publicação ou revisão real.</p>}
          </section>

          <section className="space-y-3">
            <SectionHeader title="Destaques da LiveLab" />
            <LessonGrid lessons={featured} progress={progress} onOpen={onOpen} onBookmark={onBookmark} />
          </section>

          <section className="space-y-3">
            <SectionHeader title="Materiais rápidos" action="Ver tudo" onAction={() => onTab('library')} />
            <LessonGrid lessons={quick} progress={progress} onOpen={onOpen} onBookmark={onBookmark} />
          </section>
        </div>
      ) : null}

      {tab === 'trails' ? (
        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3">
              <h2 className="text-xl font-bold text-ink">{trail.title}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{trail.outcome}</p>
              <p className="text-sm text-ink-muted">{trail.modules.length} módulos · {trailState.completed}/{trailState.total} aulas obrigatórias</p>
              <ol className="space-y-4">
                {trail.modules.map((module) => (
                  <li key={module.id} className="space-y-2">
                    <p className="text-sm font-bold text-ink">{module.title}</p>
                    <LessonGrid
                      lessons={module.lessonIds.map((id) => catalog.find((lesson) => lesson.id === id)).filter((lesson): lesson is CatalogLesson => Boolean(lesson))}
                      progress={progress}
                      onOpen={onOpen}
                      onBookmark={onBookmark}
                    />
                  </li>
                ))}
              </ol>
              {!trailLessons.length ? <EmptyState title="A trilha inicial ainda não tem aulas" description="Publique materiais da unidade ou da rede para montar o percurso." /> : null}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === 'library' ? (
        <div className="space-y-4">
          <FilterFields filters={filters} onChange={onFilters} />
          <p className="text-sm text-ink-muted" aria-live="polite">{filtered.length} aulas encontradas</p>
          <LessonGrid lessons={filtered} progress={progress} onOpen={onOpen} onBookmark={onBookmark} />
        </div>
      ) : null}

      {tab === 'updates' ? (
        <div className="space-y-3">
          {updates.length ? updates.map((lesson) => (
            <button key={lesson.id} type="button" onClick={() => onOpen(lesson)} className="block w-full rounded-2xl border border-line bg-surface p-4 text-left">
              <p className="text-xs font-bold uppercase text-ink-muted">{lesson.freshness === 'novo' ? 'Novo' : 'Atualizado'} · {formatDate(lesson.updatedAt || lesson.publishedAt || undefined)}</p>
              <p className="mt-1 text-lg font-bold text-ink">{lesson.titulo}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]"><span className="font-semibold text-ink">O que mudou:</span> {lesson.excerpt || lesson.objective || 'Revisão do material publicado.'}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]"><span className="font-semibold text-ink">O que fazer hoje:</span> {lesson.objective || 'Releia a aula e aplique na próxima live.'}</p>
              <p className="mt-2 text-xs text-ink-muted">Vigência {formatDate(lesson.publishedAt || lesson.updatedAt || undefined)} · Função {lesson.role ? ROLE_LABEL[lesson.role] : 'equipe'}</p>
            </button>
          )) : <EmptyState title="Sem atualizações datadas" description="Materiais sem data de publicação ou revisão não entram como novidade." />}
        </div>
      ) : null}

      {tab === 'saved' ? (
        <LessonGrid lessons={saved} progress={progress} onOpen={onOpen} onBookmark={onBookmark} />
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
