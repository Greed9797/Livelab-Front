// Tipos do Financeiro (lançamentos unificados, DRE, fluxo de caixa, custos).
// Contrato: SPEC_V2 adendo "Onda 2". Todos os campos numéricos passam por
// normalização defensiva em services/financeiro.ts (o backend pode mandar string).

export type Natureza = 'receita' | 'custo'

/** 'perdido' só existe para receitas e 'cancelado' para pagáveis (custos, apresentadora, imposto) (encerrados sem pagamento do saldo). */
export type StatusLancamento = 'previsto' | 'pendente' | 'atrasado' | 'parcial' | 'pago' | 'perdido' | 'cancelado'

export const STATUS_LANCAMENTO: StatusLancamento[] = ['previsto', 'pendente', 'atrasado', 'parcial', 'pago', 'perdido', 'cancelado']

/** Modo do PerdaModal: perder (receita), cancelar (custo) ou desfazer (perda/cancelamento). */
export type ModoPerda = 'perder' | 'cancelar' | 'desfazer'

export type OrigemLancamento =
  | 'marca_fixo'
  | 'marca_comissao'
  | 'comercial'
  | 'manual'
  | 'recorrente'
  | 'parcela'
  | 'apresentadora'
  | 'imposto'
  | string

export const GRUPOS_CUSTO = [
  'operacional',
  'estrutural',
  'diversos',
  'investimento',
  'prolabore',
  'marketing',
  'ferramentas',
  'cartao',
  'aporte',
  'outros',
] as const

export type ClasseCusto = 'fixo' | 'variavel'

export interface Lancamento {
  id: string
  natureza: Natureza
  origem: OrigemLancamento
  descricao: string
  competencia: string // 'YYYY-MM-01'
  data_vencimento: string | null // 'YYYY-MM-DD'
  valor_previsto: number
  valor_pago: number
  data_pagamento: string | null
  status: StatusLancamento
  grupo: string | null
  componente: string | null // receitas: 'fixo' | 'comissao'; apresentadora: 'fixo' | 'variavel'
  /** Classe do custo informada pelo backend (null/ausente = derivar em utils/custo-classe.ts). */
  classe: ClasseCusto | null
  marca_id: string | null
  marca_nome: string | null
  cliente_id: string | null
  cliente_nome: string | null
  apresentadora_id: string | null
  recorrente_id: string | null
  parcela_grupo_id: string | null
  parcela_num: number | null
  parcelas_total: number | null
  observacao: string | null
  virtual: boolean
  /** Receita perdida: quando/por quê (ISO). null/ausente = não perdida. */
  perdido_em?: string | null
  perdido_motivo?: string | null
  /** Custo, pagamento de apresentadora ou imposto cancelado: quando/por quê (ISO). null/ausente = não cancelado. */
  cancelado_em?: string | null
  cancelado_motivo?: string | null
  cancelado_por?: string | null
}

export interface TotaisNatureza {
  previsto: number
  pago: number
  atrasado: number
  pendente: number
  /** Saldo em aberto encerrado (receita.perdido / custo.cancelado). Ausente em backends antigos. */
  perdido?: number
  cancelado?: number
}

export interface TotaisLancamentos {
  receita: TotaisNatureza
  custo: TotaisNatureza
  saldo_previsto: number
  saldo_realizado: number
}

export interface LancamentosFiltro {
  inicio: string // YYYY-MM
  fim: string // YYYY-MM
  natureza?: Natureza | ''
  status?: StatusLancamento | ''
  grupo?: string
  q?: string
  classe?: ClasseCusto | ''
  origem?: string
}

export interface PrevistoRealizado {
  previsto: number
  realizado: number
}

export interface DreMes {
  mes: string // YYYY-MM
  receita: PrevistoRealizado
  custos: PrevistoRealizado & { por_grupo: Record<string, PrevistoRealizado> }
  apresentadoras: PrevistoRealizado
  imposto: PrevistoRealizado & { aliquota: number; base: number }
  resultado: PrevistoRealizado
}

export interface DreResponse {
  inicio: string
  fim: string
  meses: DreMes[]
  totais: Omit<DreMes, 'mes'>
}

export interface FluxoLinha {
  chave: string // '5' | '10' | ... | 'cartao'
  label: string
  entradas: PrevistoRealizado
  saidas: PrevistoRealizado
  saldo: PrevistoRealizado
  acumulado: PrevistoRealizado
}

export interface FluxoSerieMes {
  mes: string // YYYY-MM
  entradas: PrevistoRealizado
  saidas: PrevistoRealizado
  saldo: PrevistoRealizado
}

export interface FluxoCaixaResponse {
  mes: string
  saldo_inicial: number
  linhas: FluxoLinha[]
  serie_anual: FluxoSerieMes[]
  totais: { entradas: PrevistoRealizado; saidas: PrevistoRealizado; saldo: PrevistoRealizado }
}

export interface FinanceiroConfig {
  aliquota_imposto_pct: number
  /** 'YYYY-MM-DD' — tudo que vence antes é ignorado; null = sem corte. */
  data_corte: string | null
  saldo_abertura: number
}

/** PATCH /financeiro/config aceita qualquer subconjunto. */
export type FinanceiroConfigPatch = Partial<FinanceiroConfig>

/** Lado (receber/pagar) do painel: caixa = em aberto com vencimento até o fim do mês. */
export interface PainelLado {
  no_mes: number
  atrasado_anterior: number
  total: number
  qtd: number
  atrasados: { qtd: number; valor: number }
}

/** Projeção da comissão do mês corrente pelo ritmo atual (nunca entra nos totais reais). */
export interface ProjecaoComissao {
  competencia: string
  previsto_atual: number
  projetado: number
  ajuste: number
  dias_decorridos: number
  dias_mes: number
  qtd: number
  vence_em: string | null
  entra_no_painel: boolean
}

export type MesRelativo = 'passado' | 'corrente' | 'futuro'

/** GET /financeiro/painel?mes=YYYY-MM */
export interface PainelFinanceiro {
  mes: string
  hoje: string
  fim_mes: string
  mes_relativo: MesRelativo
  configurado: boolean
  data_corte: string | null
  saldo_abertura: number
  caixa: { saldo_atual: number; ate: string | null }
  recebido_mes: { total: number; receitas: number; aportes: number }
  pago_mes: { total: number }
  a_receber: PainelLado
  a_pagar: PainelLado
  projetado_fim_mes: number
  projecao_comissao: ProjecaoComissao | null
  projetado_fim_mes_ritmo: number | null
  competencia: { receita: PrevistoRealizado; custos: PrevistoRealizado; resultado: PrevistoRealizado }
}

export const GRUPOS_RECEITA_AVULSA = ['aporte', 'servico', 'reembolso', 'outros'] as const
export type GrupoReceitaAvulsa = (typeof GRUPOS_RECEITA_AVULSA)[number]

export interface ReceitaAvulsaPayload {
  descricao: string
  grupo: GrupoReceitaAvulsa
  valor: number
  data_vencimento: string
  observacao?: string | null
  /** Informados juntos quando a receita já foi recebida. */
  valor_pago?: number
  data_pagamento?: string
}

export interface CustoRecorrente {
  id: string
  nome: string
  descricao: string | null
  grupo: string
  valor: number
  dia_vencimento: number
  mes_offset: number
  inicio: string // YYYY-MM-DD
  fim: string | null
  ativo: boolean
  /** Override da classe derivada (null = automática). */
  classe_custo: ClasseCusto | null
}

export interface BaixaPayload {
  valor_pago?: number
  data_pagamento?: string
}

export interface CustoPontualPayload {
  descricao: string
  valor: number
  grupo: string
  competencia?: string
  data_vencimento?: string
  observacao?: string | null
  valor_pago?: number | null
  data_pagamento?: string | null
  classe_custo?: ClasseCusto | null
}

export interface CustoParceladoPayload {
  descricao: string
  parcelas: number
  valor_total?: number
  valor_parcela?: number
  grupo: string
  competencia?: string
  data_vencimento?: string
  observacao?: string | null
  classe_custo?: ClasseCusto | null
}

export type CustoRecorrentePayload = Omit<CustoRecorrente, 'id'>

export type EscopoExclusao = 'um' | 'grupo' | 'futuras'

// ── Importação da planilha ───────────────────────────────────────────────────

export interface ImportarRecorrenteItem {
  nome: string
  descricao?: string
  grupo: string
  valor: number
  dia_vencimento: number
  mes_offset?: number
  inicio: string // YYYY-MM-DD
  fim: string | null
}

export interface ImportarPontualItem {
  descricao: string
  grupo: string
  valor: number
  data_vencimento: string
  competencia: string
  parcela_num?: number
  parcelas_total?: number
}

export interface ImportarCustosPayload {
  recorrentes: ImportarRecorrenteItem[]
  pontuais: ImportarPontualItem[]
}

export interface ImportarCustosBody extends ImportarCustosPayload {
  dry_run?: boolean
}

export interface ImportarResumo {
  criados: number
  ignorados: number
  itens: { nome?: string; descricao?: string; acao: string }[]
}

export interface ImportarCustosResultado {
  dry_run: boolean
  recorrentes: ImportarResumo
  pontuais: ImportarResumo
}
