import type { Lancamento } from '../types/financeiro'
import { isMes } from '../utils/financeiro'
import { apiPost } from './api'

export type LiquidacaoIncrementalTipo = 'receita' | 'avulsa' | 'custo' | 'apresentadora' | 'imposto'

export interface LiquidacaoIncrementalPayload {
  tipo: LiquidacaoIncrementalTipo
  id: string
  valor_operacao: string
  data: string
  chave_operacao: string
  observacao?: string
}

export interface LiquidacaoIncrementalResultado {
  liquidacao_id: string
  tipo: LiquidacaoIncrementalTipo
  origem_id: string
  valor_operacao: string
  valor_pago_anterior: string
  valor_pago: string
  saldo_restante: string
  data: string
  replay: boolean
  situacao_data: 'agendada' | 'realizada'
  afeta_caixa_atual: boolean
  mensagem: string
}

const MONEY = /^\d+\.\d{2}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Resposta inválida ao registrar a operação financeira.')
  return value as Record<string, unknown>
}

function requiredString(raw: Record<string, unknown>, key: string): string {
  const value = raw[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error('Resposta inválida ao registrar a operação financeira.')
  return value
}

function money(raw: Record<string, unknown>, key: string): string {
  const value = requiredString(raw, key)
  if (!MONEY.test(value)) throw new Error('Resposta inválida ao registrar a operação financeira.')
  return value
}

export function normalizarLiquidacaoIncremental(value: unknown): LiquidacaoIncrementalResultado {
  const raw = record(value)
  const tipo = requiredString(raw, 'tipo')
  const situacao = requiredString(raw, 'situacao_data')
  const data = requiredString(raw, 'data')
  if (!['receita', 'avulsa', 'custo', 'apresentadora', 'imposto'].includes(tipo)
    || !['agendada', 'realizada'].includes(situacao)
    || !DATE.test(data)
    || typeof raw.replay !== 'boolean'
    || typeof raw.afeta_caixa_atual !== 'boolean') {
    throw new Error('Resposta inválida ao registrar a operação financeira.')
  }
  return {
    liquidacao_id: requiredString(raw, 'liquidacao_id'),
    tipo: tipo as LiquidacaoIncrementalTipo,
    origem_id: requiredString(raw, 'origem_id'),
    valor_operacao: money(raw, 'valor_operacao'),
    valor_pago_anterior: money(raw, 'valor_pago_anterior'),
    valor_pago: money(raw, 'valor_pago'),
    saldo_restante: money(raw, 'saldo_restante'),
    data,
    replay: raw.replay,
    situacao_data: situacao as LiquidacaoIncrementalResultado['situacao_data'],
    afeta_caixa_atual: raw.afeta_caixa_atual,
    mensagem: requiredString(raw, 'mensagem'),
  }
}

export function origemLiquidacaoIncremental(lancamento: Lancamento): Pick<LiquidacaoIncrementalPayload, 'tipo' | 'id'> {
  if (lancamento.natureza === 'receita') {
    return { tipo: lancamento.origem === 'avulsa' ? 'avulsa' : 'receita', id: lancamento.id }
  }
  if (lancamento.origem === 'apresentadora') {
    const [, idNoLancamento, mesNoLancamento, componenteNoLancamento] = lancamento.id.split(':')
    const apresentadoraId = lancamento.apresentadora_id ?? idNoLancamento
    const mes = isMes(mesNoLancamento) ? mesNoLancamento : lancamento.competencia.slice(0, 7)
    const componente = lancamento.componente === 'fixo' || lancamento.componente === 'variavel'
      ? lancamento.componente
      : componenteNoLancamento === 'fixo' || componenteNoLancamento === 'variavel'
        ? componenteNoLancamento
        : 'fixo'
    return { tipo: 'apresentadora', id: `apresentadora:${apresentadoraId}:${mes}:${componente}` }
  }
  if (lancamento.origem === 'imposto') {
    const mesNoId = lancamento.id.startsWith('imposto:') ? lancamento.id.slice('imposto:'.length) : ''
    const mes = isMes(mesNoId) ? mesNoId : lancamento.competencia.slice(0, 7)
    return { tipo: 'imposto', id: `imposto:${mes}` }
  }
  return { tipo: 'custo', id: lancamento.id }
}

/** Gera UUID válido mesmo nos ambientes de teste que não expõem randomUUID. */
export function novaChaveOperacao(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function registrarLiquidacaoIncremental(payload: LiquidacaoIncrementalPayload): Promise<LiquidacaoIncrementalResultado> {
  return normalizarLiquidacaoIncremental(await apiPost<unknown>('/financeiro/liquidacoes/incrementais', payload))
}
