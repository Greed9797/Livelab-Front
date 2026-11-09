import type { RhColaborador } from '../types/models'

export const ORG_NODE_WIDTH = 236
export const ORG_NODE_HEIGHT = 132
export const ORG_GAP_X = 32
export const ORG_GAP_Y = 56

const ORG_SETOR_COLORS = [
  'var(--primary)',
  'var(--info)',
  'var(--success)',
  'var(--warning)',
  'var(--danger)',
  'var(--text-muted)',
]

export interface OrgEdge {
  source: string
  target: string
}

function indexar(colaboradores: RhColaborador[]) {
  return new Map(colaboradores.map((colaborador) => [colaborador.id, colaborador]))
}

/** Sobe a cadeia de responsáveis: true se tornar managerId pai de colaboradorId fecharia ciclo. */
export function wouldCreateCycle(
  colaboradorId: string,
  managerId: string,
  colaboradores: RhColaborador[],
): boolean {
  if (colaboradorId === managerId) return true
  const porId = indexar(colaboradores)
  const visitados = new Set<string>()
  let atual = porId.get(managerId)
  while (atual?.responsavel_id) {
    if (atual.responsavel_id === colaboradorId) return true
    if (visitados.has(atual.id)) return true
    visitados.add(atual.id)
    atual = porId.get(atual.responsavel_id)
  }
  return false
}

/** Arestas pai -> filho, ignorando pai inexistente, auto-vínculo e ciclos. */
export function buildHierarchyEdges(colaboradores: RhColaborador[]): OrgEdge[] {
  const ids = new Set(colaboradores.map((colaborador) => colaborador.id))
  const edges: OrgEdge[] = []
  for (const colaborador of colaboradores) {
    const responsavelId = colaborador.responsavel_id
    if (!responsavelId || responsavelId === colaborador.id || !ids.has(responsavelId)) continue
    if (wouldCreateCycle(colaborador.id, responsavelId, colaboradores)) continue
    edges.push({ source: responsavelId, target: colaborador.id })
  }
  return edges
}

interface TreeLayout {
  positions: Record<string, { x: number; y: number }>
  width: number
  height: number
  minX: number
}

function layoutTree(
  raiz: string,
  filhos: Map<string, string[]>,
  posicoes: Record<string, { x: number; y: number }>,
  profundidade: number,
  offsetX: number,
): number {
  const y = profundidade * (ORG_NODE_HEIGHT + ORG_GAP_Y)
  const filhosDaRaiz = filhos.get(raiz) ?? []

  if (filhosDaRaiz.length === 0) {
    posicoes[raiz] = { x: offsetX, y }
    return ORG_NODE_WIDTH
  }

  let cursor = offsetX
  const centros: number[] = []
  for (const filho of filhosDaRaiz) {
    const largura = layoutTree(filho, filhos, posicoes, profundidade + 1, cursor)
    centros.push(posicoes[filho].x + ORG_NODE_WIDTH / 2)
    cursor += largura + ORG_GAP_X
  }

  const larguraTotal = cursor - offsetX - ORG_GAP_X
  const centro = (centros[0] + centros[centros.length - 1]) / 2
  posicoes[raiz] = { x: centro - ORG_NODE_WIDTH / 2, y }
  return Math.max(larguraTotal, ORG_NODE_WIDTH)
}

/** Árvore por responsável, raízes em cima e filhos centralizados; florestas em grade. */
export function layoutHierarquia(colaboradores: RhColaborador[]): Record<string, { x: number; y: number }> {
  if (colaboradores.length === 0) return {}

  const ids = new Set(colaboradores.map((colaborador) => colaborador.id))
  const filhos = new Map<string, string[]>()
  const temPai = new Set<string>()

  for (const colaborador of colaboradores) {
    const responsavelId = colaborador.responsavel_id
    if (!responsavelId || responsavelId === colaborador.id || !ids.has(responsavelId)) continue
    if (wouldCreateCycle(colaborador.id, responsavelId, colaboradores)) continue
    const lista = filhos.get(responsavelId) ?? []
    lista.push(colaborador.id)
    filhos.set(responsavelId, lista)
    temPai.add(colaborador.id)
  }

  const raizes = colaboradores
    .map((colaborador) => colaborador.id)
    .filter((id) => !temPai.has(id))

  const arvores: TreeLayout[] = []
  for (const raiz of raizes) {
    const posicoes: Record<string, { x: number; y: number }> = {}
    layoutTree(raiz, filhos, posicoes, 0, 0)
    const xs = Object.values(posicoes).map((posicao) => posicao.x)
    const ys = Object.values(posicoes).map((posicao) => posicao.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    arvores.push({
      positions: posicoes,
      width: maxX - minX + ORG_NODE_WIDTH,
      height: maxY + ORG_NODE_HEIGHT,
      minX,
    })
  }

  const colunas = Math.ceil(Math.sqrt(arvores.length))
  const larguraCelula = Math.max(...arvores.map((arvore) => arvore.width)) + ORG_GAP_X * 2
  const alturaCelula = Math.max(...arvores.map((arvore) => arvore.height)) + ORG_GAP_Y

  const resultado: Record<string, { x: number; y: number }> = {}
  arvores.forEach((arvore, indice) => {
    const coluna = indice % colunas
    const linha = Math.floor(indice / colunas)
    const offsetX = coluna * larguraCelula
    const offsetY = linha * alturaCelula
    for (const [id, posicao] of Object.entries(arvore.positions)) {
      resultado[id] = {
        x: Math.round(offsetX + (posicao.x - arvore.minX)),
        y: Math.round(offsetY + posicao.y),
      }
    }
  })

  // Garante que todo id tenha posição mesmo em dados inesperados.
  for (const colaborador of colaboradores) {
    if (!resultado[colaborador.id]) resultado[colaborador.id] = { x: 0, y: 0 }
  }
  return resultado
}

/** Grade por setor: colunas por setor em ordem alfabética, linhas por colaborador. */
export function layoutPorSetor(colaboradores: RhColaborador[]): Record<string, { x: number; y: number }> {
  const grupos = new Map<string, RhColaborador[]>()
  for (const colaborador of colaboradores) {
    const setor = colaborador.setor?.trim() || 'Sem setor'
    const lista = grupos.get(setor) ?? []
    lista.push(colaborador)
    grupos.set(setor, lista)
  }

  const setores = [...grupos.keys()].sort((a, b) => a.localeCompare(b))
  const resultado: Record<string, { x: number; y: number }> = {}
  setores.forEach((setor, setorIndex) => {
    const lista = [...(grupos.get(setor) ?? [])].sort((a, b) => a.nome.localeCompare(b.nome))
    lista.forEach((colaborador, colaboradorIndex) => {
      resultado[colaborador.id] = { x: setorIndex * 330, y: colaboradorIndex * 140 }
    })
  })
  return resultado
}

/** Setores únicos ordenados com cor cíclica estável. */
export function setoresComCor(colaboradores: RhColaborador[]): Array<{ setor: string; cor: string }> {
  const setores = [...new Set(colaboradores.map((colaborador) => colaborador.setor?.trim() || 'Sem setor'))]
    .sort((a, b) => a.localeCompare(b))
  return setores.map((setor, indice) => ({ setor, cor: ORG_SETOR_COLORS[indice % ORG_SETOR_COLORS.length] }))
}
