import { Ban, RotateCcw } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { usePerdaMutation } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import type { Lancamento, ModoPerda } from '../../types/financeiro'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { Resumo } from './LancamentoModals'
import { Field, InlineError } from './primitives'

export const MOTIVO_MAX = 300

const TEXTOS: Record<ModoPerda, { title: string; efeito: string; cta: string; ok: string }> = {
  perder: {
    title: 'Dar como perdida?',
    efeito:
      'Sai do “a receber”, do atrasado e do caixa projetado, e entra em “Receita perdida” no DRE (o previsto não muda). Se já houve recebimento parcial, só o saldo em aberto é encerrado. Dá para desfazer depois.',
    cta: 'Dar como perdida',
    ok: 'Receita marcada como perdida.',
  },
  cancelar: {
    title: 'Cancelar despesa?',
    efeito:
      'Sai do “a pagar” e do previsto do mês. O registro continua no histórico, com o motivo. Dá para reativar depois.',
    cta: 'Cancelar despesa',
    ok: 'Despesa cancelada.',
  },
  desfazer: {
    title: 'Desfazer?',
    efeito: 'O lançamento volta ao normal: o status é recalculado pelo vencimento e ele volta a contar no a receber / a pagar e no previsto.',
    cta: 'Desfazer',
    ok: 'Lançamento reativado.',
  },
}

/** Dar como perdida (receita), cancelar (custo) ou desfazer uma dessas ações. Chama a API e fecha ao concluir. */
export function PerdaModal({ item, modo, onClose }: { item: Lancamento; modo: ModoPerda; onClose: () => void }) {
  const toast = useToast()
  const mut = usePerdaMutation()
  const [motivo, setMotivo] = useState('')
  const textos = TEXTOS[modo]
  const receita = item.natureza === 'receita'
  const title = modo === 'desfazer' ? (receita ? 'Desfazer perda?' : 'Desfazer cancelamento?') : textos.title
  const cta = modo === 'desfazer' ? (receita ? 'Desfazer perda' : 'Desfazer cancelamento') : textos.cta
  const ok = modo === 'desfazer' ? (receita ? 'Perda desfeita.' : 'Cancelamento desfeito.') : textos.ok
  const motivoAnterior = receita ? item.perdido_motivo : item.cancelado_motivo

  function submit(e: FormEvent) {
    e.preventDefault()
    if (mut.isPending) return
    mut.mutate(
      { lancamento: item, modo, motivo: modo === 'desfazer' ? undefined : motivo },
      {
        onSuccess: () => {
          toast.push(ok, 'success')
          onClose()
        },
      },
    )
  }

  return (
    <Modal open size="sm" title={title} subtitle={textos.efeito} onClose={mut.isPending ? () => undefined : onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <Resumo l={item} />
        {modo === 'desfazer' ? (
          motivoAnterior ? <p className="text-xs text-ink-muted">Motivo registrado: {motivoAnterior}</p> : null
        ) : (
          <Field label="Motivo (opcional)" hint={`${motivo.length}/${MOTIVO_MAX}`}>
            <textarea
              className="design-input min-h-20 w-full resize-y p-3 text-sm"
              value={motivo}
              maxLength={MOTIVO_MAX}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={receita ? 'Ex.: cliente encerrou o contrato sem pagar' : 'Ex.: cobrança duplicada'}
            />
          </Field>
        )}
        <InlineError message={mut.error ? extractErrorMessage(mut.error) : null} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mut.isPending}>Voltar</Button>
          <Button type="submit" variant={modo === 'desfazer' ? 'primary' : 'danger'} icon={modo === 'desfazer' ? RotateCcw : Ban} isLoading={mut.isPending}>
            {cta}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
