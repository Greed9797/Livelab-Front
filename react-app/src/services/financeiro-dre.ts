// API do DRE v3 (SPEC_V3, F2): DRE anual com custos fixos/variáveis + aportes e
// o detalhe de um mês. A normalização defensiva (inclui `aportes`) vive em
// utils/dre-detalhe.ts — re-exportada aqui para quem consome o serviço.
import type { DreAnualV3, DreMesDetalheResponse } from '../types/financeiro-dre'
import { normalizarDreAnualV3, normalizarDreMesDetalhe } from '../utils/dre-detalhe'
import { apiGet } from './api'

export { normalizarAportes, normalizarDreAnualV3, normalizarDreMesDetalhe, normalizarLinhaV3 } from '../utils/dre-detalhe'

// Prefixo 'fin2' → invalidado junto com o resto do financeiro (FQK.all).
export const DRE_QK = {
  anual: (inicio: string, fim: string) => ['fin2', 'dre-v3', inicio, fim] as const,
  mes: (mes: string) => ['fin2', 'dre-mes', mes] as const,
}

export async function getDreAnualV3(inicio: string, fim: string): Promise<DreAnualV3> {
  const raw = await apiGet<unknown>('/financeiro/resumo', { inicio, fim })
  return normalizarDreAnualV3(raw, { inicio, fim })
}

export async function getDreMesDetalhe(mes: string): Promise<DreMesDetalheResponse> {
  const raw = await apiGet<unknown>('/financeiro/dre/mes', { mes })
  return normalizarDreMesDetalhe(raw, mes)
}
