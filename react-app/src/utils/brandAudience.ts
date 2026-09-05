import { asNumber, asString } from './format'
import type { JsonRecord } from '../types/models'

export type BrandAudienceRow = {
  key: string
  marcaNome: string
  impressoesLive: number | null
  visualizacoesManuais: number | null
  impressoesProduto: number | null
  cliquesProduto: number | null
  livesTotal: number
  livesComImpressoesRegistradas: number
  livesComVisualizacoesRegistradas: number
  livesComImpressoesProdutoRegistradas: number
  livesComCliquesProdutoRegistrados: number
}

function nullableNumber(value: unknown): number | null {
  return value == null || value === '' ? null : asNumber(value)
}

export function buildBrandAudienceRows(rows: JsonRecord[]): BrandAudienceRow[] {
  return rows.map((row, index) => {
    const marcaNome = asString(row.marca_nome, '').trim() || 'Marca não identificada'
    return {
      key: asString(row.marca_id, '') || `${marcaNome}:${index}`,
      marcaNome,
      impressoesLive: nullableNumber(row.impressoes_live),
      visualizacoesManuais: nullableNumber(row.visualizacoes_manuais),
      impressoesProduto: nullableNumber(row.impressoes_produto),
      cliquesProduto: nullableNumber(row.cliques_produto),
      livesTotal: asNumber(row.lives_total),
      livesComImpressoesRegistradas: asNumber(row.lives_com_impressoes_registradas),
      livesComVisualizacoesRegistradas: asNumber(row.lives_com_visualizacoes_registradas),
      livesComImpressoesProdutoRegistradas: asNumber(row.lives_com_impressoes_produto_registradas),
      livesComCliquesProdutoRegistrados: asNumber(row.lives_com_cliques_produto_registrados),
    }
  })
}

export function sortBrandAudienceRows(rows: BrandAudienceRow[], key: 'impressoesLive' | 'visualizacoesManuais' | 'cliquesProduto') {
  return [...rows].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (left === null && right === null) return a.marcaNome.localeCompare(b.marcaNome, 'pt-BR')
    if (left === null) return 1
    if (right === null) return -1
    return right - left || a.marcaNome.localeCompare(b.marcaNome, 'pt-BR')
  })
}
