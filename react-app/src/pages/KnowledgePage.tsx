import { BookOpen, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ErrorState, LoadingState } from '../components/ui/States'
import { getKnowledgeArticles, getKnowledgeCategories } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asString } from '../utils/format'

export function KnowledgePage() {
  const categories = useQuery({ queryKey: ['knowledge-categories'], queryFn: getKnowledgeCategories })
  const articles = useQuery({ queryKey: ['knowledge-articles'], queryFn: () => getKnowledgeArticles() })

  if (categories.isLoading || articles.isLoading) return <LoadingState />
  if (categories.isError) return <ErrorState message={extractErrorMessage(categories.error)} onRetry={() => void categories.refetch()} />
  if (articles.isError) return <ErrorState message={extractErrorMessage(articles.error)} onRetry={() => void articles.refetch()} />

  const categoryRows = categories.data ?? []
  const articleRows = articles.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Base" accent="Conhecimento" title="Livelab" subtitle="Categorias, artigos e materiais disponíveis para os papéis autorizados." />

      {categoryRows.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {categoryRows.map((category, index) => (
            <Card key={asString(category.id, String(index))}>
              <CardBody>
                <BookOpen className="h-5 w-5 text-brand" />
                <p className="mt-4 text-base font-bold text-ink">{asString(category.nome ?? category.title ?? category.name)}</p>
                <p className="mt-2 text-sm text-ink-muted">{asString(category.descricao ?? category.description, '')}</p>
              </CardBody>
            </Card>
          ))}
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <p className="text-sm font-bold text-ink">Artigos recentes</p>
        </CardHeader>
        <CardBody className="space-y-3">
          {articleRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
              Nenhum conteúdo publicado ainda.
            </p>
          ) : null}
          {articleRows.map((article, index) => (
            <div key={asString(article.id, String(index))} className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface-muted/50 p-4">
              <div className="flex gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-brand" />
                <div>
                  <p className="font-bold text-ink">{asString(article.titulo ?? article.title)}</p>
                  <p className="mt-1 text-sm text-ink-muted">{asString(article.resumo ?? article.excerpt ?? article.slug, '')}</p>
                </div>
              </div>
              <Badge tone="neutral">{asString(article.status ?? 'publicado')}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
