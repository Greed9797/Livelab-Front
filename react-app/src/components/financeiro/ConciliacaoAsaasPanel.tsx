import { ArrowDownLeft, ArrowUpRight, Landmark, RefreshCcw, Scale, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MetricCard } from '../ui/MetricCard'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { useToast } from '../ui/Toast'
import {
  useAsaasConciliacao,
  useAsaasExtrato,
  useAsaasSaldo,
  useConciliarAsaas,
  useDesfazerConciliacaoAsaas,
  useSincronizarAsaas,
} from '../../hooks/useAsaasConciliacao'
import { extractErrorMessage } from '../../services/api'
import { useCurrentUser } from '../../stores/auth-store'
import { formatDate, formatMoney } from '../../utils/format'
import { alvoRotulo, motivoLabel, periodoDoMes, scoreTone, separarConciliadas, somaValores, tipoAlvoPadrao, valorComSinal } from '../../utils/asaas-conciliacao'
import { metric, moneyMetric } from '../../pages/page-helpers'
import type { AsaasPendente, AsaasSugestao, AsaasTransacao, TipoTransacao } from '../../types/asaas'

// Espelha WRITE_FINANCEIRO do back (leitura = demais papéis financeiros).
const writeRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'financeiro'])

function PendenteCard({
  item,
  canWrite,
  busyId,
  onConciliar,
}: {
  item: AsaasPendente
  canWrite: boolean
  busyId: string | null
  onConciliar: (item: AsaasPendente, s: AsaasSugestao) => void
}) {
  const entrada = item.tipo === 'entrada'
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{item.descricao || item.tipo_asaas || 'Transação Asaas'}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {formatDate(item.data)}{item.cliente_nome ? ` · ${item.cliente_nome}` : ''}{item.valor_bruto && item.valor_bruto !== item.valor ? ` · bruto ${formatMoney(item.valor_bruto, true)}` : ''}
          </p>
        </div>
        <p className={`num text-base font-bold ${entrada ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{formatMoney(valorComSinal(item), true)}</p>
      </div>
      {item.sugestoes.length === 0 ? (
        <p className="mt-3 text-xs text-ink-muted">Sem sugestões automáticas para esta transação.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {item.ambiguo ? <p className="text-xs font-semibold text-[var(--warning)]">Sugestões empatadas — confira antes de conciliar.</p> : null}
          {item.sugestoes.map((s) => (
            <div key={`${s.tipo}:${s.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  <Badge tone={scoreTone(s.score)} className="mr-2">{s.score}%</Badge>
                  {alvoRotulo(s.tipo, s.componente, s.id)} · {s.descricao || '—'}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {s.data_referencia ? `ref. ${formatDate(s.data_referencia)}` : 'sem data'}
                  {s.valor_casado != null ? ` · ${formatMoney(s.valor_casado, true)}` : ''}
                  {s.motivos.length ? ` · ${s.motivos.map(motivoLabel).join(', ')}` : ''}
                </p>
              </div>
              {canWrite ? (
                <Button className="h-9 min-h-11 sm:min-h-0" variant="secondary" isLoading={busyId === item.id} disabled={busyId !== null} onClick={() => onConciliar(item, s)}>
                  Conciliar
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ConciliacaoAsaasPanel({ mes }: { mes: string }) {
  const toast = useToast()
  const user = useCurrentUser()
  const canWrite = writeRoles.has(user?.papel ?? '')
  const [tipo, setTipo] = useState<TipoTransacao>('entrada')
  const faixa = periodoDoMes(mes) ?? { inicio: `${mes}-01`, fim: `${mes}-28` }

  const saldo = useAsaasSaldo()
  const extrato = useAsaasExtrato(faixa.inicio, faixa.fim)
  const conciliacao = useAsaasConciliacao(faixa.inicio, faixa.fim, tipo)
  const sincronizar = useSincronizarAsaas()
  const conciliar = useConciliarAsaas()
  const desfazer = useDesfazerConciliacaoAsaas()
  const busyId = conciliar.isPending ? (conciliar.variables?.transacao_id ?? null) : desfazer.isPending ? (desfazer.variables ?? null) : null

  const { conciliadas } = useMemo(() => separarConciliadas(extrato.data?.itens ?? []), [extrato.data])
  const pendentes = conciliacao.data?.itens ?? []

  function onSincronizar() {
    sincronizar.mutate(faixa, {
      onSuccess: (r) => toast.push(`Extrato sincronizado: ${r.inseridas} novas, ${r.atualizadas} atualizadas.`, 'success'),
      onError: (e) => toast.push(extractErrorMessage(e), 'error'),
    })
  }

  function onConciliar(item: AsaasPendente, s: AsaasSugestao) {
    conciliar.mutate(
      { transacao_id: item.id, tipo: s.tipo ?? tipoAlvoPadrao(item.tipo), id: s.id },
      {
        onSuccess: () => toast.push('Transação conciliada.', 'success'),
        onError: (e) => toast.push(extractErrorMessage(e), 'error'),
      },
    )
  }

  function onDesfazer(t: AsaasTransacao) {
    if (!t.id) return
    desfazer.mutate(t.id, {
      onSuccess: () => toast.push('Conciliação desfeita.', 'success'),
      onError: (e) => toast.push(extractErrorMessage(e), 'error'),
    })
  }

  const saldoMetric = saldo.isError
    ? metric('Saldo Asaas', '—', extractErrorMessage(saldo.error), 'neutral')
    : moneyMetric('Saldo Asaas', saldo.data?.saldo, saldo.data ? `consultado ${new Date(saldo.data.consultado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'consultando…', 'brand')
  const ex = extrato.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">Saldo, extrato e vínculo das entradas e saídas do Asaas com receitas e custos do sistema.</p>
        {canWrite ? <Button icon={RefreshCcw} onClick={onSincronizar} isLoading={sincronizar.isPending}>Sincronizar</Button> : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard metric={saldoMetric} icon={Landmark} />
        <MetricCard metric={moneyMetric('Entradas no mês', ex?.total_entradas, 'extrato sincronizado', 'success')} icon={ArrowDownLeft} />
        <MetricCard metric={moneyMetric('Saídas no mês', ex?.total_saidas, 'extrato sincronizado', 'danger')} icon={ArrowUpRight} />
        <MetricCard metric={metric('Conciliadas', `${conciliadas.length} / ${ex?.itens.length ?? 0}`, 'transações vinculadas', 'info')} icon={Scale} />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-bold text-ink">Pendências de conciliação</p>
            <div className="inline-flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Tipo de transação">
              {(['entrada', 'saida'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tipo === t}
                  onClick={() => setTipo(t)}
                  className={`h-11 rounded-full px-4 text-sm font-semibold transition sm:h-8 ${tipo === t ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:text-ink'}`}
                >
                  {t === 'entrada' ? 'Entradas' : 'Saídas'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {conciliacao.isLoading ? <LoadingState label="Carregando pendências" /> : null}
          {conciliacao.isError ? <ErrorState message={extractErrorMessage(conciliacao.error)} onRetry={() => void conciliacao.refetch()} /> : null}
          {conciliacao.data?.avisos.map((a) => <p key={a} className="rounded-xl bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]">{a}</p>)}
          {conciliacao.data && pendentes.length === 0 ? (
            <EmptyState title="Nada pendente" description={`Sem ${tipo === 'entrada' ? 'entradas' : 'saídas'} a conciliar neste mês. Use Sincronizar para buscar o extrato do Asaas.`} />
          ) : null}
          {conciliacao.data && pendentes.length > 0 ? (
            <>
              <p className="text-xs text-ink-muted">{pendentes.length} pendente(s) · {formatMoney(somaValores(pendentes), true)}</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {pendentes.map((p) => <PendenteCard key={p.id} item={p} canWrite={canWrite} busyId={busyId} onConciliar={onConciliar} />)}
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-base font-bold text-ink">Extrato do mês</p>
        </CardHeader>
        <CardBody>
          {extrato.isLoading ? <LoadingState label="Carregando extrato" /> : null}
          {extrato.isError ? <ErrorState message={extractErrorMessage(extrato.error)} onRetry={() => void extrato.refetch()} /> : null}
          {ex ? (
            <DataTable<AsaasTransacao>
              data={ex.itens}
              rowKey={(t) => t.id ?? t.asaas_id}
              columns={[
                { key: 'data', header: 'Data', render: (t) => formatDate(t.data) },
                { key: 'descricao', header: 'Descrição', render: (t) => t.descricao || t.tipo_asaas || '—' },
                { key: 'valor', header: 'Valor', align: 'right', render: (t) => <span className={`num font-semibold ${t.tipo === 'entrada' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{formatMoney(valorComSinal(t), true)}</span> },
                {
                  key: 'conciliado', header: 'Conciliação',
                  render: (t) => t.conciliado_com_id ? <Badge tone="success">{alvoRotulo(t.conciliado_com_tipo, t.conciliado_com_componente, t.conciliado_com_id)}</Badge> : <Badge tone="warning">Pendente</Badge>,
                },
                {
                  key: 'acoes', header: '', align: 'right',
                  render: (t) => canWrite && t.conciliado_com_id && t.id
                    ? <Button className="h-8 min-h-11 sm:min-h-0" variant="ghost" icon={Undo2} isLoading={busyId === t.id} disabled={busyId !== null} onClick={() => onDesfazer(t)}>Desfazer</Button>
                    : null,
                },
              ]}
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}
