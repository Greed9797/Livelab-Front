import type { JsonRecord } from './models'

/**
 * Cadastro unificado (marca + ficha comercial opcional do cliente).
 * id público = marca_id. Contrato do backend: GET/POST/PATCH /v1/cadastros.
 */
export type CadastroTipo = 'cliente' | 'afiliada' | 'propria' | 'parceira'

export const CADASTRO_TIPOS: readonly CadastroTipo[] = ['cliente', 'afiliada', 'propria', 'parceira']

/** Campos da ficha comercial (tabela clientes). gateway_customer_id é só leitura. */
export interface CadastroFicha {
  celular: string | null
  email: string | null
  cnpj: string | null
  razao_social: string | null
  gateway_customer_id: string | null
  acesso_email: string | null
}

export interface Cadastro {
  /** = marca_id quando existe; cliente legado sem marca usa o id do cliente. */
  id: string
  marca_id: string | null
  cliente_id: string | null
  nome: string
  /** Nome da marca operacional (difere de `nome` em fichas legadas com marca renomeada). */
  marca_nome: string | null
  tipo: CadastroTipo
  sistema: boolean
  /** Só tipo cliente e não-sistema gera receita (fixo + % do GMV). */
  gera_receita: boolean
  status_operacional: string
  /** Status da ficha do cliente; null quando não há ficha. */
  status_comercial: string | null
  ficha: CadastroFicha
  logo_url: string | null
  cor: string | null
  tiktok_username: string | null
  configuracao_comercial: JsonRecord | null
  apresentadoras: JsonRecord[]
  gmv_mes: number
  lives_mes: number
  videos_mes: number
  origem_dados: string | null
  /** Outras marcas da mesma ficha (só no formato legado /clientes + /marcas). */
  marcas_vinculadas: JsonRecord[]
  /** Payload original, para campos que a tela ainda lê diretamente. */
  raw: JsonRecord
}

/** De onde veio a lista: endpoint novo ou junção legada /clientes + /marcas. */
export type CadastrosFonte = 'cadastros' | 'legado'

export interface CadastrosResultado {
  fonte: CadastrosFonte
  cadastros: Cadastro[]
}
