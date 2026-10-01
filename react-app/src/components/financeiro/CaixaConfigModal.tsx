import { AlertTriangle, Save } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useConfigMutation } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import type { FinanceiroConfig } from '../../types/financeiro'
import { formatDataBR, montarPayloadCaixa, precisaConfirmarAlteracao } from '../../utils/caixa'
import { hojeSP } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import { formatBRLWithoutSymbol } from '../../utils/money'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { MoneyInput } from '../ui/MoneyInput'
import { Field, InlineError } from './primitives'

export function CaixaConfigModal({
  open,
  atual,
  podeEscrever,
  onClose,
  onSaved,
}: {
  open: boolean
  atual: Pick<FinanceiroConfig, 'data_corte' | 'saldo_abertura'> | undefined
  podeEscrever: boolean
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  if (!open) return null
  return <CaixaForm atual={atual} podeEscrever={podeEscrever} onClose={onClose} onSaved={onSaved} />
}

function CaixaForm({ atual, podeEscrever, onClose, onSaved }: { atual: Pick<FinanceiroConfig, 'data_corte' | 'saldo_abertura'> | undefined; podeEscrever: boolean; onClose: () => void; onSaved: (msg: string) => void }) {
  const configurado = Boolean(atual?.data_corte)
  const [valor, setValor] = useState(configurado ? formatBRLWithoutSymbol(atual?.saldo_abertura ?? 0) : '')
  const [corte, setCorte] = useState(atual?.data_corte ?? hojeSP())
  const [confirmando, setConfirmando] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const mut = useConfigMutation()

  function salvar(payload: { saldo_abertura: number; data_corte: string }) {
    mut.mutate(payload, {
      onSuccess: () => {
        onSaved(configurado ? 'Caixa atualizado.' : 'Saldo de abertura cadastrado.')
        onClose()
      },
    })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (mut.isPending) return
    setLocalError(null)
    const res = montarPayloadCaixa({ valor, dataCorte: corte })
    if (!res.ok) return setLocalError(res.error)
    if (atual && !confirmando && precisaConfirmarAlteracao(atual, res.payload)) {
      setConfirmando(true)
      return
    }
    salvar(res.payload)
  }

  const editando = !confirmando
  return (
    <Modal open size="sm" title="Saldo de abertura" subtitle="Ponto de partida do caixa." onClose={onClose}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field label="Saldo de caixa (R$)" hint="Aceita valor negativo, ex.: -1.500,00">
          <MoneyInput
            className="design-input h-12 w-full px-4 text-lg font-bold"
            value={valor}
            onChange={(raw) => { setValor(raw); setConfirmando(false) }}
            placeholder="0,00"
            disabled={!podeEscrever || mut.isPending}
            autoFocus
            required
          />
        </Field>
        <Field label="Data de corte">
          <input
            type="date"
            className="design-input h-11 w-full px-4"
            value={corte}
            max="2100-12-31"
            onChange={(e) => { setCorte(e.target.value); setConfirmando(false) }}
            disabled={!podeEscrever || mut.isPending}
            required
          />
        </Field>
        <p className="rounded-2xl border border-line bg-surface-muted p-4 text-xs text-[var(--text-secondary)]">
          Tudo antes desta data é ignorado; vencimentos a partir dela entram.
        </p>

        {confirmando && atual ? (
          <div role="alert" className="flex gap-3 rounded-2xl border border-[var(--warning)] bg-[var(--warning-soft)] p-4 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" aria-hidden />
            <div>
              <p className="font-semibold">Alterar o caixa já configurado?</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Hoje: {formatMoney(atual.saldo_abertura, true)} em {formatDataBR(atual.data_corte)}. O saldo atual e a lista de lançamentos serão recalculados com o novo corte.
              </p>
            </div>
          </div>
        ) : null}

        <InlineError message={localError ?? (mut.error ? extractErrorMessage(mut.error) : null)} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mut.isPending}>{podeEscrever ? 'Cancelar' : 'Fechar'}</Button>
          {podeEscrever ? (
            <Button type="submit" icon={Save} isLoading={mut.isPending} disabled={mut.isPending}>
              {editando ? 'Salvar' : 'Confirmar alteração'}
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}
