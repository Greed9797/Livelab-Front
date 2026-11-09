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
