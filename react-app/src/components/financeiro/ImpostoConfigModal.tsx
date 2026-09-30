import { Percent, Save } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useConfigMutation } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import { formatPercent } from '../../utils/format'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Field, InlineError } from './primitives'

export function ImpostoConfigModal({
  open,
  atual,
  podeEscrever,
  onClose,
  onSaved,
}: {
  open: boolean
  atual: number
  podeEscrever: boolean
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  if (!open) return null
  return <ImpostoForm atual={atual} podeEscrever={podeEscrever} onClose={onClose} onSaved={onSaved} />
}

function ImpostoForm({ atual, podeEscrever, onClose, onSaved }: { atual: number; podeEscrever: boolean; onClose: () => void; onSaved: (msg: string) => void }) {
  const [valor, setValor] = useState(String(atual).replace('.', ','))
  const mut = useConfigMutation()
  const num = Number(valor.replace(',', '.'))
  const invalido = !Number.isFinite(num) || num < 0 || num > 100
  const exemplo = 10000 * (invalido ? 0 : num / 100)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (invalido) return
    mut.mutate(
      { aliquota_imposto_pct: Math.round(num * 100) / 100 },
      {
        onSuccess: (res) => {
          onSaved(`Alíquota atualizada para ${formatPercent(res.aliquota_imposto_pct)}.`)
          onClose()
        },
      },
    )
  }

  return (
    <Modal open size="sm" title="Imposto sobre recebimentos" subtitle="Alíquota aplicada ao total recebido no mês anterior." onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Alíquota (%)" hint="Padrão: 10%">
          <div className="relative">
            <input
              className="design-input h-12 w-full px-4 pr-10 text-lg font-bold"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              disabled={!podeEscrever}
              aria-invalid={invalido}
            />
            <Percent className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          </div>
        </Field>
        <ul className="space-y-1.5 rounded-2xl border border-line bg-surface-muted p-4 text-xs text-[var(--text-secondary)]">
          <li>• Base: tudo que foi <strong>recebido</strong> das marcas no mês anterior (M−1).</li>
          <li>• Lançado na competência M com vencimento no <strong>dia 20</strong>.</li>
          <li>• Meses futuros são projetados sobre o previsto de M−1.</li>
          <li className="num pt-1 text-ink">Ex.: recebeu R$ 10.000,00 → imposto de R$ {exemplo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.</li>
        </ul>
        {invalido ? <InlineError message="Informe um percentual entre 0 e 100." /> : null}
        <InlineError message={mut.error ? extractErrorMessage(mut.error) : null} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>{podeEscrever ? 'Cancelar' : 'Fechar'}</Button>
          {podeEscrever ? <Button type="submit" icon={Save} isLoading={mut.isPending} disabled={invalido}>Salvar</Button> : null}
        </div>
      </form>
    </Modal>
  )
}
