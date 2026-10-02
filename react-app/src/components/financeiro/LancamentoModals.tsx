import { Check, Trash2, Undo2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
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

/** Marcar como pago/recebido — total por padrão, valor parcial e data editáveis. */
export function BaixaModal({
  lancamento,
  onClose,
  onConfirm,
  isPending,
  error,
}: {
  lancamento: Lancamento | null
  onClose: () => void
  onConfirm: (payload: { valor_pago: number; data_pagamento: string }) => void
  isPending: boolean
  error?: string | null
}) {
  if (!lancamento) return null
  return <BaixaForm key={lancamento.id} lancamento={lancamento} onClose={onClose} onConfirm={onConfirm} isPending={isPending} error={error} />
}

function BaixaForm({
  lancamento: l,
  onClose,
  onConfirm,
  isPending,
  error,
}: {
  lancamento: Lancamento
  onClose: () => void
  onConfirm: (payload: { valor_pago: number; data_pagamento: string }) => void
  isPending: boolean
  error?: string | null
}) {
  // valor_pago no backend é o TOTAL acumulado do título: pré-preenche o valor previsto inteiro.
  const [valor, setValor] = useState(formatBRLWithoutSymbol(l.valor_previsto))
  const [data, setData] = useState(hojeSP())
  const entrada = l.natureza === 'receita'
  const decimal = parseBRMoneyToDecimal(valor)
  const parcial = decimal > 0 && decimal < l.valor_previsto
  const invalido = !(decimal > 0) || !data

  function submit(e: FormEvent) {
    e.preventDefault()
    if (invalido) return
    onConfirm({ valor_pago: decimal, data_pagamento: data })
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
          <Field label={entrada ? 'Valor recebido (total)' : 'Valor pago (total)'} hint={parcial ? `Parcial — faltam ${formatMoney(l.valor_previsto - decimal, true)}` : 'Valor cheio quita o lançamento'}>
            <MoneyInput className="design-input h-11 w-full px-4" value={valor} onChange={(raw) => setValor(raw)} required />
          </Field>
          <Field label={entrada ? 'Data do recebimento' : 'Data do pagamento'}>
            <input type="date" className="design-input h-11 w-full px-4" value={data} max="2100-12-31" onChange={(e) => setData(e.target.value)} required />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink" onClick={() => setValor(formatBRLWithoutSymbol(l.valor_previsto))}>
            Valor cheio
          </button>
          <button type="button" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink" onClick={() => setData(hojeSP())}>
            Hoje
          </button>
          {l.data_vencimento ? (
            <button type="button" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink" onClick={() => setData(l.data_vencimento!)}>
              No vencimento
            </button>
          ) : null}
        </div>
        <InlineError message={error} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" icon={Check} isLoading={isPending} disabled={invalido}>
            {parcial ? 'Registrar parcial' : entrada ? 'Marcar recebido' : 'Marcar pago'}
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
