export type TipoTransacao = 'entrada' | 'saida'
export type TipoAlvoConciliacao = 'receita' | 'custo' | 'apresentadora' | 'imposto'

export interface AsaasSaldo {
  saldo: number
  consultado_em: string
}

export interface AsaasTransacao {
  id?: string
  asaas_id: string
  tipo: TipoTransacao
  tipo_asaas: string | null
  valor: number
  valor_bruto: number | null
  data: string
  descricao: string | null
  customer_id: string | null
  payment_id: string | null
  cliente_id?: string | null
  cliente_nome?: string | null
  saldo_apos?: number | null
  conciliado_com_tipo?: TipoAlvoConciliacao | null
  conciliado_com_id?: string | null
  conciliado_em?: string | null
}

export interface AsaasExtrato {
  inicio: string
  fim: string
  fonte: 'asaas' | 'cache'
  total_entradas: number
  total_saidas: number
  liquido: number
  itens: AsaasTransacao[]
}

export interface AsaasSincronizacao {
  inicio: string
  fim: string
  total: number
  inseridas: number
  atualizadas: number
}

export interface AsaasSugestao {
  tipo: TipoAlvoConciliacao
  id: string
  descricao: string | null
  data_referencia: string | null
  valor_casado: number | null
  score: number
  motivos: string[]
}

export interface AsaasPendente extends AsaasTransacao {
  id: string
  sugestoes: AsaasSugestao[]
  ambiguo: boolean
}

export interface AsaasConciliacao {
  inicio: string
  fim: string
  tipo: TipoTransacao
  total: number
  avisos: string[]
  itens: AsaasPendente[]
}
