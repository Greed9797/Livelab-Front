import { describe, expect, it } from 'vitest'
import { splitPendingGroupSubmissions } from './group-approve'

describe('splitPendingGroupSubmissions', () => {
  it('separa envios pendentes sem conciliação dos que a lista já marca como conflito', () => {
    const split = splitPendingGroupSubmissions([
      { id: 'live-1', registro_tipo: 'live' },
      { id: 'submissao:a', submissao_id: 'a', registro_tipo: 'submissao', revisao_status: 'pendente', em_conciliacao: false, apresentadora_nome: 'Ana' },
      { id: 'submissao:b', submissao_id: 'b', registro_tipo: 'submissao', revisao_status: 'pendente', em_conciliacao: true, apresentadora_nome: 'Bia' },
      { id: 'submissao:c', submissao_id: 'c', registro_tipo: 'submissao', revisao_status: 'devolvida', em_conciliacao: false },
    ])

    expect(split.limpos.map((live) => live.submissao_id)).toEqual(['a'])
    expect(split.conflitos.map((live) => live.submissao_id)).toEqual(['b'])
    expect(split.pending).toHaveLength(2)
  })
})
