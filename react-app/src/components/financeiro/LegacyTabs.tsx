// Abas herdadas do Financeiro antigo ("Por cliente" e "Comissões") — mesma lógica,
// extraídas da FinanceiroPage para o redesenho. Período = mês selecionado no topo.
import { Download } from 'lucide-react'
import { CircleDollarSign, Percent, Receipt, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MetricCard } from '../ui/MetricCard'
import { CadastroQuickEdit } from '../forms/CadastroQuickEdit'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { exportarComissoesCSV, getClienteOperacional, getComissoesApresentadoras, getComissoesMarcas, getFinanceiroFaturamento, getMarcaOperacional, reprocessarComissoes } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { QK } from '../../services/query-keys'
import { asArray, asNumber, asString, formatMoney, getRecord } from '../../utils/format'
import { downloadCsv } from '../../utils/exportCsv'
import { type PeriodRange, comissoesParams, financeiroParams, periodKey } from '../../utils/period'
import { metric, moneyMetric } from '../../pages/page-helpers'
import type { JsonRecord } from '../../types/models'

const num = (value: unknown) => asNumber(value).toLocaleString('pt-BR')
const sumBy = (rows: JsonRecord[], ...keys: string[]) =>
  rows.reduce((total, row) => total + asNumber(keys.map((k) => row[k]).find((v) => v !== undefined)), 0)

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

export function PorClienteTab({ periodo }: { periodo: PeriodRange }) {
  const pk = periodKey(periodo)
  const fp = financeiroParams(periodo)
  const [selectedCliente, setSelectedCliente] = useState<JsonRecord | null>(null)
  const faturamento = useQuery({ queryKey: QK.financeiroFaturamento(pk), queryFn: () => getFinanceiroFaturamento(fp), placeholderData: keepPreviousData })
  const clientesRaw = asArray<JsonRecord>(faturamento.data?.clientes ?? faturamento.data?.por_cliente ?? faturamento.data?.items ?? faturamento.data)
  const clientes = useMemo(
    () => [...clientesRaw].sort((a, b) => asNumber(b.gmv_mes ?? b.total) - asNumber(a.gmv_mes ?? a.total)),
    [clientesRaw],
  )
  const clientesView = clientes.slice(0, 100)

  function exportClientesCsv() {
    downloadCsv(`faturamento-por-cliente-${periodo.inicio}_${periodo.fim}.csv`, clientes, [
      { key: 'nome', header: 'nome', value: (row) => asString(row.cliente_nome ?? row.nome) },
      { key: 'tipo_operacional', header: 'tipo' },
      { key: 'nicho', header: 'nicho' },
      { key: 'gmv_mes', header: 'faturamento', value: (row) => asNumber(row.gmv_mes ?? row.total) },
      { key: 'receita_liquida', header: 'receita_liquida', value: (row) => asNumber(row.receita_liquida) },
      { key: 'lives_mes', header: 'lives', value: (row) => asNumber(row.lives_mes ?? row.total_lives) },
      { key: 'videos_mes', header: 'videos', value: (row) => asNumber(row.videos_mes) },
    ])
  }

  if (faturamento.isLoading && !faturamento.data) return <LoadingState />
  if (faturamento.isError) return <ErrorState message={extractErrorMessage(faturamento.error)} onRetry={() => void faturamento.refetch()} />

  return (
    <>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-bold text-ink">Faturamento por cliente</p>
                <p className="mt-1 text-xs text-ink-muted">Participação da carteira no GMV da unidade no período. Clique numa linha para abrir o detalhe. {clientes.length > 100 ? `Mostrando top 100 de ${num(clientes.length)}.` : ''}</p>
              </div>
              {clientes.length ? <Button variant="secondary" icon={Download} onClick={exportClientesCsv}>Exportar CSV</Button> : null}
            </div>
          </CardHeader>
          <CardBody>
            <DataTable<JsonRecord>
              data={clientesView}
              onRowClick={(item) => setSelectedCliente(item)}
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
      <ClienteDetalheModal periodo={periodo} selected={selectedCliente} onClose={() => setSelectedCliente(null)} />
    </>
  )
}

export function ComissoesTab({ periodo, podeReprocessar }: { periodo: PeriodRange; podeReprocessar: boolean }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const pk = periodKey(periodo)
  const cp = comissoesParams(periodo)
  const [selectedCliente, setSelectedCliente] = useState<JsonRecord | null>(null)
  const [exportingComissoes, setExportingComissoes] = useState(false)
  const [comissoesExportError, setComissoesExportError] = useState('')
  const comissoesApresentadoras = useQuery({ queryKey: [...QK.comissoesApresentadoras, pk], queryFn: () => getComissoesApresentadoras(cp), placeholderData: keepPreviousData })
  const comissoesMarcas = useQuery({ queryKey: [...QK.comissoesMarcas, pk], queryFn: () => getComissoesMarcas(cp), placeholderData: keepPreviousData })
  const reprocessar = useMutation({
    mutationFn: reprocessarComissoes,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.comissoesMarcas })
      void client.invalidateQueries({ queryKey: QK.comissoesApresentadoras })
      void client.invalidateQueries({ queryKey: QK.financeiroResumo() })
      void client.invalidateQueries({ queryKey: ['fin2'] })
    },
  })
  const apresentadorasRows = useMemo(
    () => [...(comissoesApresentadoras.data ?? [])].sort((a, b) => asNumber(b.comissao_apresentadora ?? b.comissao_total) - asNumber(a.comissao_apresentadora ?? a.comissao_total)),
    [comissoesApresentadoras.data],
  )
  const marcasRows = useMemo(
    () => [...(comissoesMarcas.data ?? [])].sort((a, b) => asNumber(b.gmv_total) - asNumber(a.gmv_total)),
    [comissoesMarcas.data],
  )

  async function exportComissoesCsv() {
    setExportingComissoes(true)
    try {
      const blob = await exportarComissoesCSV(cp)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comissoes-${periodo.inicio}_${periodo.fim}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setComissoesExportError('')
    } catch (err) {
      setComissoesExportError(extractErrorMessage(err))
    } finally {
      setExportingComissoes(false)
    }
  }

  if (comissoesApresentadoras.isLoading || comissoesMarcas.isLoading) return <LoadingState />
  if (comissoesApresentadoras.isError || comissoesMarcas.isError) {
    return (
      <ErrorState
        message={extractErrorMessage(comissoesApresentadoras.error ?? comissoesMarcas.error)}
        onRetry={() => {
          void comissoesApresentadoras.refetch()
          void comissoesMarcas.refetch()
        }}
      />
    )
  }

  return (
    <>
            <section className="space-y-4">
              {podeReprocessar ? (
                <Card>
                  <CardBody className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">Comissão zerada numa live que tem GMV?</p>
                      <p className="mt-0.5 text-xs text-ink-muted">Recalcula agora as lives encerradas sem comissão (não espera os 10 min) e lista as que continuarem zeradas e por quê.</p>
                    </div>
                    <Button onClick={() => reprocessar.mutate(typeof cp.mes === 'string' ? cp.mes : periodo.fim)} isLoading={reprocessar.isPending}>Recalcular comissões agora</Button>
                  </CardBody>
                  {reprocessar.isError ? (
                    <CardBody className="border-t border-line">
                      <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{extractErrorMessage(reprocessar.error)}</p>
                    </CardBody>
                  ) : null}
                  {reprocessar.data ? (
                    <CardBody className="space-y-2 border-t border-line text-sm">
                      <p className="text-ink">
                        <span className="font-bold text-[var(--success)]">{asNumber(reprocessar.data.recalculadas_com_comissao)}</span> live(s) recalculada(s) com comissão
                        {' · '}{asNumber(reprocessar.data.lives_sem_comissao_encontradas)} sem comissão encontradas
                      </p>
                      {asArray<JsonRecord>(reprocessar.data.ainda_zeradas).length ? (
                        <div className="rounded-xl bg-surface-muted px-3 py-2 text-xs text-ink">
                          <p className="mb-1 font-semibold text-[var(--warning)]">Ainda zeradas (precisa ajuste de cadastro):</p>
                          <ul className="space-y-0.5">
                            {asArray<JsonRecord>(reprocessar.data.ainda_zeradas).map((l) => (
                              <li key={asString(l.live_id)}>
                                {asString(l.nome)} · {asString(l.dia)} · GMV {formatMoney(l.gmv)} — <span className="text-ink-muted">{asString(l.motivo)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-ink-muted">Nenhuma live ficou zerada. ✅</p>
                      )}
                    </CardBody>
                  ) : null}
                </Card>
              ) : null}
              <details className="group rounded-2xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink">
                  <span>Regras de comissão</span>
                  <span className="text-xs font-normal text-ink-muted">expandir</span>
                </summary>
                <p className="border-t border-line px-4 py-3 text-xs text-ink-muted">
                  Live em sábado ou domingo usa 2%. Dias úteis e vídeos seguem as faixas mensais, com vínculo de marca e escada padrão como fallback.
                </p>
              </details>

              <div className="flex flex-wrap items-center justify-end gap-3">
                {comissoesExportError ? (
                  <p className="text-sm font-medium text-[var(--danger)]">{comissoesExportError}</p>
                ) : null}
                <Button type="button" variant="secondary" icon={Download} onClick={exportComissoesCsv} isLoading={exportingComissoes}>
                  Exportar comissões (CSV)
                </Button>
              </div>

              <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <p className="text-base font-bold text-ink">Comissão por apresentador</p>
                    <p className="mt-1 text-xs text-ink-muted">GMV base, vídeos e lives incluídos no cálculo. Clique numa linha para ver o detalhe e o histórico.</p>
                  </CardHeader>
                  <CardBody>
                    <DataTable<JsonRecord>
                      data={apresentadorasRows}
                      onRowClick={(item) => {
                        const id = asString(item.apresentadora_id ?? item.id, '')
                        if (id) navigate(`/apresentadoras/${id}`)
                      }}
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
                    <p className="mt-1 text-xs text-ink-muted">Valores por marca, cliente ou afiliada. Clique numa linha para abrir o detalhe.</p>
                  </CardHeader>
                  <CardBody>
                    <DataTable<JsonRecord>
                      data={marcasRows}
                      onRowClick={(item) => {
                        const id = asString(item.marca_id ?? item.id, '')
                        if (id) setSelectedCliente({ ...item, tipo_entidade: 'marca' })
                      }}
                      columns={[
                        { key: 'marca_nome', header: 'Marca', render: (item) => (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">{asString(item.marca_nome ?? item.nome)}</span>
                            <Badge tone={asString(item.marca_tipo ?? item.tipo) === 'afiliada' ? 'info' : 'brand'}>{asString(item.marca_tipo ?? item.tipo, 'cliente')}</Badge>
                          </div>
                        ) },
                        { key: 'gmv_total', header: 'GMV base', align: 'right', render: (item) => <span className="num">{formatMoney(item.gmv_total)}</span> },
                        { key: 'comissao_apresentadoras', header: 'Apresentadores', align: 'right', render: (item) => <span className="num">{formatMoney(item.comissao_apresentadoras)}</span> },
                        { key: 'comissao_fixo', header: 'Fixo', align: 'right', render: (item) => <span className="num">{formatMoney(item.comissao_fixo)}</span> },
                        { key: 'comissao_franquia', header: 'Franquia', align: 'right', render: (item) => <span className="num">{formatMoney(item.comissao_franquia)}</span> },
                      ]}
                    />
                    {marcasRows.length ? <TotalsBar items={[{ label: 'Total franquia', value: formatMoney(sumBy(marcasRows, 'comissao_franquia')) }]} /> : null}
                  </CardBody>
                </Card>
              </section>
            </section>
      <ClienteDetalheModal periodo={periodo} selected={selectedCliente} onClose={() => setSelectedCliente(null)} />
    </>
  )
}

function ClienteDetalheModal({ periodo, selected: selectedCliente, onClose }: { periodo: PeriodRange; selected: JsonRecord | null; onClose: () => void }) {
  const client = useQueryClient()
  const pk = periodKey(periodo)
  const fp = financeiroParams(periodo)
  const selectedTipo = asString(selectedCliente?.tipo_operacional ?? selectedCliente?.tipo_entidade)
  const selectedClienteKind = selectedTipo === 'afiliada' || selectedTipo === 'marca' || asString(selectedCliente?.tipo_entidade) === 'marca' ? 'marca' : 'cliente'
  const selectedClienteId = selectedClienteKind === 'marca'
    ? asString(selectedCliente?.marca_id ?? selectedCliente?.id, '')
    : asString(selectedCliente?.cliente_id ?? selectedCliente?.id, '')
  const selectedClienteDetail = useQuery({
    queryKey: QK.financeiroClienteOperacional({ clienteKind: selectedClienteKind, clienteId: selectedClienteId, periodo: pk }),
    enabled: Boolean(selectedClienteId),
    queryFn: () => selectedClienteKind === 'marca'
      ? getMarcaOperacional(selectedClienteId, fp)
      : getClienteOperacional(selectedClienteId, fp),
  })

  return (
      <Modal
        open={Boolean(selectedCliente)}
        title={`${selectedClienteKind === 'marca' ? 'Marca' : 'Cliente'}: ${asString(selectedCliente?.marca_nome ?? selectedCliente?.nome, '—')}`}
        subtitle="GMV, comissão, sessões de live e vídeos do período selecionado."
        size="xl"
        onClose={onClose}
      >
        {selectedClienteDetail.isLoading ? <LoadingState label="Carregando histórico" /> : null}
        {selectedClienteDetail.isError ? <ErrorState message={extractErrorMessage(selectedClienteDetail.error)} onRetry={() => void selectedClienteDetail.refetch()} /> : null}
        {selectedClienteDetail.data ? (() => {
          const m = getRecord(selectedClienteDetail.data.metrics)
          const cadastro = getRecord(selectedClienteDetail.data.marca ?? selectedClienteDetail.data.cliente)
          const lives = asArray<JsonRecord>(selectedClienteDetail.data.lives)
          const vendas = asArray<JsonRecord>(selectedClienteDetail.data.vendas_atribuidas)
          const comissao = asNumber(m.comissao_franquia) + asNumber(m.comissao_franqueadora)
          return (
            <div className="space-y-4">
              <CadastroQuickEdit
                kind={selectedClienteKind}
                record={cadastro}
                onSaved={() => {
                  void client.invalidateQueries({ queryKey: QK.financeiroClienteOperacional({ clienteKind: selectedClienteKind, clienteId: selectedClienteId }) })
                  void client.invalidateQueries({ queryKey: QK.comissoesMarcas })
                  void client.invalidateQueries({ queryKey: QK.financeiroResumo() })
                  void client.invalidateQueries({ queryKey: QK.financeiroFaturamento() })
                }}
              />
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  moneyMetric('GMV no período', m.gmv_mes, 'lives + vídeos', 'brand'),
                  moneyMetric('Comissão de franquia', comissao, 'franquia + franqueadora', 'success'),
                  metric('Lives', m.total_lives ?? 0, 'no período', 'neutral'),
                  metric('Vídeos', m.total_videos ?? 0, 'no período', 'info'),
                ].map((item, index) => <MetricCard key={item.label} metric={item} icon={[CircleDollarSign, Percent, Users, Receipt][index]} />)}
              </section>

              <Card>
                <CardHeader><p className="text-base font-bold text-ink">Sessões de live</p></CardHeader>
                <CardBody>
                  {lives.length ? (
                    <DataTable<JsonRecord>
                      data={lives}
                      columns={[
                        { key: 'iniciado_em', header: 'Data', render: (item) => asString(item.iniciado_em).slice(0, 10) },
                        { key: 'apresentadora_nome', header: 'Apresentadora', render: (item) => asString(item.apresentadora_nome, '—') },
                        { key: 'gmv', header: 'GMV', align: 'right', render: (item) => <span className="num">{formatMoney(item.gmv)}</span> },
                        { key: 'status', header: 'Status', render: (item) => <Badge tone={asString(item.status) === 'encerrada' ? 'success' : 'neutral'}>{asString(item.status, '—')}</Badge> },
                      ]}
                    />
                  ) : (
                    <EmptyState title="Sem lives no período" description="Nenhuma live encerrada para este cadastro no período selecionado." />
                  )}
                </CardBody>
              </Card>

              {vendas.length ? (
                <Card>
                  <CardHeader><p className="text-base font-bold text-ink">Comissões atribuídas</p></CardHeader>
                  <CardBody>
                    <DataTable<JsonRecord>
                      data={vendas}
                      columns={[
                        { key: 'data', header: 'Data', render: (item) => asString(item.data).slice(0, 10) },
                        { key: 'origem', header: 'Origem', render: (item) => asString(item.origem) },
                        { key: 'gmv', header: 'GMV', align: 'right', render: (item) => <span className="num">{formatMoney(item.gmv)}</span> },
                        { key: 'comissao_franquia', header: 'Comissão franquia', align: 'right', render: (item) => <span className="num">{formatMoney(item.comissao_franquia)}</span> },
                      ]}
                    />
                  </CardBody>
                </Card>
              ) : null}
            </div>
          )
        })() : null}
      </Modal>
  )
}
