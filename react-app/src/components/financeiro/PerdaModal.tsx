import { Ban, RotateCcw } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { usePerdaMutation } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import type { Lancamento, ModoPerda } from '../../types/financeiro'
import { valorEmAberto } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
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
      'O valor escolhido sai do saldo a receber e entra em “Receita perdida” no Resultado do mês do registro. O que já foi recebido continua preservado. Dá para desfazer depois.',
    cta: 'Dar como perdida',
    ok: 'Receita marcada como perdida.',
  },
  cancelar: {
    title: 'Cancelar lançamento?',
    efeito:
      'Sai do a pagar e do previsto do mês; o registro fica com o motivo. Dá para reativar.',
    cta: 'Cancelar lançamento',
    ok: 'Lançamento cancelado.',
  },
  desfazer: {
    title: 'Desfazer?',
    efeito: 'O valor escolhido volta ao saldo em aberto. O status é recalculado pelo vencimento e a reversão fica registrada no Resultado do mês.',
    cta: 'Desfazer',
    ok: 'Lançamento reativado.',
  },
}

/** Nome do item no título/CTA do cancelamento; origens ausentes usam o texto neutro. */
const NOME_CANCELAMENTO: Partial<Record<Lancamento['origem'], string>> = {
  apresentadora: 'pagamento',
  imposto: 'imposto',
  manual: 'despesa',
  recorrente: 'despesa',
  parcela: 'despesa',
}

/** Dar como perdida (receita), cancelar (custo) ou desfazer uma dessas ações. Chama a API e fecha ao concluir. */
export function PerdaModal({ item, modo, onClose }: { item: Lancamento; modo: ModoPerda; onClose: () => void }) {
  const toast = useToast()
  const mut = usePerdaMutation()
  const [motivo, setMotivo] = useState('')
  const [valor, setValor] = useState('')
  const textos = TEXTOS[modo]
  const nome = NOME_CANCELAMENTO[item.origem]
  const receita = item.natureza === 'receita'
  const title = modo === 'cancelar' && nome ? `Cancelar ${nome}?` : modo === 'desfazer' ? (receita ? 'Desfazer perda?' : 'Desfazer cancelamento?') : textos.title
  const cta = modo === 'cancelar' && nome ? `Cancelar ${nome}` : modo === 'desfazer' ? (receita ? 'Desfazer perda' : 'Desfazer cancelamento') : textos.cta
  const ok = modo === 'desfazer' ? (receita ? 'Perda desfeita.' : 'Cancelamento desfeito.') : textos.ok
  const efeito = modo === 'desfazer' && !receita
    ? 'O lançamento volta ao a pagar e ao previsto conforme as regras do período.'
    : textos.efeito
  const motivoAnterior = receita ? item.perdido_motivo : item.cancelado_motivo
  const precisaMotivo = receita || modo !== 'desfazer'
  const motivoValido = !precisaMotivo || motivo.trim().length > 0
  const saldoOriginal = valorEmAberto(item)
  const saldoAfetado = receita
    ? modo === 'desfazer' ? (item.valor_perdido ?? saldoOriginal) : Math.max(0, saldoOriginal - (item.valor_perdido ?? 0))
    : saldoOriginal
  const valorDigitado = valor.trim().replace(',', '.') || saldoAfetado.toFixed(2)
  const formatoValido = /^\d{1,13}(?:\.\d{1,2})?$/.test(valorDigitado)
  const centavos = formatoValido ? Math.round(Number(valorDigitado) * 100) : 0
  const valorValido = !receita || (centavos > 0 && centavos <= Math.round(saldoAfetado * 100))
  const valorNormalizado = formatoValido ? `${valorDigitado.split('.')[0]}.${(valorDigitado.split('.')[1] ?? '').padEnd(2, '0')}` : ''
  const saldoLabel = modo === 'desfazer' ? 'Máximo que pode ser reaberto' : 'Saldo máximo que pode ser encerrado'

  function submit(e: FormEvent) {
    e.preventDefault()
    if (mut.isPending || !motivoValido || !valorValido) return
    mut.mutate(
      { lancamento: item, modo, ...(precisaMotivo ? { motivo: motivo.trim() } : {}), ...(receita ? { valor: valorNormalizado } : {}) },
      {
        onSuccess: () => {
          toast.push(ok, 'success')
          onClose()
        },
      },
    )
  }

  return (
    <Modal open size="sm" title={title} subtitle={efeito} onClose={mut.isPending ? () => undefined : onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <Resumo l={item} />
        <div className="rounded-xl border border-line bg-surface-muted px-3 py-2.5 text-sm text-ink">
          <p>{saldoLabel}: <strong className="num">{formatMoney(saldoAfetado, true)}</strong></p>
          {receita ? <p className="mt-1 text-xs text-ink-muted">O efeito no Resultado será considerado no mês em que esta ação for registrada.</p> : null}
        </div>
        {receita ? <Field label={modo === 'desfazer' ? 'Valor a reabrir' : 'Valor a encerrar'} hint="Informe o valor total ou apenas uma parte, em reais.">
          <input
            className="design-input w-full px-3 py-2 text-sm"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={saldoAfetado.toFixed(2).replace('.', ',')}
            aria-invalid={valor.length > 0 && !valorValido}
          />
        </Field> : null}
        {receita && valor.length > 0 && !valorValido ? <InlineError message="Informe um valor maior que zero e até o saldo disponível, com no máximo duas casas decimais." /> : null}
        {modo === 'desfazer' && motivoAnterior ? <p className="text-xs text-ink-muted">Motivo registrado anteriormente: {motivoAnterior}</p> : null}
        {precisaMotivo ? <Field label={modo === 'desfazer' ? 'Motivo da reversão' : 'Motivo'} hint={`${motivo.length}/${MOTIVO_MAX}`}>
          <textarea
            className="design-input min-h-20 w-full resize-y p-3 text-sm"
            value={motivo}
            maxLength={MOTIVO_MAX}
            required
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={modo === 'desfazer' ? 'Explique por que esta ação está sendo revertida' : receita ? 'Ex.: cliente encerrou o contrato sem pagar' : 'Ex.: cobrança duplicada'}
          />
        </Field> : null}
        <InlineError message={mut.error ? extractErrorMessage(mut.error) : null} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mut.isPending}>Voltar</Button>
          <Button type="submit" variant={modo === 'desfazer' ? 'primary' : 'danger'} icon={modo === 'desfazer' ? RotateCcw : Ban} isLoading={mut.isPending} disabled={!motivoValido || !valorValido || mut.isPending}>
            {cta}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
