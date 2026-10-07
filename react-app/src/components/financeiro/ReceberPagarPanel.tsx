import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download, Search, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { extractErrorMessage } from '../../services/api'
import { consultarFinanceiro, exportarConsultaFinanceiro, formatConsultaMoney, type ConsultaFiltro, type ConsultaItem } from '../../services/financeiro-consulta'
import { consultarHistorico } from '../../services/financeiro-historico'
import type { Natureza } from '../../types/financeiro'
import { formatDataCurta, isMes } from '../../utils/financeiro'
import { Button } from '../ui/Button'
import { ErrorState } from '../ui/States'

const STATUSES = ['', 'previsto', 'pendente', 'atrasado', 'parcial', 'pago', 'perdido', 'cancelado'] as const
const ORIGENS = ['marca_fixo', 'marca_comissao', 'avulsa', 'manual', 'recorrente', 'parcela', 'apresentadora', 'imposto'] as const
const MONEY_INPUT = /^\d{1,13}(?:\.\d{1,2})?$/

function inputCents(value: string): bigint {
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0')
}

function itemKey(item: ConsultaItem): string {
  return `${item.origem}:${item.id}:${item.componente ?? ''}`
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function Detail({ item, onClose }: { item: ConsultaItem; onClose: () => void }) {
  const materializado = !item.virtual && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id)
  const historico = useQuery({
    queryKey: ['financeiro', 'historico', item.origem, item.id],
    queryFn: () => consultarHistorico(item.origem, item.id),
    enabled: materializado,
  })
  return (
    <aside aria-label={`Detalhe de ${item.descricao}`} className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-4 lg:w-80 lg:shrink-0">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink">{item.descricao}</h3>
        <button type="button" aria-label="Fechar detalhe" onClick={onClose} className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted"><X className="h-4 w-4" /></button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <dt className="text-ink-muted">Contraparte</dt><dd className="text-right text-ink">{item.cliente_nome ?? item.marca_nome ?? 'Não informada'}</dd>
        <dt className="text-ink-muted">Componente</dt><dd className="text-right text-ink">{item.componente ?? item.origem}</dd>
        <dt className="text-ink-muted">Competência</dt><dd className="text-right text-ink">{item.competencia.slice(0, 7)}</dd>
        <dt className="text-ink-muted">Vencimento</dt><dd className="text-right text-ink">{formatDataCurta(item.data_vencimento)}</dd>
        <dt className="text-ink-muted">Valor</dt><dd className="num text-right text-ink">{formatConsultaMoney(item.valor_previsto_exato)}</dd>
        <dt className="text-ink-muted">Liquidado</dt><dd className="num text-right text-ink">{formatConsultaMoney(item.valor_pago_exato)}</dd>
        <dt className="text-ink-muted">Em aberto</dt><dd className="num text-right font-semibold text-ink">{formatConsultaMoney(item.saldo_aberto)}</dd>
        {item.inconsistente ? <><dt className="text-ink-muted">Conferência</dt><dd className="text-right text-ink">Saldo negativo; conferir baixa</dd></> : null}
        <dt className="text-ink-muted">Situação</dt><dd className="text-right text-ink">{item.status}</dd>
      </dl>
      {item.observacao ? <p className="mt-4 border-t border-line pt-4 text-sm text-ink-muted">{item.observacao}</p> : null}
      <div className="mt-4 border-t border-line pt-4">
        <h4 className="font-semibold text-ink">Pagamentos e estornos</h4>
        {!materializado ? <p className="mt-2 text-sm text-ink-muted">Previsão sem obrigação materializada; histórico canônico indisponível.</p>
          : historico.isError ? <ErrorState message={extractErrorMessage(historico.error)} onRetry={() => void historico.refetch()} />
            : historico.isPending ? <p role="status" className="mt-2 text-sm text-ink-muted">Carregando histórico…</p>
              : historico.data ? <>
                {historico.data.historico_incompleto ? <p role="status" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Histórico parcial: o valor legado e os eventos canônicos não estão conciliados. {historico.data.valor_legado !== null ? `Legado: ${formatConsultaMoney(historico.data.valor_legado)}.` : ''}
                </p> : null}
                {historico.data.liquidacoes.length === 0 ? <p className="mt-2 text-sm text-ink-muted">Nenhuma liquidação canônica registrada.</p>
                  : <ul className="mt-2 space-y-3">{historico.data.liquidacoes.map((liquidacao) => <li key={liquidacao.id} className="rounded-lg border border-line p-3 text-sm">
                    <p className="text-ink">{formatDataCurta(liquidacao.data_liquidacao)} · {formatConsultaMoney(liquidacao.valor)}</p>
                    {liquidacao.estornos.length ? <ul className="mt-1 text-ink-muted">{liquidacao.estornos.map((estorno) => <li key={estorno.id}>Estorno em {formatDataCurta(estorno.data_estorno)}: {formatConsultaMoney(estorno.valor)}</li>)}</ul> : null}
                  </li>)}</ul>}
              </> : null}
      </div>
    </aside>
  )
}

export function ReceberPagarPanel({ mes, natureza }: { mes: string; natureza: Natureza }) {
  const [params, setParams] = useSearchParams()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [maisFiltrosAbertos, setMaisFiltrosAbertos] = useState(false)
  const paginaParam = Number(params.get('fin_pagina'))
  const pagina = Number.isSafeInteger(paginaParam) && paginaParam >= 1 && paginaParam <= 1_000_000 ? paginaParam : 1
  const eixo = params.get('fin_eixo') === 'vencimento' ? 'vencimento' : params.get('fin_eixo') === 'pagamento' ? 'pagamento' : 'competencia'
  const statusParam = params.get('fin_status') ?? ''
  const status = STATUSES.includes(statusParam as typeof STATUSES[number])
    && (natureza === 'receita' ? statusParam !== 'cancelado' : statusParam !== 'perdido') ? statusParam : ''
  const q = params.get('fin_q') ?? ''
  const contraparte = params.get('fin_contraparte') ?? ''
  const componente = params.get('fin_componente') ?? ''
  const origemParam = params.get('fin_origem') ?? ''
  const origem = ORIGENS.includes(origemParam as typeof ORIGENS[number]) ? origemParam : ''
  const tituloId = params.get('fin_titulo_id') ?? ''
  const valorMin = params.get('fin_valor_min') ?? ''
  const valorMax = params.get('fin_valor_max') ?? ''
  const ordenar = params.get('fin_ordenar') === 'valor' ? 'valor' : 'data'
  const direcao = params.get('fin_direcao') === 'desc' ? 'desc' : 'asc'
  const scopeIsCurrent = params.get('fin_comp_mes') === mes
  const competenciaInicio = scopeIsCurrent ? params.get('fin_comp_inicio') ?? mes : mes
  const competenciaFim = scopeIsCurrent ? params.get('fin_comp_fim') ?? mes : mes
  const scopeValid = eixo === 'competencia' || (isMes(competenciaInicio) && isMes(competenciaFim) && competenciaInicio <= competenciaFim
    && (Number(competenciaFim.slice(0, 4)) * 12 + Number(competenciaFim.slice(5)) - Number(competenciaInicio.slice(0, 4)) * 12 - Number(competenciaInicio.slice(5))) < 36
  )
  const moneyValid = (!valorMin || MONEY_INPUT.test(valorMin)) && (!valorMax || MONEY_INPUT.test(valorMax)) &&
    (!valorMin || !valorMax || inputCents(valorMin) <= inputCents(valorMax))
  const filtersValid = scopeValid && moneyValid
  const filtro: ConsultaFiltro = {
    eixo, inicio: mes, fim: mes,
    ...(eixo === 'competencia' ? {} : { competencia_inicio: competenciaInicio, competencia_fim: competenciaFim }),
    natureza, status: status || undefined, q: q.trim().slice(0, 120) || undefined,
    contraparte: contraparte.trim().slice(0, 120) || undefined,
    componente: componente.trim().slice(0, 80) || undefined,
    origem: origem || undefined, id: tituloId || undefined,
    valor_min: valorMin || undefined, valor_max: valorMax || undefined,
    ordenar, direcao,
    pagina, limite: 25,
  }
  const query = useQuery({ queryKey: ['fin2', 'consulta', filtro], queryFn: () => consultarFinanceiro(filtro), enabled: filtersValid })
  const selectedParam = params.get('fin_id')
  const selectedMatches = query.data?.itens.filter((item) => selectedParam === itemKey(item) || selectedParam === item.id) ?? []
  const selected = selectedMatches.length === 1 ? selectedMatches[0] : undefined
  const title = natureza === 'receita' ? 'Receber' : 'Pagar'

  function patch(values: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    if (values.fin_comp_mes && !scopeIsCurrent) {
      next.delete('fin_comp_inicio')
      next.delete('fin_comp_fim')
    }
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  async function exportCsv() {
    setExporting(true)
    setExportError(null)
    try {
      download(await exportarConsultaFinanceiro(filtro), `financeiro-${natureza}-${eixo}-${mes}.csv`)
    } catch (error) {
      setExportError(extractErrorMessage(error))
    } finally {
      setExporting(false)
    }
  }

  const filtroAtivo = (label: string, key: string, values: Record<string, string | null>) => ({ label, key, values })
  const filtrosAtivos = [
    status ? filtroAtivo(`Situação: ${status}`, 'Situação', { fin_status: null }) : null,
    q ? filtroAtivo(`Busca: ${q}`, 'Busca', { fin_q: null }) : null,
    eixo !== 'competencia' ? filtroAtivo(`Data: ${eixo}`, 'Data', { fin_eixo: null, fin_comp_mes: null, fin_comp_inicio: null, fin_comp_fim: null }) : null,
    contraparte ? filtroAtivo(`Contraparte: ${contraparte}`, 'Contraparte', { fin_contraparte: null }) : null,
    componente ? filtroAtivo(`Componente: ${componente}`, 'Componente', { fin_componente: null }) : null,
    origem ? filtroAtivo(`Origem: ${origem.replaceAll('_', ' ')}`, 'Origem', { fin_origem: null }) : null,
    valorMin ? filtroAtivo(`Valor mínimo: ${valorMin}`, 'Valor mínimo', { fin_valor_min: null }) : null,
    valorMax ? filtroAtivo(`Valor máximo: ${valorMax}`, 'Valor máximo', { fin_valor_max: null }) : null,
    ordenar !== 'data' ? filtroAtivo(`Ordenar: ${ordenar}`, 'Ordenar', { fin_ordenar: null }) : null,
    direcao !== 'asc' ? filtroAtivo(`Direção: ${direcao}`, 'Direção', { fin_direcao: null }) : null,
  ].filter((filtro): filtro is ReturnType<typeof filtroAtivo> => filtro !== null)

  function limparFiltros() {
    patch({
      fin_eixo: null, fin_comp_mes: null, fin_comp_inicio: null, fin_comp_fim: null,
      fin_status: null, fin_q: null, fin_contraparte: null, fin_componente: null,
      fin_origem: null, fin_titulo_id: null, fin_valor_min: null, fin_valor_max: null,
      fin_ordenar: null, fin_direcao: null, fin_pagina: null, fin_id: null,
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-semibold text-ink">{title}</h2><p className="text-sm text-ink-muted">Obrigações, baixas e saldo no recorte selecionado.</p></div>
        <Button variant="secondary" icon={Download} disabled={exporting || !filtersValid || query.isPending || query.isError} onClick={() => void exportCsv()}>{exporting ? 'Exportando…' : 'Exportar CSV'}</Button>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="min-w-48 text-sm text-ink-muted xl:col-span-2">Buscar<br /><span className="relative mt-1 block"><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" /><input aria-label="Buscar" value={q} maxLength={120} onChange={(event) => patch({ fin_q: event.target.value, fin_pagina: null, fin_id: null })} className="design-input w-full pl-9" /></span></label>
          <label className="text-sm text-ink-muted">Data<br /><select aria-label="Eixo de data" value={eixo} onChange={(event) => patch({ fin_eixo: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1"><option value="competencia">Competência</option><option value="vencimento">Vencimento</option><option value="pagamento">Pagamento</option></select></label>
          <label className="text-sm text-ink-muted">Situação<br /><select aria-label="Situação" value={status} onChange={(event) => patch({ fin_status: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1"><option value="">Todas</option>{STATUSES.slice(1).filter((value) => natureza === 'receita' ? value !== 'cancelado' : value !== 'perdido').map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          {eixo !== 'competencia' ? <><label className="text-sm text-ink-muted">Competências desde<br /><input type="month" value={competenciaInicio} aria-invalid={!scopeValid} onChange={(event) => patch({ fin_comp_mes: mes, fin_comp_inicio: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1" /></label><label className="text-sm text-ink-muted">Competências até<br /><input type="month" value={competenciaFim} aria-invalid={!scopeValid} onChange={(event) => patch({ fin_comp_mes: mes, fin_comp_fim: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1" /></label></> : null}
        </div>

        <button type="button" aria-expanded={maisFiltrosAbertos} onClick={() => setMaisFiltrosAbertos((aberto) => !aberto)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink hover:bg-surface-muted focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
          Mais filtros <ChevronDown className={maisFiltrosAbertos ? 'h-4 w-4' : 'h-4 w-4 -rotate-90'} aria-hidden />
        </button>
        <div hidden={!maisFiltrosAbertos} className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="min-w-40 text-sm text-ink-muted">Contraparte<br /><input aria-label="Contraparte" value={contraparte} maxLength={120} onChange={(event) => patch({ fin_contraparte: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1 w-full" /></label>
          <label className="min-w-32 text-sm text-ink-muted">Componente<br /><input aria-label="Componente" value={componente} maxLength={80} onChange={(event) => patch({ fin_componente: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1 w-full" /></label>
          <label className="text-sm text-ink-muted">Origem<br /><select aria-label="Origem" value={origem} onChange={(event) => patch({ fin_origem: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1"><option value="">Todas</option>{ORIGENS.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="w-28 text-sm text-ink-muted">Valor mínimo<br /><input aria-label="Valor mínimo" inputMode="decimal" value={valorMin} maxLength={16} onChange={(event) => patch({ fin_valor_min: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1 w-full" /></label>
          <label className="w-28 text-sm text-ink-muted">Valor máximo<br /><input aria-label="Valor máximo" inputMode="decimal" value={valorMax} maxLength={16} onChange={(event) => patch({ fin_valor_max: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1 w-full" /></label>
          <label className="text-sm text-ink-muted">Ordenar<br /><select aria-label="Ordenar" value={ordenar} onChange={(event) => patch({ fin_ordenar: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1"><option value="data">Data</option><option value="valor">Valor</option></select></label>
          <label className="text-sm text-ink-muted">Direção<br /><select aria-label="Direção" value={direcao} onChange={(event) => patch({ fin_direcao: event.target.value, fin_pagina: null, fin_id: null })} className="design-input mt-1"><option value="asc">Crescente</option><option value="desc">Decrescente</option></select></label>
        </div>
      </div>
      {filtrosAtivos.length ? <div className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
        {filtrosAtivos.map((filtroAtivo) => <button key={filtroAtivo.label} type="button" aria-label={`Remover filtro: ${filtroAtivo.key}`} onClick={() => patch({ ...filtroAtivo.values, fin_pagina: null, fin_id: null })} className="inline-flex min-h-8 items-center rounded-full bg-surface-muted px-3 text-xs font-semibold text-ink hover:brightness-95">{filtroAtivo.label} <span aria-hidden="true">×</span></button>)}
        <button type="button" onClick={limparFiltros} className="min-h-8 px-2 text-xs font-semibold text-ink-muted underline hover:text-ink">Limpar filtros</button>
      </div> : null}
      {eixo !== 'competencia' ? <p className="text-sm text-ink-muted">O recorte por {eixo} considera apenas títulos das competências {competenciaInicio} a {competenciaFim}. Escolha uma janela maior para incluir títulos de outras competências.</p> : null}
      {!scopeValid ? <p role="alert" className="text-sm text-[var(--danger)]">Escolha competências em ordem, em um intervalo de até 36 meses.</p> : null}
      {!moneyValid ? <p role="alert" className="text-sm text-[var(--danger)]">Informe valores válidos em ordem, com até duas casas decimais.</p> : null}
      {tituloId ? <p className="text-sm text-ink-muted">Título selecionado: {tituloId} <button type="button" className="underline" onClick={() => patch({ fin_titulo_id: null, fin_id: null })}>Limpar seleção</button></p> : null}
      {exportError ? <p role="alert" className="text-sm text-[var(--danger)]">{exportError}</p> : null}
      {!filtersValid ? null : query.isError ? <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} /> : query.isPending ? <p role="status" className="text-sm text-ink-muted">Carregando lançamentos…</p> : query.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">{([['Previsto', query.data.totais.previsto], ['Liquidado', query.data.totais.pago], ['Em aberto', query.data.totais.aberto]] as const).map(([label, amount]) => <div key={label} className="rounded-2xl border border-line bg-surface p-4"><p className="text-sm text-ink-muted">{label}</p><p className="num mt-1 text-xl font-semibold text-ink">{formatConsultaMoney(amount)}</p></div>)}</div>
          <div className="flex flex-col gap-4 lg:flex-row"><div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-line bg-surface"><table className="w-full text-left text-sm"><caption className="sr-only">Lançamentos a {title.toLowerCase()} no recorte selecionado</caption><thead className="border-b border-line text-ink-muted"><tr><th scope="col" className="px-4 py-3">Contraparte / título</th><th scope="col" className="px-4 py-3">Vencimento</th><th scope="col" className="px-4 py-3">Valor</th><th scope="col" className="px-4 py-3">Liquidado</th><th scope="col" className="px-4 py-3">Aberto</th><th scope="col" className="px-4 py-3">Situação</th></tr></thead><tbody>{query.data.itens.map((item, index) => <tr key={`${itemKey(item)}:${index}`} className="border-b border-line last:border-0"><td className="px-4 py-3"><button type="button" aria-expanded={selected ? itemKey(selected) === itemKey(item) : false} onClick={() => patch({ fin_id: itemKey(item) })} className="text-left font-medium text-ink hover:underline">{item.cliente_nome ?? item.marca_nome ?? item.descricao}<span className="block text-xs font-normal text-ink-muted">{item.descricao}</span></button></td><td className="px-4 py-3 text-ink-muted">{formatDataCurta(item.data_vencimento)}</td><td className="num px-4 py-3 text-ink">{formatConsultaMoney(item.valor_previsto_exato)}</td><td className="num px-4 py-3 text-ink">{formatConsultaMoney(item.valor_pago_exato)}</td><td className="num px-4 py-3 text-ink">{formatConsultaMoney(item.saldo_aberto)}{item.inconsistente ? <span className="block text-xs text-ink-muted">Conferir baixa</span> : null}</td><td className="px-4 py-3 text-ink-muted">{item.status}</td></tr>)}</tbody></table>{query.data.itens.length === 0 ? <p className="p-6 text-sm text-ink-muted">Nenhum lançamento neste recorte.</p> : null}</div>{selected ? <Detail item={selected} onClose={() => patch({ fin_id: null })} /> : null}</div>
          <div className="flex items-center justify-between text-sm text-ink-muted"><span>{query.data.total_registros} registros no recorte</span><div className="flex items-center gap-3"><Button variant="secondary" disabled={pagina <= 1} onClick={() => patch({ fin_pagina: String(pagina - 1), fin_id: null })}>Anterior</Button><span>Página {pagina} de {Math.max(1, query.data.total_paginas)}</span><Button variant="secondary" disabled={pagina >= query.data.total_paginas} onClick={() => patch({ fin_pagina: String(pagina + 1), fin_id: null })}>Próxima</Button></div></div>
        </>
      ) : null}
    </section>
  )
}
