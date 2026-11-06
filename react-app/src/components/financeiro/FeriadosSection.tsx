import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ErrorState, LoadingState } from '../ui/States'
import { extractErrorMessage } from '../../services/api'
import { getHolidays, resetHoliday, saveHoliday, type Holiday } from '../../services/remuneration'
import { useCurrentUser } from '../../stores/auth-store'

const thClass = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted'
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function formatHolidayDate(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')} (${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]})`
}

// Feriado muda a comissão de 2% e o bônus de fds/feriado: invalida o fechamento junto.
export function FeriadosSection() {
  const client = useQueryClient()
  const user = useCurrentUser()
  const [ano, setAno] = useState(new Date().getFullYear())
  const [novo, setNovo] = useState({ data: '', nome: '' })
  const queryKey = ['feriados', user?.tenant_id ?? 'anonymous', ano] as const
  const query = useQuery({ queryKey, queryFn: () => getHolidays(ano) })
  const onSuccess = () => {
    void client.invalidateQueries({ queryKey: ['feriados'] })
    void client.invalidateQueries({ queryKey: ['financeiro-fechamento-apresentadoras'] })
  }
  const salvar = useMutation({
    mutationFn: ({ data, nome, ativo }: { data: string; nome: string; ativo: boolean }) => saveHoliday(data, { nome, ativo }),
    onSuccess: (_r, vars) => { onSuccess(); if (vars.data === novo.data) setNovo({ data: '', nome: '' }) },
  })
  const restaurar = useMutation({ mutationFn: resetHoliday, onSuccess })
  const erro = salvar.error ?? restaurar.error
  const podeEditar = query.data?.pode_editar ?? false
  const ocupado = salvar.isPending || restaurar.isPending

  const acoes = (f: Holiday) => {
    if (!podeEditar) return <span className="text-xs text-ink-muted">—</span>
    return (
      <div className="flex justify-end gap-2">
        {f.ativo ? (
          <Button variant="ghost" disabled={ocupado} onClick={() => salvar.mutate({ data: f.data, nome: f.nome, ativo: false })}>Desligar</Button>
        ) : f.origem === 'unidade' ? (
          <Button variant="ghost" disabled={ocupado} onClick={() => salvar.mutate({ data: f.data, nome: f.nome, ativo: true })}>Reativar</Button>
        ) : null}
        {f.ajustado ? (
          <Button variant="ghost" disabled={ocupado} onClick={() => restaurar.mutate(f.data)}>
            {f.origem === 'unidade' ? 'Excluir' : 'Restaurar'}
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-base font-bold text-ink">Feriados</p>
        <p className="mt-1 text-xs text-ink-muted">
          Live em sábado, domingo ou feriado paga 2% de comissão e R$100 de bônus a cada 4h. Feriados nacionais e de
          Blumenau já vêm do calendário; aqui a gestão acrescenta feriados da unidade ou desliga um do calendário.
          Mudar um feriado recalcula as comissões pendentes daquele mês.
        </p>
      </CardHeader>
      <CardBody className="p-0">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <input
            className="design-input h-10 w-28 px-3"
            type="number"
            aria-label="Ano"
            min={2020}
            max={2100}
            value={ano}
            onChange={(e) => { const v = Number(e.target.value); if (Number.isInteger(v) && v >= 2000 && v <= 2100) setAno(v) }}
          />
          {podeEditar ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (novo.data && novo.nome.trim()) salvar.mutate({ data: novo.data, nome: novo.nome.trim(), ativo: true })
              }}
            >
              <input className="design-input h-10 px-3" type="date" aria-label="Data do feriado" value={novo.data} onChange={(e) => setNovo((s) => ({ ...s, data: e.target.value }))} required />
              <input className="design-input h-10 px-3" type="text" aria-label="Nome do feriado" placeholder="Nome do feriado" maxLength={120} value={novo.nome} onChange={(e) => setNovo((s) => ({ ...s, nome: e.target.value }))} required />
              <Button type="submit" isLoading={salvar.isPending && salvar.variables?.data === novo.data}>Adicionar feriado</Button>
            </form>
          ) : null}
        </div>
        {erro ? (
          <p className="mx-4 mb-3 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(erro)}</p>
        ) : null}
        {query.isLoading ? (
          <LoadingState label="Carregando feriados" />
        ) : query.isError ? (
          <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className={`${thClass} text-left`}>Data</th>
                  <th className={`${thClass} text-left`}>Feriado</th>
                  <th className={`${thClass} text-left`}>Origem</th>
                  <th className={`${thClass} text-left`}>Situação</th>
                  <th className={`${thClass} text-right`}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(query.data?.items ?? []).map((f) => (
                  <tr key={f.data} className={f.ativo ? undefined : 'text-ink-muted'}>
                    <td className="num px-4 py-3">{formatHolidayDate(f.data)}</td>
                    <td className="px-4 py-3">{f.nome}</td>
                    <td className="px-4 py-3"><Badge tone={f.origem === 'unidade' ? 'brand' : 'neutral'}>{f.origem === 'unidade' ? 'Unidade' : 'Calendário'}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={f.ativo ? 'success' : 'warning'}>{f.ativo ? 'Conta como feriado' : 'Desligado'}</Badge></td>
                    <td className="px-4 py-3 text-right">{acoes(f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
