import { AlertTriangle, CheckCircle2, ChevronDown, History, Pencil, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card, CardBody } from '../ui/Card'
import { LoadingState } from '../ui/States'
import { MoneyInput } from '../ui/MoneyInput'
import { extractErrorMessage } from '../../services/api'
import { confirmMarcaCondicao, getMarcaCondicoes, previewMarcaCondicao } from '../../services/domain'
import { patchVencimentoCondicao } from '../../services/condicoes'
import { getSaoPauloDateInput } from '../../utils/sao-paulo-date'
import { MES_OFFSET_OPTIONS, condicaoVigente, parseVencimentoForm, previewJanelaComissao, resumoJanela, resumoVencimento, vencimentoDaCondicao } from '../../utils/condicoes-vencimento'
import { QK } from '../../services/query-keys'
import { formatMoney } from '../../utils/format'
import { parseBRMoneyToDecimal } from '../../utils/money'
import { commercialConfigCodes, commercialConfigLabel } from '../../utils/comercial-config'
import type { JsonRecord } from '../../types/models'

type CondicaoForm = {
  competencia: string
  fixo_mensal: string
  comissao_franquia_pct: string
  comissao_franqueadora_pct: string
  tipo_cobranca: 'fixo_mais_comissao' | 'fixo_ou_comissao'
  fixo_confirmado: boolean
  comissao_confirmada: boolean
  motivo: string
}

export interface CondicoesComerciaisProps {
  marcaId: string | null
  marcaNome?: string
  canEdit?: boolean
  configuracaoComercial?: JsonRecord | null
  hasMarca?: boolean
}

function currentMonth() {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export function initialForm(): CondicaoForm {
  return {
    competencia: currentMonth(),
    fixo_mensal: '',
    comissao_franquia_pct: '',
    comissao_franqueadora_pct: '',
    tipo_cobranca: 'fixo_mais_comissao',
    fixo_confirmado: false,
    comissao_confirmada: false,
    motivo: '',
  }
}

function readMoney(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || !/\d/.test(trimmed)) return null
  const parsed = parseBRMoneyToDecimal(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function readPercent(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/** Campo vazio não vira 0. Zero explícito só segue com o checkbox de confirmação. */
export function condicaoSubmitError(form: CondicaoForm): string | null {
  const fixo = readMoney(form.fixo_mensal)
  const franquia = readPercent(form.comissao_franquia_pct)
  const franqueadora = readPercent(form.comissao_franqueadora_pct)
  if (fixo === null || franquia === null || franqueadora === null) return 'informe o valor'
  if (fixo === 0 && !form.fixo_confirmado) return 'Confirme o valor zero.'
  if ((franquia === 0 || franqueadora === 0) && !form.comissao_confirmada) return 'Confirme o valor zero.'
  return null
}

export function submitMarcaCondicao(form: CondicaoForm, send: (payload: JsonRecord) => void): string | null {
  const error = condicaoSubmitError(form)
  if (error) return error
  send(buildMarcaCondicaoProposal(form))
  return null
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function boolValue(value: unknown) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function monthLabel(value: unknown) {
  const month = String(value ?? '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) return 'Baseline histórico'
  const [year, monthNumber] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, monthNumber - 1, 1)))
}

function dateForCondition(value: unknown) {
  return String(value ?? '').slice(0, 7)
}

function conditionTitle(condition: JsonRecord) {
  const origin = String(condition.origem ?? '')
  if (origin === 'legado_nao_verificado') return 'Legado a revisar'
  return condition.inicio_vigencia ? monthLabel(condition.inicio_vigencia) : 'Condição comercial'
}

function conditionPeriodLabel(condition: JsonRecord) {
  const month = dateForCondition(condition.inicio_vigencia)
  const current = currentMonth()
  if (month === '1900-01') return 'Histórico'
  if (month > current) return 'Futura'
  if (month === current) return 'Vigente'
  return 'Histórico'
}

function conditionValue(condition: JsonRecord | null | undefined, key: string) {
  return numberValue(condition?.[key])
}

export function buildMarcaCondicaoProposal(form: CondicaoForm): JsonRecord {
  return {
    inicio_vigencia: form.competencia,
    fixo_mensal: readMoney(form.fixo_mensal),
    comissao_franquia_pct: readPercent(form.comissao_franquia_pct),
    comissao_franqueadora_pct: readPercent(form.comissao_franqueadora_pct),
    tipo_cobranca: form.tipo_cobranca,
    fixo_confirmado: form.fixo_confirmado,
    comissao_confirmada: form.comissao_confirmada,
    origem: 'gestao',
    motivo: form.motivo.trim() || null,
  }
}

function conditionSummary(condition: JsonRecord | null | undefined) {
  if (!condition) return 'Nenhuma condição cadastrada'
  const fixed = conditionValue(condition, 'fixo_mensal')
  const franchise = conditionValue(condition, 'comissao_franquia_pct')
  const franchisor = conditionValue(condition, 'comissao_franqueadora_pct')
  return `${formatMoney(fixed)} fixo · ${franchise.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% franquia · ${franchisor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% franqueadora`
}

function AlertItem({ children, onCorrect, canCorrect, tone = 'warning' }: { children: string; onCorrect: () => void; canCorrect: boolean; tone?: 'warning' | 'danger' | 'info' }) {
  return (
    <li className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${tone === 'danger' ? 'border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]' : tone === 'info' ? 'border-brand/25 bg-brand-soft text-ink' : 'border-[var(--warning)]/30 bg-[var(--warning-soft)] text-ink'}`}>
      <span className="flex min-w-0 items-center gap-2"><AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />{children}</span>
      {canCorrect ? <button type="button" className="font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-brand" onClick={onCorrect}>Corrigir</button> : null}
    </li>
  )
}

export function CondicoesComerciais({ marcaId, marcaNome, canEdit = true, configuracaoComercial = null, hasMarca = Boolean(marcaId) }: CondicoesComerciaisProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CondicaoForm>(() => initialForm())
  const [editorOpen, setEditorOpen] = useState(false)
  const [previewData, setPreviewData] = useState<JsonRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const idempotencyKeyRef = useRef<string | null>(null)
  const conditionsQuery = useQuery({
    queryKey: QK.marcaCondicoes(marcaId ?? undefined),
    queryFn: () => getMarcaCondicoes(marcaId as string),
    enabled: Boolean(marcaId),
  })
  const conditions = conditionsQuery.data ?? []
  const hoje = getSaoPauloDateInput()
  const vigente = useMemo(() => condicaoVigente(conditions, hoje), [conditions, hoje])
  const vigenteId = typeof vigente?.id === 'string' ? vigente.id : ''
  const [vencimentoForm, setVencimentoForm] = useState(() => {
    const padrao = vencimentoDaCondicao(null)
    return {
      fixo_vencimento_dia: String(padrao.fixo_vencimento_dia),
      fixo_vencimento_mes_offset: String(padrao.fixo_vencimento_mes_offset),
      comissao_vencimento_dia: String(padrao.comissao_vencimento_dia),
      comissao_vencimento_mes_offset: String(padrao.comissao_vencimento_mes_offset),
      comissao_janela_inicio_dia: String(padrao.comissao_janela_inicio_dia),
    }
  })
  const previewJanela = previewJanelaComissao(
    currentMonth(),
    Number(vencimentoForm.comissao_janela_inicio_dia),
    Number(vencimentoForm.comissao_vencimento_dia),
    Number(vencimentoForm.comissao_vencimento_mes_offset) === 0 ? 0 : 1,
  )
  const vencimentoSeed = useRef<string | null>(null)
  useEffect(() => {
    if (!vigenteId || vencimentoSeed.current === vigenteId) return
    vencimentoSeed.current = vigenteId
    const atual = vencimentoDaCondicao(vigente)
    setVencimentoForm({
      fixo_vencimento_dia: String(atual.fixo_vencimento_dia),
      fixo_vencimento_mes_offset: String(atual.fixo_vencimento_mes_offset),
      comissao_vencimento_dia: String(atual.comissao_vencimento_dia),
      comissao_vencimento_mes_offset: String(atual.comissao_vencimento_mes_offset),
      comissao_janela_inicio_dia: String(atual.comissao_janela_inicio_dia),
    })
  }, [vigente, vigenteId])
  const expectedRevision = useMemo(
    () => Math.max(1, ...conditions.map((condition) => Math.max(1, Math.trunc(numberValue(condition.revision))))),
    [conditions],
  )
  const alerts = useMemo(() => commercialConfigCodes(configuracaoComercial, hasMarca), [configuracaoComercial, hasMarca])

  const previewMutation = useMutation({
    mutationFn: () => previewMarcaCondicao(marcaId as string, buildMarcaCondicaoProposal(form)),
    onSuccess: (data) => { setPreviewData(data); setError(null) },
    onError: (cause) => { setError(extractErrorMessage(cause)); setPreviewData(null) },
  })
  const confirmMutation = useMutation({
    mutationFn: () => {
      const idempotencyKey = idempotencyKeyRef.current ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
      idempotencyKeyRef.current = idempotencyKey
      return confirmMarcaCondicao(marcaId as string, { ...buildMarcaCondicaoProposal(form), expected_revision: expectedRevision }, idempotencyKey)
    },
    onSuccess: () => {
      setPreviewData(null)
      setEditorOpen(false)
      idempotencyKeyRef.current = null
      setForm(initialForm())
      setError(null)
      void queryClient.invalidateQueries({ queryKey: QK.marcaCondicoes(marcaId ?? undefined) })
      void queryClient.invalidateQueries({ queryKey: QK.marcas() })
      void queryClient.invalidateQueries({ queryKey: QK.financeiroOperacional() })
    },
    onError: (cause) => {
      setPreviewData(null)
      setError(extractErrorMessage(cause))
      void queryClient.invalidateQueries({ queryKey: QK.marcaCondicoes(marcaId ?? undefined) })
    },
  })
  const vencimentoMutation = useMutation({
    mutationFn: () => {
      const parsed = parseVencimentoForm(vencimentoForm)
      if (!parsed.ok) return Promise.reject(new Error(parsed.error))
      return patchVencimentoCondicao(marcaId as string, vigenteId, parsed.value)
    },
    onSuccess: () => {
      setError(null)
      vencimentoSeed.current = null
      void queryClient.invalidateQueries({ queryKey: QK.marcaCondicoes(marcaId ?? undefined) })
    },
    onError: (cause) => setError(extractErrorMessage(cause)),
  })

  function setField<K extends keyof CondicaoForm>(key: K, value: CondicaoForm[K]) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }))
    setPreviewData(null)
    idempotencyKeyRef.current = null
    setError(null)
  }

  function openEditor() {
    setEditorOpen(true)
    setError(null)
  }

  function rejectIncompleteCondicao() {
    const message = condicaoSubmitError(form)
    if (!message) return false
    setError(message)
    return true
  }

  function cancelEditor() {
    setEditorOpen(false)
    setPreviewData(null)
    setError(null)
    idempotencyKeyRef.current = null
    setForm(initialForm())
  }

  const previous = getRecord(previewData?.condicao_anterior)
  const proposal = getRecord(previewData?.proposta)
  const impact = getRecord(previewData?.impacto)

  return (
    <section className="space-y-4 border-t border-line pt-5" aria-labelledby="condicoes-comerciais-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="condicoes-comerciais-title" className="flex items-center gap-2 text-sm font-semibold text-ink"><History aria-hidden="true" className="h-4 w-4 text-brand" />Condições comerciais</h3>
          <p className="mt-1 text-sm text-ink-muted">Histórico mensal da condição usada no fato gerador financeiro{marcaNome ? ` de ${marcaNome}` : ''}.</p>
        </div>
        {marcaId && canEdit ? <Button type="button" size="default" variant="secondary" icon={Plus} onClick={openEditor}>Nova competência</Button> : null}
      </div>

      {!marcaId ? (
        <Card className="border-[var(--warning)]/30"><CardBody><ul className="space-y-2"><AlertItem canCorrect={canEdit} onCorrect={openEditor}>Sem marca operacional vinculada. Cadastre a marca antes de informar fixo e comissão.</AlertItem></ul></CardBody></Card>
      ) : conditionsQuery.isLoading ? <LoadingState label="Carregando histórico comercial…" /> : conditionsQuery.isError ? <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{extractErrorMessage(conditionsQuery.error)}</p> : (
        <>
          {alerts.length > 0 ? (
            <Card className="border-[var(--warning)]/30"><CardBody><div className="flex items-center gap-2 text-sm font-semibold text-ink"><AlertTriangle aria-hidden="true" className="h-4 w-4 text-[var(--warning)]" />Pendências do cadastro</div><ul className="mt-3 space-y-2">
              {alerts.map((code) => <AlertItem key={code} canCorrect={canEdit && Boolean(marcaId)} onCorrect={openEditor}>{commercialConfigLabel(code)}</AlertItem>)}
            </ul></CardBody></Card>
          ) : <p className="flex items-center gap-2 text-sm text-[var(--success)]"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />Fixo e comissão vigentes confirmados.</p>}
          <div className="space-y-2">
            {conditions.map((condition) => (
              <details key={String(condition.id ?? condition.inicio_vigencia)} className="group rounded-2xl border border-line bg-surface-muted">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-brand">
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink"><Badge className="mr-2" tone={conditionPeriodLabel(condition) === 'Vigente' ? 'success' : conditionPeriodLabel(condition) === 'Futura' ? 'info' : 'neutral'}>{conditionPeriodLabel(condition)}</Badge>{conditionTitle(condition)}{condition.origem === 'legado_nao_verificado' ? <Badge className="ml-2" tone="warning">A revisar</Badge> : null}</span><span className="mt-1 block text-xs text-ink-muted">{conditionSummary(condition)} · fixo {resumoVencimento(vencimentoDaCondicao(condition).fixo_vencimento_dia, vencimentoDaCondicao(condition).fixo_vencimento_mes_offset)} · comissão {resumoVencimento(vencimentoDaCondicao(condition).comissao_vencimento_dia, vencimentoDaCondicao(condition).comissao_vencimento_mes_offset)}{resumoJanela(vencimentoDaCondicao(condition).comissao_janela_inicio_dia) ? ` (${resumoJanela(vencimentoDaCondicao(condition).comissao_janela_inicio_dia)})` : ''} · revisão {numberValue(condition.revision)}</span></span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-3 border-t border-line p-4 text-sm sm:grid-cols-3"><div><span className="block text-xs text-ink-muted">Vigência</span><span className="font-medium text-ink">{monthLabel(condition.inicio_vigencia)}</span></div><div><span className="block text-xs text-ink-muted">Fixo mensal</span><span className="font-medium text-ink">{formatMoney(conditionValue(condition, 'fixo_mensal'))} {boolValue(condition.fixo_confirmado) ? '· confirmado' : '· a revisar'}</span></div><div><span className="block text-xs text-ink-muted">Comissões</span><span className="font-medium text-ink">{conditionValue(condition, 'comissao_franquia_pct').toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% franquia · {conditionValue(condition, 'comissao_franqueadora_pct').toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% franqueadora</span></div></div>
              </details>
            ))}
          </div>
          {marcaId && canEdit ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <fieldset className="space-y-2 rounded-xl border border-line p-3">
                <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Vencimento do fixo</legend>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="text-sm font-semibold text-ink">Dia (1-31)</span><input aria-label="Dia de vencimento do fixo" className="design-input mt-2 h-11 w-full px-4" type="number" min="1" max="31" step="1" value={vencimentoForm.fixo_vencimento_dia} onChange={(event) => setVencimentoForm((current) => ({ ...current, fixo_vencimento_dia: event.target.value }))} /></label>
                  <label className="block"><span className="text-sm font-semibold text-ink">Mês</span><select aria-label="Mês de vencimento do fixo" className="design-input mt-2 h-11 w-full px-3" value={vencimentoForm.fixo_vencimento_mes_offset} onChange={(event) => setVencimentoForm((current) => ({ ...current, fixo_vencimento_mes_offset: event.target.value }))}>{MES_OFFSET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                </div>
              </fieldset>
              <fieldset className="space-y-2 rounded-xl border border-line p-3">
                <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Vencimento da comissão</legend>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="text-sm font-semibold text-ink">Dia (1-31)</span><input aria-label="Dia de vencimento da comissão" className="design-input mt-2 h-11 w-full px-4" type="number" min="1" max="31" step="1" value={vencimentoForm.comissao_vencimento_dia} onChange={(event) => setVencimentoForm((current) => ({ ...current, comissao_vencimento_dia: event.target.value }))} /></label>
                  <label className="block"><span className="text-sm font-semibold text-ink">Mês</span><select aria-label="Mês de vencimento da comissão" className="design-input mt-2 h-11 w-full px-3" value={vencimentoForm.comissao_vencimento_mes_offset} onChange={(event) => setVencimentoForm((current) => ({ ...current, comissao_vencimento_mes_offset: event.target.value }))}>{MES_OFFSET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                </div>
                <label className="block"><span className="text-sm font-semibold text-ink">Apuração começa no dia (1-28)</span><input aria-label="Dia de início da apuração da comissão" className="design-input mt-2 h-11 w-full px-4" type="number" min="1" max="28" step="1" value={vencimentoForm.comissao_janela_inicio_dia} onChange={(event) => setVencimentoForm((current) => ({ ...current, comissao_janela_inicio_dia: event.target.value }))} /></label>
                {previewJanela ? <p className="text-[11px] text-ink-muted">{previewJanela}</p> : null}
              </fieldset>
              <div className="sm:col-span-2">
                <Button type="button" variant="secondary" isLoading={vencimentoMutation.isPending} disabled={!vigenteId} onClick={() => { if (!vigenteId) { setError('Não há condição vigente para ajustar.'); return } setError(null); vencimentoMutation.mutate() }}>Salvar vencimento</Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {marcaId && editorOpen && canEdit ? (
        <Card className="border-brand/30"><CardBody>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-base font-bold text-ink">Definir condição por competência</h4><p className="mt-1 text-xs text-ink-muted">A competência passa a valer somente a partir do mês informado; condições futuras não alteram o mês vigente.</p></div><Button type="button" size="icon" variant="ghost" aria-label="Cancelar edição da condição" title="Cancelar edição" onClick={cancelEditor}><RotateCcw aria-hidden="true" className="h-4 w-4" /><span className="sr-only">Cancelar</span></Button></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="text-sm font-semibold text-ink">Competência</span><input aria-label="Competência da condição" type="month" className="design-input mt-2 h-11 w-full px-4" value={form.competencia} onChange={(event) => setField('competencia', event.target.value)} /></label>
            <label className="block"><span className="text-sm font-semibold text-ink">Modelo de cobrança</span><select aria-label="Modelo de cobrança" className="design-input mt-2 h-11 w-full px-4" value={form.tipo_cobranca} onChange={(event) => setField('tipo_cobranca', event.target.value as CondicaoForm['tipo_cobranca'])}><option value="fixo_mais_comissao">Fixo + comissão</option><option value="fixo_ou_comissao">Fixo ou comissão (maior)</option></select></label>
            <label className="block"><span className="text-sm font-semibold text-ink">Fixo mensal</span><MoneyInput aria-label="Fixo mensal" className="design-input mt-2 h-11 w-full px-4" value={form.fixo_mensal} onChange={(value) => setField('fixo_mensal', value)} /></label>
            <label className="block"><span className="text-sm font-semibold text-ink">Comissão da franquia (%)</span><input aria-label="Comissão da franquia" type="number" min="0" max="100" step="0.01" className="design-input mt-2 h-11 w-full px-4" value={form.comissao_franquia_pct} onChange={(event) => setField('comissao_franquia_pct', event.target.value)} /></label>
            <label className="block"><span className="text-sm font-semibold text-ink">Comissão da franqueadora (%)</span><input aria-label="Comissão da franqueadora" type="number" min="0" max="100" step="0.01" className="design-input mt-2 h-11 w-full px-4" value={form.comissao_franqueadora_pct} onChange={(event) => setField('comissao_franqueadora_pct', event.target.value)} /></label>
            <label className="block sm:col-span-2"><span className="text-sm font-semibold text-ink">Motivo da alteração</span><textarea aria-label="Motivo da alteração" className="design-input mt-2 min-h-20 w-full px-4 py-3" maxLength={255} value={form.motivo} onChange={(event) => setField('motivo', event.target.value)} placeholder="Ex.: novo contrato a partir de setembro" /></label>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2"><label className="flex items-start gap-2 text-sm text-ink"><input type="checkbox" className="mt-1 h-4 w-4 accent-brand" checked={form.fixo_confirmado} onChange={(event) => setField('fixo_confirmado', event.target.checked)} /><span>Confirmo o valor fixo para esta competência.</span></label><label className="flex items-start gap-2 text-sm text-ink"><input type="checkbox" className="mt-1 h-4 w-4 accent-brand" checked={form.comissao_confirmada} onChange={(event) => setField('comissao_confirmada', event.target.checked)} /><span>Confirmo as comissões para esta competência.</span></label></div>
          {previewData ? <div className="mt-5 rounded-2xl border border-brand/30 bg-brand-soft p-4"><div className="flex items-center gap-2 text-sm font-bold text-ink"><Pencil aria-hidden="true" className="h-4 w-4" />Prévia antes de confirmar</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-line bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Antes</p><p className="mt-2 text-sm text-ink">{conditionSummary(previous)}</p></div><div className="rounded-xl border border-brand/30 bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-wide text-brand">Depois · {monthLabel(proposal.inicio_vigencia)}</p><p className="mt-2 text-sm text-ink">{conditionSummary(proposal)}</p></div></div><p className="mt-3 text-xs text-ink-muted">Impacto no intervalo: {numberValue(impact.movimentos_abertos)} movimentos abertos · {numberValue(impact.movimentos_fechados)} fechados · GMV aberto {formatMoney(impact.gmv_aberto)}.</p><div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="primary" isLoading={confirmMutation.isPending} onClick={() => { if (rejectIncompleteCondicao()) return; confirmMutation.mutate() }}>Confirmar condição</Button><Button type="button" variant="secondary" onClick={() => { setPreviewData(null); idempotencyKeyRef.current = null }}>Voltar e editar</Button></div></div> : <Button type="button" className="mt-5" isLoading={previewMutation.isPending} onClick={() => { if (rejectIncompleteCondicao()) return; previewMutation.mutate() }}>Revisar impacto</Button>}
          {error ? <p role="alert" className="mt-3 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}
          <p className="mt-3 text-xs text-ink-muted">Revisão atual: {expectedRevision}. A confirmação verifica se outra pessoa alterou a marca desde a prévia.</p>
        </CardBody></Card>
      ) : null}
    </section>
  )
}

function getRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}
