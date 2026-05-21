import { Building2, CircleDollarSign, Crown, Percent, Receipt, TrendingDown, TrendingUp, Users, WalletCards, Zap } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { LinePanel } from '../components/charts/Charts'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ErrorState, LoadingState } from '../components/ui/States'
import { MoneyInput } from '../components/ui/MoneyInput'
import { createFinanceiroCusto, deleteFinanceiroCusto, getBoletos, getClienteOperacional, getComissoesApresentadoras, getComissoesMarcas, getComissoesResumo, getFinanceiroCustos, getFinanceiroFaturamento, getFinanceiroFluxo, getFinanceiroResumo, getFinanceiroFranqueadora, getMarcaOperacional } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { useCurrentUser } from '../stores/auth-store'
import { asArray, asNumber, asString, currentPeriod, formatDate, formatMoney, getRecord, periodToParam } from '../utils/format'
import { parseBRMoneyToDecimal } from '../utils/money'
import { historyPoints, metric, moneyMetric } from './page-helpers'
import { BoletosPanel } from './BoletosPage'
import type { JsonRecord } from '../types/models'

const icons = [CircleDollarSign, TrendingUp, TrendingDown, Receipt]
type FinanceiroTab = 'operacional' | 'cliente' | 'recebiveis' | 'boletos' | 'comissoes' | 'franqueadora'

export function FinanceiroPage() {
  const user = useCurrentUser()
  const isCliente = user?.papel === 'cliente_parceiro'
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get('tab')
  const initialTab: FinanceiroTab = isCliente ? 'boletos' : requestedTab === 'boletos' || requestedTab === 'comissoes' ? requestedTab : 'operacional'
  const [tab, setTab] = useState<FinanceiroTab>(initialTab)
  const [custo, setCusto] = useState({
    descricao: '',
    valor: '',
    tipo: 'outros',
    competencia: periodToParam(currentPeriod()),
  })
  const [selectedCliente, setSelectedCliente] = useState<JsonRecord | null>(null)
  const client = useQueryClient()
  const resumo = useQuery({ queryKey: ['financeiro-resumo'], queryFn: () => getFinanceiroResumo(), enabled: !isCliente })
  const fluxo = useQuery({ queryKey: ['financeiro-fluxo'], queryFn: () => getFinanceiroFluxo(), enabled: !isCliente })
  const faturamento = useQuery({ queryKey: ['financeiro-faturamento'], queryFn: () => getFinanceiroFaturamento(), enabled: !isCliente })
  const custos = useQuery({ queryKey: ['financeiro-custos', custo.competencia], queryFn: () => getFinanceiroCustos({ mes: custo.competencia }), enabled: !isCliente })
  const franqueadora = useQuery({ queryKey: ['financeiro-franqueadora'], queryFn: () => getFinanceiroFranqueadora(), enabled: user?.papel === 'franqueador_master' })
  const boletos = useQuery({ queryKey: ['boletos'], queryFn: getBoletos })
  const comissoesResumo = useQuery({ queryKey: ['comissoes-resumo'], queryFn: () => getComissoesResumo(), enabled: !isCliente && tab === 'comissoes' })
  const comissoesApresentadoras = useQuery({ queryKey: ['comissoes-apresentadoras'], queryFn: () => getComissoesApresentadoras(), enabled: !isCliente && tab === 'comissoes' })
  const comissoesMarcas = useQuery({ queryKey: ['comissoes-marcas'], queryFn: () => getComissoesMarcas(), enabled: !isCliente && tab === 'comissoes' })
  const selectedClienteKind = asString(selectedCliente?.tipo_operacional ?? selectedCliente?.tipo_entidade) === 'afiliada' || asString(selectedCliente?.tipo_entidade) === 'marca' ? 'marca' : 'cliente'
  const selectedClienteId = selectedClienteKind === 'marca'
    ? asString(selectedCliente?.marca_id ?? selectedCliente?.id, '')
    : asString(selectedCliente?.cliente_id ?? selectedCliente?.id, '')
  const selectedClienteDetail = useQuery({
    queryKey: ['financeiro-cliente-operacional', selectedClienteKind, selectedClienteId],
    enabled: Boolean(selectedClienteId),
    queryFn: () => selectedClienteKind === 'marca'
      ? getMarcaOperacional(selectedClienteId)
      : getClienteOperacional(selectedClienteId),
  })
  const createCusto = useMutation({
    mutationFn: createFinanceiroCusto,
    onSuccess: () => {
      setCusto((current) => ({ ...current, descricao: '', valor: '' }))
      void client.invalidateQueries({ queryKey: ['financeiro-custos'] })
      void client.invalidateQueries({ queryKey: ['financeiro-resumo'] })
      void client.invalidateQueries({ queryKey: ['financeiro-fluxo'] })
    },
  })
  const deleteCusto = useMutation({
    mutationFn: deleteFinanceiroCusto,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['financeiro-custos'] })
      void client.invalidateQueries({ queryKey: ['financeiro-resumo'] })
      void client.invalidateQueries({ queryKey: ['financeiro-fluxo'] })
    },
  })

  if (isCliente) return <BoletosPanel />

  if (resumo.isLoading || fluxo.isLoading || faturamento.isLoading || custos.isLoading || boletos.isLoading) return <LoadingState />
  if (resumo.isError) return <ErrorState message={extractErrorMessage(resumo.error)} onRetry={() => void resumo.refetch()} />

  const raw = resumo.data ?? {}
  const clientes = asArray<JsonRecord>(faturamento.data?.clientes ?? faturamento.data?.por_cliente ?? faturamento.data?.items ?? faturamento.data)
  const custosRows = custos.data ?? []
  const boletosRows = boletos.data ?? []
  const boletosVencidos = boletosRows.filter((item) => asString(item.status).toLowerCase() === 'vencido').length
  const metrics = [
    moneyMetric('GMV bruto', raw.gmv_total ?? raw.receita ?? raw.fat_bruto ?? raw.fat_total, 'vendas atribuídas do período', 'brand'),
    moneyMetric('Receita líquida', raw.receita_liquida ?? raw.fat_liquido, 'GMV x comissão configurada', 'success'),
    moneyMetric('Custos reais', raw.total_custos ?? raw.custos ?? 0, 'custos cadastrados', 'warning'),
    metric('Comissão ausente', raw.comissao_faltante_count ?? raw.comissoes_sem_config ?? 0, 'marcas sem comissão', 'danger'),
  ]
  const fluxoItems = historyPoints(fluxo.data?.items ?? fluxo.data?.fluxo ?? fluxo.data?.history)
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

  function switchTab(next: typeof tab) {
    setTab(next)
    const nextParams = new URLSearchParams(params)
    if (next === 'boletos' || next === 'comissoes') nextParams.set('tab', next)
    else nextParams.delete('tab')
    setParams(nextParams, { replace: true })
  }

  const comissoesResumoRaw = comissoesResumo.data ?? {}
  const comissoesTotais = (comissoesResumoRaw.totais ?? {}) as JsonRecord
  const comissoesCards = [
    moneyMetric('Comissão total', comissoesTotais.comissao ?? comissoesResumoRaw.comissao_total ?? comissoesResumoRaw.comissao_apresentadoras, 'apresentadoras, franquia e franqueadora', 'brand'),
    moneyMetric('GMV base', comissoesTotais.gmv ?? comissoesResumoRaw.gmv_total, 'base de cálculo', 'success'),
    moneyMetric('GMV lives', comissoesResumoRaw.gmv_lives, 'lives incluídas', 'neutral'),
    moneyMetric('GMV vídeos', comissoesResumoRaw.gmv_videos, 'vídeos incluídos', 'warning'),
  ]

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Financeiro" accent="Resumo" title="da unidade" subtitle="Receita, fluxo de caixa, faturamento e pendências." />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1">
        {[
          ['operacional', CircleDollarSign, 'Operacional'],
          ['cliente', Users, 'Por cliente'],
          ['recebiveis', TrendingUp, 'Recebíveis'],
          ['boletos', WalletCards, 'Boletos'],
          ['comissoes', Percent, 'Comissões'],
          ...(user?.papel === 'franqueador_master' ? [['franqueadora', Crown, 'Franqueadora']] : []),
        ].map(([key, Icon, label]) => (
          <button
            key={String(key)}
            className={tab === key ? 'inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white' : 'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink-muted hover:bg-surface-muted'}
            onClick={() => switchTab(key as typeof tab)}
          >
            <Icon className="h-4 w-4" />
            {label as string}
          </button>
        ))}
      </div>

      {tab === 'operacional' ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item, index) => (
              <MetricCard key={item.label} metric={item} icon={icons[index]} />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            {hasFluxo ? (
              <LinePanel title="Fluxo de caixa" data={fluxoItems} secondary />
            ) : (
              <Card>
                <CardHeader>
                  <p className="text-base font-bold text-ink">Fluxo de caixa</p>
                </CardHeader>
                <CardBody>
                  <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">Nenhuma entrada ou custo real lançado no período.</p>
                </CardBody>
              </Card>
            )}
            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Custos do mês</p>
                <p className="mt-1 text-xs text-ink-muted">CRUD conectado a `/financeiro/custos`.</p>
              </CardHeader>
              <CardBody className="space-y-3">
                <form className="grid gap-3" onSubmit={onCustoSubmit}>
                  <input className="design-input h-11 w-full px-4" placeholder="Descrição" value={custo.descricao} onChange={(event) => setCustoField('descricao', event.target.value)} required />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MoneyInput className="design-input h-11 w-full px-4" placeholder="Valor" value={custo.valor} onChange={(raw) => setCustoField('valor', raw)} required />
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
                    <p className="rounded-2xl border border-dashed border-line p-4 text-center text-xs text-ink-muted">Sem custos lançados no mês.</p>
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
            <p className="text-base font-bold text-ink">Faturamento por cliente</p>
            <p className="mt-1 text-xs text-ink-muted">Participação da carteira no faturamento da unidade.</p>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={clientes}
              columns={[
                { key: 'cliente_nome', header: 'Cliente', render: (item) => asString(item.cliente_nome ?? item.nome) },
                { key: 'nicho', header: 'Nicho', render: (item) => asString(item.nicho ?? item.segmento) },
                { key: 'valor', header: 'Faturamento', align: 'right', render: (item) => formatMoney(item.valor ?? item.faturamento) },
                { key: 'lives', header: 'Lives', align: 'right', render: (item) => asNumber(item.lives ?? item.total_lives).toLocaleString('pt-BR') },
                {
                  key: 'acoes',
                  header: 'Ações',
                  align: 'right',
                  render: (item) => <Button variant="secondary" onClick={() => setSelectedCliente(item)}>Abrir</Button>,
                },
              ]}
            />
          </CardBody>
        </Card>
      ) : null}

      {tab === 'recebiveis' ? (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Recebíveis</p>
          </CardHeader>
          <CardBody>
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">Nenhuma integração de recebíveis configurada para esta unidade.</p>
          </CardBody>
        </Card>
      ) : null}

      {tab === 'boletos' ? (
        <section className="grid gap-4">
          {boletosRows.length ? (
            <>
              <MetricCard metric={metric('Boletos vencidos', boletosVencidos, 'requer cobrança', 'danger')} icon={Receipt} />
              <BoletosPanel embedded />
            </>
          ) : (
            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Boletos</p>
              </CardHeader>
              <CardBody>
                <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">Nenhuma cobrança configurada ou boleto encontrado.</p>
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

              <Card>
                <CardHeader>
                  <p className="text-base font-bold text-ink">Regras de comissão</p>
                  <p className="mt-1 text-xs text-ink-muted">Live em sábado ou domingo usa 2%. Dias úteis seguem faixas mensais. Vídeos usam o vínculo apresentadora-marca quando aplicável.</p>
                </CardHeader>
              </Card>

              <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <p className="text-base font-bold text-ink">Comissão por apresentador</p>
                    <p className="mt-1 text-xs text-ink-muted">GMV base, vídeos e lives incluídos no cálculo.</p>
                  </CardHeader>
                  <CardBody>
                    <DataTable<JsonRecord>
                      data={comissoesApresentadoras.data ?? []}
                      columns={[
                        { key: 'apresentadora_nome', header: 'Apresentador', render: (item) => asString(item.apresentadora_nome ?? item.nome, 'Sem apresentador') },
                        { key: 'gmv_total', header: 'GMV base', align: 'right', render: (item) => formatMoney(item.gmv_total) },
                        { key: 'gmv_videos', header: 'Vídeos', align: 'right', render: (item) => formatMoney(item.gmv_videos) },
                        { key: 'registros', header: 'Registros', align: 'right', render: (item) => asNumber(item.registros).toLocaleString('pt-BR') },
                        { key: 'comissao_apresentadora', header: 'Comissão', align: 'right', render: (item) => formatMoney(item.comissao_apresentadora ?? item.comissao_total) },
                      ]}
                    />
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <p className="text-base font-bold text-ink">Comissão por marca</p>
                    <p className="mt-1 text-xs text-ink-muted">Valores por marca, cliente ou afiliada.</p>
                  </CardHeader>
                  <CardBody>
                    <DataTable<JsonRecord>
                      data={comissoesMarcas.data ?? []}
                      columns={[
                        { key: 'marca_nome', header: 'Marca', render: (item) => asString(item.marca_nome ?? item.nome) },
                        { key: 'marca_tipo', header: 'Tipo', render: (item) => asString(item.marca_tipo ?? item.tipo, 'cliente') },
                        { key: 'gmv_total', header: 'GMV base', align: 'right', render: (item) => formatMoney(item.gmv_total) },
                        { key: 'comissao_apresentadoras', header: 'Apresentadores', align: 'right', render: (item) => formatMoney(item.comissao_apresentadoras) },
                        { key: 'comissao_franquia', header: 'Franquia', align: 'right', render: (item) => formatMoney(item.comissao_franquia) },
                      ]}
                    />
                  </CardBody>
                </Card>
              </section>
            </section>
          )}
        </>
      ) : null}

      {tab === 'franqueadora' ? (
        <>
          {franqueadora.isLoading ? (
            <LoadingState />
          ) : franqueadora.isError ? (
            <ErrorState message={extractErrorMessage(franqueadora.error)} onRetry={() => void franqueadora.refetch()} />
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  moneyMetric('GMV total', franqueadora.data?.total_gmv, 'gross merchandise value', 'brand'),
                  moneyMetric('Royalties', franqueadora.data?.total_royalties, 'taxa arrecadada', 'success'),
                  metric('Franqueados', franqueadora.data?.total_franqueados, 'unidades ativas', 'neutral'),
                ].map((item, index) => (
                  <MetricCard key={item.label} metric={item} icon={[CircleDollarSign, TrendingUp, Building2][index]} />
                ))}
              </section>

              <Card>
                <CardHeader>
                  <p className="text-base font-bold text-ink">Desempenho por franqueado</p>
                  <p className="mt-1 text-xs text-ink-muted">GMV e faturamento de cada unidade franqueada.</p>
                </CardHeader>
                <CardBody>
                  <DataTable<JsonRecord>
                    data={asArray<JsonRecord>(franqueadora.data?.franqueados ?? [])}
                    columns={[
                      { key: 'nome', header: 'Franqueado', render: (item) => asString(item.nome) },
                      { key: 'gmv', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv ?? item.total_gmv) },
                    ]}
                  />
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
                { key: 'gmv', header: 'GMV', align: 'right', render: (item) => formatMoney(item.gmv) },
                { key: 'comissao_franquia', header: 'Receita LiveLab', align: 'right', render: (item) => formatMoney(item.comissao_franquia) },
              ]}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
