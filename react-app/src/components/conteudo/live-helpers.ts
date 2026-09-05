import type { JsonRecord } from '../../types/models'

// Helpers de formatação de live compartilhados entre LivesTab e LiveDetailModal.

export interface LiveFilterOption {
  id: string
  nome: string
}

export type LivePendingKind = 'rascunho' | 'cadastro' | 'metricas' | 'duplicata'

export interface LivePendingIssue {
  kind: LivePendingKind
  label: string
  reason: string
  actionLabel: string
}

export type LivePendingCounts = Record<LivePendingKind, number>

const PROVISIONAL_LABELS = new Set(['a definir', 'sem definir'])

function normalizedLabel(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function isProvisionalLiveLabel(value: unknown): boolean {
  return PROVISIONAL_LABELS.has(normalizedLabel(value))
}

/** Presença é diferente de valor positivo: zero informado é um registro válido. */
export function hasRecordedMetricValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string' && !value.trim()) return false
  return (typeof value === 'number' || typeof value === 'string') && Number.isFinite(Number(value))
}

/**
 * A lista nova traz `gmv` como COALESCE(..., 0), então esse alias sozinho não comprova que
 * zero foi registrado. Quando as fontes cruas existem no payload, elas decidem a presença.
 */
export function hasRecordedLiveGmv(live: JsonRecord): boolean {
  const rawKeys = ['ads_gmv', 'manual_gmv', 'fat_gerado'] as const
  const hasRawContract = rawKeys.some((key) => Object.prototype.hasOwnProperty.call(live, key))
  if (hasRawContract) return rawKeys.some((key) => hasRecordedMetricValue(live[key]))
  return hasRecordedMetricValue(live.gmv)
}

function missingRegistrationFields(live: JsonRecord): string[] {
  const presenterNames = livePresenterNames(live)
  const brandValues = [live.marca_id, live.marca_nome, live.cliente_id, live.cliente_nome]
  const cabinValues = [live.cabine_id, live.cabine_numero, live.cabine_nome]
  const presenterValues = [live.apresentadora_id, live.apresentador_id, ...presenterNames]
  const missing: string[] = []
  if (String(live.tipo ?? '').toLowerCase() !== 'teste' && !brandValues.some((value) => String(value ?? '').trim())) missing.push('marca')
  if (!cabinValues.some((value) => String(value ?? '').trim())) missing.push('cabine')
  if (!presenterValues.some((value) => String(value ?? '').trim())) missing.push('apresentadora')
  return missing
}

function provisionalRegistrationFields(live: JsonRecord): string[] {
  const fields: string[] = []
  const brandLabel = String(live.marca_nome ?? '').trim() || live.cliente_nome
  if (isProvisionalLiveLabel(brandLabel)) fields.push('marca')
  if ([live.cabine_nome, live.cabine_numero].some(isProvisionalLiveLabel)) fields.push('cabine')
  if (livePresenterNames(live).some(isProvisionalLiveLabel)) fields.push('apresentadora')
  return fields
}

function joinPt(values: string[]) {
  if (values.length <= 1) return values[0] ?? ''
  return `${values.slice(0, -1).join(', ')} e ${values.at(-1)}`
}

function missingCoreMetrics(live: JsonRecord): string[] {
  const hasGmv = hasRecordedLiveGmv(live)
  const hasOrders = [live.manual_orders, live.final_orders_count, live.qtd_pedidos].some(hasRecordedMetricValue)
  return [!hasGmv ? 'GMV' : '', !hasOrders ? 'pedidos' : ''].filter(Boolean)
}

/**
 * Classificação conservadora para a fila operacional. Campos simplesmente vazios só entram
 * como cadastro pendente enquanto o registro é rascunho; um placeholder explícito continua
 * visível em qualquer status. O detector de duplicidade fornece possibilidades, não certezas.
 */
export function classifyLivePendings(live: JsonRecord, duplicateIds: ReadonlySet<string>): LivePendingIssue[] {
  const issues: LivePendingIssue[] = []
  const isDraft = String(live.status_publicacao ?? '').toLowerCase() === 'rascunho'
  if (isDraft) {
    issues.push({
      kind: 'rascunho',
      label: 'Rascunho',
      reason: 'Rascunho aguardando conferência.',
      actionLabel: 'Revisar',
    })
  }

  const registrationFields = [...new Set([
    ...(isDraft ? missingRegistrationFields(live) : []),
    ...provisionalRegistrationFields(live),
  ])]
  if (registrationFields.length > 0) {
    issues.push({
      kind: 'cadastro',
      label: 'Cadastro pendente',
      reason: `Confirmar ${joinPt(registrationFields)} ${registrationFields.length === 1 ? 'real' : 'reais'}.`,
      actionLabel: 'Corrigir cadastro',
    })
  }

  const missingMetrics = isDraft ? missingCoreMetrics(live) : []
  if (missingMetrics.length > 0) {
    issues.push({
      kind: 'metricas',
      label: 'Métricas pendentes',
      reason: `Sem registro de ${joinPt(missingMetrics)}.`,
      actionLabel: 'Revisar métricas',
    })
  }

  if (duplicateIds.has(String(live.id ?? ''))) {
    issues.push({
      kind: 'duplicata',
      label: 'Possível duplicata',
      reason: 'Possível sobreposição com outra live na mesma cabine.',
      actionLabel: 'Conferir detalhes',
    })
  }
  return issues
}

export function filterLivesByPending(
  lives: JsonRecord[],
  pending: LivePendingKind | '',
  duplicateIds: ReadonlySet<string>,
): JsonRecord[] {
  if (!pending) return lives
  return lives.filter((live) => classifyLivePendings(live, duplicateIds).some((issue) => issue.kind === pending))
}

export function summarizeLivePendings(lives: JsonRecord[], duplicateIds: ReadonlySet<string>): LivePendingCounts {
  const counts: LivePendingCounts = { rascunho: 0, cadastro: 0, metricas: 0, duplicata: 0 }
  for (const live of lives) {
    for (const issue of classifyLivePendings(live, duplicateIds)) counts[issue.kind] += 1
  }
  return counts
}

export function livePresenterNames(live: JsonRecord): string[] {
  const rateio = Array.isArray(live.apresentadoras) ? live.apresentadoras : []
  const fromRateio = rateio
    .map((item) => (item && typeof item === 'object' ? String((item as JsonRecord).nome ?? '').trim() : ''))
    .filter(Boolean)
  if (fromRateio.length > 0) return [...new Set(fromRateio)]

  const legacy = [live.apresentadora_nome ?? live.apresentador_nome, live.apresentadora2_nome]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
  return [...new Set(legacy)]
}

export function livePresenterCellModel(
  live: JsonRecord,
  canInlineSave: boolean,
): { name: string; editable: boolean } {
  const names = livePresenterNames(live)
  return {
    name: names.join(' + '),
    // A edição inline só representa uma apresentadora. Em uma live dividida, permitir a
    // troca por esse atalho apagaria a semântica do rateio; nesse caso a edição pertence ao
    // modal "Dividir entre apresentadoras".
    editable:
      canInlineSave
      && names.length <= 1
      && String(live.status_publicacao ?? 'rascunho').toLowerCase() === 'rascunho',
  }
}

export function fmtTime(value: unknown): string {
  const d = typeof value === 'string' ? new Date(value) : null
  if (!d || Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d)
}

export function calcDuration(live: JsonRecord): { text: string; mins: number } {
  const start = live.iniciado_em ? new Date(live.iniciado_em as string) : null
  const end = live.encerrado_em ? new Date(live.encerrado_em as string) : null
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { text: '—', mins: 0 }
  }
  const mins = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return { text: h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`, mins }
}
