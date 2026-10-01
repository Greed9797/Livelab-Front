import { Save } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useReceitaAvulsaMutations } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import type { Lancamento } from '../../types/financeiro'
import { GRUPOS_RECEITA_AVULSA } from '../../types/financeiro'
import { isGrupoReceitaAvulsa, montarPayloadReceitaAvulsa } from '../../utils/caixa'
import { grupoLabel, hojeSP, vencimentoNoMes } from '../../utils/financeiro'
import { formatBRLWithoutSymbol } from '../../utils/money'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { MoneyInput } from '../ui/MoneyInput'
import { Field, InlineError } from './primitives'

export type ReceitaModalState = { kind: 'nova' } | { kind: 'editar'; lancamento: Lancamento }

const input = 'design-input h-11 w-full px-4'

export function ReceitaAvulsaModal({ state, mes, onClose, onSaved }: { state: ReceitaModalState | null; mes: string; onClose: () => void; onSaved: (msg: string) => void }) {
  if (!state) return null
  const key = state.kind === 'nova' ? 'nova' : state.lancamento.id
  return <ReceitaForm key={key} state={state} mes={mes} onClose={onClose} onSaved={onSaved} />
}

function ReceitaForm({ state, mes, onClose, onSaved }: { state: ReceitaModalState; mes: string; onClose: () => void; onSaved: (msg: string) => void }) {
  const m = useReceitaAvulsaMutations()
  const edit = state.kind === 'editar' ? state.lancamento : null
  const hoje = hojeSP()
  const [descricao, setDescricao] = useState(edit?.descricao ?? '')
  const [grupo, setGrupo] = useState(edit?.grupo && isGrupoReceitaAvulsa(edit.grupo) ? edit.grupo : 'servico')
  const [valor, setValor] = useState(edit ? formatBRLWithoutSymbol(edit.valor_previsto) : '')
  const [vencimento, setVencimento] = useState(edit?.data_vencimento ?? (hoje.startsWith(mes) ? hoje : vencimentoNoMes(mes, 5)))
  const [observacao, setObservacao] = useState(edit?.observacao ?? '')
  const [jaRecebido, setJaRecebido] = useState(false)
  const [dataRecebimento, setDataRecebimento] = useState(hoje)
  const [localError, setLocalError] = useState<string | null>(null)

  const pending = m.criar.isPending || m.atualizar.isPending
  const mutationError = m.criar.error ?? m.atualizar.error

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setLocalError(null)
    const res = montarPayloadReceitaAvulsa(
      { descricao, grupo, valor, vencimento, observacao, jaRecebido, dataRecebimento },
      { permitirRecebido: !edit },
    )
    if (!res.ok) return setLocalError(res.error)
    try {
      if (edit) {
        await m.atualizar.mutateAsync({ id: edit.id, payload: res.payload })
        onSaved('Receita atualizada.')
      } else {
        await m.criar.mutateAsync(res.payload)
        onSaved(jaRecebido ? 'Receita lançada e marcada como recebida.' : 'Receita lançada.')
      }
      onClose()
    } catch {
      // erro exibido via mutationError
    }
  }

  return (
    <Modal
      open
      size="md"
      title={edit ? 'Editar receita' : 'Nova receita'}
      subtitle="Entrada avulsa: aporte, serviço, reembolso ou outras."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <Field label="Descrição">
            <input className={input} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Aporte do sócio" required autoFocus />
          </Field>
          <Field label="Grupo">
            <select className={input} value={grupo} onChange={(e) => setGrupo(e.target.value as typeof grupo)}>
              {GRUPOS_RECEITA_AVULSA.map((g) => (
                <option key={g} value={g}>{grupoLabel(g)}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Valor">
            <MoneyInput className={input} value={valor} onChange={(raw) => setValor(raw)} placeholder="0,00" required />
          </Field>
          <Field label="Vencimento">
            <input className={input} type="date" value={vencimento} max="2100-12-31" onChange={(e) => setVencimento(e.target.value)} required />
          </Field>
        </div>
        {!edit ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 self-end rounded-xl border border-line px-4 py-3 text-sm text-ink has-[:checked]:border-[var(--success)] has-[:checked]:bg-[var(--success-soft)]">
              <input type="checkbox" checked={jaRecebido} onChange={(e) => setJaRecebido(e.target.checked)} className="h-4 w-4 accent-[var(--success)]" />
              Já recebido
            </label>
            {jaRecebido ? (
              <Field label="Data do recebimento">
                <input className={input} type="date" value={dataRecebimento} max="2100-12-31" onChange={(e) => setDataRecebimento(e.target.value)} required />
              </Field>
            ) : null}
          </div>
        ) : null}
        <Field label="Observação (opcional)">
          <textarea className="design-input min-h-[72px] w-full px-4 py-3 text-sm" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </Field>
        <InlineError message={localError ?? (mutationError ? extractErrorMessage(mutationError) : null)} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button type="submit" icon={Save} isLoading={pending} disabled={pending}>{edit ? 'Salvar alterações' : 'Lançar receita'}</Button>
        </div>
      </form>
    </Modal>
  )
}
