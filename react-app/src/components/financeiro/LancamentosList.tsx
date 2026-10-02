import clsx from 'clsx'
import { ArrowDownLeft, ArrowUpRight, Check, Download, MoreHorizontal, Pencil, Repeat, Search, Trash2, Undo2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Lancamento, Natureza, StatusLancamento } from '../../types/financeiro'
import { STATUS_LANCAMENTO } from '../../types/financeiro'
import {
  STATUS_META,
  agruparPorDia,
  contarPorStatus,
  filtrarLancamentos,
  formatDataCurta,
  grupoLabel,
  gruposPresentes,
  isEditavel,
  origemLabel,
  partesData,
  podeExcluir,
  statusLabel,
  valorEmAberto,
} from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import { textoCorte } from '../../utils/caixa'
import { exportarLancamentosCsv } from '../../utils/exportar-csv'
import { EmptyState } from '../ui/States'
import { Amount, Segmented, StatusChip } from './primitives'

export interface FiltroLocal {
  natureza: Natureza | ''
  status: StatusLancamento | ''
  grupo: string
  q: string
}

export const FILTRO_VAZIO: FiltroLocal = { natureza: '', status: '', grupo: '', q: '' }

export function RowMenu({ onEditar, onExcluir, label }: { onEditar?: () => void; onExcluir?: () => void; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  if (!onEditar && !onExcluir) return null
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Mais ações: ${label}`}
        className="grid h-9 w-9 place-items-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-[var(--shadow-card-lg)]">
          {onEditar ? (
            <button role="menuitem" type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted" onClick={() => { setOpen(false); onEditar() }}>
              <Pencil className="h-4 w-4 text-ink-muted" /> Editar
            </button>
          ) : null}
          {onExcluir ? (
            <button role="menuitem" type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)]" onClick={() => { setOpen(false); onExcluir() }}>
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function LancamentoRow({
  l,
  podeEscrever,
  onBaixar,
  onDesfazer,
  onEditar,
  onExcluir,
}: {
  l: Lancamento
  podeEscrever: boolean
  onBaixar: (l: Lancamento) => void
  onDesfazer: (l: Lancamento) => void
  onEditar: (l: Lancamento) => void
  onExcluir: (l: Lancamento) => void
}) {
  const entrada = l.natureza === 'receita'
  const Icon = entrada ? ArrowDownLeft : ArrowUpRight
  const aberto = valorEmAberto(l)
  const meta = [origemLabel(l), l.natureza === 'custo' || l.origem === 'avulsa' ? grupoLabel(l.grupo) : l.cliente_nome ?? l.marca_nome].filter(Boolean)
  const verbo = entrada ? 'Receber' : 'Pagar'

  return (
    <li className="fin-row flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5">
      <span
        aria-hidden
        className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
        style={{ background: entrada ? 'var(--success-soft)' : 'var(--bg-elev-3)', color: entrada ? 'var(--success)' : 'var(--text-secondary)' }}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] sm:basis-auto">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
          <span className="truncate">{l.descricao}</span>
          {l.origem === 'recorrente' ? <Repeat className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-label="recorrente" /> : null}
          {l.origem === 'avulsa' && l.grupo === 'aporte' ? (
            <span className="shrink-0 rounded-md bg-brand-soft px-1.5 text-[11px] font-bold text-brand">Aporte</span>
          ) : null}
          {l.parcela_num && l.parcelas_total ? (
            <span className="num shrink-0 rounded-md bg-surface-muted px-1.5 text-[11px] font-bold text-ink-muted">{l.parcela_num}/{l.parcelas_total}</span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {meta.join(' · ')}
          {l.status === 'parcial' || (l.status === 'atrasado' && l.valor_pago > 0) ? (
            <> · <span className="num font-semibold" style={{ color: STATUS_META.parcial.color }}>{formatMoney(l.valor_pago, true)} {entrada ? 'recebido' : 'pago'}, falta {formatMoney(aberto, true)}</span></>
          ) : null}
          {l.status === 'pago' && l.data_pagamento ? <> · {entrada ? 'recebido' : 'pago'} em {formatDataCurta(l.data_pagamento)}</> : null}
        </p>
      </div>

      <div className="ml-[3.25rem] flex flex-1 items-center justify-between gap-3 sm:ml-0 sm:flex-none sm:justify-end">
        <StatusChip status={l.status} natureza={l.natureza} />
        <Amount value={l.valor_previsto} natureza={l.natureza} className="w-32 text-right text-sm" />
        {podeEscrever ? (
          <div className="flex items-center justify-end gap-1 sm:w-[10.5rem]">
            {l.status !== 'pago' ? (
              <button
                type="button"
                onClick={() => onBaixar(l)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-bold text-ink transition hover:border-[var(--success)] hover:bg-[var(--success-soft)] hover:text-[var(--success)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                aria-label={`${verbo}: ${l.descricao}`}
              >
                <Check className="h-3.5 w-3.5" /> <span className="hidden md:inline">{verbo}</span>
              </button>
            ) : null}
            {l.valor_pago > 0 ? (
              <button
                type="button"
                onClick={() => onDesfazer(l)}
                className="grid h-9 w-9 place-items-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                aria-label={`Desfazer baixa: ${l.descricao}`}
                title="Desfazer baixa"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            ) : null}
            {isEditavel(l) ? (
              <RowMenu
                label={l.descricao}
                onEditar={() => onEditar(l)}
                onExcluir={podeExcluir(l) ? () => onExcluir(l) : undefined}
              />
            ) : (
              <span aria-hidden className="hidden w-9 sm:block" />
            )}
          </div>
        ) : null}
      </div>
    </li>
  )
}

export function LancamentosList({
  itens,
  hoje,
  filtro,
  onFiltro,
  podeEscrever,
  isFetching,
  onBaixar,
  onDesfazer,
  onEditar,
  onExcluir,
  dataCorte,
}: {
  itens: Lancamento[]
  hoje: string
  filtro: FiltroLocal
  onFiltro: (f: FiltroLocal) => void
  podeEscrever: boolean
  isFetching?: boolean
  onBaixar: (l: Lancamento) => void
  onDesfazer: (l: Lancamento) => void
  onEditar: (l: Lancamento) => void
  onExcluir: (l: Lancamento) => void
  dataCorte?: string | null
}) {
  const base = filtrarLancamentos(itens, { natureza: filtro.natureza })
  const counts = contarPorStatus(base)
  const visiveis = filtrarLancamentos(itens, filtro)
  const dias = agruparPorDia(visiveis)
  const grupos = gruposPresentes(itens)
  const temFiltro = Boolean(filtro.status || filtro.grupo || filtro.q || filtro.natureza)
  const set = (patch: Partial<FiltroLocal>) => onFiltro({ ...filtro, ...patch })

  return (
    <section className="design-card overflow-visible" aria-label="Lançamentos do mês">
      <header className="space-y-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">
              Lançamentos <span className="serif font-normal text-brand">do mês</span>
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted" aria-live="polite">
              {visiveis.length} de {itens.length} lançamento{itens.length === 1 ? '' : 's'}
              {isFetching ? ' · atualizando…' : ''}
            </p>
            {textoCorte(dataCorte) ? <p className="mt-0.5 text-xs text-ink-muted">{textoCorte(dataCorte)}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={visiveis.length === 0}
              onClick={() => exportarLancamentosCsv(visiveis)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-bold text-ink transition hover:bg-surface-muted focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </button>
            <Segmented
              label="Natureza"
              size="sm"
              value={filtro.natureza || 'todos'}
              onChange={(v) => set({ natureza: v === 'todos' ? '' : (v as Natureza) })}
              options={[
                { value: 'todos', label: 'Tudo' },
                { value: 'receita', label: 'Entradas', icon: <ArrowDownLeft className="h-3.5 w-3.5" /> },
                { value: 'custo', label: 'Saídas', icon: <ArrowUpRight className="h-3.5 w-3.5" /> },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por status">
            {STATUS_LANCAMENTO.map((s) => {
              const active = filtro.status === s
              const meta = STATUS_META[s]
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  disabled={!counts[s] && !active}
                  onClick={() => set({ status: active ? '' : s })}
                  className={clsx(
                    'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:opacity-40',
                    active ? 'border-transparent' : 'border-line bg-surface text-ink-muted hover:text-ink',
                  )}
                  style={active ? { background: meta.soft, color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}` } : undefined}
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                  {statusLabel(s, filtro.natureza === 'receita' ? 'receita' : 'custo')}
                  <span className="num opacity-70">{counts[s]}</span>
                </button>
              )
            })}
          </div>
          <div className="ml-auto flex w-full flex-wrap gap-2 sm:w-auto">
            <select
              aria-label="Filtrar por grupo"
              className="design-input h-9 min-w-0 flex-1 px-3 text-sm sm:w-40 sm:flex-none"
              value={filtro.grupo}
              onChange={(e) => set({ grupo: e.target.value })}
            >
              <option value="">Todos os grupos</option>
              {grupos.map((g) => (
                <option key={g} value={g}>{grupoLabel(g)}</option>
              ))}
            </select>
            <div className="relative min-w-0 flex-[2] sm:w-56 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                type="search"
                aria-label="Buscar lançamento"
                placeholder="Buscar descrição, marca…"
                className="design-input h-9 w-full pl-9 pr-3 text-sm"
                value={filtro.q}
                onChange={(e) => set({ q: e.target.value })}
              />
            </div>
            {temFiltro ? (
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink"
                onClick={() => onFiltro(FILTRO_VAZIO)}
              >
                <X className="h-3.5 w-3.5" /> Limpar
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {dias.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title={temFiltro ? 'Nenhum lançamento com esses filtros' : 'Nenhum lançamento neste mês'}
            description={temFiltro ? 'Ajuste ou limpe os filtros para ver mais.' : 'Receitas vêm do Comercial; custos e receitas avulsas você lança em “Novo custo” e “Nova receita”.'}
          />
        </div>
      ) : (
        <ol className="divide-y divide-[var(--border)]">
          {dias.map((g) => {
            const p = g.data ? partesData(g.data) : null
            const isHoje = g.data === hoje
            const passado = Boolean(g.data && g.data < hoje)
            return (
              <li key={g.data || 'sem-data'}>
                <div className="flex items-center justify-between gap-3 bg-[color-mix(in_srgb,var(--bg-elev-3)_55%,transparent)] px-4 py-2 sm:px-5">
                  <div className="flex items-baseline gap-2">
                    {p ? (
                      <>
                        <span className={clsx('fin-daystamp text-2xl leading-none', isHoje ? 'text-brand' : passado ? 'text-ink-muted' : 'text-ink')}>{p.dia}</span>
                        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">
                          {p.semana} · {p.mes}
                          {isHoje ? <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] text-brand">hoje</span> : null}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">Sem vencimento</span>
                    )}
                  </div>
                  <div className="num flex gap-3 text-xs font-semibold">
                    {g.entradas ? <span className="text-[var(--success)]">+ {formatMoney(g.entradas)}</span> : null}
                    {g.saidas ? <span className="text-ink-muted">− {formatMoney(g.saidas)}</span> : null}
                  </div>
                </div>
                <ul className="divide-y divide-[var(--hairline)]">
                  {g.itens.map((l) => (
                    <LancamentoRow
                      key={l.id}
                      l={l}
                      podeEscrever={podeEscrever}
                      onBaixar={onBaixar}
                      onDesfazer={onDesfazer}
                      onEditar={onEditar}
                      onExcluir={onExcluir}
                    />
                  ))}
                </ul>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
