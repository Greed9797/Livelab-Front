// Seletor de conta das lives (agendar, editar, registrar métricas).
// Cadastro unificado: uma opção `marca:<id>` por cadastro — sem "Marca · X" e "Cliente · X"
// para a mesma entidade. Valores antigos `cliente:<id>` continuam legíveis: resolvem para a
// marca principal do cliente. Cliente sem nenhuma marca (dado legado inconsistente) ainda
// aparece como `cliente:<id>` para não ficar impossível de agendar.
import type { JsonRecord } from '../types/models'
import { asString } from './format'
import { resolverMarcaPrincipal } from './carteira'
import { normalizarTipoCadastro, tipoCadastroLabel } from './cadastro'

export type LiveAccountOption = { value: string; label: string; tipo?: string }

export const MARCA_PREFIX = 'marca:'
export const CLIENTE_PREFIX = 'cliente:'

/** Marca principal (tipo cliente; senão homônima; senão a primeira) de uma ficha de cliente. */
export function marcaPrincipalDoCliente(clienteId: string, marcas: JsonRecord[], nomeCliente?: unknown): JsonRecord | null {
  if (!clienteId) return null
  return resolverMarcaPrincipal(marcas.filter((marca) => asString(marca.cliente_id, '') === clienteId), nomeCliente)
}

/**
 * Valor exibido no seletor para uma live/agenda. `cliente:<id>` antigo vira a marca
 * principal quando ela está na lista; sem marca conhecida, mantém o valor antigo.
 */
export function liveAccountValue(selected: { marcaId?: string; clienteId?: string } | undefined, marcas: JsonRecord[]): string {
  const marcaId = selected?.marcaId ?? ''
  const clienteId = selected?.clienteId ?? ''
  if (marcaId) return `${MARCA_PREFIX}${marcaId}`
  if (!clienteId) return ''
  const principal = marcaPrincipalDoCliente(clienteId, marcas)
  const principalId = asString(principal?.id, '')
  return principalId ? `${MARCA_PREFIX}${principalId}` : `${CLIENTE_PREFIX}${clienteId}`
}

/** Nome do cadastro, com o tipo quando não é cliente ("Farol (afiliada)"). */
export function marcaOptionLabel(marca: JsonRecord): string {
  const nome = asString(marca.nome ?? marca.cliente_nome, 'Marca')
  const tipo = normalizarTipoCadastro(marca.tipo)
  return tipo === 'cliente' ? nome : `${nome} (${tipoCadastroLabel(tipo).toLowerCase()})`
}

export function clienteOptionLabel(cliente: JsonRecord): string {
  return asString(cliente.nome ?? cliente.razao_social ?? cliente.email, 'Cliente')
}

export interface BuildLiveAccountOptionsArgs {
  marcas: JsonRecord[]
  clientes: JsonRecord[]
  /** Quais marcas viram opção (ex.: só operacionais). */
  incluirMarca: (marca: JsonRecord) => boolean
  /** Quais clientes SEM marca viram opção de fallback. */
  incluirCliente: (cliente: JsonRecord) => boolean
  marcaLabel?: (marca: JsonRecord) => string
  clienteLabel?: (cliente: JsonRecord) => string
  /**
   * Fichas já representadas por uma marca fora da lista (ex.: marca histórica/inativa da
   * live). Sem isso a mesma entidade apareceria como "X (inativo)" e como `cliente:<id>`.
   */
  ocultarClienteIds?: Iterable<string>
}

export function buildLiveAccountOptions({
  marcas,
  clientes,
  incluirMarca,
  incluirCliente,
  marcaLabel = marcaOptionLabel,
  clienteLabel = clienteOptionLabel,
  ocultarClienteIds = [],
}: BuildLiveAccountOptionsArgs): LiveAccountOption[] {
  // Cliente com qualquer marca conhecida é escolhido pela marca, nunca pela ficha.
  const clientesComMarca = new Set([...marcas.map((marca) => asString(marca.cliente_id, '')), ...ocultarClienteIds].filter(Boolean))
  const vistos = new Set<string>()
  const options: LiveAccountOption[] = []
  for (const marca of marcas) {
    const id = asString(marca.id, '')
    if (!id || vistos.has(`m:${id}`) || !incluirMarca(marca)) continue
    vistos.add(`m:${id}`)
    options.push({ value: `${MARCA_PREFIX}${id}`, label: marcaLabel(marca), tipo: normalizarTipoCadastro(marca.tipo) })
  }
  for (const cliente of clientes) {
    const id = asString(cliente.id, '')
    if (!id || vistos.has(`c:${id}`) || clientesComMarca.has(id) || !incluirCliente(cliente)) continue
    vistos.add(`c:${id}`)
    options.push({ value: `${CLIENTE_PREFIX}${id}`, label: clienteLabel(cliente), tipo: 'cliente' })
  }
  return options
}

/**
 * Como liveAccountValue, mas só troca `cliente:<id>` pela marca principal quando essa
 * marca é uma das opções do seletor (senão o <select> mostraria uma opção errada).
 */
export function resolveLiveAccountValue(
  form: { marca_id?: string; cliente_id?: string },
  marcas: JsonRecord[],
  options: LiveAccountOption[],
): string {
  const raw = form.marca_id ? `${MARCA_PREFIX}${form.marca_id}` : form.cliente_id ? `${CLIENTE_PREFIX}${form.cliente_id}` : ''
  if (form.marca_id || !form.cliente_id) return raw
  const resolved = liveAccountValue({ clienteId: form.cliente_id }, marcas)
  return options.some((option) => option.value === resolved) ? resolved : raw
}
