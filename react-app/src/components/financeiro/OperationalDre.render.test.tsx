import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { JsonRecord } from '../../types/models'
import { OperationalDre } from './OperationalDre'

const data: JsonRecord = {
  entradas: [
    { categoria: 'fixo_marca', descricao: 'Fixo mensal — Marca A', valor: 300, memoria: { marca_id: 'm1', marca_nome: 'Marca A', criterio: 'mes_com_atividade' } },
    { categoria: 'comissao_franquia', descricao: 'Comissão — Marca A', valor: 250, memoria: { marca_id: 'm1', marca_nome: 'Marca A', gmv: 10000, lives: 4 } },
    { categoria: 'fixo_marca', descricao: 'Fixo — Marca Fixo', valor: 900, memoria: { marca_id: 'mf', marca_nome: 'Marca Fixo', criterio: 'fixo_ou_comissao_venceu_fixo', comissao_comparada: 800 } },
  ],
  saidas: [
    { categoria: 'fixo_apresentadora', descricao: 'Fixo mensal — Ana', valor: 2700, memoria: { apresentadora_id: 'a1', nome: 'Ana' } },
    { categoria: 'comissao_apresentadora', descricao: 'Comissão — Ana', valor: 100, memoria: { apresentadora_id: 'a1', nome: 'Ana' } },
    { categoria: 'adicional_apresentadora', descricao: 'Bonificação — Ana', valor: 25, memoria: { apresentadora_id: 'a1', nome: 'Ana' } },
    { categoria: 'custo_manual', descricao: 'Aluguel', valor: 1000, memoria: { custo_id: 'c1', tipo: 'aluguel' } },
    { categoria: 'custo_manual', descricao: 'Material', valor: 50, memoria: { custo_id: 'c2', tipo: 'outros' } },
  ],
  totais: { entradas: 1450, despesas_fixas: 3700, despesas_variaveis: 175, resultado: -2425 },
  pendencias: ['equipe_sem_remuneracao_no_schema'],
}

describe('OperationalDre', () => {
  it('renders the four sections and one consistent result summary', () => {
    const html = renderToStaticMarkup(<OperationalDre data={data} />)
    const dreHtml = html.slice(html.indexOf('<details'))
    const sectionOrder = ['Receita de marcas', 'Remuneração de apresentadoras', 'Custos operacionais', 'Resultado operacional']
    expect(sectionOrder.every((label, index) => dreHtml.indexOf(label) >= (index === 0 ? 0 : dreHtml.indexOf(sectionOrder[index - 1])))).toBe(true)
    expect(html).toContain('Receita total')
    expect(html).toContain('Despesas totais')
    expect(html).toContain('Resultado operacional')
    expect(html).toContain('Margem operacional')
    expect(html).toContain('-R$ 2.425,00')
    expect(html).toContain('-167,2%')
  })

  it('shows brand composition, compared values and the winning rule', () => {
    const html = renderToStaticMarkup(<OperationalDre data={data} />)
    expect(html).toContain('Fixo calculado')
    expect(html).toContain('Comissão calculada')
    expect(html).toContain('Receita reconhecida')
    expect(html).toContain('Marca Fixo')
    expect(html).toContain('Comissão comparada')
    expect(html).toContain('Critério vencedor: fixo')
  })

  it('shows presenter remuneration and every manual cost grouped by type', () => {
    const html = renderToStaticMarkup(<OperationalDre data={data} />)
    expect(html).toContain('Fixo')
    expect(html).toContain('Comissão')
    expect(html).toContain('Adicionais')
    expect(html).toContain('Ana')
    expect(html).toContain('aluguel')
    expect(html).toContain('outros')
    expect(html).toContain('Aluguel')
    expect(html).toContain('Material')
  })

  it('keeps sections collapsed by default while showing subtotals and counts', () => {
    const html = renderToStaticMarkup(<OperationalDre data={data} />)
    expect((html.match(/<details/g) ?? []).length).toBe(3)
    expect(html).not.toContain('<details open')
    expect(html).toContain('2 marcas')
    expect(html).toContain('1 apresentadora')
    expect(html).toContain('2 lançamentos')
  })

  it('discloses server pendencies without inventing variable costs', () => {
    const html = renderToStaticMarkup(<OperationalDre data={data} />)
    expect(html).toContain('Pendências do período')
    expect(html).toContain('equipe sem remuneração no schema')
  })

  it('renders an unavailable state without zero-valued financial cards', () => {
    const html = renderToStaticMarkup(<OperationalDre data={{ entradas: [], totais: {} }} />)
    expect(html).toContain('Detalhamento operacional indisponível')
    expect(html).not.toContain('Receita total')
    expect(html).not.toContain('R$ 0,00')
  })

  it('explains a valid period with no financial movement', () => {
    const html = renderToStaticMarkup(
      <OperationalDre data={{ entradas: [], saidas: [], totais: { entradas: 0, despesas_fixas: 0, despesas_variaveis: 0, resultado: 0 } }} />,
    )
    expect(html).toContain('DRE vazio no período')
    expect(html).toContain('Nenhuma receita, remuneração ou custo foi lançado no período.')
    expect(html).toContain('Os subtotais zerados foram reportados pelo servidor.')
  })
})
