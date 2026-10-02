// Cadastro unificado — /v1/cadastros com fallback para a junção legada /clientes + /marcas.
// A lista funciona com o backend antigo: flag desligada, 404/405/501 ou corpo em formato
// desconhecido caem na junção atual, sem erro para o usuário.
import axios from 'axios'
import { apiGet, apiPatch, apiPost } from './api'
import { getClientes, getMarcas } from './domain'
import type { Cadastro, CadastrosResultado } from '../types/cadastro'
import type { JsonRecord } from '../types/models'
import { cadastroUnificadoHabilitado, juntarCadastrosLegado, normalizarCadastro, normalizarListaCadastros } from '../utils/cadastro'

// Depois do primeiro 404 a sessão para de tentar a rota nova (backend antigo).
let endpointAusente = false

/** Só para testes. */
export function resetCadastrosEndpointCache() {
  endpointAusente = false
}

/** 404/405/501 = backend sem a rota (ainda não publicado). Demais erros sobem. */
export function isEndpointCadastrosAusente(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status === 404 || status === 405 || status === 501
}

export interface GetCadastrosParams {
  /** Inclui inativos/arquivados (visões Todos e Inativos). */
  incluirInativos?: boolean
}

export async function getCadastrosLegado(params: GetCadastrosParams = {}): Promise<CadastrosResultado> {
  const incluirInativos = Boolean(params.incluirInativos)
  // O endpoint de clientes separa arquivados; só pede essa lista ao abrir Todos/Inativos.
  const [clientes, arquivados, marcas] = await Promise.all([
    getClientes(),
    incluirInativos ? getClientes({ status: 'arquivado' }) : Promise.resolve([] as JsonRecord[]),
    getMarcas({ status: incluirInativos ? 'all' : 'ativa' }),
  ])
  return {
    fonte: 'legado',
    cadastros: juntarCadastrosLegado([...(clientes ?? []), ...(arquivados ?? [])], marcas ?? []),
  }
}

export async function getCadastros(params: GetCadastrosParams = {}): Promise<CadastrosResultado> {
  if (!cadastroUnificadoHabilitado() || endpointAusente) return getCadastrosLegado(params)
  let payload: unknown
  try {
    payload = await apiGet<unknown>('/cadastros', params.incluirInativos ? { status: 'all' } : undefined)
  } catch (error) {
    if (!isEndpointCadastrosAusente(error)) throw error
    endpointAusente = true
    return getCadastrosLegado(params)
  }
  const cadastros = normalizarListaCadastros(payload)
  return cadastros ? { fonte: 'cadastros', cadastros } : getCadastrosLegado(params)
}

export async function getCadastro(id: string): Promise<Cadastro | null> {
  return normalizarCadastro(await apiGet<unknown>(`/cadastros/${id}`))
}

export function createCadastro(payload: JsonRecord) {
  return apiPost<JsonRecord>('/cadastros', payload)
}

export function updateCadastro(id: string, payload: JsonRecord) {
  return apiPatch<JsonRecord>(`/cadastros/${id}`, payload)
}

/** Transforma afiliada/própria/parceira (ou marca sem ficha) em cliente; passa a gerar receita. */
export function promoverCadastroACliente(id: string, payload: JsonRecord = {}) {
  return apiPost<JsonRecord>(`/cadastros/${id}/promover-cliente`, payload)
}

/**
 * 409 PROMOCAO_CONDICAO_RETROATIVA: há condição com fixo/% vigente antes do início do
 * contrato. Devolve a mensagem do backend (para pedir confirmação) ou null.
 */
export function retroativoDaPromocao(error: unknown): string | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null
  const data = error.response.data as { code?: unknown; error?: unknown; message?: unknown } | undefined
  if (data?.code !== 'PROMOCAO_CONDICAO_RETROATIVA') return null
  const msg = typeof data.error === 'string' ? data.error : typeof data.message === 'string' ? data.message : ''
  return msg || 'Há condição comercial com fixo ou % vigente antes do início do contrato.'
}
