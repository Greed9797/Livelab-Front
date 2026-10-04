import type { JsonRecord } from '../types/models'

/** Padrão do back (planilha): dia 5 do mês seguinte à competência. */
export const VENCIMENTO_PADRAO = {
  fixo_vencimento_dia: 5,
  fixo_vencimento_mes_offset: 1,
  comissao_vencimento_dia: 5,
  comissao_vencimento_mes_offset: 1,
  comissao_janela_inicio_dia: 1,
} as const

export type MesOffset = 0 | 1

export interface VencimentoCondicao {
  fixo_vencimento_dia: number
  fixo_vencimento_mes_offset: MesOffset
  comissao_vencimento_dia: number
  comissao_vencimento_mes_offset: MesOffset
  /** Dia em que a apuração da comissão começa (1 = mês civil). */
  comissao_janela_inicio_dia: number
}

export const MES_OFFSET_OPTIONS: { value: MesOffset; label: string }[] = [
  { value: 0, label: 'No próprio mês' },
  { value: 1, label: 'Mês seguinte' },
]

export function mesOffsetLabel(offset: unknown): string {
  return Number(offset) === 0 ? 'no próprio mês' : 'no mês seguinte'
}

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && /^\s*-?\d+\s*$/.test(value)) return Number(value)
  return null
}

export function isDiaValido(value: unknown): boolean {
  const n = toInt(value)
  return n !== null && n >= 1 && n <= 31
}

export function isJanelaValida(value: unknown): boolean {
  const n = toInt(value)
  return n !== null && n >= 1 && n <= 28
}

export function normalizeOffset(value: unknown, fallback: MesOffset = 1): MesOffset {
  const n = toInt(value)
  return n === 0 ? 0 : n === 1 ? 1 : fallback
}

/** Lê o vencimento de uma condição (campos `*_vencimento_*` ou `comercial_*`), com fallback no padrão. */
export function vencimentoDaCondicao(source: JsonRecord | null | undefined): VencimentoCondicao {
  const pick = (key: keyof typeof VENCIMENTO_PADRAO) => source?.[key] ?? source?.[`comercial_${key}`]
  const dia = (key: 'fixo_vencimento_dia' | 'comissao_vencimento_dia') => {
    const n = toInt(pick(key))
    return n !== null && n >= 1 && n <= 31 ? n : VENCIMENTO_PADRAO[key]
  }
  return {
    fixo_vencimento_dia: dia('fixo_vencimento_dia'),
    fixo_vencimento_mes_offset: normalizeOffset(pick('fixo_vencimento_mes_offset'), VENCIMENTO_PADRAO.fixo_vencimento_mes_offset),
    comissao_vencimento_dia: dia('comissao_vencimento_dia'),
    comissao_vencimento_mes_offset: normalizeOffset(pick('comissao_vencimento_mes_offset'), VENCIMENTO_PADRAO.comissao_vencimento_mes_offset),
    comissao_janela_inicio_dia: janelaDaCondicao(pick('comissao_janela_inicio_dia')),
  }
}

function janelaDaCondicao(value: unknown): number {
  const n = toInt(value)
  return n !== null && n >= 1 && n <= 28 ? n : VENCIMENTO_PADRAO.comissao_janela_inicio_dia
}

/** Valida o formulário (strings) e devolve o payload numérico ou o erro em pt-BR. */
export function parseVencimentoForm(form: {
  fixo_vencimento_dia: string
  fixo_vencimento_mes_offset: string
  comissao_vencimento_dia: string
  comissao_vencimento_mes_offset: string
  comissao_janela_inicio_dia?: string
}): { ok: true; value: VencimentoCondicao } | { ok: false; error: string } {
  if (!isDiaValido(form.fixo_vencimento_dia)) return { ok: false, error: 'Dia de vencimento do fixo deve estar entre 1 e 31.' }
  if (!isDiaValido(form.comissao_vencimento_dia)) return { ok: false, error: 'Dia de vencimento da comissão deve estar entre 1 e 31.' }
  const janela = form.comissao_janela_inicio_dia ?? String(VENCIMENTO_PADRAO.comissao_janela_inicio_dia)
  if (!isJanelaValida(janela)) return { ok: false, error: 'Dia de início da apuração da comissão deve estar entre 1 e 28.' }
  return {
    ok: true,
    value: {
      fixo_vencimento_dia: toInt(form.fixo_vencimento_dia) as number,
      fixo_vencimento_mes_offset: normalizeOffset(form.fixo_vencimento_mes_offset),
      comissao_vencimento_dia: toInt(form.comissao_vencimento_dia) as number,
      comissao_vencimento_mes_offset: normalizeOffset(form.comissao_vencimento_mes_offset),
      comissao_janela_inicio_dia: toInt(janela) as number,
    },
  }
}

/** Data de vencimento ('YYYY-MM-DD') para uma competência 'YYYY-MM'; dia > último dia do mês => último dia. */
export function calcularDataVencimento(competencia: string, dia: number, offset: MesOffset): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(competencia)
  if (!m) return null
  const idx = Number(m[1]) * 12 + (Number(m[2]) - 1) + offset
  const ano = Math.floor(idx / 12)
  const mes = (idx % 12) + 1
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const d = Math.min(Math.max(Math.trunc(dia), 1), ultimo)
  return `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function resumoVencimento(dia: number, offset: MesOffset): string {
  return `dia ${dia} ${mesOffsetLabel(offset)}`
}

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Resumo da janela quando ≠ 1 (ex.: "apuração do dia 16 ao 15"); string vazia para mês civil. */
export function resumoJanela(janela: number): string {
  return janela > 1 ? `apuração do dia ${janela} ao ${janela - 1}` : ''
}

/**
 * Preview da janela de apuração para uma competência 'YYYY-MM' (mês em que a janela começa):
 * "16/set → 15/out · competência set · vence 20/out". Null se a competência for inválida.
 */
export function previewJanelaComissao(competencia: string, janela: number, diaVencimento: number, offset: MesOffset): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(competencia)
  const venc = calcularDataVencimento(competencia, diaVencimento, offset)
  if (!m || !venc || !isJanelaValida(janela)) return null
  const ano = Number(m[1])
  const mes = Number(m[2]) - 1
  const ab = (idx: number) => MESES_ABREV[((idx % 12) + 12) % 12]
  const dd = (n: number) => String(n).padStart(2, '0')
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
  const inicio = `${dd(janela)}/${ab(mes)}`
  const fim = janela === 1 ? `${dd(ultimo)}/${ab(mes)}` : `${dd(janela - 1)}/${ab(mes + 1)}`
  return `${inicio} → ${fim} · competência ${ab(mes)} · vence ${venc.slice(8, 10)}/${ab(Number(venc.slice(5, 7)) - 1)}`
}

/** Versão vigente em `hoje` ('YYYY-MM-DD'): maior inicio_vigencia <= hoje, não cancelada; empate pela maior revision. */
export function condicaoVigente(condicoes: JsonRecord[], hoje: string): JsonRecord | null {
  const validas = condicoes
    .filter((c) => c && c.cancelled_at == null && typeof c.inicio_vigencia === 'string' && c.inicio_vigencia.slice(0, 10) <= hoje)
    .sort((a, b) => {
      const byInicio = String(b.inicio_vigencia).localeCompare(String(a.inicio_vigencia))
      return byInicio !== 0 ? byInicio : Number(b.revision ?? 0) - Number(a.revision ?? 0)
    })
  return validas[0] ?? null
}

/** Revisão atual da marca (maior `revision` entre as condições) — enviada como expected_revision. */
export function revisaoAtual(condicoes: JsonRecord[]): number {
  return condicoes.reduce((max, c) => Math.max(max, Number(c.revision ?? 1)), 0) || 1
}
