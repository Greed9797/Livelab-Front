import type { JsonRecord } from '../types/models'

export type CarteiraVisibilidade = 'ativos' | 'todos' | 'inativos'
export type ResolucaoLinkCarteira = 'abrir' | 'todos' | 'ausente'

/** Inadimplência é uma pendência financeira, não desativação da operação. */
export function isCarteiraAtiva(status: string): boolean {
  return status === 'ativo' || status === 'ativa' || status === 'inadimplente'
}

/** Status faz parte da chave para não misturar cadastros ativos e desativados de mesmo nome. */
export function chaveAgrupamentoCarteira(registro: { tipo_operacional?: unknown; nome?: unknown; status?: unknown }): string {
  return `${String(registro.tipo_operacional ?? '')}:${String(registro.nome ?? '').trim().toLowerCase()}:${String(registro.status ?? '')}`
}

/** Decide se um deep link pode abrir a lista atual ou precisa carregar o catálogo completo. */
export function resolverLinkCarteira(registros: JsonRecord[], catalogoCompleto: boolean): ResolucaoLinkCarteira {
  // Um nome ativo também pode ter homônimo arquivado. Só resolva após conhecer ambos.
  if (!catalogoCompleto) return 'todos'
  return registros.length === 0 ? 'ausente' : 'abrir'
}

/**
 * Mantém a ordem recebida dentro de cada grupo. Em "todos", os inativos vão ao fim
 * para preservar a leitura operacional sem ocultar registros carregados.
 */
export function selecionarCarteiraPorVisibilidade(
  registros: JsonRecord[],
  visibilidade: CarteiraVisibilidade,
): JsonRecord[] {
  const selecionados = registros.filter((registro) => {
    const ativo = isCarteiraAtiva(String(registro.status ?? ''))
    return visibilidade === 'todos' || (visibilidade === 'ativos' ? ativo : !ativo)
  })

  if (visibilidade !== 'todos') return selecionados

  return selecionados.sort((a, b) => {
    const aAtivo = isCarteiraAtiva(String(a.status ?? ''))
    const bAtivo = isCarteiraAtiva(String(b.status ?? ''))
    return Number(bAtivo) - Number(aAtivo)
  })
}
