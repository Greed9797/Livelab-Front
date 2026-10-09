import clsx from 'clsx'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarDays, Landmark, Settings2, Wallet } from 'lucide-react'
import { useCaixaOperacional } from '../../hooks/useFinanceiro'
import type { CaixaOperacionalMovimento, CaixaOperacionalResponse } from '../../types/financeiro'
import { mesLabel } from '../../utils/financeiro'
import { formatDate, formatMoney } from '../../utils/format'
import { LinePanel } from '../charts/Charts'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ErrorState, LoadingState } from '../ui/States'
import { extractErrorMessage } from '../../services/api'

export type CaixaDetalhe = 'entradas' | 'saidas' | null

interface CaixaOperacionalPanelProps {
  mes: string
  detalhe: CaixaDetalhe
  podeEscrever: boolean
  onConfigurar: () => void
  onMesChange: (mes: string) => void
  onDetalheChange: (detalhe: CaixaDetalhe, mes?: string) => void
}

function dinheiro(value: number | null): string {
  return value === null ? 'Indisponível' : formatMoney(value, true)
}

function dataCurta(value: string): string {
  return formatDate(value).slice(0, 5)
}

function tituloMes(value: string): string {
  return mesLabel(value).replace(/^./, (char) => char.toUpperCase())
}

function origemLabel(value: string): string {
  if (value === 'registrado_no_sistema') return 'movimentos registrados no LiveLab'
  return value.replaceAll('_', ' ')
}

function direcaoMovimento(item: CaixaOperacionalMovimento): Exclude<CaixaDetalhe, null> {
  const efeito = item.valor * (item.natureza === 'receita' ? 1 : -1)
  return efeito >= 0 ? 'entradas' : 'saidas'
}

function projecaoConsolidada(data: CaixaOperacionalResponse): boolean {
  return data.completude.saldo_configurado
    && data.completude.obrigacoes_com_data
    && data.completude.obrigacoes_consistentes
    && data.completude.comissoes_futuras_estimadas
    && data.completude.historico_obrigacoes_completo
    && data.completude.repasses_pendentes_incluidos_no_saldo
}

function Completeness({ data }: { data: CaixaOperacionalResponse }) {
  const itens = [
    !data.completude.obrigacoes_com_data ? `${data.pendencias.sem_data.length} item(ns) sem data defensável ficaram fora da curva` : '',
    !data.completude.obrigacoes_consistentes ? 'há valores que precisam de conferência' : '',
    !data.completude.historico_obrigacoes_completo ? 'o histórico de obrigações está incompleto' : '',
    !data.completude.comissoes_futuras_estimadas ? 'comissões futuras ainda não estão estimadas' : '',
    !data.completude.repasses_pendentes_incluidos_no_saldo ? 'repasses pendentes não compõem o saldo' : '',
  ].filter(Boolean)
  return (
    <aside className="rounded-2xl border border-[var(--warning-soft)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-ink" aria-label="Completude da projeção">
      <p className="font-semibold">{projecaoConsolidada(data) ? 'Escopo da projeção' : 'Projeção parcial'}</p>
      <p className="mt-1 text-xs text-ink-muted">
        Inclui {data.completude.escopo.replaceAll('_', ' ')}. {itens.join('; ')}.
      </p>
    </aside>
  )
}

function MetricCard({ label, value, hint, icon: Icon, tone = 'default' }: {
  label: string
  value: number | null
  hint: string
  icon: typeof Wallet
  tone?: 'default' | 'entrada' | 'saida'
}) {
  const color = tone === 'entrada' ? 'var(--success)' : tone === 'saida' ? 'var(--warning)' : 'var(--text-primary)'
  return (
    <div className="design-card min-w-0 p-4 sm:p-5" role="group" aria-label={`${label}: ${dinheiro(value)}`}>
      <p className="flex items-start gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} aria-hidden />
        <span>{label}</span>
      </p>
      <p className="num mt-2 break-words text-2xl font-bold leading-tight text-ink">{dinheiro(value)}</p>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  )
}

function Drilldown({ data, mes, detalhe, total }: {
  data: CaixaOperacionalResponse
  mes: string
  detalhe: Exclude<CaixaDetalhe, null>
  total: number
}) {
  const obrigacoes = data.obrigacoes.filter((item) => item.data_vencimento?.startsWith(mes)
    && item.valor_projetado > 0 && (item.natureza === 'receita' ? 'entradas' : 'saidas') === detalhe)
  const movimentos = data.pendencias.movimentos_futuros.filter((item) => item.data?.startsWith(mes) && direcaoMovimento(item) === detalhe)
  const explicado = obrigacoes.reduce((sum, item) => sum + item.valor_projetado, 0)
    + movimentos.reduce((sum, item) => sum + Math.abs(item.valor), 0)
  const diferenca = Math.round((total - explicado) * 100) / 100
  return (
    <section className="rounded-2xl border border-line bg-surface" aria-label={`Detalhes de ${detalhe} de ${tituloMes(mes)}`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h3 className="font-bold text-ink">{detalhe === 'entradas' ? 'Entradas previstas' : 'Saídas previstas'} · {tituloMes(mes)}</h3>
          <p className="mt-0.5 text-xs text-ink-muted">Itens usados no total de {formatMoney(total, true)}.</p>
        </div>
        <Badge tone="info">{obrigacoes.length + movimentos.length} itens</Badge>
      </header>
      <ul className="divide-y divide-line">
        {obrigacoes.map((item) => (
          <li key={`obrigacao:${item.id}`} className="flex min-w-0 items-start justify-between gap-4 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{item.descricao}</p>
              <p className="mt-0.5 text-xs text-ink-muted">Vencimento {item.data_vencimento ? formatDate(item.data_vencimento) : 'não informado'} · {origemLabel(item.origem)} · {item.virtual ? 'previsto por regra' : 'título registrado'}</p>
            </div>
            <span className="num shrink-0 font-semibold text-ink">{formatMoney(item.valor_projetado, true)}</span>
          </li>
        ))}
        {movimentos.map((item) => (
          <li key={`movimento:${item.id}`} className="flex min-w-0 items-start justify-between gap-4 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{item.descricao}</p>
              <p className="mt-0.5 text-xs text-ink-muted">Movimento registrado para {item.data ? formatDate(item.data) : 'data não informada'} · {origemLabel(item.origem)} · fonte {item.fonte}</p>
            </div>
            <span className="num shrink-0 font-semibold text-ink">{formatMoney(Math.abs(item.valor), true)}</span>
          </li>
        ))}
        {Math.abs(diferenca) >= 0.01 ? (
          <li className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-ink-muted">
            <span>Outros movimentos agregados pelo servidor</span>
            <span className="num shrink-0 font-semibold text-ink">{formatMoney(diferenca, true)}</span>
          </li>
        ) : null}
        {obrigacoes.length === 0 && movimentos.length === 0 && Math.abs(diferenca) < 0.01 ? (
          <li className="px-4 py-5 text-sm text-ink-muted">Nenhum item compõe este total.</li>
        ) : null}
      </ul>
    </section>
  )
}

export function CaixaOperacionalPanel({ mes, detalhe, podeEscrever, onConfigurar, onMesChange, onDetalheChange }: CaixaOperacionalPanelProps) {
  const query = useCaixaOperacional()
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
  if (query.isPending || !query.data) return <LoadingState label="Carregando caixa e projeção dos próximos seis meses" />

  const data = query.data
  if (!data.caixa.configurado || data.caixa.saldo_atual === null) {
    return (
      <section className="rounded-[18px] border border-dashed border-[var(--primary)] bg-brand-soft px-4 py-5 sm:px-5" aria-label="Caixa não configurado">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface text-brand"><Landmark className="h-5 w-5" aria-hidden /></span>
            <div>
              <h2 className="font-bold text-ink">Saldo do caixa não configurado</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink-muted">Cadastre o saldo de abertura antes dos movimentos incluídos a partir da data de corte. A projeção não assume saldo zero.</p>
            </div>
          </div>
          {podeEscrever ? <Button icon={Settings2} onClick={onConfigurar}>Configurar abertura do caixa</Button> : <p className="text-sm font-semibold text-ink-muted">Peça a quem gerencia o financeiro para configurar a abertura.</p>}
        </div>
      </section>
    )
  }

  const entradas = data.meses.reduce((sum, item) => sum + item.entradas_projetadas, 0)
  const saidas = data.meses.reduce((sum, item) => sum + item.saidas_projetadas, 0)
  const ultimo = data.meses.at(-1)
  const consolidada = projecaoConsolidada(data)
  const mesSelecionado = data.meses.find((item) => item.mes === mes) ?? data.meses[0]
  const mesForaHorizonte = !data.meses.some((item) => item.mes === mes)
  const dias = data.serie_diaria.filter((item) => item.dia.startsWith(mesSelecionado.mes))
  const chartData = dias.filter((item) => item.saldo_disponivel_projetado !== null).map((item) => ({
    label: dataCurta(item.dia), value: item.saldo_disponivel_projetado as number,
  }))
  const totalDetalhe = detalhe === 'entradas' ? mesSelecionado.entradas_projetadas : mesSelecionado.saidas_projetadas
  const alertas = data.pendencias.recebiveis_vencidos.length + data.pendencias.pagaveis_vencidos.length + data.pendencias.sem_data.length

  return (
    <section className="space-y-5" aria-label="Caixa operacional">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">Caixa <span className="serif font-normal text-brand">operacional</span></h2>
          <p className="mt-1 text-sm text-ink-muted">Saldo registrado no sistema e projeção contínua de {formatDate(data.horizonte.inicio)} a {formatDate(data.horizonte.fim)}.</p>
        </div>
        <Badge tone={consolidada ? 'success' : 'warning'}>{consolidada ? 'Base completa' : 'Cenário parcial'}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={`Saldo registrado em ${dataCurta(data.data_base)}`} value={data.caixa.saldo_atual} icon={Landmark}
          hint={`Origem: ${origemLabel(data.caixa.origem)} · corte ${data.caixa.data_corte ? formatDate(data.caixa.data_corte) : 'não configurado'} · escopo ${origemLabel(data.caixa.escopo)}`} />
        <MetricCard label={`Entradas previstas até ${dataCurta(data.horizonte.fim)}`} value={entradas} icon={ArrowDownLeft} tone="entrada" hint="Somente obrigações e movimentos futuros datados." />
        <MetricCard label={`Saídas previstas até ${dataCurta(data.horizonte.fim)}`} value={saidas} icon={ArrowUpRight} tone="saida" hint={`Além disso, ${formatMoney(data.caixa.reserva_pagaveis_vencidos, true)} está reservado para pagáveis vencidos.`} />
        <MetricCard label={`${consolidada ? 'Saldo projetado' : 'Cenário parcial'} em ${dataCurta(data.horizonte.fim)}`} value={ultimo?.saldo_disponivel_final ?? null} icon={Wallet}
          hint="Saldo após movimentos projetados e reserva de pagáveis vencidos; não é saldo bancário." />
      </div>

      <Completeness data={data} />

      {alertas > 0 ? (
        <aside className="flex items-start gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" aria-hidden />
          <p><strong className="text-ink">Fora da curva:</strong> {data.pendencias.recebiveis_vencidos.length} recebíveis vencidos não presumidos como entrada, {data.pendencias.pagaveis_vencidos.length} pagáveis vencidos mantidos como reserva e {data.pendencias.sem_data.length} itens sem data.</p>
        </aside>
      ) : null}

      {mesForaHorizonte ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          O período {tituloMes(mes)} está fora deste horizonte de caixa. Os dados abaixo começam em {tituloMes(data.meses[0].mes)}.
          <Button variant="secondary" onClick={() => onMesChange(data.meses[0].mes)}>Ir para o início do horizonte</Button>
        </div>
      ) : null}

      <div className="design-card overflow-hidden">
        <header className="border-b border-line px-4 py-4 sm:px-5">
          <h3 className="font-bold text-ink">Próximos seis meses</h3>
          <p className="mt-1 text-xs text-ink-muted">Cada mês começa no fechamento projetado do anterior. Selecione entradas ou saídas para ver os itens.</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <caption className="sr-only">Projeção mensal contínua do caixa</caption>
            <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-muted">
              <tr><th className="px-4 py-3 text-left" scope="col">Mês</th><th className="px-3 py-3 text-right" scope="col">Saldo inicial</th><th className="px-3 py-3 text-right" scope="col">Entradas previstas</th><th className="px-3 py-3 text-right" scope="col">Saídas previstas</th><th className="px-3 py-3 text-right" scope="col">Saldo final</th><th className="px-4 py-3 text-right" scope="col">Menor saldo diário</th></tr>
            </thead>
            <tbody>
              {data.meses.map((item) => {
                const ativo = item.mes === mesSelecionado.mes
                return (
                  <tr key={item.mes} className={clsx('border-b border-line last:border-0', ativo && 'bg-brand-soft')}>
                    <th className="px-4 py-3 text-left" scope="row"><button type="button" className="font-semibold text-ink hover:underline" aria-current={ativo ? 'true' : undefined} onClick={() => { onMesChange(item.mes); onDetalheChange(null) }}>{tituloMes(item.mes)}</button></th>
                    <td className="num px-3 py-3 text-right text-ink">{dinheiro(item.saldo_inicial)}</td>
                    <td className="num px-3 py-3 text-right"><button type="button" className="font-semibold text-[var(--success)] underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60" disabled={item.entradas_projetadas === 0} onClick={() => onDetalheChange('entradas', item.mes)}>{formatMoney(item.entradas_projetadas, true)}</button></td>
                    <td className="num px-3 py-3 text-right"><button type="button" className="font-semibold text-[var(--warning)] underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60" disabled={item.saidas_projetadas === 0} onClick={() => onDetalheChange('saidas', item.mes)}>{formatMoney(item.saidas_projetadas, true)}</button></td>
                    <td className="num px-3 py-3 text-right font-semibold text-ink">{dinheiro(item.saldo_disponivel_final)}</td>
                    <td className={clsx('num px-4 py-3 text-right font-semibold', item.menor_saldo_diario !== null && item.menor_saldo_diario < 0 ? 'text-[var(--danger)]' : 'text-ink')}>{dinheiro(item.menor_saldo_diario)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detalhe ? <Drilldown data={data} mes={mesSelecionado.mes} detalhe={detalhe} total={totalDetalhe} /> : null}

      {chartData.length ? <LinePanel title={`Saldo diário disponível · ${tituloMes(mesSelecionado.mes)}`} subtitle="Realizado na data-base; projeção nos dias seguintes, após a reserva de pagáveis vencidos." data={chartData} /> : null}

      <details className="design-card overflow-hidden">
        <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 py-3 font-semibold text-ink sm:px-5"><CalendarDays className="h-4 w-4 text-brand" aria-hidden /> Detalhe diário de {tituloMes(mesSelecionado.mes)}</summary>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[820px] text-sm">
            <caption className="sr-only">Movimentos e saldo projetado por dia de {tituloMes(mesSelecionado.mes)}</caption>
            <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink-muted"><tr><th className="px-4 py-3 text-left">Data</th><th className="px-3 py-3 text-right">Entradas realizadas</th><th className="px-3 py-3 text-right">Saídas realizadas</th><th className="px-3 py-3 text-right">Entradas projetadas</th><th className="px-3 py-3 text-right">Saídas projetadas</th><th className="px-4 py-3 text-right">Saldo disponível projetado</th></tr></thead>
            <tbody>{dias.map((item) => <tr key={item.dia} className="border-b border-line last:border-0"><th className="px-4 py-2 text-left font-medium text-ink" scope="row">{formatDate(item.dia)}</th><td className="num px-3 py-2 text-right text-ink">{formatMoney(item.entradas_realizadas, true)}</td><td className="num px-3 py-2 text-right text-ink">{formatMoney(item.saidas_realizadas, true)}</td><td className="num px-3 py-2 text-right text-[var(--success)]">{formatMoney(item.entradas_projetadas, true)}</td><td className="num px-3 py-2 text-right text-[var(--warning)]">{formatMoney(item.saidas_projetadas, true)}</td><td className="num px-4 py-2 text-right font-semibold text-ink">{dinheiro(item.saldo_disponivel_projetado)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
