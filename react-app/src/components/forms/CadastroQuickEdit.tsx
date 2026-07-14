import { FormEvent, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { MoneyInput } from '../ui/MoneyInput'
import { updateCliente, updateMarca } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { asNumber, asString } from '../../utils/format'
import { parseBRMoneyToDecimal } from '../../utils/money'
import type { JsonRecord } from '../../types/models'

interface CadastroQuickEditProps {
  kind: 'marca' | 'cliente'
  /** Registro atual (marca ou cliente) vindo do detalhe operacional. */
  record: JsonRecord
  onSaved: () => void
}

/**
 * Edição rápida do cadastro direto no modal de detalhe — evita ter que
 * procurar o cliente no Comercial só pra ajustar nome ou o fixo mensal.
 */
export function CadastroQuickEdit({ kind, record, onSaved }: CadastroQuickEditProps) {
  const recordId = asString(record.id, '')
  const [nome, setNome] = useState('')
  const [fixoMensal, setFixoMensal] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNome(asString(record.nome, ''))
    setFixoMensal(kind === 'marca' ? String(asNumber(record.valor_fixo_minimo)) : '')
    setSaved(false)
  }, [kind, record])

  const mutation = useMutation({
    mutationFn: (payload: JsonRecord) =>
      kind === 'marca' ? updateMarca(recordId, payload) : updateCliente(recordId, payload),
    onSuccess: () => { setSaved(true); onSaved() },
  })

  if (!recordId) return null

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nome.trim()) return
    const payload: JsonRecord = { nome: nome.trim() }
    if (kind === 'marca') payload.valor_fixo_minimo = parseBRMoneyToDecimal(fixoMensal)
    mutation.mutate(payload)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-muted">
          Nome {kind === 'marca' ? 'da marca' : 'do cliente'}
        </span>
        <input
          className="design-input h-9 w-56 px-3"
          value={nome}
          onChange={(e) => { setNome(e.target.value); setSaved(false) }}
          required
        />
      </label>
      {kind === 'marca' ? (
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-muted">Fixo mensal (R$)</span>
          <MoneyInput
            className="design-input h-9 w-36 px-3"
            value={fixoMensal}
            onChange={(value) => { setFixoMensal(value); setSaved(false) }}
          />
        </label>
      ) : null}
      <Button type="submit" variant="secondary" isLoading={mutation.isPending}>Salvar cadastro</Button>
      {saved ? <span className="text-xs font-semibold text-[color:var(--success)]">Salvo ✓</span> : null}
      {mutation.error ? (
        <span className="text-xs font-semibold text-[color:var(--danger)]">{extractErrorMessage(mutation.error)}</span>
      ) : null}
    </form>
  )
}
