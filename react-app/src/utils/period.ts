import type { Period } from '../types/models'
import { currentPeriod, periodLabel } from './format'

// Período financeiro com dois modos: mês único ou intervalo (range de meses).
// Sempre transportamos início/fim como 'YYYY-MM' — em modo single, inicio === fim.
// O backend (resolveRange em financeiro.js) trata inicio=fim como um único mês.

export type PeriodMode = 'single' | 'range'

export interface PeriodRange {
  mode: PeriodMode
  inicio: string // 'YYYY-MM'
  fim: string    // 'YYYY-MM' (=== inicio quando single)
}

const YM = /^\d{4}-\d{2}$/
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function periodToYm(period: Period): string {
  return `${period.ano}-${String(period.mes).padStart(2, '0')}`
}

export function ymToPeriod(ym: string): Period {
  const [ano, mes] = ym.split('-').map(Number)
  return { ano, mes }
}

function ymIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return y * 12 + (m - 1)
}

function ymFromIndex(index: number): string {
  const y = Math.floor(index / 12)
  const m = (index % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function lastDayOf(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${ym}-${String(last).padStart(2, '0')}`
}

export function defaultPeriodRange(): PeriodRange {
  const ym = periodToYm(currentPeriod())
  return { mode: 'single', inicio: ym, fim: ym }
}

export function isValidPeriodRange(pr: PeriodRange): boolean {
  return YM.test(pr.inicio) && YM.test(pr.fim) && pr.inicio <= pr.fim
}

export function monthsInRange(pr: PeriodRange): number {
  return ymIndex(pr.fim) - ymIndex(pr.inicio) + 1
}

/** Chave estável e legível para o cache do React Query. */
export function periodKey(pr: PeriodRange): string {
  return `${pr.mode}:${pr.inicio}:${pr.fim}`
}

/** Endpoints /financeiro/* aceitam inicio/fim (YYYY-MM); single envia inicio=fim. */
export function financeiroParams(pr: PeriodRange): Record<string, string> {
  return { inicio: pr.inicio, fim: pr.fim }
}

/** Endpoints /comissoes/* aceitam mes=YYYY-MM (single) ou data_inicio/data_fim (YYYY-MM-DD). */
export function comissoesParams(pr: PeriodRange): Record<string, string> {
  if (pr.mode === 'single' || pr.inicio === pr.fim) return { mes: pr.inicio }
  return { data_inicio: `${pr.inicio}-01`, data_fim: lastDayOf(pr.fim) }
}

/** /financeiro/custos opera por competência de UM mês — usamos o mês final do range. */
export function custosCompetencia(pr: PeriodRange): string {
  return pr.fim
}

/** Bloco contíguo anterior de mesmo tamanho — base para deltas (mês ant. ou range ant.). */
export function previousPeriodRange(pr: PeriodRange): PeriodRange {
  const n = monthsInRange(pr)
  const prevFimIdx = ymIndex(pr.inicio) - 1
  const prevInicioIdx = prevFimIdx - (n - 1)
  return { mode: pr.mode, inicio: ymFromIndex(prevInicioIdx), fim: ymFromIndex(prevFimIdx) }
}

/** Rótulo em linguagem natural: "Junho de 2025" (single) ou "jan–mar 2025" (range). */
export function periodRangeLabel(pr: PeriodRange): string {
  if (pr.mode === 'single' || pr.inicio === pr.fim) {
    const label = periodLabel(ymToPeriod(pr.inicio))
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  const [iy, im] = pr.inicio.split('-').map(Number)
  const [fy, fm] = pr.fim.split('-').map(Number)
  if (iy === fy) return `${MONTHS_SHORT[im - 1]}–${MONTHS_SHORT[fm - 1]} ${fy}`
  return `${MONTHS_SHORT[im - 1]}/${iy} – ${MONTHS_SHORT[fm - 1]}/${fy}`
}

/** Presets de intervalo ancorados no mês corrente. */
export function presetRange(kind: 'last3' | 'last6' | 'ytd'): PeriodRange {
  const cur = periodToYm(currentPeriod())
  if (kind === 'ytd') return { mode: 'range', inicio: `${cur.slice(0, 4)}-01`, fim: cur }
  const span = kind === 'last3' ? 2 : 5
  return { mode: 'range', inicio: ymFromIndex(ymIndex(cur) - span), fim: cur }
}

// ── URL searchParams sync (keys: pmode, pini, pfim) — preserva os demais params ──

export function periodRangeFromParams(params: URLSearchParams): PeriodRange {
  const mode = params.get('pmode')
  const ini = params.get('pini')
  const fim = params.get('pfim') ?? ini
  if ((mode === 'single' || mode === 'range') && ini && YM.test(ini) && fim && YM.test(fim)) {
    const pr: PeriodRange = { mode, inicio: ini, fim: mode === 'single' ? ini : fim }
    if (isValidPeriodRange(pr)) return pr
  }
  return defaultPeriodRange()
}

export function writePeriodRangeToParams(params: URLSearchParams, pr: PeriodRange): URLSearchParams {
  const next = new URLSearchParams(params)
  next.set('pmode', pr.mode)
  next.set('pini', pr.inicio)
  if (pr.mode === 'range') next.set('pfim', pr.fim)
  else next.delete('pfim')
  return next
}
