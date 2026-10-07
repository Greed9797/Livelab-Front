// API do DRE v3 (SPEC_V3, F2): DRE anual com custos fixos/variáveis + aportes e
// o detalhe de um mês. A normalização defensiva (inclui `aportes`) vive em
// utils/dre-detalhe.ts.
import type { DreAnualV3, DreMesDetalheResponse, RegimeDre } from '../types/financeiro-dre'
import { normalizarDreAnualV3, normalizarDreMesDetalhe } from '../utils/dre-detalhe'
import axios from 'axios'
import { apiGet } from './api'

// Prefixo 'fin2' → invalidado junto com o resto do financeiro (FQK.all).
export const DRE_QK = {
  anual: (inicio: string, fim: string, regime: RegimeDre = 'caixa_vencimento') => ['fin2', 'dre-v3', inicio, fim, regime] as const,
  mes: (mes: string, regime: RegimeDre = 'caixa_vencimento') => ['fin2', 'dre-mes', mes, regime] as const,
}

/**
 * DRE anual com regime explícito. Só competência pode usar o resumo legado no 404;
 * caixa exige resposta confirmando o regime para não exibir números com outro recorte.
 */
export async function getDreAnualV3(inicio: string, fim: string, regime: RegimeDre = 'caixa_vencimento'): Promise<DreAnualV3> {
  let raw: unknown
  try {
    raw = await apiGet<unknown>('/financeiro/dre', { inicio, fim, regime })
  } catch (e) {
    if (regime !== 'competencia' || !(axios.isAxiosError(e) && e.response?.status === 404)) throw e
    raw = await apiGet<unknown>('/financeiro/resumo', { inicio, fim })
  }
  validarRegime(raw, regime)
  return { ...normalizarDreAnualV3(raw, { inicio, fim }), regime }
}

export async function getDreMesDetalhe(mes: string, regime: RegimeDre = 'caixa_vencimento'): Promise<DreMesDetalheResponse> {
  const raw = await apiGet<unknown>('/financeiro/dre/mes', { mes, regime })
  validarRegime(raw, regime)
  return { ...normalizarDreMesDetalhe(raw, mes), regime }
}

function validarRegime(raw: unknown, regime: RegimeDre) {
  const recebido = raw && typeof raw === 'object' ? (raw as { regime?: string }).regime : undefined
  if ((regime === 'caixa_vencimento' && recebido !== regime) || (recebido && recebido !== regime)) {
    throw new Error('O servidor não confirmou o regime solicitado. Atualize e tente novamente.')
  }
}
