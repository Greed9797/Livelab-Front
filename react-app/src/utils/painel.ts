// Normalização defensiva do GET /financeiro/painel (A receber / A pagar em regime de CAIXA).
// Puro e coberto por painel.test.ts.
import type { MesRelativo, PainelLado, PainelFinanceiro, PrevistoRealizado, ProjecaoComissao } from '../types/financeiro'
import { isDataISO } from './caixa'
import { isMes, mesAtualSP, ultimoDiaMes } from './financeiro'
import { asNumber } from './format'

const r2 = (n: number) => Math.round(n * 100) / 100

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function dataOuNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const d = v.slice(0, 10)
  return isDataISO(d) ? d : null
}

function pr(v: unknown): PrevistoRealizado {
  const r = rec(v)
  return { previsto: asNumber(r.previsto), realizado: asNumber(r.realizado) }
}

function lado(v: unknown): PainelLado {
  const r = rec(v)
  const no_mes = asNumber(r.no_mes)
  const atrasado_anterior = asNumber(r.atrasado_anterior)
  const atr = rec(r.atrasados)
  return {
    no_mes,
    atrasado_anterior,
    total: r.total == null ? r2(no_mes + atrasado_anterior) : asNumber(r.total),
    qtd: Math.max(0, Math.trunc(asNumber(r.qtd))),
    atrasados: { qtd: Math.max(0, Math.trunc(asNumber(atr.qtd))), valor: asNumber(atr.valor) },
  }
}

function projecao(v: unknown): ProjecaoComissao | null {
  const r = rec(v)
  if (!Object.keys(r).length) return null
  const previsto_atual = asNumber(r.previsto_atual)
  const projetado = asNumber(r.projetado)
  return {
    competencia: isMes(r.competencia) ? r.competencia : typeof r.competencia === 'string' && isMes(r.competencia.slice(0, 7)) ? r.competencia.slice(0, 7) : '',
    previsto_atual,
    projetado,
    ajuste: r.ajuste == null ? r2(projetado - previsto_atual) : asNumber(r.ajuste),
    dias_decorridos: asNumber(r.dias_decorridos),
    dias_mes: asNumber(r.dias_mes),
    qtd: Math.max(0, Math.trunc(asNumber(r.qtd))),
    vence_em: dataOuNull(r.vence_em),
    entra_no_painel: r.entra_no_painel === true,
  }
}

function mesRelativoDe(raw: unknown, mes: string, hoje: string): MesRelativo {
  if (raw === 'passado' || raw === 'corrente' || raw === 'futuro') return raw
  const atual = hoje.slice(0, 7)
  return mes < atual ? 'passado' : mes > atual ? 'futuro' : 'corrente'
}

export function normalizarPainel(input: unknown, mesFallback: string): PainelFinanceiro {
  const raw = rec(input)
  const mes = isMes(raw.mes) ? raw.mes : mesFallback
  const hoje = dataOuNull(raw.hoje) ?? `${mesAtualSP()}-01`
  const fim_mes = dataOuNull(raw.fim_mes) ?? `${mes}-${String(ultimoDiaMes(mes)).padStart(2, '0')}`
  const data_corte = dataOuNull(raw.data_corte)
  const caixaRaw = rec(raw.caixa)
  const recebido = rec(raw.recebido_mes)
  const receber = lado(raw.a_receber)
  const pagar = lado(raw.a_pagar)
  const saldo_atual = asNumber(caixaRaw.saldo_atual)
  const ritmo = raw.projetado_fim_mes_ritmo
  const comp = rec(raw.competencia)
  return {
    mes,
    hoje,
    fim_mes,
    mes_relativo: mesRelativoDe(raw.mes_relativo, mes, hoje),
    configurado: raw.configurado === true || (raw.configurado == null && data_corte != null),
    data_corte,
    saldo_abertura: asNumber(raw.saldo_abertura),
    caixa: { saldo_atual, ate: dataOuNull(caixaRaw.ate) },
    recebido_mes: {
      total: asNumber(recebido.total),
      receitas: asNumber(recebido.receitas),
      aportes: asNumber(recebido.aportes),
    },
    pago_mes: { total: asNumber(rec(raw.pago_mes).total) },
    a_receber: receber,
    a_pagar: pagar,
    projetado_fim_mes: raw.projetado_fim_mes == null ? r2(saldo_atual + receber.total - pagar.total) : asNumber(raw.projetado_fim_mes),
    projecao_comissao: projecao(raw.projecao_comissao),
    projetado_fim_mes_ritmo: ritmo == null || ritmo === '' || !Number.isFinite(Number(ritmo)) ? null : asNumber(ritmo),
    competencia: { receita: pr(comp.receita), custos: pr(comp.custos), resultado: pr(comp.resultado) },
  }
}

/** Só mostra a linha "ritmo atual" quando backend mandou projeção E projetado. */
export function temProjecaoRitmo(p: PainelFinanceiro): p is PainelFinanceiro & { projecao_comissao: NonNullable<PainelFinanceiro['projecao_comissao']>; projetado_fim_mes_ritmo: number } {
  return p.projecao_comissao != null && p.projetado_fim_mes_ritmo != null
}
