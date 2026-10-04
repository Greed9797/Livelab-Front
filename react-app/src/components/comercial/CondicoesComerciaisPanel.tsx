import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { MoneyInput } from '../ui/MoneyInput'
import { useToast } from '../ui/Toast'
import { LoadingState, ErrorState } from '../ui/States'
import { CONDICOES_QK, createCondicaoMarca, getCondicoesMarca, patchVencimentoCondicao } from '../../services/condicoes'
import { QK } from '../../services/query-keys'
import { extractErrorMessage } from '../../services/api'
import { asArray, asString, formatDate, formatMoney } from '../../utils/format'
import { normalizeMoneyInputText, parseBRMoneyToDecimal } from '../../utils/money'
import { getSaoPauloDateInput } from '../../utils/sao-paulo-date'
import {
  MES_OFFSET_OPTIONS,
  calcularDataVencimento,
  previewJanelaComissao,
  resumoJanela,
  condicaoVigente,
  parseVencimentoForm,
  resumoVencimento,
  revisaoAtual,
  vencimentoDaCondicao,
  type VencimentoCondicao,
} from '../../utils/condicoes-vencimento'
import type { JsonRecord } from '../../types/models'

type FormState = {
  competencia: string
  fixo_mensal: string
  comissao_franquia_pct: string
  comissao_franqueadora_pct: string
  tipo_cobranca: string
  fixo_confirmado: boolean
  comissao_confirmada: boolean
  motivo: string
  fixo_vencimento_dia: string
  fixo_vencimento_mes_offset: string
  comissao_vencimento_dia: string
  comissao_vencimento_mes_offset: string
  comissao_janela_inicio_dia: string
}

function formFromCondicao(c: JsonRecord | null, mesAtual: string): FormState {
  const v = vencimentoDaCondicao(c)
  return {
    competencia: mesAtual,
    fixo_mensal: normalizeMoneyInputText(asString(c?.fixo_mensal ?? 0, '0')),
    comissao_franquia_pct: asString(c?.comissao_franquia_pct ?? 0, '0'),
    comissao_franqueadora_pct: asString(c?.comissao_franqueadora_pct ?? 0, '0'),
    tipo_cobranca: asString(c?.tipo_cobranca ?? 'fixo_mais_comissao', 'fixo_mais_comissao'),
    fixo_confirmado: Boolean(c?.fixo_confirmado),
    comissao_confirmada: Boolean(c?.comissao_confirmada),
    motivo: '',
    fixo_vencimento_dia: String(v.fixo_vencimento_dia),
    fixo_vencimento_mes_offset: String(v.fixo_vencimento_mes_offset),
    comissao_vencimento_dia: String(v.comissao_vencimento_dia),
    comissao_vencimento_mes_offset: String(v.comissao_vencimento_mes_offset),
    comissao_janela_inicio_dia: String(v.comissao_janela_inicio_dia),
  }
}

function newKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Condições comerciais versionadas da marca (fixo, comissão e vencimentos).
 * - "Salvar vencimento" ajusta só o vencimento da versão vigente (PATCH .../vencimento).
 * - "Nova condição" cria uma versão com vigência a partir da competência (POST .../condicoes).
 */
export function CondicoesComerciaisPanel({ marcaId }: { marcaId: string }) {
  const toast = useToast()
  const client = useQueryClient()
  const hoje = getSaoPauloDateInput()
  const mesAtual = hoje.slice(0, 7)
  const query = useQuery({ queryKey: CONDICOES_QK.lista(marcaId), queryFn: () => getCondicoesMarca(marcaId) })
  const condicoes = useMemo(() => asArray<JsonRecord>(query.data), [query.data])
  const vigente = useMemo(() => condicaoVigente(condicoes, hoje), [condicoes, hoje])
  const [form, setForm] = useState<FormState>(() => formFromCondicao(null, mesAtual))
  const [erro, setErro] = useState('')

  const vigenteId = asString(vigente?.id, '')
  useEffect(() => {
    if (query.data) setForm(formFromCondicao(vigente, mesAtual))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, vigenteId, marcaId])

  function invalidar() {
    void client.invalidateQueries({ queryKey: CONDICOES_QK.lista(marcaId) })
    void client.invalidateQueries({ queryKey: QK.marcas() })
    void client.invalidateQueries({ queryKey: QK.marcas('ativas') })
    void client.invalidateQueries({ queryKey: QK.comissoesMarcas })
  }

  const vencimentoMutation = useMutation({
    mutationFn: (v: VencimentoCondicao) => patchVencimentoCondicao(marcaId, vigenteId, v),
    onSuccess: () => { toast.push('Vencimento atualizado.', 'success'); invalidar() },
  })
  const novaMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createCondicaoMarca>[1]) => createCondicaoMarca(marcaId, payload, newKey()),
    onSuccess: () => { toast.push('Nova condição comercial criada.', 'success'); invalidar() },
  })

  function vencimentoPayload() {
    const parsed = parseVencimentoForm(form)
    if (!parsed.ok) { setErro(parsed.error); return null }
    setErro('')
    return parsed.value
  }

  function salvarVencimento() {
    if (!vigenteId) { setErro('Não há condição vigente para ajustar — crie uma nova condição.'); return }
    const v = vencimentoPayload()
    if (v) vencimentoMutation.mutate(v)
  }

  function salvarNova() {
    const v = vencimentoPayload()
    if (!v) return
    if (!/^\d{4}-\d{2}$/.test(form.competencia)) { setErro('Informe a competência (início da vigência).'); return }
    novaMutation.mutate({
      inicio_vigencia: form.competencia,
      fixo_mensal: parseBRMoneyToDecimal(form.fixo_mensal),
      comissao_franquia_pct: Number(form.comissao_franquia_pct || 0),
      comissao_franqueadora_pct: Number(form.comissao_franqueadora_pct || 0),
      tipo_cobranca: form.tipo_cobranca,
      fixo_confirmado: form.fixo_confirmado,
      comissao_confirmada: form.comissao_confirmada,
      motivo: form.motivo.trim() || undefined,
      expected_revision: revisaoAtual(condicoes),
      ...v,
    })
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((c) => ({ ...c, [key]: value }))
  const fx = Number(form.fixo_vencimento_dia)
  const cm = Number(form.comissao_vencimento_dia)
  const fxOff = Number(form.fixo_vencimento_mes_offset) === 0 ? 0 : 1
  const cmOff = Number(form.comissao_vencimento_mes_offset) === 0 ? 0 : 1
  const exemploFixo = calcularDataVencimento(form.competencia || mesAtual, fx, fxOff)
  const exemploCom = calcularDataVencimento(form.competencia || mesAtual, cm, cmOff)
  const janelaN = Number(form.comissao_janela_inicio_dia)
  const previewJanela = previewJanelaComissao(form.competencia || mesAtual, janelaN, cm, cmOff)
  const mutErro = vencimentoMutation.error ?? novaMutation.error

  if (query.isLoading) return <LoadingState label="Carregando condições comerciais" />
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  return (
    <div className="col-span-full space-y-4 rounded-2xl border border-line p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Condições comerciais (versionadas)</p>
        <p className="mt-1 text-[11px] text-ink-muted">
          {vigente
            ? <>Vigente desde {formatDate(asString(vigente.inicio_vigencia, '').slice(0, 10))}: fixo {formatMoney(vigente.fixo_mensal)} ({resumoVencimento(vencimentoDaCondicao(vigente).fixo_vencimento_dia, vencimentoDaCondicao(vigente).fixo_vencimento_mes_offset)}) · comissão {resumoVencimento(vencimentoDaCondicao(vigente).comissao_vencimento_dia, vencimentoDaCondicao(vigente).comissao_vencimento_mes_offset)}{resumoJanela(vencimentoDaCondicao(vigente).comissao_janela_inicio_dia) ? ` · ${resumoJanela(vencimentoDaCondicao(vigente).comissao_janela_inicio_dia)}` : ''}.</>
            : 'Nenhuma condição vigente cadastrada.'}
          {' '}Valores só mudam criando uma nova condição com vigência; o vencimento pode ser ajustado na versão vigente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Fixo mensal (R$)</span>
          <MoneyInput className="design-input mt-2 h-11 w-full px-4" placeholder="0,00" value={form.fixo_mensal} onChange={(raw) => set('fixo_mensal', raw)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Comissão Franquia (%)</span>
            <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" max="100" step="0.01" value={form.comissao_franquia_pct} onChange={(e) => set('comissao_franquia_pct', e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Comissão Franqueadora (%)</span>
            <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" max="100" step="0.01" value={form.comissao_franqueadora_pct} onChange={(e) => set('comissao_franqueadora_pct', e.target.value)} />
          </label>
        </div>
        <div className="sm:col-span-2">
          <span className="text-sm font-semibold text-ink">Tipo de cobrança</span>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {([
              { v: 'fixo_mais_comissao', label: 'Fixo + comissão', hint: 'Soma o fixo mensal e a comissão sobre GMV.' },
              { v: 'fixo_ou_comissao', label: 'Fixo OU comissão', hint: 'Entra só o maior: o fixo ou a comissão.' },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => set('tipo_cobranca', opt.v)}
                aria-pressed={form.tipo_cobranca === opt.v}
                className={`rounded-xl border px-4 py-3 text-left transition ${form.tipo_cobranca === opt.v ? 'border-brand bg-brand-soft text-ink' : 'border-border text-ink-muted hover:border-border-strong'}`}
              >
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="mt-0.5 block text-[11px] text-ink-muted">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <fieldset className="space-y-2 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Vencimento do fixo</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Dia (1-31)</span>
              <input className="design-input mt-2 h-11 w-full px-4" type="number" min="1" max="31" step="1" value={form.fixo_vencimento_dia} onChange={(e) => set('fixo_vencimento_dia', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Mês</span>
              <select className="design-input mt-2 h-11 w-full px-3" value={form.fixo_vencimento_mes_offset} onChange={(e) => set('fixo_vencimento_mes_offset', e.target.value)}>
                {MES_OFFSET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
          {exemploFixo ? <p className="text-[11px] text-ink-muted">Ex.: competência {form.competencia || mesAtual} vence em {formatDate(exemploFixo)}.</p> : null}
        </fieldset>
        <fieldset className="space-y-2 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Vencimento da comissão</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Dia (1-31)</span>
              <input className="design-input mt-2 h-11 w-full px-4" type="number" min="1" max="31" step="1" value={form.comissao_vencimento_dia} onChange={(e) => set('comissao_vencimento_dia', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Mês</span>
              <select className="design-input mt-2 h-11 w-full px-3" value={form.comissao_vencimento_mes_offset} onChange={(e) => set('comissao_vencimento_mes_offset', e.target.value)}>
                {MES_OFFSET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Apuração começa no dia (1-28)</span>
            <input className="design-input mt-2 h-11 w-full px-4" type="number" min="1" max="28" step="1" value={form.comissao_janela_inicio_dia} onChange={(e) => set('comissao_janela_inicio_dia', e.target.value)} />
          </label>
          {previewJanela ? <p className="text-[11px] text-ink-muted">{previewJanela}</p> : exemploCom ? <p className="text-[11px] text-ink-muted">Ex.: competência {form.competencia || mesAtual} vence em {formatDate(exemploCom)}.</p> : null}
        </fieldset>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Vigência a partir de</span>
          <input type="month" className="design-input mt-2 h-11 w-full px-4" value={form.competencia} onChange={(e) => set('competencia', e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-ink">Motivo (opcional)</span>
          <input className="design-input mt-2 h-11 w-full px-4" maxLength={255} value={form.motivo} onChange={(e) => set('motivo', e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={form.fixo_confirmado} onChange={(e) => set('fixo_confirmado', e.target.checked)} /> Fixo confirmado
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={form.comissao_confirmada} onChange={(e) => set('comissao_confirmada', e.target.checked)} /> Comissão confirmada
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={salvarVencimento} isLoading={vencimentoMutation.isPending} disabled={!vigenteId}>Salvar vencimento</Button>
        <Button type="button" onClick={salvarNova} isLoading={novaMutation.isPending}>Criar nova condição</Button>
      </div>
      {erro ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{erro}</p> : null}
      {mutErro ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">{extractErrorMessage(mutErro)}</p> : null}
    </div>
  )
}
