import { CheckCircle2, DatabaseZap, Download, Info, SearchCheck } from 'lucide-react'
import { useState } from 'react'
import { SEED_CUSTOS_PLANILHA } from '../../data/seed-custos-planilha'
import { useImportarCustos } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import type { ImportarCustosResultado } from '../../types/financeiro'
import { formatDataCurta, grupoLabel, mesLabel } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import { totalMensalRecorrentes } from '../../utils/importar-custos'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { InlineError } from './primitives'

const { recorrentes, pontuais } = SEED_CUSTOS_PLANILHA
const th = 'px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted'
const td = 'px-3 py-2 text-sm text-ink'

function vigencia(inicio: string, fim: string | null) {
  const ini = mesLabel(inicio.slice(0, 7), true)
  return fim ? `${ini} → ${mesLabel(fim.slice(0, 7), true)}` : `desde ${ini}`
}

function Resultado({ res }: { res: ImportarCustosResultado }) {
  return (
    <div className="rounded-xl bg-surface-muted p-3 text-sm text-ink" role="status">
      <p className="flex items-center gap-2 font-semibold">
        <CheckCircle2 className="h-4 w-4" />
        {res.dry_run ? 'Conferência (nada foi gravado)' : 'Importação concluída'}
      </p>
      <p className="mt-1">
        {res.dry_run ? 'Seriam criados' : 'Criados'}: {res.recorrentes.criados} recorrente(s) e {res.pontuais.criados} pontual(is).
      </p>
      <p>Ignorados (já existiam): {res.recorrentes.ignorados} recorrente(s) e {res.pontuais.ignorados} pontual(is).</p>
    </div>
  )
}

export function ImportarPlanilhaModal({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: (msg: string, variant?: 'success' | 'error') => void }) {
  const imp = useImportarCustos()
  const [conferencia, setConferencia] = useState<ImportarCustosResultado | null>(null)
  const busy = imp.isPending
  const total = totalMensalRecorrentes(recorrentes)

  function fechar() {
    if (busy) return
    setConferencia(null)
    imp.reset()
    onClose()
  }

  function conferir() {
    imp.mutate({ seed: SEED_CUSTOS_PLANILHA, dryRun: true }, { onSuccess: setConferencia })
  }

  function importar() {
    imp.mutate(
      { seed: SEED_CUSTOS_PLANILHA, dryRun: false },
      {
        onSuccess: (res) => {
          const criados = res.recorrentes.criados + res.pontuais.criados
          const ignorados = res.recorrentes.ignorados + res.pontuais.ignorados
          onToast(`Importação concluída: ${criados} criado(s), ${ignorados} ignorado(s).`)
          setConferencia(null)
          imp.reset()
          onClose()
        },
        onError: (e) => onToast(extractErrorMessage(e), 'error'),
      },
    )
  }

  return (
    <Modal
      open={open}
      size="lg"
      title="Importar lista da planilha"
      subtitle={`${recorrentes.length} recorrentes e ${pontuais.length} lançamentos pontuais · ${SEED_CUSTOS_PLANILHA.versao}`}
      onClose={fechar}
      closeDisabled={busy}
      footer={
        <>
          <Button variant="ghost" onClick={fechar} disabled={busy}>Cancelar</Button>
          <Button variant="secondary" icon={SearchCheck} isLoading={busy && imp.variables?.dryRun === true} disabled={busy} onClick={conferir}>
            Conferir (sem gravar)
          </Button>
          <Button icon={Download} isLoading={busy && imp.variables?.dryRun === false} disabled={busy} onClick={importar}>
            Importar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl bg-surface-muted p-3 text-sm text-ink">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Nada que já existe é alterado: itens repetidos são ignorados e apenas os novos são criados.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-soft text-brand"><DatabaseZap className="h-5 w-5" /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Total mensal dos recorrentes</p>
            <p className="num text-xl font-bold text-ink">{formatMoney(total, true)}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[560px]">
            <thead className="bg-surface-muted">
              <tr><th className={th}>Nome</th><th className={th}>Grupo</th><th className={`${th} text-right`}>Valor</th><th className={th}>Dia</th><th className={th}>Vigência</th></tr>
            </thead>
            <tbody>
              {recorrentes.map((r) => (
                <tr key={`${r.nome}-${r.dia_vencimento}`} className="border-t border-[var(--border)]">
                  <td className={td}>{r.nome}</td>
                  <td className={td}>{grupoLabel(r.grupo)}</td>
                  <td className={`${td} num text-right`}>{formatMoney(r.valor, true)}</td>
                  <td className={td}>{r.dia_vencimento}{r.mes_offset ? ' (mês seguinte)' : ''}</td>
                  <td className={td}>{vigencia(r.inicio, r.fim)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pontuais.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[560px]">
              <thead className="bg-surface-muted">
                <tr><th className={th}>Pontual</th><th className={th}>Grupo</th><th className={`${th} text-right`}>Valor</th><th className={th}>Vencimento</th><th className={th}>Competência</th></tr>
              </thead>
              <tbody>
                {pontuais.map((p) => (
                  <tr key={p.descricao} className="border-t border-[var(--border)]">
                    <td className={td}>{p.descricao}</td>
                    <td className={td}>{grupoLabel(p.grupo)}</td>
                    <td className={`${td} num text-right`}>{formatMoney(p.valor, true)}</td>
                    <td className={td}>{formatDataCurta(p.data_vencimento)}/{p.data_vencimento.slice(2, 4)}</td>
                    <td className={td}>{mesLabel(p.competencia.slice(0, 7), true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {conferencia ? <Resultado res={conferencia} /> : null}
        <InlineError message={imp.error ? extractErrorMessage(imp.error) : null} />
      </div>
    </Modal>
  )
}
