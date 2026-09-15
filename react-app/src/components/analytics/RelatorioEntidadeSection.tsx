import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CircleDollarSign, Clock, FileDown, Film, Radio, ReceiptText, ShoppingBag, TrendingUp } from 'lucide-react'
import { MetricCard } from '../ui/MetricCard'
import { DataTable } from '../ui/DataTable'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { getComissoesApresentadoras, getComissoesMarcas, getDailyAnalytics, getMarca } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { asArray, asNumber, asString, formatMoney, unwrapList } from '../../utils/format'
import { metric, moneyMetric, sumDailyTotals } from '../../pages/page-helpers'
import { QK } from '../../services/query-keys'
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

  const rows = unwrapList<JsonRecord>(query.data)
    .slice()
    .sort((a, b) => asString(a.dia).localeCompare(asString(b.dia)))
  const totals = sumDailyTotals(rows)
  const pendingLives = rows.reduce((total, row) => total + asNumber(row.total_lives_pendentes_aprovacao), 0)
  const emConciliacao = rows.some(row => row.em_conciliacao)

  // % de franquia: prioriza o valor FRESCO da API pela marcaId; cai pro prop se
  // ainda não carregou. Comissão = GMV total × % (tempo real, qualquer mês).
  const franquiaPctFromApi = marcaPctQuery.data?.comissao_franquia_pct
  const franquiaPctNum = asNumber(franquiaPctFromApi ?? franquiaPct)
  const semFranquiaPct = tipo === 'marca' && !marcaPctQuery.isLoading && franquiaPctNum <= 0

  function buildMetrics(t: ReturnType<typeof sumDailyTotals>, row: JsonRecord | undefined = comissaoRow, dailyRows: JsonRecord[] = rows): Metric[] {
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
      metric('Vídeos', t.total_videos.toLocaleString('pt-BR'), 'no mês', 'neutral'),
      metric('Pedidos', t.pedidos.toLocaleString('pt-BR'), 'atribuídos', 'success'),
      moneyMetric('Ticket médio', t.ticket_medio, 'GMV / pedidos', 'neutral'),
      moneyMetric('GMV / hora', t.gmv_por_hora, 'GMV lives / horas de live', 'success'),
      moneyMetric('GMV / live', t.gmv_por_live, 'GMV total / live', 'info'),
      ...comissaoMetrics,
      ...(hasPending ? [
        metric('Impressões pendentes', dailyRows.reduce((sum, item) => sum + asNumber(item.impressoes_pendentes_aprovacao), 0).toLocaleString('pt-BR'), 'Declaradas; aguardam validação', 'neutral'),
        metric('Visualizações pendentes', dailyRows.reduce((sum, item) => sum + asNumber(item.visualizacoes_pendentes_aprovacao), 0).toLocaleString('pt-BR'), 'Declaradas; aguardam validação', 'neutral'),
      ] : []),
    ]
  }

  const metrics = buildMetrics(totals)

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
        metrics: buildMetrics(sumDailyTotals(pdfRows), freshComissao, pdfRows).map((m) => ({ label: m.label, value: m.value })),
        tables: [{
          title: 'Detalhamento diário',
          head: ['Dia', 'Marca', 'GMV lives', 'R$ comissão', '% comissão', 'Horas', 'Pedidos'],
          rightAlign: [2, 3, 4, 5, 6],
          body: pdfRows.map((r) => [
            diaCurto(r.dia),
            `${asString(r.marca_nome, '—')}${r.pendente_aprovacao ? ` · Pendente aprovação: ${formatMoney(r.gmv_pendente_aprovacao)}${r.em_conciliacao ? ' · conferir vínculo (não somado)' : ' (incluído)'}` : ''}`,
            formatMoney(r.gmv_lives ?? r.gmv),
            r.pendente_aprovacao && r.comissao_apresentadora == null ? 'Aguardando validação' : `${formatMoney(r.comissao_apresentadora)}${r.pendente_aprovacao ? ' · somente validada' : ''}`,
            r.pendente_aprovacao && r.comissao_apresentadora == null ? '—' : `${asNumber(r.comissao_pct).toFixed(2)}%`,
            asNumber(r.horas_live).toFixed(1),
            asNumber(r.pedidos ?? r.total_pedidos).toLocaleString('pt-BR'),
          ]),
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
              <div>
                <p className="mb-2 text-sm font-bold text-ink">Detalhamento diário</p>
                <DataTable<JsonRecord>
                  data={rows}
                  columns={[
                    { key: 'dia', header: 'Dia', render: (r) => diaCurto(r.dia) },
                    { key: 'marca_nome', header: 'Marca', render: (r) => asString(r.marca_nome, '—') },
                    { key: 'gmv_lives', header: 'GMV lives', align: 'right', render: (r) => <span>{formatMoney(r.gmv_lives ?? r.gmv)}{asNumber(r.gmv_pendente_aprovacao) > 0 ? <small className="block text-[var(--warning)]">{r.em_conciliacao ? 'Declarado pendente (conferir vínculo): ' : 'Inclui pendente: '}{formatMoney(r.gmv_pendente_aprovacao)}</small> : null}</span> },
                    { key: 'comissao_apresentadora', header: 'R$ comissão', align: 'right', render: (r) => r.pendente_aprovacao && r.comissao_apresentadora == null ? 'Aguardando validação' : formatMoney(r.comissao_apresentadora) },
                    { key: 'comissao_pct', header: '% comissão', align: 'right', render: (r) => r.pendente_aprovacao && r.comissao_apresentadora == null ? '—' : `${asNumber(r.comissao_pct).toFixed(2)}%` },
                    { key: 'horas_live', header: 'Horas', align: 'right', render: (r) => asNumber(r.horas_live).toFixed(1) },
                    { key: 'pedidos', header: 'Pedidos', align: 'right', render: (r) => asNumber(r.pedidos ?? r.total_pedidos).toLocaleString('pt-BR') },
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
