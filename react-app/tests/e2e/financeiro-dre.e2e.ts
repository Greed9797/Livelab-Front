import { expect, test, type Page } from '@playwright/test'

const operational = {
  entradas: [
    { categoria: 'comissao_franquia', descricao: 'Comissão de franquia — Marca A', valor: 250, memoria: { marca_id: 'm1', marca_nome: 'Marca A', gmv: 10000, lives: 4, pct_medio: 2.5 } },
    { categoria: 'fixo_marca', descricao: 'Fixo mensal — Marca A', valor: 300, memoria: { marca_id: 'm1', marca_nome: 'Marca A', criterio: 'mes_com_atividade', meses_ativos: 1 } },
    { categoria: 'comissao_franquia', descricao: 'Comissão de franquia — Marca B', valor: 900, memoria: { marca_id: 'm2', marca_nome: 'Marca B', gmv: 9000, lives: 3, pct_medio: 10 } },
  ],
  saidas: [
    { categoria: 'fixo_apresentadora', descricao: 'Fixo mensal — Ana', valor: 2700, memoria: { apresentadora_id: 'a1', nome: 'Ana', criterio: 'fixo_mensal' } },
    { categoria: 'comissao_apresentadora', descricao: 'Comissão — Ana', valor: 100, memoria: { apresentadora_id: 'a1', nome: 'Ana', gmv_atribuido: 10000, pct_medio: 1 } },
    { categoria: 'adicional_apresentadora', descricao: 'Bonificação — Ana', valor: 25, memoria: { adicional_id: 'x1', apresentadora_id: 'a1', nome: 'Ana', tipo: 'bonificacao' } },
    { categoria: 'fixo_apresentadora', descricao: 'Fixo mensal — Bia', valor: 500, memoria: { apresentadora_id: 'a2', nome: 'Bia', criterio: 'fixo_mensal' } },
    { categoria: 'custo_manual', descricao: 'Aluguel', valor: 1000, memoria: { custo_id: 'c1', tipo: 'aluguel' } },
    { categoria: 'custo_manual', descricao: 'Material', valor: 50, memoria: { custo_id: 'c2', tipo: 'outros' } },
  ],
  totais: { entradas: 1450, despesas_fixas: 4200, despesas_variaveis: 175, resultado: -2925 },
  pendencias: ['equipe_sem_remuneracao_no_schema'],
}

async function setup(page: Page) {
  const writes: string[] = []
  const calls: string[] = []
  await page.addInitScript(() => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'dre-e2e-token')
    localStorage.setItem('livelab.react.refresh_token', 'dre-e2e-refresh')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: 'dre-user', nome: 'Consulta financeira', papel: 'financeiro_readonly', tenant_id: 'dre-tenant', onboarding_completed: true }))
    localStorage.setItem('livelab-theme', 'light')
  })
  await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    calls.push(url.pathname)
    if (request.method() !== 'GET') {
      writes.push(`${request.method()} ${url.pathname}`)
      return route.fulfill({ status: 405, json: { error: 'Fixture somente leitura' } })
    }
    if (url.pathname === '/v1/financeiro/operacional') return route.fulfill({ json: operational })
    if (url.pathname === '/v1/financeiro/custos') return route.fulfill({ json: operational.saidas.filter((line) => line.categoria === 'custo_manual').map((line) => ({ id: line.memoria.custo_id, descricao: line.descricao, valor: line.valor, tipo: line.memoria.tipo, competencia: '2026-09-01' })) })
    if (url.pathname === '/v1/financeiro/faturamento') return route.fulfill({ json: { por_cliente: [] } })
    return route.fulfill({ json: [] })
  })
  return { writes, calls }
}

test('exibe DRE reconciliado, expande detalhes e permanece somente leitura', async ({ page }) => {
  const { writes, calls } = await setup(page)
  await page.goto('/financeiro?inicio=2026-09&fim=2026-09')

  const dre = page.getByRole('region', { name: 'DRE operacional' })
  await expect(page.getByRole('heading', { name: 'Resultado operacional completo', exact: true })).toBeVisible()
  await expect(page.getByText('-R$ 2.925,00', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Margem após custos manuais', { exact: false })).toHaveCount(0)
  await expect(page.getByText('Fluxo de caixa', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Adicionar custo', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Excluir', exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Descrição do custo', exact: true })).toHaveCount(0)

  await dre.getByText('Receita de marcas', { exact: true }).click()
  await expect(dre.getByText('Marca A', { exact: true })).toBeVisible()
  await expect(dre.getByText('Marca B', { exact: true })).toBeVisible()
  await dre.getByText('Remuneração de apresentadoras', { exact: true }).click()
  await expect(dre.getByText('Ana', { exact: true })).toBeVisible()
  await expect(dre.getByText('Bia', { exact: true })).toBeVisible()
  await dre.getByText('Custos operacionais', { exact: true }).click()
  await expect(dre.getByText('Aluguel', { exact: true })).toBeVisible()
  await expect(dre.getByText('Material', { exact: true })).toBeVisible()

  expect(calls).toContain('/v1/financeiro/operacional')
  expect(calls).not.toContain('/v1/financeiro/resumo')
  expect(calls).not.toContain('/v1/financeiro/fluxo-caixa')
  expect(writes).toEqual([])
})
