import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CircleDollarSign, Clock, FileDown, Film, Radio, ReceiptText, ShoppingBag, TrendingUp } from 'lucide-react'
import { MetricCard } from '../ui/MetricCard'
import { DataTable } from '../ui/DataTable'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { getComissoesApresentadoras, getComissoesMarcas, getDailyAnalytics, getMarca } from '../../services/domain'
import { getPresenterSettlement, type PresenterSettlementRow, type PresenterSpecialDay } from '../../services/remuneration'
import { extractErrorMessage } from '../../services/api'
import { asArray, asNumber, asString, formatMoney, getRecord, unwrapList } from '../../utils/format'
import { metric, moneyMetric, sumDailyTotals } from '../../pages/page-helpers'
import { QK } from '../../services/query-keys'
import { bonusRuleLabel, hoursGoalLabel, monthLabel, settlementKey, SettlementTotalCards, specialDayLabel, specialDaysPdfTable } from '../financeiro/PresenterSettlement'
import { useCurrentUser } from '../../stores/auth-store'
import type { PdfMetric } from '../../utils/pdfReport'
import type { JsonRecord, Metric } from '../../types/models'

interface RelatorioEntidadeSectionProps {
  from: string
  to: string
  marcaId: string
  apresentadoraId: string
  nomeEntidade: string
  comissaoRow?: JsonRecord
  /** % de comissão de franquia cadastrado na marca selecionada (0 = não configurado). */
  franquiaPct?: number
}

function diaCurto(value: unknown): string {
  const raw = asString(value, '')
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}` : raw || '—'
}

// Meta de vídeos do período: soma das metas diárias (dias úteis) que o
// /analytics/diario devolve quando o relatório é de apresentadora. null = sem meta.
function metaVideosDoPeriodo(data: unknown): number | null {
  const metas = Object.values(getRecord(getRecord(data).meta_videos_por_dia))
  return metas.length ? metas.reduce<number>((sum, value) => sum + asNumber(value), 0) : null
}

// Tag do dia: feriado (nome vem do fechamento) ou Sáb/Dom pela própria data (sem fuso: Date.UTC).
function diaTag(dia: string, especiais: PresenterSpecialDay[] = []): string | null {
  const feriado = especiais.find((d) => d.data === dia && d.tipo === 'feriado')
  if (feriado) return specialDayLabel(feriado)
  const m = dia.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const dow = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()
  return dow === 0 ? 'Dom' : dow === 6 ? 'Sáb' : null
}

function closingPdfMetrics(row: PresenterSettlementRow, mes: string): PdfMetric[] {
  // O fechamento é do mês inteiro, mesmo quando o relatório filtra só parte dele.
  return [
    { label: 'Fechamento (mês inteiro)', value: monthLabel(mes) },
    { label: 'Fixo', value: formatMoney(row.fixo, true) },
    { label: 'Comissão do fechamento', value: formatMoney(row.comissao, true) },
    { label: 'Bônus fds/feriado', value: formatMoney(row.bonus_fim_de_semana ?? 0, true) },
    { label: 'Ajustes excepcionais', value: formatMoney(row.adicionais, true) },
    { label: 'Total a pagar', value: formatMoney(row.total, true) },
    { label: 'Horas em dias úteis / meta', value: hoursGoalLabel(row.horas) },
  ]
}

function brDate(iso: string): string {
  return iso.split('-').reverse().join('/')
}

export function RelatorioEntidadeSection({ from, to, marcaId, apresentadoraId, nomeEntidade, comissaoRow, franquiaPct }: RelatorioEntidadeSectionProps) {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const tipo: 'marca' | 'apresentadora' = marcaId ? 'marca' : 'apresentadora'

  // Usa o intervalo completo (from/to) — não um mês único. Isso evita perder dados
  // quando a janela cruza meses (ex.: "7 dias" = 31/05 → 06/06).
  const periodoLabel = from === to ? brDate(from) : `${brDate(from)} → ${brDate(to)}`
  const mesToken = from === to ? from : `${from}_a_${to}`

  const query = useQuery({
    queryKey: QK.analyticsDailyRange(from, to, marcaId, apresentadoraId),
    queryFn: () => getDailyAnalytics({ from, to, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }),
    enabled: Boolean(marcaId || apresentadoraId),
    staleTime: 5 * 60_000,
  })

  // Lê o % de franquia FRESCO da marca do relatório. O endpoint individual tem
  // o mesmo readAccess da lista e inclui marcas inativas, sem baixar o cadastro
  // inteiro nem perder uma marca histórica selecionada.
  const marcaPctQuery = useQuery({
    queryKey: ['relatorio-marca-pct', marcaId],
    queryFn: () => getMarca(marcaId),
    enabled: tipo === 'marca' && Boolean(marcaId),
    staleTime: 0,
  })

  // Fechamento mensal da apresentadora: mesma query key do Financeiro > Fechamento (cache compartilhado).
  // Erro (403) ou sem linha = seção some; o resto do relatório segue.
  const user = useCurrentUser()
  const mesFechamento = from.slice(0, 7)
  const fechamentoAtivo = tipo === 'apresentadora' && Boolean(apresentadoraId) && from.slice(0, 7) === to.slice(0, 7)
  const settlementQuery = useQuery({
    queryKey: settlementKey(user?.tenant_id ?? 'anonymous', mesFechamento),
    queryFn: () => getPresenterSettlement(mesFechamento),
    enabled: fechamentoAtivo,
    retry: false,
  })
  const [anoF, mesF] = mesFechamento.split('-').map(Number)
  const mesInteiro = from === `${mesFechamento}-01` && to === `${mesFechamento}-${String(new Date(Date.UTC(anoF, mesF, 0)).getUTCDate()).padStart(2, '0')}`
  const fechamentoRow = fechamentoAtivo ? settlementQuery.data?.apresentadoras.find((a) => a.apresentadora_id === apresentadoraId) : undefined

  const rows = unwrapList<JsonRecord>(query.data)
    .slice()
    .sort((a, b) => asString(a.dia).localeCompare(asString(b.dia)))
  const totals = sumDailyTotals(rows)
  const metaVideos = metaVideosDoPeriodo(query.data)
  const pendingLives = rows.reduce((total, row) => total + asNumber(row.total_lives_pendentes_aprovacao), 0)
  const emConciliacao = rows.some(row => row.em_conciliacao)

  // % de franquia: prioriza o valor FRESCO da API pela marcaId; cai pro prop se
  // ainda não carregou. Comissão = GMV total × % (tempo real, qualquer mês).
  const franquiaPctFromApi = marcaPctQuery.data?.comissao_franquia_pct
  const franquiaPctNum = asNumber(franquiaPctFromApi ?? franquiaPct)
  const semFranquiaPct = tipo === 'marca' && !marcaPctQuery.isLoading && franquiaPctNum <= 0

  function buildMetrics(t: ReturnType<typeof sumDailyTotals>, row: JsonRecord | undefined = comissaoRow, dailyRows: JsonRecord[] = rows, metaVideosPeriodo: number | null = metaVideos): Metric[] {
    const hasPending = dailyRows.some(item => item.pendente_aprovacao)
    const pendingOnly = hasPending && dailyRows.every(item => item.pendente_aprovacao && item.comissao_apresentadora == null)
    // Comissão de franquia: SEMPRE preferir o valor do endpoint /comissoes/marcas —
    // ele aplica MAX(piso, gmv×pct); o cálculo local (gmv×pct) é só fallback de loading.
    const comissaoMetrics: Metric[] = pendingOnly
      ? [metric(tipo === 'marca' ? 'Comissão franquia' : 'Comissão', 'Aguardando validação', 'Envios pendentes não geram comissão', 'neutral')]
      : tipo === 'marca'
        ? [moneyMetric('Comissão franquia', row?.comissao_franquia ?? dailyRows.reduce((sum, item) => sum + asNumber(item.gmv_validado ?? item.gmv_total), 0) * (franquiaPctNum / 100), hasPending ? 'Somente registros validados' : `${franquiaPctNum.toLocaleString('pt-BR')}% do GMV · respeita piso`, 'success')]
        : [moneyMetric('Comissão', row?.comissao_apresentadora ?? 0, hasPending ? 'Somente registros validados' : 'no período', 'success')]
    return [
      moneyMetric(dailyRows.some(item => item.em_conciliacao) ? 'Subtotal em conciliação' : hasPending ? 'GMV provisório' : 'GMV total (faturamento)', t.gmv_total, 'lives + vídeos', 'brand'),
      moneyMetric('GMV lives', t.gmv_lives, 'vendas em live', 'info'),
      moneyMetric('GMV vídeos', t.gmv_videos, 'vendas em vídeo', 'info'),
      metric('Horas de live', t.horas_live.toFixed(1), 'lives encerradas', 'neutral'),
      metric('Lives realizadas', t.total_lives.toLocaleString('pt-BR'), 'no mês', 'neutral'),
      metaVideosPeriodo == null
        ? metric('Vídeos', t.total_videos.toLocaleString('pt-BR'), 'no período', 'neutral')
        : metric('Vídeos', `${t.total_videos.toLocaleString('pt-BR')} / ${metaVideosPeriodo.toLocaleString('pt-BR')}`, 'realizado / meta (dias úteis)', t.total_videos >= metaVideosPeriodo ? 'success' : 'warning'),
      metric('Pedidos', t.pedidos.toLocaleString('pt-BR'), 'atribuídos', 'success'),
      moneyMetric('Ticket médio', t.ticket_medio, 'GMV / pedidos', 'neutral'),
      moneyMetric('GMV / hora', t.gmv_por_hora, 'GMV lives / horas de live', 'success'),
      moneyMetric('GMV / live', t.gmv_por_live, 'GMV lives / live', 'info'),
      ...comissaoMetrics,
      ...(hasPending ? [
        metric('Impressões pendentes', dailyRows.reduce((sum, item) => sum + asNumber(item.impressoes_pendentes_aprovacao), 0).toLocaleString('pt-BR'), 'Declaradas; aguardam validação', 'neutral'),
        metric('Visualizações pendentes', dailyRows.reduce((sum, item) => sum + asNumber(item.visualizacoes_pendentes_aprovacao), 0).toLocaleString('pt-BR'), 'Declaradas; aguardam validação', 'neutral'),
      ] : []),
    ]
  }

  const metrics = buildMetrics(totals)

  // Comissão da linha: marca = franquia (GMV validado × % franquia, mesma base da métrica-título);
  // apresentadora = faixa da apresentadora. null = pendente sem comissão calculada.
  function rowComissao(r: JsonRecord): { valor: number, pct: number } | null {
    if (r.pendente_aprovacao && r.comissao_apresentadora == null) return null
    if (tipo === 'marca') return { valor: asNumber(r.gmv_validado ?? r.gmv_total) * franquiaPctNum / 100, pct: franquiaPctNum }
    return { valor: asNumber(r.comissao_apresentadora), pct: asNumber(r.comissao_pct) }
  }

  const icons = [CircleDollarSign, Radio, Film, Clock, Radio, Film, ShoppingBag, ReceiptText, TrendingUp, TrendingUp, CircleDollarSign, CircleDollarSign]

  async function exportPdf() {
    setExporting(true)
    try {
      // O Fechamento recalcula comissões no servidor — refetch aqui garante PDF
      // fresco mesmo dentro do staleTime de 5min do cache local. refetch() não
      // rejeita em erro: checar isError para não exportar cache velho como "fresco".
      const fresh = await query.refetch()
      if (fresh.isError) {
        toast.push(extractErrorMessage(fresh.error), 'error')
        return
      }
      const pdfRows = unwrapList<JsonRecord>(fresh.data ?? query.data)
        .slice()
        .sort((a, b) => asString(a.dia).localeCompare(asString(b.dia)))
      if (pdfRows.length === 0) {
        toast.push('Sem dados para exportar neste período.', 'error')
        return
      }
      // A comissão-título vem da prop comissaoRow (cache do pai, staleTime 5min) —
      // busca fresca aqui pelo mesmo motivo do refetch acima. Falhou (403/rede)?
      // Mantém o valor da tela, como antes.
      let freshComissao = comissaoRow
      try {
        const filtros = { data_inicio: from, data_fim: to, marca_id: marcaId || undefined, apresentadora_id: apresentadoraId || undefined }
        freshComissao = (tipo === 'marca'
          ? asArray<JsonRecord>(await getComissoesMarcas(filtros))[0]
          : asArray<JsonRecord>(await getComissoesApresentadoras(filtros))[0]) ?? comissaoRow
      } catch {
        /* ponytail: sem acesso a comissões ou rede instável — segue com a prop */
      }
      const { buildRelatorioPdf } = await import('../../utils/pdfReport')
      buildRelatorioPdf({
        titulo: nomeEntidade || (tipo === 'marca' ? 'Marca' : 'Apresentadora'),
        subtitulo: `${tipo === 'marca' ? 'Relatório por marca' : 'Relatório por apresentadora'}${pdfRows.some(r => r.em_conciliacao) ? ' · Em conciliação: total consolidado indisponível' : pdfRows.some(r => r.pendente_aprovacao) ? ' · Total provisório: inclui pendentes de aprovação' : ''}`,
        mes: mesToken,
        metrics: [
          ...buildMetrics(sumDailyTotals(pdfRows), freshComissao, pdfRows, metaVideosDoPeriodo(fresh.data ?? query.data)).map((m) => ({ label: m.label, value: m.value })),
          ...(fechamentoRow ? closingPdfMetrics(fechamentoRow, mesFechamento) : []),
        ],
        tables: [...(fechamentoRow?.dias_especiais?.length ? [specialDaysPdfTable(fechamentoRow.dias_especiais, mesFechamento)] : []), {
          title: 'Detalhamento diário',
          head: ['Dia', 'Início', 'Fim', 'Marca', 'GMV lives', 'R$ comissão', '% comissão', 'Horas', 'Pedidos', 'Vídeos'],
          rightAlign: [4, 5, 6, 7, 8, 9],
          body: pdfRows.map((r) => {
            const c = rowComissao(r)
            return [
              diaCurto(r.dia),
              asString(r.hora_inicio, '—'),
              asString(r.hora_fim, '—'),
              `${asString(r.marca_nome, '—')}${r.pendente_aprovacao ? ` · Pendente aprovação: ${formatMoney(r.gmv_pendente_aprovacao)}${r.em_conciliacao ? ' · conferir vínculo (não somado)' : ' (incluído)'}` : ''}`,
              formatMoney(r.gmv_lives ?? r.gmv),
              c ? `${formatMoney(c.valor)}${r.pendente_aprovacao ? ' · somente validada' : ''}` : 'Aguardando validação',
              c ? `${c.pct.toFixed(2)}%` : '—',
              asNumber(r.horas_live).toFixed(1),
              asNumber(r.pedidos ?? r.total_pedidos).toLocaleString('pt-BR'),
              asNumber(r.total_videos).toLocaleString('pt-BR'),
            ]
          }),
        }],
        geradoEm: new Date().toLocaleString('pt-BR'),
      })
      toast.push('PDF gerado', 'success')
    } catch (err) {
      toast.push(extractErrorMessage(err), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-muted">
                {tipo === 'marca' ? 'Relatório da marca' : 'Relatório da apresentadora'} · PDF
              </p>
              <h3 className="mt-0.5 text-lg font-extrabold tracking-[-0.01em] text-ink">{nomeEntidade || '—'}</h3>
              <p className="mt-0.5 text-sm text-ink-muted">{periodoLabel} · consolidado a partir do dia-a-dia atribuído.</p>
            </div>
            <Button type="button" icon={FileDown} onClick={exportPdf} isLoading={exporting} disabled={query.isLoading || rows.length === 0}>
              Exportar PDF
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {semFranquiaPct ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning-soft)] px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                <p className="text-sm text-ink">
                  <span className="font-bold">{nomeEntidade || 'Esta marca'}</span> está sem <span className="font-bold">% de comissão de franquia</span> cadastrado — por isso a comissão sai como R$ 0,00.
                  <span className="block text-xs text-ink-muted">Cadastre o percentual em Clientes → marca, no campo “% franquia”.</span>
                </p>
              </div>
              <Link
                to={`/clientes?ativo=${encodeURIComponent(nomeEntidade)}`}
                className="shrink-0 rounded-full bg-[var(--warning)] px-4 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                Cadastrar % de franquia
              </Link>
            </div>
          ) : null}
          {emConciliacao ? <p role="status" className="mb-3 text-sm text-[var(--warning)]">Em conciliação: o total consolidado está indisponível. Os subtotais exibidos excluem envios com possível vínculo; os valores declarados continuam discriminados abaixo.</p> : null}{pendingLives > 0 ? <div className="mb-4 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning-soft)] px-4 py-3 text-sm text-ink"><strong>{pendingLives} live{pendingLives > 1 ? 's' : ''} pendente{pendingLives > 1 ? 's' : ''} de aprovação</strong> nos relatórios operacionais; valores sujeitos à conciliação são discriminados separadamente. Comissão só é calculada após a validação da gestão.</div> : null}
          {query.isLoading ? (
            <p className="py-6 text-center text-sm text-ink-muted">Carregando relatório...</p>
          ) : query.isError ? (
            <p className="py-6 text-center text-sm text-[var(--danger)]">{extractErrorMessage(query.error)}</p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Sem dados atribuídos para esta seleção no mês.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((item, index) => (
                  <MetricCard key={item.label} metric={item} icon={icons[index]} />
                ))}
              </div>
              {tipo === 'apresentadora' && from.slice(0, 7) !== to.slice(0, 7) ? (
                <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">O fechamento é mensal: selecione um único mês para ver o valor a pagar.</p>
              ) : null}
              {fechamentoRow ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="text-sm font-bold text-ink">Fechamento do mês · {monthLabel(mesFechamento)}</p><p className="mt-0.5 text-xs text-ink-muted">Bônus sáb/dom/feriado: {bonusRuleLabel(mesFechamento)}.</p>{mesInteiro ? null : <p className="mt-0.5 text-xs text-ink-muted">Valores do mês inteiro, não só de {periodoLabel}.</p>}</div>
                    {fechamentoRow.horas ? (
                      <Badge tone={fechamentoRow.horas.bateu_meta ? 'success' : 'warning'}>{fechamentoRow.horas.bateu_meta ? 'Bateu a meta de horas' : 'Abaixo da meta de horas'}</Badge>
                    ) : null}
                  </div>
                  <SettlementTotalCards row={fechamentoRow} />
                  {fechamentoRow.horas ? (
                    <p className="text-sm text-ink-muted">Horas em dias úteis: <span className="num font-semibold text-ink">{hoursGoalLabel(fechamentoRow.horas)}</span> · {fechamentoRow.horas.dias_uteis} dias úteis</p>
                  ) : null}
                  {fechamentoRow.dias_especiais?.length ? (
                    <DataTable<PresenterSpecialDay>
                      data={fechamentoRow.dias_especiais}
                      columns={[
                        { key: 'data', header: 'Data', render: (r) => diaCurto(r.data) },
                        { key: 'tipo', header: 'Dia', render: (r) => specialDayLabel(r) },
                        { key: 'horas', header: 'Horas', render: (r) => `${r.horas.toFixed(1)}h` },
                        { key: 'bonus', header: 'Bônus', render: (r) => formatMoney(r.bonus, true) },
                        { key: 'gmv', header: 'GMV', render: (r) => formatMoney(r.gmv, true) },
                        { key: 'comissao', header: 'Comissão', render: (r) => formatMoney(r.comissao, true) },
                      ]}
                    />
                  ) : <p className="text-sm text-ink-muted">Nenhuma live em sábado, domingo ou feriado neste mês.</p>}
                </div>
              ) : null}
              <div>
                <p className="mb-2 text-sm font-bold text-ink">Detalhamento diário</p>
                <DataTable<JsonRecord>
                  data={rows}
                  columns={[
                    { key: 'dia', header: 'Dia', render: (r) => <span>{diaCurto(asString(r.dia))}{diaTag(asString(r.dia), fechamentoRow?.dias_especiais) ? <Badge tone="neutral">{diaTag(asString(r.dia), fechamentoRow?.dias_especiais)}</Badge> : null}</span> },
                    { key: 'hora_inicio', header: 'Início', render: (r) => asString(r.hora_inicio, '—') },
                    { key: 'hora_fim', header: 'Fim', render: (r) => asString(r.hora_fim, '—') },
                    { key: 'marca_nome', header: 'Marca', render: (r) => asString(r.marca_nome, '—') },
                    { key: 'gmv_lives', header: 'GMV lives', align: 'right', render: (r) => <span>{formatMoney(r.gmv_lives ?? r.gmv)}{asNumber(r.gmv_pendente_aprovacao) > 0 ? <small className="block text-[var(--warning)]">{r.em_conciliacao ? 'Declarado pendente (conferir vínculo): ' : 'Inclui pendente: '}{formatMoney(r.gmv_pendente_aprovacao)}</small> : null}</span> },
                    { key: 'comissao_apresentadora', header: 'R$ comissão', align: 'right', render: (r) => { const c = rowComissao(r); return c ? formatMoney(c.valor) : 'Aguardando validação' } },
                    { key: 'comissao_pct', header: '% comissão', align: 'right', render: (r) => { const c = rowComissao(r); return c ? `${c.pct.toFixed(2)}%` : '—' } },
                    { key: 'horas_live', header: 'Horas', align: 'right', render: (r) => asNumber(r.horas_live).toFixed(1) },
                    { key: 'pedidos', header: 'Pedidos', align: 'right', render: (r) => asNumber(r.pedidos ?? r.total_pedidos).toLocaleString('pt-BR') },
                    { key: 'total_videos', header: 'Vídeos', align: 'right', render: (r) => asNumber(r.total_videos).toLocaleString('pt-BR') },
                  ]}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  )
}
