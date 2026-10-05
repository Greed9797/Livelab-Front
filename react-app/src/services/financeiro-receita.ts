// API da aba Receita do Financeiro — GET /v1/financeiro/receita?mes=YYYY-MM (SPEC v3).
// Resposta passa pelo normalizador defensivo (utils/receita-mensal.ts).
import type { ReceitaMensal } from '../types/financeiro-receita'
import { normalizarReceitaMensal } from '../utils/receita-mensal'
import { apiGet, apiPost } from './api'

// Sob o prefixo 'fin2' (FQK.all): toda baixa/receita avulsa que invalida o Financeiro também refaz a Receita.
export const RECEITA_QK = {
  all: ['fin2', 'receita'] as const,
  mes: (mes: string) => ['fin2', 'receita', mes] as const,
}

export async function getReceitaMensal(mes: string): Promise<ReceitaMensal> {
  const raw = await apiGet<unknown>('/financeiro/receita', { mes })
  return normalizarReceitaMensal(raw, mes)
}

export function gerarTitulosReceita(mes: string) {
  return apiPost<unknown>(`/financeiro/receitas/gerar?mes=${mes}`)
}
