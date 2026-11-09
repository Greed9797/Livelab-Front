import type { RhColaborador, RhFolhaRow, RhFolhaTotais } from '../types/models'
import { asNumber } from './format'

/** Competência atual em 'YYYY-MM' no fuso local — nunca via toISOString (UTC). */
export function competenciaAtual(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function totalFolha(row: Pick<RhFolhaRow, 'salario_fixo' | 'comissao' | 'bonus' | 'descontos'>): number {
  return asNumber(row.salario_fixo) + asNumber(row.comissao) + asNumber(row.bonus) - asNumber(row.descontos)
}

export function resumoFolha(rows: RhFolhaRow[]): RhFolhaTotais {
  return rows.reduce<RhFolhaTotais>(
    (acc, row) => ({
      salario_fixo: acc.salario_fixo + asNumber(row.salario_fixo),
      meta_valor: acc.meta_valor + asNumber(row.meta_valor),
      meta_realizado: acc.meta_realizado + asNumber(row.meta_realizado),
      comissao: acc.comissao + asNumber(row.comissao),
      bonus: acc.bonus + asNumber(row.bonus),
      descontos: acc.descontos + asNumber(row.descontos),
      total: acc.total + totalFolha(row),
    }),
    { salario_fixo: 0, meta_valor: 0, meta_realizado: 0, comissao: 0, bonus: 0, descontos: 0, total: 0 },
  )
}

export function metaAtingida(row: Pick<RhFolhaRow, 'meta_valor' | 'meta_realizado'>): boolean {
  const meta = asNumber(row.meta_valor)
  return meta > 0 && asNumber(row.meta_realizado) >= meta
}

export function aniversariantesDoMes(colaboradores: RhColaborador[], mes: string): RhColaborador[] {
  const mesAlvo = mes.slice(5, 7)
  return colaboradores
    .filter((colaborador) => colaborador.ativo && Boolean(colaborador.data_nascimento))
    .filter((colaborador) => (colaborador.data_nascimento as string).slice(5, 7) === mesAlvo)
    .sort((a, b) => (a.data_nascimento as string).slice(8, 10).localeCompare((b.data_nascimento as string).slice(8, 10)))
}

export interface RhSetorResumo {
  setor: string
  ativos: number
  total: number
  folha: number
  percentual: number
}

/**
 * Agrupa colaboradores e folha por setor. `ativos` conta status 'ativo',
 * `total` conta todos, `folha` soma totalFolha das linhas por colaborador_id e
 * `percentual` é a fatia do headcount ativo. Ordena por ativos desc.
 */
export function resumoPorSetor(colaboradores: RhColaborador[], folhaRows: RhFolhaRow[]): RhSetorResumo[] {
  const grupos = new Map<string, { ativos: number; total: number; folha: number }>()

  function grupoDo(setor: string | null | undefined) {
    const chave = setor?.trim() || 'Sem setor'
    const atual = grupos.get(chave) ?? { ativos: 0, total: 0, folha: 0 }
    grupos.set(chave, atual)
    return atual
  }

  for (const colaborador of colaboradores) {
    const grupo = grupoDo(colaborador.setor)
    grupo.total += 1
    if (colaborador.status === 'ativo') grupo.ativos += 1
  }

  const setorPorColaborador = new Map(colaboradores.map((colaborador) => [colaborador.id, colaborador.setor]))
  for (const row of folhaRows) {
    if (!setorPorColaborador.has(row.colaborador_id)) continue
    grupoDo(setorPorColaborador.get(row.colaborador_id)).folha += totalFolha(row)
  }

  const totalAtivos = [...grupos.values()].reduce((soma, grupo) => soma + grupo.ativos, 0)
  return [...grupos.entries()]
    .map(([setor, grupo]) => ({
      setor,
      ativos: grupo.ativos,
      total: grupo.total,
      folha: grupo.folha,
      percentual: totalAtivos > 0 ? (grupo.ativos / totalAtivos) * 100 : 0,
    }))
    .sort((a, b) => b.ativos - a.ativos)
}
