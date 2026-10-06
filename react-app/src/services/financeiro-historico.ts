import { apiGet } from './api'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ORIGENS = new Set(['marca_fixo', 'marca_comissao', 'avulsa', 'manual', 'recorrente', 'parcela', 'apresentadora', 'imposto'])
const MONEY = /^-?\d+\.\d{2}$/

export interface HistoricoEstorno {
  id: string
  valor: string
  data_estorno: string
}

export interface HistoricoLiquidacao {
  id: string
  valor: string
  data_liquidacao: string
  total_estornado: string
  total_liquido: string
  estornos: HistoricoEstorno[]
}

export interface FinanceiroHistorico {
  origem: string
  origem_id: string
  estado_comparacao: 'matching' | 'legacy-only' | 'canonical-only' | 'divergent'
  historico_incompleto: boolean
  valor_legado: string | null
  valor_canonico: string | null
  liquidacoes: HistoricoLiquidacao[]
}

export async function consultarHistorico(origem: string, id: string): Promise<FinanceiroHistorico> {
  if (!ORIGENS.has(origem) || !UUID.test(id)) throw new Error('Obrigação não materializada.')
  const raw = await apiGet<unknown>(`/financeiro/consulta/${origem}/${id}/historico`)
  if (!raw || typeof raw !== 'object') throw new Error('Histórico financeiro incompleto.')
  const data = raw as Record<string, unknown>
  if (data.origem !== origem || data.origem_id !== id ||
      !['matching', 'legacy-only', 'canonical-only', 'divergent'].includes(String(data.estado_comparacao)) ||
      typeof data.historico_incompleto !== 'boolean' ||
      data.historico_incompleto !== (data.estado_comparacao !== 'matching') ||
      ![data.valor_legado, data.valor_canonico].every((value) => value === null || (typeof value === 'string' && MONEY.test(value))) ||
      !Array.isArray(data.liquidacoes) || !data.liquidacoes.every((row) => {
        if (!row || typeof row !== 'object') return false
        const item = row as Record<string, unknown>
        return typeof item.id === 'string' && typeof item.data_liquidacao === 'string' &&
          ['valor', 'total_estornado', 'total_liquido'].every((key) => typeof item[key] === 'string' && MONEY.test(item[key] as string)) &&
          Array.isArray(item.estornos) && item.estornos.every((event) => event && typeof event === 'object' &&
            typeof event.id === 'string' && typeof event.data_estorno === 'string' &&
            typeof event.valor === 'string' && MONEY.test(event.valor))
      })) throw new Error('Histórico financeiro incompleto.')
  return data as unknown as FinanceiroHistorico
}
