import { CalendarClock, Layers, Receipt, Repeat, Save } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useCustoMutations } from '../../hooks/useFinanceiro'
import { extractErrorMessage } from '../../services/api'
import type { CustoRecorrente, Lancamento } from '../../types/financeiro'
import { GRUPOS_CUSTO } from '../../types/financeiro'
import { dividirParcelas, formatDataCurta, grupoLabel, hojeSP, shiftMes, ultimoDiaMes, vencimentoNoMes } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import { formatBRLWithoutSymbol, parseBRMoneyToDecimal } from '../../utils/money'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { MoneyInput } from '../ui/MoneyInput'
import { Field, InlineError, Segmented } from './primitives'

export type ModoCusto = 'pontual' | 'recorrente' | 'parcelado'

export type CustoModalState =
  | { kind: 'novo'; modo: ModoCusto }
  | { kind: 'editar-lancamento'; lancamento: Lancamento }
  | { kind: 'editar-recorrente'; recorrente: CustoRecorrente }

const input = 'design-input h-11 w-full px-4'

function GrupoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className={input} value={value} onChange={(e) => onChange(e.target.value)}>
      {GRUPOS_CUSTO.filter((g) => g !== 'aporte').map((g) => (
        <option key={g} value={g}>{grupoLabel(g)}</option>
      ))}
    </select>
  )
}

function vencimentoPadrao(mes: string) {
  const hoje = hojeSP()
  return hoje.startsWith(mes) ? hoje : vencimentoNoMes(mes, 5)
}

export function CustoFormModal({ state, mes, onClose, onSaved }: { state: CustoModalState | null; mes: string; onClose: () => void; onSaved: (msg: string) => void }) {
  if (!state) return null
  const key = state.kind === 'novo' ? `novo-${state.modo}` : state.kind === 'editar-lancamento' ? state.lancamento.id : state.recorrente.id
  return <CustoForm key={key} state={state} mes={mes} onClose={onClose} onSaved={onSaved} />
}

function CustoForm({ state, mes, onClose, onSaved }: { state: CustoModalState; mes: string; onClose: () => void; onSaved: (msg: string) => void }) {
  const m = useCustoMutations()
  const editLanc = state.kind === 'editar-lancamento' ? state.lancamento : null
  const editRec = state.kind === 'editar-recorrente' ? state.recorrente : null
  const [modo, setModo] = useState<ModoCusto>(state.kind === 'novo' ? state.modo : editRec ? 'recorrente' : 'pontual')

  // Campos compartilhados
  const [descricao, setDescricao] = useState(editLanc?.descricao ?? editRec?.nome ?? '')
  const [valor, setValor] = useState(
    editLanc ? formatBRLWithoutSymbol(editLanc.valor_previsto) : editRec ? formatBRLWithoutSymbol(editRec.valor) : '',
  )
  const [grupo, setGrupo] = useState(editLanc?.grupo ?? editRec?.grupo ?? 'diversos')
  const [observacao, setObservacao] = useState(editLanc?.observacao ?? editRec?.descricao ?? '')

  // Pontual
  const [vencimento, setVencimento] = useState(editLanc?.data_vencimento ?? vencimentoPadrao(mes))
  const [competencia, setCompetencia] = useState((editLanc?.competencia || `${mes}-01`).slice(0, 7))
  const [jaPago, setJaPago] = useState(false)

  // Recorrente
  const [dia, setDia] = useState(String(editRec?.dia_vencimento ?? 5))
  const [offset, setOffset] = useState(String(editRec?.mes_offset ?? 0))
  const [inicio, setInicio] = useState((editRec?.inicio || `${mes}-01`).slice(0, 7))
  const [fim, setFim] = useState(editRec?.fim ? editRec.fim.slice(0, 7) : '')
  const [ativo, setAtivo] = useState(editRec?.ativo ?? true)

  // Parcelado
  const [parcelas, setParcelas] = useState('3')
  const [tipoValor, setTipoValor] = useState<'total' | 'parcela'>('total')

  const valorNum = parseBRMoneyToDecimal(valor)
  const nParcelas = Math.max(1, Math.min(120, Math.trunc(Number(parcelas)) || 1))
  const previewParcelas = modo === 'parcelado'
    ? tipoValor === 'total'
      ? dividirParcelas(valorNum, nParcelas)
      : Array.from({ length: valorNum > 0 ? nParcelas : 0 }, () => valorNum)
    : []

  const pending = m.criarPontual.isPending || m.criarParcelado.isPending || m.criarRecorrente.isPending || m.atualizar.isPending || m.atualizarRecorrente.isPending
  const mutationError = m.criarPontual.error ?? m.criarParcelado.error ?? m.criarRecorrente.error ?? m.atualizar.error ?? m.atualizarRecorrente.error
  const [localError, setLocalError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (!descricao.trim()) return setLocalError('Informe a descrição.')
    if (!(valorNum > 0)) return setLocalError('Informe um valor maior que zero.')
    try {
      if (modo === 'pontual') {
        const payload = {
          descricao: descricao.trim(),
          valor: valorNum,
          grupo,
          competencia,
          data_vencimento: vencimento,
          observacao: observacao.trim() || null,
        }
        if (editLanc) {
          await m.atualizar.mutateAsync({ id: editLanc.id, payload })
          onSaved('Custo atualizado.')
        } else {
          await m.criarPontual.mutateAsync({
            ...payload,
            ...(jaPago ? { valor_pago: valorNum, data_pagamento: hojeSP() } : {}),
          })
          onSaved('Custo lançado.')
        }
      } else if (modo === 'recorrente') {
        const d = Math.trunc(Number(dia))
        if (!(d >= 1 && d <= 31)) return setLocalError('Dia de vencimento deve ser entre 1 e 31.')
        if (fim && fim < inicio) return setLocalError('O fim deve ser igual ou posterior ao início.')
        const payload = {
          nome: descricao.trim(),
          descricao: observacao.trim() || null,
          grupo,
          valor: valorNum,
          dia_vencimento: d,
          mes_offset: Number(offset) === 1 ? 1 : 0,
          inicio: `${inicio}-01`,
          fim: fim ? `${fim}-${String(ultimoDiaMes(fim)).padStart(2, '0')}` : null,
          ativo,
        }
        if (editRec) {
          await m.atualizarRecorrente.mutateAsync({ id: editRec.id, payload })
          onSaved('Recorrente atualizado.')
        } else {
          await m.criarRecorrente.mutateAsync(payload)
          onSaved('Custo recorrente criado.')
        }
      } else {
        await m.criarParcelado.mutateAsync({
          descricao: descricao.trim(),
          parcelas: nParcelas,
          ...(tipoValor === 'total' ? { valor_total: valorNum } : { valor_parcela: valorNum }),
          grupo,
          data_vencimento: vencimento,
          observacao: observacao.trim() || null,
        })
        onSaved(`${nParcelas} parcelas lançadas.`)
      }
      onClose()
    } catch {
      // erro exibido via mutationError
    }
  }

  const titulo = editLanc
    ? editLanc.origem === 'recorrente' && editLanc.virtual
      ? 'Editar lançamento deste mês'
      : 'Editar custo'
    : editRec
      ? 'Editar custo recorrente'
      : 'Novo custo'

  const subtitulo = editLanc?.origem === 'recorrente'
    ? 'Altera só esta ocorrência. Para mudar todos os meses, edite o recorrente na aba Recorrentes.'
    : editLanc?.parcela_grupo_id
      ? 'Altera só esta parcela.'
      : modo === 'recorrente'
        ? 'Aluguel, ferramentas, contabilidade… gera um lançamento por mês automaticamente.'
        : modo === 'parcelado'
          ? 'Compra no cartão ou parcelada — uma parcela por mês a partir do 1º vencimento.'
          : 'Despesa única com data de vencimento.'

  return (
    <Modal open size="md" title={titulo} subtitle={subtitulo} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        {state.kind === 'novo' ? (
          <Segmented<ModoCusto>
            label="Tipo de custo"
            value={modo}
            onChange={(v) => {
              setModo(v)
              if (v === 'parcelado' && grupo === 'diversos') setGrupo('cartao')
              if (v === 'recorrente' && grupo === 'diversos') setGrupo('estrutural')
            }}
            options={[
              { value: 'pontual', label: 'Pontual', icon: <Receipt className="h-4 w-4" /> },
              { value: 'recorrente', label: 'Recorrente', icon: <Repeat className="h-4 w-4" /> },
              { value: 'parcelado', label: 'Parcelado', icon: <Layers className="h-4 w-4" /> },
            ]}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <Field label={modo === 'recorrente' ? 'Nome' : 'Descrição'}>
            <input className={input} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={modo === 'recorrente' ? 'Ex.: Aluguel da sala' : 'Ex.: Ring light nova'} required autoFocus />
          </Field>
          <Field label="Grupo">
            <GrupoSelect value={grupo} onChange={setGrupo} />
          </Field>
        </div>

        {modo === 'parcelado' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Valor">
              <MoneyInput className={input} value={valor} onChange={(raw) => setValor(raw)} placeholder="0,00" required />
            </Field>
            <Field label="O valor é">
              <select className={input} value={tipoValor} onChange={(e) => setTipoValor(e.target.value as 'total' | 'parcela')}>
                <option value="total">Total da compra</option>
                <option value="parcela">De cada parcela</option>
              </select>
            </Field>
            <Field label="Parcelas">
              <input className={input} type="number" inputMode="numeric" min={1} max={120} value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
            </Field>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={modo === 'recorrente' ? 'Valor mensal' : 'Valor'}>
              <MoneyInput className={input} value={valor} onChange={(raw) => setValor(raw)} placeholder="0,00" required />
            </Field>
            {modo === 'pontual' ? (
              <Field label="Vencimento">
                <input className={input} type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required />
              </Field>
            ) : (
              <Field label="Dia do vencimento" hint="Dia maior que o mês → último dia">
                <input className={input} type="number" inputMode="numeric" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} />
              </Field>
            )}
          </div>
        )}

        {modo === 'pontual' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Competência" hint="Mês ao qual a despesa pertence (DRE)">
              <input className={input} type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} required />
            </Field>
            {!editLanc ? (
              <label className="flex items-center gap-3 self-end rounded-xl border border-line px-4 py-3 text-sm text-ink has-[:checked]:border-[var(--success)] has-[:checked]:bg-[var(--success-soft)]">
                <input type="checkbox" checked={jaPago} onChange={(e) => setJaPago(e.target.checked)} className="h-4 w-4 accent-[var(--success)]" />
                Já foi pago hoje
              </label>
            ) : null}
          </div>
        ) : null}

        {modo === 'recorrente' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Vence">
              <select className={input} value={offset} onChange={(e) => setOffset(e.target.value)}>
                <option value="0">No próprio mês</option>
                <option value="1">No mês seguinte</option>
              </select>
            </Field>
            <Field label="Início">
              <input className={input} type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            </Field>
            <Field label="Fim (opcional)" hint="Vazio = sem data para acabar">
              <input className={input} type="month" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} />
            </Field>
            {editRec ? (
              <label className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm text-ink sm:col-span-3">
                <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                Ativo (gera lançamentos nos próximos meses)
              </label>
            ) : null}
          </div>
        ) : null}

        {modo === 'parcelado' ? (
          <>
            <Field label="1º vencimento">
              <input className={input} type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required />
            </Field>
            {previewParcelas.length ? (
              <div className="rounded-2xl border border-dashed border-line p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <CalendarClock className="h-4 w-4 text-brand" /> Prévia — total {formatMoney(previewParcelas.reduce((s, v) => s + v, 0), true)}
                </p>
                <ol className="grid max-h-40 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto text-xs sm:grid-cols-3 scrollbar-thin">
                  {previewParcelas.map((v, i) => {
                    const venc = vencimento ? vencimentoNoMes(shiftMes(vencimento.slice(0, 7), i), Number(vencimento.slice(8, 10))) : ''
                    return (
                      <li key={i} className="num flex justify-between gap-2 text-ink-muted">
                        <span>{i + 1}/{previewParcelas.length} · {formatDataCurta(venc)}</span>
                        <span className="font-semibold text-ink">{formatMoney(v, true)}</span>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ) : null}
          </>
        ) : null}

        <Field label={modo === 'recorrente' ? 'Observação' : 'Observação (opcional)'}>
          <textarea className="design-input min-h-[72px] w-full px-4 py-3 text-sm" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </Field>

        <InlineError message={localError ?? (mutationError ? extractErrorMessage(mutationError) : null)} />

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" icon={Save} isLoading={pending}>
            {editLanc || editRec ? 'Salvar alterações' : modo === 'parcelado' ? `Lançar ${nParcelas}x` : 'Lançar custo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
