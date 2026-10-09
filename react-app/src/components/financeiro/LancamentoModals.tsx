import { Check, Trash2, Undo2 } from 'lucide-react'
import { type FormEvent, useRef, useState } from 'react'
import { useLiquidacaoIncrementalMutation } from '../../hooks/useFinanceiroLiquidacoes'
import { extractErrorMessage } from '../../services/api'
import {
  novaChaveOperacao,
  origemLiquidacaoIncremental,
  type LiquidacaoIncrementalResultado,
} from '../../services/financeiro-liquidacoes'
import type { EscopoExclusao, Lancamento } from '../../types/financeiro'
import { formatDataCurta, hojeSP, origemLabel, valorEmAberto } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import { formatBRLWithoutSymbol, parseBRMoneyToDecimal } from '../../utils/money'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { MoneyInput } from '../ui/MoneyInput'
import { Amount, Field, InlineError, StatusChip } from './primitives'

export function Resumo({ l }: { l: Lancamento }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface-muted p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{l.descricao}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {origemLabel(l)} · vence {formatDataCurta(l.data_vencimento)}
        </p>
        <div className="mt-2">
          <StatusChip status={l.status} natureza={l.natureza} />
        </div>
      </div>
      <div className="text-right">
        <Amount value={l.valor_previsto} natureza={l.natureza} className="text-base" />
        {l.valor_pago > 0 ? <p className="num mt-1 text-xs text-ink-muted">já {l.natureza === 'receita' ? 'recebido' : 'pago'} {formatMoney(l.valor_pago, true)}</p> : null}
      </div>
    </div>
  )
}

/** Registra um fato incremental; o servidor mantém `valor_pago` acumulado para clientes legados. */
export function BaixaModal({
  lancamento,
  onClose,
  error,
}: {
  lancamento: Lancamento | null
  onClose: () => void
  onConfirm: (payload: { valor_pago: number; data_pagamento: string }) => void
  isPending: boolean
  error?: string | null
}) {
  if (!lancamento) return null
  return <BaixaForm key={lancamento.id} lancamento={lancamento} onClose={onClose} error={error} />
}

function BaixaForm({
  lancamento: l,
  onClose,
  error,
}: {
  lancamento: Lancamento
  onClose: () => void
  error?: string | null
}) {
  const mutation = useLiquidacaoIncrementalMutation()
  const operacaoRef = useRef<{ fingerprint: string; chave: string } | null>(null)
  const saldoAtual = valorEmAberto(l)
  const [valor, setValor] = useState(formatBRLWithoutSymbol(saldoAtual))
  const [data, setData] = useState(hojeSP())
  const [resultado, setResultado] = useState<LiquidacaoIncrementalResultado | null>(null)
  const entrada = l.natureza === 'receita'
  const decimal = parseBRMoneyToDecimal(valor)
  const parcial = decimal > 0 && decimal < saldoAtual
  const invalido = !(decimal > 0) || decimal > saldoAtual || !/^\d{4}-\d{2}-\d{2}$/.test(data)
  const futuro = data > hojeSP()
  const acumuladoDepois = l.valor_pago + decimal
  const saldoDepois = Math.max(0, saldoAtual - decimal)

  function editarValor(raw: string) {
    mutation.reset()
    setValor(raw)
  }

  function editarData(value: string) {
    mutation.reset()
    setData(value)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (invalido) return
    const valorOperacao = decimal.toFixed(2)
    const fingerprint = `${l.id}\n${valorOperacao}\n${data}`
    if (operacaoRef.current?.fingerprint !== fingerprint) {
      operacaoRef.current = { fingerprint, chave: novaChaveOperacao() }
    }
    mutation.mutate({
      ...origemLiquidacaoIncremental(l),
      valor_operacao: valorOperacao,
      data,
      chave_operacao: operacaoRef.current.chave,
    }, { onSuccess: setResultado })
  }

  if (resultado) {
    return (
      <Modal
        open
        size="sm"
        title={resultado.situacao_data === 'agendada' ? 'Operação agendada' : entrada ? 'Recebimento registrado' : 'Pagamento registrado'}
        subtitle={resultado.mensagem}
        onClose={onClose}
      >
        <div className="space-y-4">
          <Resumo l={l} />
          <div role="status" className="rounded-2xl border border-[var(--success)]/35 bg-[var(--success-soft)] p-4 text-sm text-ink">
            <p className="font-bold">{resultado.replay ? 'Operação confirmada sem duplicação' : 'Operação aplicada com sucesso'}</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div><dt className="text-xs text-ink-muted">Valor desta operação</dt><dd className="num font-semibold">{formatMoney(resultado.valor_operacao, true)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Data do evento</dt><dd className="num font-semibold">{formatDataCurta(resultado.data)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Acumulado antes</dt><dd className="num font-semibold">{formatMoney(resultado.valor_pago_anterior, true)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Acumulado depois</dt><dd className="num font-semibold">{formatMoney(resultado.valor_pago, true)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Saldo restante</dt><dd className="num font-semibold">{formatMoney(resultado.saldo_restante, true)}</dd></div>
            </dl>
            {resultado.situacao_data === 'agendada' ? (
              <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-ink-muted">Agendado para uma data futura. Não altera o caixa atual; entrará na projeção na data registrada.</p>
            ) : null}
          </div>
          <div className="flex justify-end border-t border-line pt-4">
            <Button type="button" icon={Check} onClick={onClose}>Concluir</Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      size="sm"
      title={entrada ? 'Registrar recebimento' : 'Registrar pagamento'}
      subtitle={`Em aberto: ${formatMoney(valorEmAberto(l), true)}`}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <Resumo l={l} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Valor desta operação" hint={parcial ? `Parcial — restarão ${formatMoney(saldoDepois, true)}` : 'Este valor quita o saldo em aberto'}>
            <MoneyInput className="design-input h-11 w-full px-4" value={valor} onChange={editarValor} required />
          </Field>
          <Field label="Data desta operação">
            <input type="date" className="design-input h-11 w-full px-4" value={data} max="2100-12-31" onChange={(e) => editarData(e.target.value)} required />
          </Field>
        </div>
        {!invalido ? (
          <div className="rounded-2xl border border-line bg-surface-muted p-4 text-sm" aria-label="Prévia da operação">
            <p className="font-bold text-ink">Prévia</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div><dt className="text-xs text-ink-muted">Valor desta operação</dt><dd className="num font-semibold text-ink">{formatMoney(decimal, true)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Data</dt><dd className="num font-semibold text-ink">{formatDataCurta(data)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Acumulado antes</dt><dd className="num font-semibold text-ink">{formatMoney(l.valor_pago, true)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Acumulado depois</dt><dd className="num font-semibold text-ink">{formatMoney(acumuladoDepois, true)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Saldo restante</dt><dd className="num font-semibold text-ink">{formatMoney(saldoDepois, true)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-ink-muted">
              {futuro ? 'Agendado: não altera o caixa atual e entra na projeção na data registrada.' : 'A baixa altera o caixa na data registrada.'}
              {' '}Este registro não executa transferência bancária.
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink" onClick={() => editarValor(formatBRLWithoutSymbol(saldoAtual))}>
            Quitar saldo
          </button>
          <button type="button" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink" onClick={() => editarData(hojeSP())}>
            Hoje
          </button>
          {l.data_vencimento ? (
            <button type="button" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink" onClick={() => editarData(l.data_vencimento!)}>
              No vencimento
            </button>
          ) : null}
        </div>
        <InlineError message={mutation.error ? extractErrorMessage(mutation.error) : error} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" icon={Check} isLoading={mutation.isPending} disabled={invalido}>
            {parcial ? 'Registrar parcial' : entrada ? 'Confirmar recebimento' : 'Confirmar pagamento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function DesfazerModal({
  lancamento,
  onClose,
  onConfirm,
  isPending,
  error,
}: {
  lancamento: Lancamento | null
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
  error?: string | null
}) {
  if (!lancamento) return null
  return (
    <Modal
      open
      size="sm"
      title="Desfazer baixa?"
      subtitle="O valor pago e a data serão removidos; o status volta a ser calculado pelo vencimento."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" icon={Undo2} isLoading={isPending} onClick={onConfirm}>Desfazer</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Resumo l={lancamento} />
        <InlineError message={error} />
      </div>
    </Modal>
  )
}

export function ExcluirModal({
  lancamento,
  onClose,
  onConfirm,
  isPending,
  error,
}: {
  lancamento: Lancamento | null
  onClose: () => void
  onConfirm: (escopo: EscopoExclusao) => void
  isPending: boolean
  error?: string | null
}) {
  const [escopo, setEscopo] = useState<EscopoExclusao>('um')
  if (!lancamento) return null
  const parcelado = Boolean(lancamento.parcela_grupo_id)
  return (
    <Modal
      open
      size="sm"
      title={lancamento.natureza === 'receita' ? 'Excluir receita?' : 'Excluir custo?'}
      subtitle="Esta ação não pode ser desfeita."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" icon={Trash2} isLoading={isPending} onClick={() => onConfirm(parcelado ? escopo : 'um')}>Excluir</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Resumo l={lancamento} />
        {parcelado ? (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-xs font-semibold text-[var(--text-secondary)]">Compra parcelada — o que excluir?</legend>
            {([
              ['um', 'Só esta parcela'],
              ['futuras', 'Esta e as próximas'],
              ['grupo', 'Todas as parcelas'],
            ] as const).map(([v, label]) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-ink has-[:checked]:border-[var(--danger)] has-[:checked]:bg-[var(--danger-soft)]">
                <input type="radio" name="escopo" value={v} checked={escopo === v} onChange={() => setEscopo(v)} className="accent-[var(--danger)]" />
                {label}
              </label>
            ))}
          </fieldset>
        ) : null}
        <InlineError message={error} />
      </div>
    </Modal>
  )
}
