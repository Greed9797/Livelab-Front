import { AlertTriangle, Building2, CircleDollarSign, Crown, Download, MapPin, Percent, Receipt, TrendingUp, Users, WalletCards, Zap } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { LinePanel } from '../components/charts/Charts'
import { ReceitaWaterfall } from '../components/charts/ReceitaWaterfall'
import { FinanceiroHeroPanel } from '../components/dashboard/FinanceiroHeroPanel'
import { PeriodRangeControl } from '../components/forms/PeriodRangeControl'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { MoneyInput } from '../components/ui/MoneyInput'
import { createFinanceiroCusto, deleteFinanceiroCusto, getBoletos, getClienteOperacional, getComissoesApresentadoras, getComissoesMarcas, getComissoesResumo, getFinanceiroCustos, getFinanceiroFaturamento, getFinanceiroFluxo, getFinanceiroResumo, getFinanceiroFranqueadora, getMarcaOperacional } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { useCurrentUser } from '../stores/auth-store'
import { asArray, asNumber, asString, formatDate, formatMoney, getRecord } from '../utils/format'
import { parseBRMoneyToDecimal } from '../utils/money'
import { downloadCsv } from '../utils/exportCsv'
import {
  type PeriodRange,
  comissoesParams,
  custosCompetencia,
  defaultPeriodRange,
  financeiroParams,
  isValidPeriodRange,
  periodKey,
  periodRangeFromParams,
  periodRangeLabel,
  previousPeriodRange,
  writePeriodRangeToParams,
} from '../utils/period'
import { historyPoints, metric, moneyMetric } from './page-helpers'
import { BoletosPanel } from './BoletosPage'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

type FinanceiroTab = 'operacional' | 'cliente' | 'recebiveis' | 'boletos' | 'comissoes' | 'franqueadora'

const num = (value: unknown) => asNumber(value).toLocaleString('pt-BR')
const sumBy = (rows: JsonRecord[], ...keys: string[]) =>
  rows.reduce((total, row) => total + asNumber(keys.map((k) => row[k]).find((v) => v !== undefined)), 0)

// 'YYYY-MM-DD' → 'DD/MM' para o eixo X do fluxo de caixa (premium > ISO cru).
function dmLabel(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}/${match[2]}` : value
}

const TIPO_LABEL: Record<string, string> = {
  cliente_ecommerce: 'e-commerce',
  afiliada: 'afiliada',
  marca: 'marca',
  sem_marca: 'sem marca',
}
function tipoTone(tipo: string): 'brand' | 'info' | 'warning' | 'neutral' {
  if (tipo === 'cliente_ecommerce') return 'brand'
  if (tipo === 'afiliada') return 'info'
  if (tipo === 'marca') return 'warning'
  return 'neutral'
}

function TotalsBar({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-line pt-3 text-sm">
      {items.map((item) => (
        <span key={item.label} className="text-ink-muted">
          {item.label} <span className="num ml-1 font-bold text-ink">{item.value}</span>
        </span>
      ))}
    </div>
  )
}

export function FinanceiroPage() {
  const user = useCurrentUser()
  const isCliente = user?.papel === 'cliente_parceiro'
  const isMaster = user?.papel === 'franqueador_master'
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get('tab')
  const initialTab: FinanceiroTab = isCliente ? 'boletos' : requestedTab === 'boletos' || requestedTab === 'comissoes' ? requestedTab : 'operacional'
  const [tab, setTab] = useState<FinanceiroTab>(initialTab)

  // Período (mês único ou intervalo) — fonte de edição local + sync URL. Queries usam
  // o último período VÁLIDO (committed), então digitar fim<início não dispara fetch ruim.
  const [periodRange, setPeriodRangeState] = useState<PeriodRange>(() => periodRangeFromParams(params))
  const lastValid = useRef<PeriodRange>(isValidPeriodRange(periodRange) ? periodRange : defaultPeriodRange())
  if (isValidPeriodRange(periodRange)) lastValid.current = periodRange
  const committed = lastValid.current
  const prevPeriod = previousPeriodRange(committed)
  const pk = periodKey(committed)
  const fp = financeiroParams(committed)
  const cp = comissoesParams(committed)

  function setPeriodRange(next: PeriodRange) {
    setPeriodRangeState(next)
    if (isValidPeriodRange(next)) setParams(writePeriodRangeToParams(params, next), { replace: true })
  }

  const [custo, setCusto] = useState({ descricao: '', valor: '', tipo: 'outros', competencia: custosCompetencia(committed) })
  // Custos seguem por competência de UM mês — ao mudar o período, acompanham o mês final (editável).
  useEffect(() => {
    setCusto((current) => ({ ...current, competencia: custosCompetencia(committed) }))
  }, [committed.fim])

  const [selectedCliente, setSelectedCliente] = useState<JsonRecord | null>(null)
  const client = useQueryClient()

  const resumo = useQuery({ queryKey: QK.financeiroResumo(pk), queryFn: () => getFinanceiroResumo(fp), enabled: !isCliente, placeholderData: keepPreviousData })
  const resumoPrev = useQuery({ queryKey: QK.financeiroResumo(`${periodKey(prevPeriod)}:prev`), queryFn: () => getFinanceiroResumo(financeiroParams(prevPeriod)), enabled: !isCliente && tab === 'operacional', placeholderData: keepPreviousData })
  const fluxo = useQuery({ queryKey: QK.financeiroFluxo(pk), queryFn: () => getFinanceiroFluxo(fp), enabled: !isCliente, placeholderData: keepPreviousData })
  const faturamento = useQuery({ queryKey: QK.financeiroFaturamento(pk), queryFn: () => getFinanceiroFaturamento(fp), enabled: !isCliente, placeholderData: keepPreviousData })
  const custos = useQuery({ queryKey: QK.financeiroCustos(custo.competencia), queryFn: () => getFinanceiroCustos({ mes: custo.competencia }), enabled: !isCliente })
  const franqueadora = useQuery({ queryKey: QK.financeiroFranqueadora(pk), queryFn: () => getFinanceiroFranqueadora(fp), enabled: isMaster, placeholderData: keepPreviousData })
  const boletos = useQuery({ queryKey: QK.boletos, queryFn: getBoletos })
  const comissoesResumo = useQuery({ queryKey: [...QK.comissoesResumo, pk], queryFn: () => getComissoesResumo(cp), enabled: !isCliente && tab === 'comissoes', placeholderData: keepPreviousData })
  const comissoesApresentadoras = useQuery({ queryKey: [...QK.comissoesApresentadoras, pk], queryFn: () => getComissoesApresentadoras(cp), enabled: !isCliente && tab === 'comissoes', placeholderData: keepPreviousData })
  const comissoesMarcas = useQuery({ queryKey: [...QK.comissoesMarcas, pk], queryFn: () => getComissoesMarcas(cp), enabled: !isCliente && tab === 'comissoes', placeholderData: keepPreviousData })

  const selectedTipo = asString(selectedCliente?.tipo_operacional ?? selectedCliente?.tipo_entidade)
  const selectedClienteKind = selectedTipo === 'afiliada' || selectedTipo === 'marca' || asString(selectedCliente?.tipo_entidade) === 'marca' ? 'marca' : 'cliente'
  const selectedClienteId = selectedClienteKind === 'marca'
    ? asString(selectedCliente?.marca_id ?? selectedCliente?.id, '')
    : asString(selectedCliente?.cliente_id ?? selectedCliente?.id, '')
  const selectedClienteDetail = useQuery({
    queryKey: QK.financeiroClienteOperacional({ clienteKind: selectedClienteKind, clienteId: selectedClienteId }),
    enabled: Boolean(selectedClienteId),
    queryFn: () => selectedClienteKind === 'marca'
      ? getMarcaOperacional(selectedClienteId)
      : getClienteOperacional(selectedClienteId),
  })
  const createCusto = useMutation({
    mutationFn: createFinanceiroCusto,
    onSuccess: () => {
      setCusto((current) => ({ ...current, descricao: '', valor: '' }))
      void client.invalidateQueries({ queryKey: QK.financeiroCustos() })
      void client.invalidateQueries({ queryKey: QK.financeiroResumo() })
      void client.invalidateQueries({ queryKey: QK.financeiroFluxo() })
    },
  })
  const deleteCusto = useMutation({
    mutationFn: deleteFinanceiroCusto,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.financeiroCustos() })
      void client.invalidateQueries({ queryKey: QK.financeiroResumo() })
      void client.invalidateQueries({ queryKey: QK.financeiroFluxo() })
    },
  })

  const raw = resumo.data ?? {}
  const clientesRaw = asArray<JsonRecord>(faturamento.data?.clientes ?? faturamento.data?.por_cliente ?? faturamento.data?.items ?? faturamento.data)
  const clientes = useMemo(
    () => [...clientesRaw].sort((a, b) => asNumber(b.gmv_mes ?? b.total) - asNumber(a.gmv_mes ?? a.total)),
    [clientesRaw],
  )
  const clientesView = clientes.slice(0, 100)
  const custosRows = custos.data ?? []
  const boletosRows = boletos.data ?? []
  const boletosVencidos = boletosRows.filter((item) => asString(item.status).toLowerCase() === 'vencido').length
  const comissaoFaltante = asNumber(raw.comissao_faltante_count ?? raw.comissoes_sem_config)

  const metrics = [
    moneyMetric('GMV total', raw.gmv_total ?? raw.fat_bruto, 'lives + vídeos do período', 'brand'),
    moneyMetric('Comissão de franquia', raw.receita_liquida, 'receita LiveLab, antes dos custos', 'success'),
    moneyMetric('Custos reais', raw.total_custos ?? 0, 'lançados na competência', 'warning'),
    metric('Comissão ausente', comissaoFaltante, 'lives com GMV sem comissão', comissaoFaltante > 0 ? 'danger' : 'neutral'),
  ]
  const metricIcons = [CircleDollarSign, Percent, Receipt, AlertTriangle]

  const fluxoItems = historyPoints(fluxo.data?.items ?? fluxo.data?.fluxo ?? fluxo.data?.history)
    .map((point) => ({ ...point, label: dmLabel(point.label) }))
  const hasFluxo = fluxoItems.some((item) => asNumber(item.value) !== 0 || asNumber(item.secondary) !== 0)

  function setCustoField(key: keyof typeof custo, value: string) {
    setCusto((current) => ({ ...current, [key]: value }))
  }

  function onCustoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createCusto.mutate({
      descricao: custo.descricao,
      valor: parseBRMoneyToDecimal(custo.valor),
      tipo: custo.tipo,
      competencia: custo.competencia,
    })
  }

  function switchTab(next: FinanceiroTab) {
    setTab(next)
    const nextParams = new URLSearchParams(params)
    if (next === 'boletos' || next === 'comissoes') nextParams.set('tab', next)
    else nextParams.delete('tab')
    setParams(nextParams, { replace: true })
  }

  function exportClientesCsv() {
    downloadCsv(`faturamento-por-cliente-${committed.inicio}_${committed.fim}.csv`, clientes, [
      { key: 'nome', header: 'nome', value: (row) => asString(row.cliente_nome ?? row.nome) },
      { key: 'tipo_operacional', header: 'tipo' },
      { key: 'nicho', header: 'nicho' },
      { key: 'gmv_mes', header: 'faturamento', value: (row) => asNumber(row.gmv_mes ?? row.total) },
      { key: 'receita_liquida', header: 'receita_liquida', value: (row) => asNumber(row.receita_liquida) },
      { key: 'lives_mes', header: 'lives', value: (row) => asNumber(row.lives_mes ?? row.total_lives) },
      { key: 'videos_mes', header: 'videos', value: (row) => asNumber(row.videos_mes) },
    ])
  }

  if (isCliente) return <BoletosPanel />

  if (resumo.isError) return <ErrorState message={extractErrorMessage(resumo.error)} onRetry={() => void resumo.refetch()} />
  if (resumo.isLoading && !resumo.data) return <LoadingState />

  const comissoesResumoRaw = comissoesResumo.data ?? {}
  const comissoesTotais = (comissoesResumoRaw.totais ?? {}) as JsonRecord
  const comissoesCards = [
    moneyMetric('Comissão total', comissoesTotais.comissao ?? comissoesResumoRaw.comissao_total ?? comissoesResumoRaw.comissao_apresentadoras, 'apresentadoras, franquia e franqueadora', 'brand'),
    moneyMetric('GMV base', comissoesTotais.gmv ?? comissoesResumoRaw.gmv_total, 'base de cálculo', 'success'),
    moneyMetric('GMV lives', comissoesResumoRaw.gmv_lives, 'lives incluídas', 'neutral'),
    moneyMetric('GMV vídeos', comissoesResumoRaw.gmv_videos, 'vídeos incluídos', 'warning'),
  ]
  const apresentadorasRows = [...(comissoesApresentadoras.data ?? [])].sort((a, b) => asNumber(b.comissao_apresentadora ?? b.comissao_total) - asNumber(a.comissao_apresentadora ?? a.comissao_total))
  const marcasRows = [...(comissoesMarcas.data ?? [])].sort((a, b) => asNumber(b.gmv_total) - asNumber(a.gmv_total))
  const franqueadosRows = [...asArray<JsonRecord>(franqueadora.data?.franqueados)].sort((a, b) => asNumber(b.gmv_total ?? b.gmv) - asNumber(a.gmv_total ?? a.gmv))
  const royaltiesConfigurados = asNumber(franqueadora.data?.total_royalties) > 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        accent="Resumo"
        title="da unidade"
        subtitle={`Período: ${periodRangeLabel(committed)} · Receita, fluxo de caixa e pendências.`}
        actions={<PeriodRangeControl value={periodRange} onChange={setPeriodRange} />}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1">
        {[
          ['operacional', CircleDollarSign, 'Operacional'],
          ['cliente', Users, 'Por cliente'],
          ['recebiveis', TrendingUp, 'Recebíveis'],
          ['boletos', WalletCards, 'Boletos'],
          ['comissoes', Percent, 'Comissões'],
          ...(isMaster ? [['franqueadora', Crown, 'Franqueadora']] : []),
        ].map(([key, Icon, label]) => (
          <button
            key={String(key)}
            className={tab === key ? 'inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white' : 'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink-muted hover:bg-surface-muted'}
            onClick={() => switchTab(key as FinanceiroTab)}
          >
            <Icon className="h-4 w-4" />
            {label as string}
          </button>
        ))}
      </div>

      {tab === 'operacional' ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <FinanceiroHeroPanel raw={raw} prev={resumoPrev.data} />
            <ReceitaWaterfall
              gmvTotal={raw.gmv_total ?? raw.fat_bruto}
              comissao={raw.receita_liquida}
              custos={raw.total_custos}
              resultado={raw.fat_liquido}
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item, index) => (
              <MetricCard key={item.label} metric={item} icon={metricIcons[index]} />
            ))}
          </section>

          {/* Memória de cálculo — transparência: de onde vem cada número (fonte: lives + vídeos) */}
          <details className="group rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink">
              <span>Memória de cálculo — de onde vêm os números</span>
              <span className="text-xs font-normal text-ink-muted">expandir</span>
            </summary>
            <div className="space-y-2 border-t border-line px-4 py-3 text-sm text-ink-muted">
              <p>
                <span className="font-semibold text-ink">GMV bruto {formatMoney(raw.gmv_total)}</span>
                {' = '}Lives {formatMoney(raw.gmv_lives)} ({num(raw.total_lives)} lives) + Vídeos {formatMoney(raw.gmv_videos)} ({num(raw.total_videos)} vídeos)
              </p>
              <p>
                <span className="font-semibold text-[var(--success)]">Comissão de franquia {formatMoney(raw.receita_liquida)}</span>
                {' = '}Σ comissão calculada das lives (receita da LiveLab, <span className="font-semibold">antes</span> dos custos)
              </p>
              <p>
                <span className="font-semibold text-ink">Resultado líquido {formatMoney(raw.fat_liquido)}</span>
                {' = '}comissão de franquia {formatMoney(raw.receita_liquida)} − custos {formatMoney(raw.total_custos)}
              </p>
              <p className="text-xs">
                Comissão de franquia por live = <span className="num">MAX(valor fixo mínimo da marca, GMV × % da marca)</span>.
                Fonte do GMV: tabela <code>lives</code> (Conteúdo/Operacional) + <code>video_registros</code> — não usa mais vendas_atribuidas como base de GMV.
              </p>
              {comissaoFaltante > 0 ? (
                <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-[var(--danger)]">
                  ⚠ {comissaoFaltante} live(s) com GMV mas sem comissão calculada — marca/apresentadora não resolvida. Financeiro × Comissões não batem até ajustar o cadastro.
                </p>
              ) : null}
            </div>
          </details>

          <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            {hasFluxo ? (
              <LinePanel title="Fluxo de caixa" subtitle="Entradas (GMV) vs. saídas (custos) por dia" data={fluxoItems} secondary />
            ) : (
              <Card>
                <CardHeader>
                  <p className="text-base font-bold text-ink">Fluxo de caixa</p>
                </CardHeader>
                <CardBody>
                  <EmptyState title="Sem dados de fluxo" description="Nenhuma entrada ou custo real lançado no período." />
                </CardBody>
              </Card>
            )}
            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Custos da competência</p>
                <p className="mt-1 text-xs text-ink-muted">Lançamentos de um mês — independem do intervalo selecionado acima.</p>
              </CardHeader>
              <CardBody className="space-y-3">
                <form className="grid gap-3" onSubmit={onCustoSubmit}>
                  <input className="design-input h-11 w-full px-4" placeholder="Descrição" value={custo.descricao} onChange={(event) => setCustoField('descricao', event.target.value)} required />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MoneyInput className="design-input h-11 w-full px-4" placeholder="Valor" value={custo.valor} onChange={(rawValue) => setCustoField('valor', rawValue)} required />
                    <select className="design-input h-11 w-full px-4" value={custo.tipo} onChange={(event) => setCustoField('tipo', event.target.value)}>
                      {['aluguel', 'salario', 'energia', 'internet', 'outros'].map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                    </select>
                    <input className="design-input h-11 w-full px-4" type="month" value={custo.competencia} onChange={(event) => setCustoField('competencia', event.target.value)} required />
                  </div>
                  {createCusto.isError || custos.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(createCusto.error ?? custos.error)}</p> : null}
                  <Button type="submit" icon={Receipt} isLoading={createCusto.isPending}>Adicionar custo</Button>
                </form>
                <div className="space-y-2 border-t border-line pt-3">
                  {custosRows.length === 0 ? (
                    <EmptyState title="Sem custos no mês" description="Nenhum custo lançado para a competência selecionada." />
                  ) : null}
                  {custosRows.map((item) => {
                    const Icon = item.tipo === 'aluguel' ? Building2 : item.tipo === 'salario' ? Users : item.tipo === 'energia' ? Zap : Receipt
                    return (
                      <div key={asString(item.id)} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-muted p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{asString(item.descricao)}</p>
                            <p className="text-xs text-ink-muted">{asString(item.tipo)} · {formatDate(asString(item.competencia, ''))}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="num text-sm font-bold text-ink">{formatMoney(item.valor, true)}</span>
                          <Button variant="ghost" disabled={deleteCusto.isPending} onClick={() => void deleteCusto.mutate(asString(item.id, ''))}>Excluir</Button>
                        </div>
                      </div>
                    )
                  })}
                  {deleteCusto.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(deleteCusto.error)}</p> : null}
                </div>
              </CardBody>
            </Card>
          </section>
        </>
      ) : null}

      {tab === 'cliente' ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-bold text-ink">Faturamento por cliente</p>
                <p className="mt-1 text-xs text-ink-muted">Participação da carteira no GMV da unidade no período. {clientes.length > 100 ? `Mostrando top 100 de ${num(clientes.length)}.` : ''}</p>
              </div>
              {clientes.length ? <Button variant="secondary" icon={Download} onClick={exportClientesCsv}>Exportar CSV</Button> : null}
            </div>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={clientesView}
              columns={[
                {
                  key: 'cliente_nome',
                  header: 'Cliente',
                  render: (item) => (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{asString(item.cliente_nome ?? item.nome)}</span>
                      <Badge tone={tipoTone(asString(item.tipo_operacional))}>{TIPO_LABEL[asString(item.tipo_operacional)] ?? asString(item.tipo_operacional, 'cliente')}</Badge>
                    </div>
                  ),
                },
                { key: 'nicho', header: 'Nicho', render: (item) => asString(item.nicho ?? item.segmento) },
                { key: 'valor', header: 'Faturamento', align: 'right', render: (item) => <span className="num">{formatMoney(item.gmv_mes ?? item.valor ?? item.faturamento ?? item.total ?? item.gmv_total)}</span> },
                { key: 'receita_liquida', header: 'Receita LiveLab', align: 'right', render: (item) => <span className="num">{formatMoney(item.receita_liquida)}</span> },
                { key: 'lives', header: 'Lives', align: 'right', render: (item) => <span className="num">{num(item.lives_mes ?? item.lives ?? item.total_lives)}</span> },
                { key: 'videos', header: 'Vídeos', align: 'right', render: (item) => <span className="num">{num(item.videos_mes ?? item.quantidade_videos)}</span> },
                {
                  key: 'gmv_live',
                  header: 'GMV/live',
                  align: 'right',
                  render: (item) => {
                    const lives = asNumber(item.lives_mes ?? item.lives ?? item.total_lives)
                    return <span className="num">{lives > 0 ? formatMoney(asNumber(item.gmv_mes ?? item.total) / lives) : '—'}</span>
                  },
                },
                {
                  key: 'acoes',
                  header: 'Ações',
                  align: 'right',
                  render: (item) => <Button variant="secondary" onClick={() => setSelectedCliente(item)}>Abrir</Button>,
                },
              ]}
            />
            {clientesView.length ? (
              <TotalsBar
                items={[
                  { label: 'Total faturamento', value: formatMoney(sumBy(clientes, 'gmv_mes', 'total')) },
                  { label: 'Total receita LiveLab', value: formatMoney(sumBy(clientes, 'receita_liquida')) },
                ]}
              />
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {tab === 'recebiveis' ? (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Recebíveis</p>
          </CardHeader>
          <CardBody>
            <EmptyState title="Sem integração de recebíveis" description="Nenhuma integração de recebíveis configurada para esta unidade." />
          </CardBody>
        </Card>
      ) : null}

      {tab === 'boletos' ? (
        <section className="grid gap-4">
          {boletosRows.length ? (
            <>
              <MetricCard metric={metric('Boletos vencidos', boletosVencidos, 'requer cobrança', boletosVencidos > 0 ? 'danger' : 'neutral')} icon={Receipt} />
              <BoletosPanel embedded />
            </>
          ) : (
            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Boletos</p>
              </CardHeader>
              <CardBody>
                <EmptyState title="Sem boletos" description="Nenhuma cobrança configurada ou boleto encontrado." />
              </CardBody>
            </Card>
          )}
        </section>
      ) : null}

      {tab === 'comissoes' ? (
        <>
          {comissoesResumo.isLoading || comissoesApresentadoras.isLoading || comissoesMarcas.isLoading ? (
            <LoadingState />
          ) : comissoesResumo.isError || comissoesApresentadoras.isError || comissoesMarcas.isError ? (
            <ErrorState
              message={extractErrorMessage(comissoesResumo.error ?? comissoesApresentadoras.error ?? comissoesMarcas.error)}
              onRetry={() => {
                void comissoesResumo.refetch()
                void comissoesApresentadoras.refetch()
                void comissoesMarcas.refetch()
              }}
            />
          ) : (
            <section className="space-y-4">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {comissoesCards.map((item, index) => (
                  <MetricCard key={item.label} metric={item} icon={[Percent, CircleDollarSign, TrendingUp, Receipt][index]} />
                ))}
              </section>

              <details className="group rounded-2xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink">
                  <span>Regras de comissão</span>
                  <span className="text-xs font-normal text-ink-muted">expandir</span>
                </summary>
                <p className="border-t border-line px-4 py-3 text-xs text-ink-muted">
                  Live em sábado ou domingo usa 2%. Dias úteis e vídeos seguem as faixas mensais, com vínculo de marca e escada padrão como fallback.
                </p>
              </details>

              <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <p className="text-base font-bold text-ink">Comissão por apresentador</p>
                    <p className="mt-1 text-xs text-ink-muted">GMV base, vídeos e lives incluídos no cálculo.</p>
                  </CardHeader>
                  <CardBody>
                    <DataTable<JsonRecord>
                      data={apresentadorasRows}
                      columns={[
                        { key: 'apresentadora_nome', header: 'Apresentador', render: (item) => asString(item.apresentadora_nome ?? item.nome, 'Sem apresentador') },
                        { key: 'gmv_total', header: 'GMV base', align: 'right', render: (item) => <span className="num">{formatMoney(item.gmv_total)}</span> },
                        { key: 'gmv_videos', header: 'Vídeos', align: 'right', render: (item) => <span className="num">{formatMoney(item.gmv_videos)}</span> },
                        { key: 'registros', header: 'Registros', align: 'right', render: (item) => <span className="num">{num(item.registros)}</span> },
                        { key: 'comissao_apresentadora', header: 'Comissão', align: 'right', render: (item) => <span className="num">{formatMoney(item.comissao_apresentadora ?? item.comissao_total)}</span> },
                      ]}
                    />
                    {apresentadorasRows.length ? <TotalsBar items={[{ label: 'Total comissão', value: formatMoney(sumBy(apresentadorasRows, 'comissao_apresentadora', 'comissao_total')) }]} /> : null}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <p className="text-base font-bold text-ink">Comissão por marca</p>
                    <p className="mt-1 text-xs text-ink-muted">Valores por marca, cliente ou afiliada.</p>
                  </CardHeader>
                  <CardBody>
                    <DataTable<JsonRecord>
                      data={marcasRows}
                      columns={[
                        { key: 'marca_nome', header: 'Marca', render: (item) => (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">{asString(item.marca_nome ?? item.nome)}</span>
                            <Badge tone={asString(item.marca_tipo ?? item.tipo) === 'afiliada' ? 'info' : 'brand'}>{asString(item.marca_tipo ?? item.tipo, 'cliente')}</Badge>
                          </div>
                        ) },
                        { key: 'gmv_total', header: 'GMV base', align: 'right', render: (item) => <span className="num">{formatMoney(item.gmv_total)}</span> },
                        { key: 'comissao_apresentadoras', header: 'Apresentadores', align: 'right', render: (item) => <span className="num">{formatMoney(item.comissao_apresentadoras)}</span> },
                        { key: 'comissao_franquia', header: 'Franquia', align: 'right', render: (item) => <span className="num">{formatMoney(item.comissao_franquia)}</span> },
                      ]}
                    />
                    {marcasRows.length ? <TotalsBar items={[{ label: 'Total franquia', value: formatMoney(sumBy(marcasRows, 'comissao_franquia')) }]} /> : null}
                  </CardBody>
                </Card>
              </section>
            </section>
          )}
        </>
      ) : null}

      {tab === 'franqueadora' ? (
        <>
          {franqueadora.isLoading && !franqueadora.data ? (
            <LoadingState />
          ) : franqueadora.isError ? (
            <ErrorState message={extractErrorMessage(franqueadora.error)} onRetry={() => void franqueadora.refetch()} />
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard metric={moneyMetric('GMV da rede', franqueadora.data?.total_gmv, 'gross merchandise value', 'brand')} icon={CircleDollarSign} />
                <MetricCard
                  metric={royaltiesConfigurados
                    ? moneyMetric('Royalties', franqueadora.data?.total_royalties, 'taxa arrecadada no período', 'success')
                    : metric('Royalties', 'Não configurado', '% de royalties ainda não definido', 'neutral')}
                  icon={TrendingUp}
                />
                <MetricCard metric={metric('Franqueados', asNumber(franqueadora.data?.total_franqueados), 'unidades ativas', 'neutral')} icon={Building2} />
              </section>

              <Card>
                <CardHeader>
                  <p className="text-base font-bold text-ink">Desempenho por franqueado</p>
                  <p className="mt-1 text-xs text-ink-muted">GMV, lives e royalties de cada unidade no período.</p>
                </CardHeader>
                <CardBody>
                  <DataTable<JsonRecord>
                    data={franqueadosRows}
                    columns={[
                      {
                        key: 'nome',
                        header: 'Franqueado',
                        render: (item) => (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">{asString(item.franqueado_nome ?? item.nome)}</span>
                            {asString(item.uf, '') ? <Badge tone="neutral">{asString(item.uf)}</Badge> : null}
                          </div>
                        ),
                      },
                      { key: 'cidade', header: 'Cidade', render: (item) => <span className="inline-flex items-center gap-1 text-ink-muted"><MapPin className="h-3.5 w-3.5" />{asString(item.cidade)}</span> },
                      { key: 'plano', header: 'Plano', render: (item) => asString(item.plano, '—') },
                      { key: 'gmv_total', header: 'GMV', align: 'right', render: (item) => <span className="num">{formatMoney(item.gmv_total ?? item.gmv)}</span> },
                      { key: 'total_lives', header: 'Lives', align: 'right', render: (item) => <span className="num">{num(item.total_lives)}</span> },
                      { key: 'royalties_estimados', header: 'Royalties', align: 'right', render: (item) => <span className="num" title="Estimado — % configurável">{royaltiesConfigurados ? formatMoney(item.royalties_estimados) : '—'}</span> },
                    ]}
                  />
                  {franqueadosRows.length ? (
                    <TotalsBar
                      items={[
                        { label: 'Total GMV', value: formatMoney(sumBy(franqueadosRows, 'gmv_total', 'gmv')) },
                        ...(royaltiesConfigurados ? [{ label: 'Total royalties', value: formatMoney(sumBy(franqueadosRows, 'royalties_estimados')) }] : []),
                      ]}
                    />
                  ) : null}
                </CardBody>
              </Card>
            </>
          )}
        </>
      ) : null}

      <Modal
        open={Boolean(selectedCliente)}
        title="Financeiro por cliente"
        subtitle="GMV, receita, lives, vídeos e comissão do cadastro selecionado."
        size="xl"
        onClose={() => setSelectedCliente(null)}
      >
        {selectedClienteDetail.isLoading ? <LoadingState label="Carregando histórico" /> : null}
        {selectedClienteDetail.isError ? <ErrorState message={extractErrorMessage(selectedClienteDetail.error)} onRetry={() => void selectedClienteDetail.refetch()} /> : null}
        {selectedClienteDetail.data ? (
          <div className="space-y-4">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                moneyMetric('GMV mês', getRecord(selectedClienteDetail.data.metrics).gmv_mes, 'período atual', 'brand'),
                moneyMetric('GMV acumulado', getRecord(selectedClienteDetail.data.metrics).gmv_acumulado, 'histórico', 'success'),
                metric('Lives', getRecord(selectedClienteDetail.data.metrics).total_lives ?? 0, 'histórico', 'neutral'),
                metric('Vídeos', getRecord(selectedClienteDetail.data.metrics).total_videos ?? 0, 'histórico', 'info'),
              ].map((item, index) => <MetricCard key={item.label} metric={item} icon={[CircleDollarSign, TrendingUp, Users, Receipt][index]} />)}
            </section>
            <DataTable<JsonRecord>
              data={asArray<JsonRecord>(selectedClienteDetail.data.vendas_atribuidas)}
              columns={[
                { key: 'data_referencia', header: 'Data', render: (item) => asString(item.data_referencia).slice(0, 10) },
                { key: 'origem', header: 'Origem', render: (item) => asString(item.origem) },
                { key: 'gmv', header: 'GMV', align: 'right', render: (item) => <span className="num">{formatMoney(item.gmv)}</span> },
                { key: 'comissao_franquia', header: 'Receita LiveLab', align: 'right', render: (item) => <span className="num">{formatMoney(item.comissao_franquia)}</span> },
              ]}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
