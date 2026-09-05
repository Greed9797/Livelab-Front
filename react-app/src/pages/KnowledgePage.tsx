import {
  ChevronLeft,
  ExternalLink,
  FileText,
  Play,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { ErrorState, LoadingState, EmptyState } from "../components/ui/States";
import { Button } from "../components/ui/Button";
import {
  getKnowledgeArticles,
  getKnowledgeCategories,
} from "../services/domain";
import {
  getKnowledgeArticle,
  safeExternalUrl,
  sanitizeKnowledgeMarkdown,
} from "../services/knowledge";
import { extractErrorMessage } from "../services/api";
import { asString } from "../utils/format";
import { QK } from "../services/query-keys";

const statusLabel = (status: unknown) =>
  ({ published: "Publicado", draft: "Rascunho", archived: "Arquivado" })[
    asString(status).toLowerCase()
  ] ?? "Disponível";

export function KnowledgePage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const articleHeading = useRef<HTMLHeadingElement>(null);
  const articleRef = params.get("artigo") ?? "";
  const categories = useQuery({
    queryKey: QK.knowledgeCategories,
    queryFn: getKnowledgeCategories,
  });
  const articles = useQuery({
    queryKey: QK.knowledgeArticles,
    queryFn: () => getKnowledgeArticles(),
  });
  const detail = useQuery({
    queryKey: ["knowledge-article", articleRef],
    queryFn: () => getKnowledgeArticle(articleRef),
    enabled: Boolean(articleRef),
  });
  const categoryRows = categories.data ?? [];
  const rows = articles.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter(
      (a) =>
        (!category ||
          asString(a.category_id) === category ||
          asString(a.category_slug) === category) &&
        (!term ||
          `${asString(a.titulo ?? a.title)} ${asString(a.excerpt ?? a.resumo)} ${Array.isArray(a.tags) ? a.tags.join(" ") : ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(term)),
    );
  }, [rows, category, search]);
  const open = (ref: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("artigo", ref);
      return next;
    });
  const back = () =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("artigo");
      return next;
    });
  useEffect(() => {
    if (articleRef && detail.isSuccess) articleHeading.current?.focus();
  }, [articleRef, detail.isSuccess]);
  if (articleRef) {
    if (detail.isLoading)
      return (
        <div className="space-y-5">
          <Button
            type="button"
            variant="ghost"
            icon={ChevronLeft}
            onClick={back}
          >
            Voltar aos artigos
          </Button>
          <LoadingState label="Abrindo artigo" />
        </div>
      );
    if (detail.isError)
      return (
        <div className="space-y-5">
          <Button
            type="button"
            variant="ghost"
            icon={ChevronLeft}
            onClick={back}
          >
            Voltar aos artigos
          </Button>
          <ErrorState
            message={extractErrorMessage(detail.error)}
            onRetry={() => void detail.refetch()}
          />
        </div>
      );
    const a = detail.data!;
    const source = safeExternalUrl(a.url);
    const video = safeExternalUrl(a.video_url);
    const html = sanitizeKnowledgeMarkdown(a.content_markdown);
    return (
      <div className="space-y-5">
        <Button type="button" variant="ghost" icon={ChevronLeft} onClick={back}>
          Voltar aos artigos
        </Button>
        <Card className="max-w-4xl">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {asString(a.category_name, "Base de conhecimento")} ·{" "}
              {statusLabel(a.status)}
            </p>
            <h1
              ref={articleHeading}
              tabIndex={-1}
              className="mt-1 text-2xl font-bold text-ink"
            >
              {asString(a.titulo ?? a.title, "Artigo")}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              {asString(a.excerpt ?? a.resumo, "")}
            </p>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {source ? (
                <a
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Documentação original
                </a>
              ) : null}
              {video ? (
                <a
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
                  href={video}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Play className="h-4 w-4" />
                  Abrir vídeo
                </a>
              ) : null}
            </div>
            {html ? (
              <article
                className="mt-6 break-words text-sm leading-7 text-ink [&_a]:text-brand [&_a]:underline [&_h1]:mt-6 [&_h1]:text-2xl [&_h2]:mt-6 [&_h2]:text-xl [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-surface-muted [&_pre]:p-3 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-6"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <EmptyState
                title={
                  source
                    ? "Acesse o material pelo link acima"
                    : "Conteúdo ainda não disponível"
                }
              />
            )}
          </CardBody>
        </Card>
      </div>
    );
  }
  if (categories.isLoading || articles.isLoading) return <LoadingState />;
  if (categories.isError)
    return (
      <ErrorState
        message={extractErrorMessage(categories.error)}
        onRetry={() => void categories.refetch()}
      />
    );
  if (articles.isError)
    return (
      <ErrorState
        message={extractErrorMessage(articles.error)}
        onRetry={() => void articles.refetch()}
      />
    );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Conhecimento Livelab"
        subtitle="Encontre orientações operacionais e materiais publicados."
      />
      <Card>
        <CardBody className="space-y-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              aria-label="Buscar artigos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, resumo ou tag"
              className="design-input h-11 w-full pl-10 pr-4"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              aria-pressed={!category}
              variant={category ? "secondary" : "primary"}
              onClick={() => setCategory("")}
            >
              Todas
            </Button>
            {categoryRows.map((c, i) => {
              const id = asString(c.id) || asString(c.slug);
              return (
                <Button
                  key={id || String(i)}
                  type="button"
                  aria-pressed={category === id}
                  variant={category === id ? "primary" : "secondary"}
                  onClick={() => setCategory(id)}
                >
                  {asString(c.nome ?? c.name, "Categoria")}
                </Button>
              );
            })}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <p className="text-sm font-bold text-ink">Artigos</p>
          <p className="mt-1 text-sm text-ink-muted">
            {filtered.length} encontrado(s)
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          {filtered.length ? (
            filtered.map((a, i) => {
              const ref = asString(a.slug, "") || asString(a.id, "");
              return ref ? (
                <button
                  key={asString(a.id, String(i))}
                  type="button"
                  onClick={() => open(ref)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-line bg-surface-muted/50 p-4 text-left transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <span>
                    <span className="block font-bold text-ink">
                      {asString(a.titulo ?? a.title, "Artigo")}
                    </span>
                    {asString(a.excerpt ?? a.resumo) ? (
                      <span className="mt-1 block text-sm text-ink-muted">
                        {asString(a.excerpt ?? a.resumo)}
                      </span>
                    ) : null}
                    <span className="mt-2 block text-xs text-ink-muted">
                      {asString(a.category_name, "Sem categoria")} ·{" "}
                      {statusLabel(a.status)}
                      {a.estimated_read_minutes
                        ? ` · ${a.estimated_read_minutes} min de leitura`
                        : ""}
                    </span>
                  </span>
                </button>
              ) : null;
            })
          ) : (
            <EmptyState
              title="Nenhum artigo encontrado"
              description="Ajuste a busca ou escolha outra categoria."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
