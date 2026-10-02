// Peças compartilhadas por CustosFixosPanel e CustosVariaveisPanel: ações de baixa/edição/exclusão
// (com seus modais), resumo do mês e linhas agrupadas por grupo.
import clsx from 'clsx'
import { Check, Undo2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useBaixaMutation, useCustoMutations } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import type { Lancamento, ModoPerda } from '../../types/financeiro'
import { type GrupoCusto, type TotaisCusto } from '../../utils/custo-classe'
import { formatDataCurta, isEditavel, isEncerrado, origemLabel, podeExcluir, valorEmAberto } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import { useToast } from '../ui/Toast'
import { type CustoModalState, CustoFormModal } from './CustoFormModal'
import { BaixaModal, DesfazerModal, ExcluirModal } from './LancamentoModals'
import { RowMenu, acaoPerdaMenu } from './LancamentosList'
import { PerdaModal } from './PerdaModal'
import { StatusChip } from './primitives'

export function useCustoAcoes() {
  const toast = useToast()
  const baixaMut = useBaixaMutation()
  const custos = useCustoMutations()
  const [baixa, setBaixa] = useState<Lancamento | null>(null)
  const [desfazer, setDesfazer] = useState<Lancamento | null>(null)
  const [excluir, setExcluir] = useState<Lancamento | null>(null)
  const [perda, setPerda] = useState<{ item: Lancamento; modo: ModoPerda } | null>(null)
  const [custoModal, setCustoModal] = useState<CustoModalState | null>(null)
  const toastOk = (msg: string, variant: 'success' | 'error' = 'success') => toast.push(msg, variant)
  return {
    baixa,
    desfazer,
    excluir,
    perda,
    custoModal,
    setCustoModal,
    toastOk,
    baixaMut,
    custos,
    abrirBaixa: (l: Lancamento) => {
      baixaMut.reset()
      setBaixa(l)
    },
    abrirDesfazer: (l: Lancamento) => {
      baixaMut.reset()
      setDesfazer(l)
    },
    abrirExcluir: (l: Lancamento) => {
      custos.excluir.reset()
      setExcluir(l)
    },
    abrirPerda: (item: Lancamento, modo: ModoPerda) => setPerda({ item, modo }),
    fecharPerda: () => setPerda(null),
    abrirEditar: (l: Lancamento) => setCustoModal({ kind: 'editar-lancamento', lancamento: l }),
    fecharBaixa: () => setBaixa(null),
    fecharDesfazer: () => setDesfazer(null),
    fecharExcluir: () => setExcluir(null),
  }
}

export type CustoAcoes = ReturnType<typeof useCustoAcoes>

export function CustoAcoesModais({ acoes, mes }: { acoes: CustoAcoes; mes: string }) {
  const { baixa, desfazer, excluir, baixaMut, custos, toastOk } = acoes
  const erroBaixa = baixaMut.error ? extractErrorMessage(baixaMut.error) : null
  return (
    <>
      <BaixaModal
        lancamento={baixa}
        onClose={acoes.fecharBaixa}
        isPending={baixaMut.isPending}
        error={erroBaixa}
        onConfirm={(payload) => {
          if (!baixa) return
          baixaMut.mutate(
            { lancamento: baixa, acao: 'pagar', payload },
            {
              onSuccess: () => {
                acoes.fecharBaixa()
                toastOk(payload.valor_pago < baixa.valor_previsto ? 'Pagamento parcial registrado.' : 'Marcado como pago.')
              },
            },
          )
        }}
      />
      <DesfazerModal
        lancamento={desfazer}
        onClose={acoes.fecharDesfazer}
        isPending={baixaMut.isPending}
        error={erroBaixa}
        onConfirm={() => {
          if (!desfazer) return
          baixaMut.mutate(
            { lancamento: desfazer, acao: 'desfazer' },
            {
              onSuccess: () => {
                acoes.fecharDesfazer()
                toastOk('Baixa desfeita.')
              },
            },
          )
        }}
      />
      <ExcluirModal
        key={excluir?.id ?? 'none'}
        lancamento={excluir}
        onClose={acoes.fecharExcluir}
        isPending={custos.excluir.isPending}
        error={custos.excluir.error ? extractErrorMessage(custos.excluir.error) : null}
        onConfirm={(escopo) => {
          if (!excluir) return
          custos.excluir.mutate(
            { id: excluir.id, escopo },
            {
              onSuccess: () => {
                acoes.fecharExcluir()
                toastOk('Custo excluído.')
              },
            },
          )
        }}
      />
      {acoes.perda ? <PerdaModal key={`${acoes.perda.item.id}:${acoes.perda.modo}`} item={acoes.perda.item} modo={acoes.perda.modo} onClose={acoes.fecharPerda} /> : null}
      <CustoFormModal state={acoes.custoModal} mes={mes} onClose={() => acoes.setCustoModal(null)} onSaved={(msg) => toastOk(msg)} />
    </>
  )
}

export function ResumoCusto({ titulo, totais, extra }: { titulo: string; totais: TotaisCusto; extra?: ReactNode }) {
  const cell = (label: string, value: number, tone?: string) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="num text-2xl font-bold tracking-[-0.02em]" style={tone ? { color: tone } : undefined}>{formatMoney(value, true)}</p>
    </div>
  )
  return (
    <section className="design-panel flex flex-wrap items-end justify-between gap-6 p-5" aria-label={titulo}>
      <div className="flex flex-wrap gap-8">
        {cell(titulo, totais.previsto)}
        {cell('Pago', totais.pago, 'var(--success)')}
        {cell('Em aberto', totais.aberto, totais.aberto > 0 ? 'var(--warning)' : undefined)}
      </div>
      {extra}
    </section>
  )
}

export function CustoItemRow({ l, podeEscrever, acoes }: { l: Lancamento; podeEscrever: boolean; acoes: CustoAcoes }) {
  const aberto = valorEmAberto(l)
  const cancelado = isEncerrado(l.status)
  const extra = acaoPerdaMenu(l, acoes.abrirPerda)
  return (
    <li className={clsx('fin-row flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5', cancelado && 'opacity-60')}>
      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
        <p className="truncate text-sm font-semibold text-ink">{l.descricao}</p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {origemLabel(l)}
          {l.parcela_num && l.parcelas_total ? ` · ${l.parcela_num}/${l.parcelas_total}` : ''} · vence {formatDataCurta(l.data_vencimento)}
          {l.status === 'parcial' || (l.status === 'atrasado' && l.valor_pago > 0) ? <> · <span className="num font-semibold">{formatMoney(l.valor_pago, true)} pago, falta {formatMoney(aberto, true)}</span></> : null}
          {cancelado ? <> · <span title={l.cancelado_motivo ?? undefined}>Cancelado{l.cancelado_motivo ? `: ${l.cancelado_motivo}` : ''}</span></> : null}
          {l.status === 'pago' && l.data_pagamento ? ` · pago em ${formatDataCurta(l.data_pagamento)}` : ''}
        </p>
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 sm:flex-none sm:justify-end">
        <StatusChip status={l.status} natureza="custo" />
        <span className={clsx('num w-28 text-right text-sm font-bold text-ink', cancelado && 'line-through')}>{formatMoney(l.valor_previsto, true)}</span>
        {podeEscrever ? (
          <div className="flex items-center justify-end gap-1 sm:w-[10.5rem]">
            {l.status !== 'pago' && !cancelado ? (
              <button
                type="button"
                onClick={() => acoes.abrirBaixa(l)}
                aria-label={`Pagar: ${l.descricao}`}
                className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-xs font-bold sm:h-9 sm:px-3 text-ink transition hover:border-[var(--success)] hover:bg-[var(--success-soft)] hover:text-[var(--success)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
              >
                <Check className="h-3.5 w-3.5" /> <span className="hidden md:inline">Pagar</span>
              </button>
            ) : null}
            {l.valor_pago > 0 ? (
              <button
                type="button"
                onClick={() => acoes.abrirDesfazer(l)}
                aria-label={`Desfazer baixa: ${l.descricao}`}
                title="Desfazer baixa"
                className="grid h-11 w-11 place-items-center sm:h-9 sm:w-9 rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            ) : null}
            {isEditavel(l) || extra ? (
              <RowMenu
                label={l.descricao}
                onEditar={isEditavel(l) ? () => acoes.abrirEditar(l) : undefined}
                onExcluir={isEditavel(l) && podeExcluir(l) ? () => acoes.abrirExcluir(l) : undefined}
                extra={extra}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  )
}

export function CustoGrupoBloco({ g, podeEscrever, acoes }: { g: GrupoCusto; podeEscrever: boolean; acoes: CustoAcoes }) {
  return (
    <section className="design-card overflow-visible" aria-label={g.label}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <h3 className="text-sm font-bold text-ink">
          {g.label} <span className="num font-normal text-ink-muted">· {g.itens.length}</span>
        </h3>
        <p className="num text-xs font-semibold text-ink-muted">
          {formatMoney(g.totais.previsto, true)}
          {g.totais.aberto > 0 ? ` · em aberto ${formatMoney(g.totais.aberto, true)}` : ' · quitado'}
        </p>
      </header>
      <ul className="divide-y divide-[var(--hairline)]">
        {g.itens.map((l) => (
          <CustoItemRow key={l.id} l={l} podeEscrever={podeEscrever} acoes={acoes} />
        ))}
      </ul>
    </section>
  )
}
