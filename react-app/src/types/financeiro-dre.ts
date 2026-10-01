// Tipos do DRE v3 (SPEC_V3, frente F2): linhas Receita − Custos fixos − Custos
// variáveis (imposto incluso) = Resultado, aportes informativos, e o detalhe de
// um mês (GET /financeiro/dre/mes?mes=YYYY-MM). Tudo passa pela normalização
// defensiva de utils/dre-detalhe.ts — o backend pode mandar string, faltar chave
// ou ainda responder no formato antigo.
import type { DreMes, PrevistoRealizado } from './financeiro'

export type VisaoDre = 'ambos' | 'realizado' | 'previsto'

/** Quebra opcional da receita (se o backend mandar). */
export interface ReceitaPartes {
  fixo: PrevistoRealizado
  comissao: PrevistoRealizado
  avulsas: PrevistoRealizado
}

/**
 * Linha do DRE v3. Mantém as chaves antigas (receita, custos, apresentadoras,
 * imposto, resultado) e ganha custos_fixos / custos_variaveis / aportes.
 * `classificacao = 'estimada'` quando o backend ainda não manda as chaves novas
 * e os totais fixos/variáveis foram derivados das chaves antigas.
 */
export interface DreLinhaV3 extends Omit<DreMes, 'mes'> {
  custos_fixos: PrevistoRealizado
  custos_variaveis: PrevistoRealizado
  aportes: PrevistoRealizado
  receita_partes: ReceitaPartes | null
  classificacao: 'api' | 'estimada'
}

export interface DreMesV3 extends DreLinhaV3 {
  mes: string // YYYY-MM
}

export interface DreAnualV3 {
  inicio: string
  fim: string
  meses: DreMesV3[]
  totais: DreLinhaV3
}

// ── Detalhe do mês ───────────────────────────────────────────────────────────

export interface DreDetalheMarca {
  marca_id: string
  marca_nome: string
  fixo: PrevistoRealizado
  comissao: PrevistoRealizado
  total: PrevistoRealizado
  gmv: number
  /** Percentual de comissão (ex.: 12 = 12%). */
  pct: number
}

export interface DreDetalheCliente {
  cliente_id: string
  cliente_nome: string
  marcas: DreDetalheMarca[]
  total: PrevistoRealizado
}

/** Item genérico (receita avulsa, aporte, item de custo). */
export interface DreDetalheItem {
  id: string
  descricao: string
  origem: string | null
  grupo: string | null
  previsto: number
  realizado: number
  status: string | null
  data_vencimento: string | null
}

export interface DreDetalheGrupo {
  grupo: string
  total: PrevistoRealizado
  itens: DreDetalheItem[]
}

export interface DreApresentadoraFixo {
  apresentadora_id: string
  nome: string
  previsto: number
  realizado: number
}

export interface DreApresentadoraVariavel extends DreApresentadoraFixo {
  comissao: number
  adicionais: number
}

export interface DreImpostoDetalhe extends PrevistoRealizado {
  /** Percentual (ex.: 6 = 6%). */
  aliquota: number
  base: number
  base_tipo: string | null
  /** 'YYYY-MM' do mês-base (normalmente o anterior). */
  mes_base: string | null
}

export interface DreDeltas {
  receita: PrevistoRealizado
  custos_fixos: PrevistoRealizado
  custos_variaveis: PrevistoRealizado
  resultado: PrevistoRealizado
}

export interface DreMesDetalheResponse {
  mes: string
  atual: DreLinhaV3
  anterior: DreLinhaV3 | null
  delta: DreDeltas
  receita: {
    por_cliente: DreDetalheCliente[]
    avulsas: DreDetalheItem[]
    total: PrevistoRealizado
  }
  custos_fixos: {
    total: PrevistoRealizado
    por_grupo: DreDetalheGrupo[]
    apresentadoras_fixo: DreApresentadoraFixo[]
  }
  custos_variaveis: {
    total: PrevistoRealizado
    por_grupo: DreDetalheGrupo[]
    apresentadoras_variavel: DreApresentadoraVariavel[]
    imposto: DreImpostoDetalhe
  }
  aportes: DreDetalheItem[]
  margem: {
    contribuicao: PrevistoRealizado
    /** Percentual (ex.: 35 = 35%). */
    pct: PrevistoRealizado
  }
}
