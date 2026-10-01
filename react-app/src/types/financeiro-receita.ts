// Tipos da aba Receita do Financeiro — GET /v1/financeiro/receita?mes=YYYY-MM (SPEC v3).
// O backend é implementado em paralelo: tudo passa pelo normalizador defensivo
// de utils/receita-mensal.ts (campos ausentes, números como string, etc.).
import type { Lancamento } from './financeiro'

export type VisaoReceita = 'competencia' | 'vencimento'

export type ComponenteReceita = 'fixo' | 'comissao'

export interface TotalReceita {
  previsto: number
  pago: number
}

export interface TotalReceitaAberto extends TotalReceita {
  aberto: number
}

/**
 * Título de receita de uma marca (fixo ou comissão), já no formato `Lancamento`
 * (natureza 'receita', origem 'comercial') para reaproveitar BaixaModal/rotaBaixa.
 * `divergente` vem do backend (valor pago ≠ previsto recalculado).
 */
export type TituloReceita = Lancamento & { componente: ComponenteReceita; divergente: boolean }

export interface ReceitaMarca {
  marca_id: string
  marca_nome: string
  /** 'fixo_mais_comissao' | 'fixo_ou_comissao' | outro valor legado */
  tipo_cobranca: string
  /** % de comissão da franquia (ex.: 10 = 10%); null quando desconhecido. */
  pct: number | null
  gmv: number
  /** GMV × %, antes da regra fixo_ou_comissao; null quando não informado. */
  comissao_bruta: number | null
  em_apuracao: boolean
  fixo: TituloReceita | null
  comissao: TituloReceita | null
  total: TotalReceita
}

export interface ReceitaCliente {
  cliente_id: string
  cliente_nome: string
  total: TotalReceita
  marcas: ReceitaMarca[]
}

export interface ReceitaCompetencia {
  total: TotalReceitaAberto
  clientes: ReceitaCliente[]
  /** Receitas avulsas (serviço, reembolso, outros) — entram na receita. */
  avulsas: Lancamento[]
  /** Aportes — entrada de caixa, FORA da receita/resultado. */
  aportes: Lancamento[]
}

export interface ReceitaVencimento {
  total: TotalReceitaAberto
  /** Títulos e avulsas com vencimento no mês, ordenados por data. */
  itens: Lancamento[]
}

export interface ReceitaMensal {
  mes: string // YYYY-MM
  hoje: string // YYYY-MM-DD
  data_corte: string | null
  competencia: ReceitaCompetencia
  vencimento: ReceitaVencimento
  /** O que ainda falta receber com vencimento no mês (independe da visão). */
  a_receber_mes: number
}
