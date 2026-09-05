import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { QK } from '../../services/query-keys'
import { getClienteBriefing, saveClienteBriefing } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { Button } from '../ui/Button'

interface BriefingSectionProps {
  clienteId: string
}

export function BriefingSection({ clienteId }: BriefingSectionProps) {
  const client = useQueryClient()
  const [conteudo, setConteudo] = useState('')
  const [preview, setPreview] = useState(false)
  const [dirty, setDirty] = useState(false)
  // `loaded` só vira true após o primeiro GET bem-sucedido. Gate essencial:
  // sem ele, um GET que falha deixaria a textarea vazia (sem erro visível) e o
  // Save (PUT = full-replace) apagaria o briefing já salvo. Também evita o flash
  // de textarea vazia quando o dado vem do cache. O componente é keyed por
  // clienteId no pai, então remonta e reseta este estado ao trocar de cliente.
  const [loaded, setLoaded] = useState(false)

  const query = useQuery({
    queryKey: QK.clienteBriefing(clienteId),
    queryFn: () => getClienteBriefing(clienteId),
  })

  useEffect(() => {
    if (!loaded && query.isSuccess) {
      setConteudo(query.data?.conteudo ?? '')
      setLoaded(true)
    }
  }, [loaded, query.isSuccess, query.data])

  const mutation = useMutation({
    mutationFn: () => saveClienteBriefing(clienteId, conteudo),
    onSuccess: () => {
      setDirty(false)
      client.invalidateQueries({ queryKey: QK.clienteBriefing(clienteId) })
    },
  })

  // mutation.data reflete o save na hora (footer atualiza antes do refetch chegar).
  const atualizado = mutation.data ?? query.data
  const html = preview ? DOMPurify.sanitize(marked.parse(conteudo, { async: false }) as string) : ''
  const labelId = `briefing-label-${clienteId}`

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface-muted p-4">
      <div className="flex items-center justify-between">
        <h3 id={labelId} className="text-sm font-bold text-ink">Briefing</h3>
        {loaded && !query.isError ? (
          <button type="button" className="text-xs font-semibold text-brand" onClick={() => setPreview((value) => !value)}>
            {preview ? 'Editar' : 'Preview'}
          </button>
        ) : null}
      </div>

      {query.isError ? (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
          <p className="text-sm text-[var(--danger)]">
            Não foi possível carregar o briefing. {extractErrorMessage(query.error)}
          </p>
          <button type="button" className="text-xs font-semibold text-brand" onClick={() => void query.refetch()}>
            Tentar de novo
          </button>
        </div>
      ) : !loaded ? (
        <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
      ) : preview ? (
        <div
          className="min-h-40 rounded-xl border border-line bg-surface p-3 text-sm text-ink [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand [&_a]:underline [&_h1]:text-base [&_h1]:font-bold [&_h2]:font-semibold"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <textarea
          className="design-input min-h-40 w-full px-4 py-3 text-sm"
          aria-labelledby={labelId}
          placeholder="Escreva o briefing do cliente em Markdown (**negrito**, - listas, [links](url))…"
          value={conteudo}
          onChange={(event) => {
            setConteudo(event.target.value)
            setDirty(true)
          }}
        />
      )}

      {loaded && !query.isError ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">
            {atualizado?.atualizado_por_nome
              ? `Atualizado por ${atualizado.atualizado_por_nome} em ${new Date(atualizado.atualizado_em).toLocaleString('pt-BR')}`
              : 'Ainda não preenchido'}
          </p>
          <Button
            type="button"
            isLoading={mutation.isPending}
            disabled={!dirty || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isSuccess && !dirty ? 'Salvo ✓' : 'Salvar'}
          </Button>
        </div>
      ) : null}

      {mutation.isError ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {extractErrorMessage(mutation.error)}
        </p>
      ) : null}
    </section>
  )
}
